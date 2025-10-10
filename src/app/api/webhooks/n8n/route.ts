import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-db'
import { LeadStatus, EmailStatus, WhatsAppStatus, CadenceType } from '@prisma/client'
import { handleLeadsExtracted } from './handleLeadsExtracted'
import { checkRateLimit, getClientIp, getRateLimitHeaders } from '@/lib/rate-limit'

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
  event: 'leads-extracted' | 'lead-enriched' | 'lead-enriched-whatsapp' | 'email-sent' | 'email-replied' | 'opted-out'
  data: any
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 100 requisições por minuto por IP
    const clientIp = getClientIp(request)
    const rateLimitResult = checkRateLimit({
      identifier: `n8n-webhook:${clientIp}`,
      maxRequests: 100,
      windowMs: 60000, // 1 minuto
    })

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      )
    }

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

      case 'lead-enriched-whatsapp':
        await handleLeadEnrichedWhatsApp(data)
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

  // Redes sociais (opcionais - do actor lukaskrivka/google-maps-with-contact-details)
  linkedinUrl?: string
  twitterUrl?: string
  instagramUrl?: string
  facebookUrl?: string
  youtubeUrl?: string
  tiktokUrl?: string
  pinterestUrl?: string

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
    linkedinUrl,
    twitterUrl,
    instagramUrl,
    facebookUrl,
    youtubeUrl,
    tiktokUrl,
    pinterestUrl,
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

  // Determinar tipo de cadência baseado em email e telefone disponíveis
  let cadenceType: CadenceType = CadenceType.EMAIL_ONLY

  const hasEmail = !!email || !!lead.email
  const hasPhone = !!lead.telefone

  if (hasEmail && hasPhone) {
    // Buscar configurações do usuário para verificar se híbrido está ativo
    const userSettings = await prisma.userSettings.findFirst()
    if (userSettings?.useHybridCadence) {
      cadenceType = CadenceType.HYBRID
    } else {
      cadenceType = CadenceType.EMAIL_ONLY // Default para email se híbrido desativado
    }
  } else if (hasEmail) {
    cadenceType = CadenceType.EMAIL_ONLY
  } else if (hasPhone) {
    cadenceType = CadenceType.WHATSAPP_ONLY
  }

  // Atualizar lead com dados enriquecidos + EMAIL + REDES SOCIAIS (se disponíveis)
  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      email: email || null, // Salvar email se N8N conseguiu obter
      companyResearch: companyResearch || null,
      strategicAnalysis: strategicAnalysis || null,
      personalization: personalization || null,
      analysisLink: analysisLink || null,

      // Redes sociais (opcionais)
      linkedinUrl: linkedinUrl || null,
      twitterUrl: twitterUrl || null,
      instagramUrl: instagramUrl || null,
      facebookUrl: facebookUrl || null,
      youtubeUrl: youtubeUrl || null,
      tiktokUrl: tiktokUrl || null,
      pinterestUrl: pinterestUrl || null,

      assignedSender,
      optOutToken,
      cadenceType, // Atribuir tipo de cadência
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

  // Verificar se todos os leads da campanha foram enriquecidos
  const campaign = await prisma.campaign.findUnique({
    where: { id: lead.campaignId },
    select: {
      id: true,
      tipo: true,
      leadsCreated: true,
      _count: {
        select: {
          leads: {
            where: { status: LeadStatus.ENRICHED }
          }
        }
      }
    }
  })

  if (campaign && campaign.tipo === 'COMPLETO') {
    const enrichedCount = campaign._count.leads
    const totalLeads = campaign.leadsCreated

    console.log(`[Lead Enriched] Progresso da campanha ${campaign.id}: ${enrichedCount}/${totalLeads} enriquecidos`)

    // Se todos os leads foram enriquecidos, marcar campanha como COMPLETED
    if (enrichedCount >= totalLeads && totalLeads > 0) {
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: 'COMPLETED' }
      })

      console.log(`[Lead Enriched] ✅ Campanha ${campaign.id} marcada como COMPLETED (todos os ${totalLeads} leads enriquecidos)`)
    }
  }
}

// Handler: Lead enriquecido para WhatsApp (nova automação N8N)
async function handleLeadEnrichedWhatsApp(data: {
  leadId?: string
  apifyId?: string
  companyName?: string
  whatsapp1Message: string
  whatsapp2Message: string
  whatsapp3Message: string
  optOutToken: string
}) {
  const {
    leadId,
    apifyId,
    companyName,
    whatsapp1Message,
    whatsapp2Message,
    whatsapp3Message,
    optOutToken,
  } = data

  console.log(`[Lead Enriched WhatsApp] Lead: ${leadId || apifyId || companyName}`)

  // Validação: campos obrigatórios
  if (!whatsapp1Message || !whatsapp2Message || !whatsapp3Message) {
    throw new Error('Campos obrigatórios de WhatsApp ausentes no payload')
  }

  // Buscar lead por ID, apifyId ou nome da empresa
  const whereClause = leadId
    ? { id: leadId }
    : apifyId
    ? { apifyLeadId: apifyId }
    : { nomeEmpresa: companyName }

  const lead = await prisma.lead.findFirst({ where: whereClause })

  if (!lead) {
    console.error(`[Lead Enriched WhatsApp] Lead não encontrado`)
    return
  }

  if (!lead.telefone) {
    console.error(`[Lead Enriched WhatsApp] Lead sem telefone, impossível enviar WhatsApp`)
    return
  }

  // Determinar tipo de cadência baseado em email e telefone disponíveis
  let cadenceType: CadenceType = CadenceType.WHATSAPP_ONLY

  const hasEmail = !!lead.email
  const hasPhone = !!lead.telefone

  if (hasEmail && hasPhone) {
    // Buscar configurações do usuário para verificar se híbrido está ativo
    const userSettings = await prisma.userSettings.findFirst()
    if (userSettings?.useHybridCadence) {
      cadenceType = CadenceType.HYBRID
    } else {
      cadenceType = CadenceType.WHATSAPP_ONLY // Default para whatsapp se híbrido desativado
    }
  } else if (hasEmail) {
    cadenceType = CadenceType.EMAIL_ONLY
  } else if (hasPhone) {
    cadenceType = CadenceType.WHATSAPP_ONLY
  }

  // Atualizar lead com optOutToken e status
  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      optOutToken,
      cadenceType, // Atribuir tipo de cadência
      status: LeadStatus.ENRICHED,
      enrichedAt: new Date(),
    },
  })

  // Criar os 3 registros de WhatsApp
  await prisma.whatsAppMessage.createMany({
    data: [
      {
        leadId: lead.id,
        sequenceNumber: 1,
        phoneNumber: lead.telefone,
        message: whatsapp1Message,
        status: WhatsAppStatus.PENDING,
      },
      {
        leadId: lead.id,
        sequenceNumber: 2,
        phoneNumber: lead.telefone,
        message: whatsapp2Message,
        status: WhatsAppStatus.PENDING,
      },
      {
        leadId: lead.id,
        sequenceNumber: 3,
        phoneNumber: lead.telefone,
        message: whatsapp3Message,
        status: WhatsAppStatus.PENDING,
      },
    ],
  })

  console.log(`[Lead Enriched WhatsApp] Lead ${lead.id} enriquecido e 3 mensagens WhatsApp criadas`)
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
