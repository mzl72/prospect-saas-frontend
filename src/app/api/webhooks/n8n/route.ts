import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-db'
import { LeadStatus, EmailStatus } from '@prisma/client'

// Validação de segurança do webhook
function validateWebhookSecret(request: NextRequest): boolean {
  const secret = request.headers.get('x-webhook-secret')
  const expectedSecret = process.env.N8N_WEBHOOK_SECRET

  if (!expectedSecret) {
    throw new Error('N8N_WEBHOOK_SECRET must be configured in environment variables')
  }

  return secret === expectedSecret
}

// Tipo dos payloads esperados do N8N
type WebhookPayload = {
  event: 'leads-extracted' | 'lead-enriched' | 'email-sent' | 'email-replied' | 'opted-out'
  data: any
}

export async function POST(request: NextRequest) {
  try {
    // Validar secret
    if (!validateWebhookSecret(request)) {
      return NextResponse.json(
        { error: 'Webhook secret inválido' },
        { status: 401 }
      )
    }

    const payload: WebhookPayload = await request.json()
    const { event, data } = payload

    console.log(`[N8N Webhook] Recebido evento: ${event}`)

    switch (event) {
      case 'leads-extracted':
        await handleLeadsExtracted(data)
        break

      case 'lead-enriched':
        await handleLeadEnriched(data)
        break

      case 'email-sent':
        await handleEmailSent(data)
        break

      case 'email-replied':
        await handleEmailReplied(data)
        break

      case 'opted-out':
        await handleOptedOut(data)
        break

      default:
        console.warn(`[N8N Webhook] Evento desconhecido: ${event}`)
        return NextResponse.json(
          { error: 'Evento não reconhecido' },
          { status: 400 }
        )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[N8N Webhook] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao processar webhook' },
      { status: 500 }
    )
  }
}

// Handler: Leads extraídos do Apify (Fluxo 1)
async function handleLeadsExtracted(data: {
  campaignId: string
  leads: any
}) {
  const { campaignId, leads } = data

  console.log(`[Leads Extracted] Recebido:`, { campaignId, leadsType: typeof leads })

  // Normalizar formato dos leads
  let leadsArray: any[] = []

  if (Array.isArray(leads)) {
    leadsArray = leads
  } else if (typeof leads === 'string') {
    try {
      leadsArray = JSON.parse(leads)
    } catch (e) {
      console.error('[Leads Extracted] Erro ao fazer parse de leads string:', e)
      throw new Error('Formato inválido de leads')
    }
  } else if (typeof leads === 'object') {
    // Se for um objeto, pode ser que tenha vindo errado do N8N
    console.error('[Leads Extracted] Leads veio como objeto:', leads)
    throw new Error('Formato inválido de leads - esperado array')
  }

  console.log(`[Leads Extracted] Campaign ${campaignId}: ${leadsArray.length} leads`)

  // Criar todos os leads no banco
  const createdLeads = await Promise.all(
    leadsArray.map(async (lead) => {
      // Suportar tanto formato Apify quanto formato customizado
      const leadData = {
        apifyId: lead.apifyId || lead.nome_empresa + '-' + Date.now(),
        title: lead.title || lead.nome_empresa,
        address: lead.address || lead.endereco,
        website: lead.website,
        phone: lead.phone || lead.telefone_desformatado,
        category: lead.category || lead.categoria,
        totalScore: lead.totalScore || lead.nota_media,
        reviewsCount: lead.reviewsCount || lead.total_reviews,
        url: lead.url || lead.link_google_maps,
      }

      return prisma.lead.create({
        data: {
          campaignId,
          apifyLeadId: leadData.apifyId,
          nomeEmpresa: leadData.title,
          endereco: leadData.address,
          website: leadData.website,
          telefone: leadData.phone,
          categoria: leadData.category,
          totalReviews: leadData.reviewsCount,
          notaMedia: leadData.totalScore,
          linkGoogleMaps: leadData.url,
          status: LeadStatus.EXTRACTED,
          extractedAt: new Date(),
        },
      })
    })
  )

  // Atualizar status da campanha se ainda estiver PROCESSING
  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: 'PROCESSING',
      updatedAt: new Date(),
    },
  })

  console.log(`[Leads Extracted] ${createdLeads.length} leads criados`)
}

// Handler: Lead enriquecido com IA (Fluxo 2)
async function handleLeadEnriched(data: {
  leadId?: string
  apifyId?: string
  companyName?: string
  email?: string // OPCIONAL - Email do lead (quando disponível)
  companyResearch?: string
  strategicAnalysis?: string
  personalization?: string
  analysisLink?: string
  email1Subject: string
  email1Body: string
  email2Body: string
  email3Subject: string
  email3Body: string
  assignedSender: string
  optOutToken: string
}) {
  const {
    leadId,
    apifyId,
    companyName,
    email,
    companyResearch,
    strategicAnalysis,
    personalization,
    analysisLink,
    email1Subject,
    email1Body,
    email2Body,
    email3Subject,
    email3Body,
    assignedSender,
    optOutToken,
  } = data

  console.log(`[Lead Enriched] Lead: ${leadId || apifyId || companyName}`)
  console.log(`[Lead Enriched] Email: ${email || 'not provided (ok for now)'}`)
  console.log(`[Lead Enriched] Payload recebido:`, JSON.stringify(data, null, 2))

  // Validação: campos obrigatórios
  if (!email1Subject || !email1Body || !email2Body || !email3Subject || !email3Body || !assignedSender) {
    console.error(`[Lead Enriched] Campos obrigatórios ausentes no payload:`, {
      email1Subject: !!email1Subject,
      email1Body: !!email1Body,
      email2Body: !!email2Body,
      email3Subject: !!email3Subject,
      email3Body: !!email3Body,
      assignedSender: !!assignedSender,
    })
    throw new Error('Campos obrigatórios de email ausentes no payload')
  }

  // Buscar lead por ID, apifyId ou nome da empresa
  const whereClause = leadId
    ? { id: leadId }
    : apifyId
    ? { apifyLeadId: apifyId }
    : { nomeEmpresa: companyName }

  const lead = await prisma.lead.findFirst({ where: whereClause })

  if (!lead) {
    console.error(`[Lead Enriched] Lead não encontrado: ${leadId || apifyId}`)
    return
  }

  // Atualizar lead com dados enriquecidos + EMAIL (se disponível)
  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      email: email || null, // Salvar email se N8N conseguiu obter
      companyResearch: companyResearch || null,
      strategicAnalysis: strategicAnalysis || null,
      personalization: personalization || null,
      analysisLink: analysisLink || null,
      assignedSender,
      optOutToken,
      status: LeadStatus.ENRICHED,
      enrichedAt: new Date(),
    },
  })

  // Criar os 3 registros de email
  await prisma.email.createMany({
    data: [
      {
        leadId: lead.id,
        sequenceNumber: 1,
        subject: email1Subject,
        body: email1Body,
        senderAccount: assignedSender,
        status: EmailStatus.PENDING,
      },
      {
        leadId: lead.id,
        sequenceNumber: 2,
        subject: `Re: ${email1Subject}`, // Email 2 é resposta na thread (bump)
        body: email2Body,
        senderAccount: assignedSender,
        status: EmailStatus.PENDING,
      },
      {
        leadId: lead.id,
        sequenceNumber: 3,
        subject: email3Subject,
        body: email3Body,
        senderAccount: assignedSender,
        status: EmailStatus.PENDING,
      },
    ],
  })

  console.log(`[Lead Enriched] Lead ${lead.id} enriquecido e 3 emails criados`)
}

// Handler: Email enviado (Fluxos 3, 4, 5)
async function handleEmailSent(data: {
  leadId?: string
  apifyId?: string
  optOutToken?: string
  sequenceNumber: number
  messageId: string
  threadId?: string
  sentAt: string
}) {
  const { leadId, apifyId, optOutToken, sequenceNumber, messageId, threadId, sentAt } = data

  console.log(`[Email Sent] Lead ${leadId || apifyId}, Email #${sequenceNumber}`)

  // Buscar lead
  const whereClause = leadId
    ? { id: leadId }
    : apifyId
    ? { apifyLeadId: apifyId }
    : { optOutToken }

  const lead = await prisma.lead.findFirst({ where: whereClause })

  if (!lead) {
    console.error(`[Email Sent] Lead não encontrado`)
    return
  }

  // Atualizar email específico
  const email = await prisma.email.findFirst({
    where: {
      leadId: lead.id,
      sequenceNumber,
    },
  })

  if (email) {
    await prisma.email.update({
      where: { id: email.id },
      data: {
        messageId,
        threadId,
        sentAt: new Date(sentAt),
        status: EmailStatus.SENT,
      },
    })
  }

  // Atualizar status do lead
  const newStatus =
    sequenceNumber === 1 ? LeadStatus.EMAIL_1_SENT :
    sequenceNumber === 2 ? LeadStatus.EMAIL_2_SENT :
    LeadStatus.EMAIL_3_SENT

  await prisma.lead.update({
    where: { id: lead.id },
    data: { status: newStatus },
  })

  console.log(`[Email Sent] Lead ${lead.id} atualizado para ${newStatus}`)
}

// Handler: Lead respondeu
async function handleEmailReplied(data: {
  leadId?: string
  apifyId?: string
  optOutToken?: string
  repliedAt: string
}) {
  const { leadId, apifyId, optOutToken, repliedAt } = data

  console.log(`[Email Replied] Lead ${leadId || apifyId}`)

  const whereClause = leadId
    ? { id: leadId }
    : apifyId
    ? { apifyLeadId: apifyId }
    : { optOutToken }

  const lead = await prisma.lead.findFirst({ where: whereClause })

  if (!lead) {
    console.error(`[Email Replied] Lead não encontrado`)
    return
  }

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      status: LeadStatus.REPLIED,
      repliedAt: new Date(repliedAt),
    },
  })

  console.log(`[Email Replied] Lead ${lead.id} marcado como REPLIED`)
}

// Handler: Lead fez opt-out
async function handleOptedOut(data: {
  optOutToken: string
  optedOutAt: string
}) {
  const { optOutToken, optedOutAt } = data

  console.log(`[Opted Out] Token: ${optOutToken}`)

  const lead = await prisma.lead.findUnique({
    where: { optOutToken },
  })

  if (!lead) {
    console.error(`[Opted Out] Lead não encontrado para token: ${optOutToken}`)
    return
  }

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      status: LeadStatus.OPTED_OUT,
      optedOutAt: new Date(optedOutAt),
    },
  })

  console.log(`[Opted Out] Lead ${lead.id} marcado como OPTED_OUT`)
}
