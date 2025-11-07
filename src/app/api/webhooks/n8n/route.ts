import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-db'
import { LeadStatus, EmailStatus, WhatsAppStatus, CadenceType } from '@prisma/client'
import { handleLeadsExtracted } from './handleLeadsExtracted'
import { checkRateLimit, getClientIp, getRateLimitHeaders } from '@/lib/rate-limit'
import { normalizeToNull } from '@/lib/sanitization'
import { z } from 'zod'

// ==================== Schemas de Validação Zod ====================

// Schema para validar dados de lead enriquecido (Email)
const LeadEnrichedEmailSchema = z.object({
  leadId: z.string().min(1, 'leadId é obrigatório'),
  email1Subject: z.string().min(1, 'email1Subject não pode estar vazio'),
  email1Body: z.string().min(1, 'email1Body não pode estar vazio'),
  email2Body: z.string().min(1, 'email2Body não pode estar vazio'),
  email3Subject: z.string().min(1, 'email3Subject não pode estar vazio'),
  email3Body: z.string().min(1, 'email3Body não pode estar vazio'),
  companyResearch: z.string().optional(),
  strategicAnalysis: z.string().optional(),
  personalization: z.string().optional(),
  analysisLink: z.string().url().optional().or(z.literal('')),
  senderAccount: z.string().email('senderAccount deve ser um email válido'),
})

// Schema para validar dados de lead enriquecido (WhatsApp)
const LeadEnrichedWhatsAppSchema = z.object({
  leadId: z.string().min(1, 'leadId é obrigatório'),
  whatsappMessage1: z.string().min(1, 'whatsappMessage1 não pode estar vazio'),
  whatsappMessage2: z.string().min(1, 'whatsappMessage2 não pode estar vazio'),
  whatsappMessage3: z.string().min(1, 'whatsappMessage3 não pode estar vazio'),
  companyResearch: z.string().optional(),
  strategicAnalysis: z.string().optional(),
  personalization: z.string().optional(),
  analysisLink: z.string().url().optional().or(z.literal('')),
  senderInstance: z.string().min(1, 'senderInstance é obrigatório'),
})

// Schema para validar dados de lead enriquecido (Híbrido)
const LeadEnrichedHybridSchema = z.object({
  leadId: z.string().min(1, 'leadId é obrigatório'),
  // Emails
  email1Subject: z.string().min(1, 'email1Subject não pode estar vazio'),
  email1Body: z.string().min(1, 'email1Body não pode estar vazio'),
  email2Subject: z.string().min(1, 'email2Subject não pode estar vazio'),
  email2Body: z.string().min(1, 'email2Body não pode estar vazio'),
  email3Subject: z.string().min(1, 'email3Subject não pode estar vazio'),
  email3Body: z.string().min(1, 'email3Body não pode estar vazio'),
  // WhatsApp
  whatsappMessage1: z.string().min(1, 'whatsappMessage1 não pode estar vazio'),
  whatsappMessage2: z.string().min(1, 'whatsappMessage2 não pode estar vazio'),
  // Análise
  companyResearch: z.string().optional(),
  strategicAnalysis: z.string().optional(),
  personalization: z.string().optional(),
  analysisLink: z.string().url().optional().or(z.literal('')),
  // Contas
  senderAccount: z.string().email('senderAccount deve ser um email válido'),
  senderInstance: z.string().min(1, 'senderInstance é obrigatório'),
})

// Validação de segurança do webhook
function validateWebhookSecret(request: NextRequest): boolean {
  const secret = request.headers.get('x-webhook-secret')
  const expectedSecret = process.env.N8N_WEBHOOK_SECRET

  if (!expectedSecret) {
    throw new Error('N8N_WEBHOOK_SECRET must be configured in environment variables')
  }

  return secret === expectedSecret
}

// Função de normalização movida para @/lib/sanitization

// Tipo dos payloads esperados do N8N
type WebhookPayload = {
  event: 'leads-extracted' | 'lead-enriched' | 'lead-enriched-whatsapp' | 'lead-enriched-hybrid' | 'campaign-completed' | 'email-sent' | 'email-replied' | 'opted-out'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

      case 'lead-enriched-hybrid':
        await handleLeadEnrichedHybrid(data)
        break

      case 'campaign-completed':
        await handleCampaignCompleted(data)
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

// Handler: Campanha finalizada (N8N terminou o loop de enriquecimento)
async function handleCampaignCompleted(data: {
  campaignId: string
}) {
  const { campaignId } = data

  console.log(`[Campaign Completed] Recebido para campanha: ${campaignId}`)

  // Buscar campanha com contagem de leads
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      status: true,
      tipo: true,
      leadsCreated: true,
      _count: {
        select: {
          leads: {
            where: {
              status: {
                not: LeadStatus.EXTRACTED
              }
            }
          }
        }
      }
    }
  })

  if (!campaign) {
    console.error(`[Campaign Completed] Campanha ${campaignId} não encontrada`)
    throw new Error('Campanha não encontrada')
  }

  // Se já está COMPLETED ou FAILED, não fazer nada
  if (campaign.status === 'COMPLETED' || campaign.status === 'FAILED') {
    console.log(`[Campaign Completed] Campanha já está no status ${campaign.status}, ignorando`)
    return
  }

  const enrichedCount = campaign._count.leads
  const totalLeads = campaign.leadsCreated

  console.log(`[Campaign Completed] Campanha ${campaignId}:`)
  console.log(`[Campaign Completed]   - Tipo: ${campaign.tipo}`)
  console.log(`[Campaign Completed]   - Total de leads: ${totalLeads}`)
  console.log(`[Campaign Completed]   - Leads enriquecidos: ${enrichedCount}`)

  // Para campanhas COMPLETO, marcar como COMPLETED
  if (campaign.tipo === 'COMPLETO') {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'COMPLETED' }
    })

    console.log(`[Campaign Completed] ✅ Campanha ${campaignId} marcada como COMPLETED`)
  } else {
    console.log(`[Campaign Completed] Campanha é BASICO, status já deve estar correto`)
  }
}

// Handler: Lead enriquecido com IA (Fluxo 2)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleLeadEnriched(data: any) {
  // Validar dados críticos com Zod
  try {
    const validatedData = LeadEnrichedEmailSchema.parse({
      leadId: data.leadId,
      email1Subject: data.email1Subject,
      email1Body: data.email1Body,
      email2Body: data.email2Body,
      email3Subject: data.email3Subject,
      email3Body: data.email3Body,
      companyResearch: data.companyResearch,
      strategicAnalysis: data.strategicAnalysis,
      personalization: data.personalization,
      analysisLink: data.analysisLink || '',
      senderAccount: data.assignedSender,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[Lead Enriched] Validation error:', error.issues)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      throw new Error(`Dados inválidos: ${error.issues.map((e: any) => e.message).join(', ')}`)
    }
    throw error
  }

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
  // Se buscar por nome, pegar o mais recente com status EXTRACTED (evita pegar de campanhas antigas)
  const whereClause = leadId
    ? { id: leadId }
    : apifyId
    ? { apifyLeadId: apifyId }
    : { nomeEmpresa: companyName, status: LeadStatus.EXTRACTED }

  const lead = await prisma.lead.findFirst({
    where: whereClause,
    orderBy: { createdAt: 'desc' } // Pegar o mais recente
  })

  if (!lead) {
    console.error(`[Lead Enriched] Lead não encontrado para: ${JSON.stringify({ leadId, apifyId, companyName })}`)
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

  // Normalizar campos antes de salvar (converter "Não Informado" para null)
  const normalizedEmail = normalizeToNull(email)
  const normalizedLinkedin = normalizeToNull(linkedinUrl)
  const normalizedTwitter = normalizeToNull(twitterUrl)
  const normalizedInstagram = normalizeToNull(instagramUrl)
  const normalizedFacebook = normalizeToNull(facebookUrl)
  const normalizedYoutube = normalizeToNull(youtubeUrl)
  const normalizedTiktok = normalizeToNull(tiktokUrl)
  const normalizedPinterest = normalizeToNull(pinterestUrl)

  // Atualizar lead com dados enriquecidos + EMAIL + REDES SOCIAIS (se disponíveis)
  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      // Só atualizar email se veio com valor válido (não sobrescrever existente)
      ...(normalizedEmail && { email: normalizedEmail }),

      companyResearch: companyResearch || null,
      strategicAnalysis: strategicAnalysis || null,
      personalization: personalization || null,
      analysisLink: analysisLink || null,

      // Redes sociais (só atualizar se vieram com valor válido - não sobrescrever existentes)
      ...(normalizedLinkedin && { linkedinUrl: normalizedLinkedin }),
      ...(normalizedTwitter && { twitterUrl: normalizedTwitter }),
      ...(normalizedInstagram && { instagramUrl: normalizedInstagram }),
      ...(normalizedFacebook && { facebookUrl: normalizedFacebook }),
      ...(normalizedYoutube && { youtubeUrl: normalizedYoutube }),
      ...(normalizedTiktok && { tiktokUrl: normalizedTiktok }),
      ...(normalizedPinterest && { pinterestUrl: normalizedPinterest }),

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
}

// Handler: Lead enriquecido para WhatsApp (nova automação N8N)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleLeadEnrichedWhatsApp(data: any) {
  // Extrair mensagens WhatsApp (podem vir como string ou objeto)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extractWhatsAppMessage = (msg: any): string => {
    if (typeof msg === 'string') return msg
    if (typeof msg === 'object' && msg.mensagem) return msg.mensagem
    return ''
  }

  const whatsappMessage1 = extractWhatsAppMessage(data.whatsapp1)
  const whatsappMessage2 = extractWhatsAppMessage(data.whatsapp2)
  const whatsappMessage3 = extractWhatsAppMessage(data.whatsapp3)

  // Validar dados críticos com Zod
  try {
    const validatedData = LeadEnrichedWhatsAppSchema.parse({
      leadId: data.leadId,
      whatsappMessage1,
      whatsappMessage2,
      whatsappMessage3,
      companyResearch: data.companyResearch,
      strategicAnalysis: data.strategicAnalysis,
      personalization: data.personalization,
      analysisLink: data.analysisLink || '',
      senderInstance: data.sender_whatsapp,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[Lead Enriched WhatsApp] Validation error:', error.issues)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      throw new Error(`Dados inválidos: ${error.issues.map((e: any) => e.message).join(', ')}`)
    }
    throw error
  }

  const {
    leadId,
    apifyId,
    companyName,
    telefone,
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
    whatsapp1,
    whatsapp2,
    whatsapp3,
    sender_whatsapp,
    optOutToken,
  } = data

  console.log(`[Lead Enriched WhatsApp] Lead: ${leadId || apifyId || companyName}`)
  console.log(`[Lead Enriched WhatsApp] Payload recebido:`, JSON.stringify(data, null, 2))

  // Parse WhatsApp messages (N8N envia como JSON string ou objeto)
  const parseWhatsAppMessage = (field: string | { mensagem: string } | undefined): string | null => {
    if (!field) return null

    // Se já é string, tentar fazer parse como JSON
    if (typeof field === 'string') {
      try {
        const parsed = JSON.parse(field)
        return parsed.mensagem || field
      } catch {
        // Se não for JSON válido, retornar como está
        return field
      }
    }

    // Se é objeto, extrair mensagem
    if (typeof field === 'object' && 'mensagem' in field) {
      return field.mensagem
    }

    return null
  }

  const whatsapp1Message = parseWhatsAppMessage(whatsapp1)
  const whatsapp2Message = parseWhatsAppMessage(whatsapp2)
  const whatsapp3Message = parseWhatsAppMessage(whatsapp3)

  console.log(`[Lead Enriched WhatsApp] Mensagens parseadas:`, {
    whatsapp1Message: whatsapp1Message?.substring(0, 50),
    whatsapp2Message: whatsapp2Message?.substring(0, 50),
    whatsapp3Message: whatsapp3Message?.substring(0, 50),
  })

  // Validação: campos obrigatórios
  if (!whatsapp1Message || !whatsapp2Message || !whatsapp3Message) {
    console.error(`[Lead Enriched WhatsApp] Campos obrigatórios de WhatsApp ausentes no payload:`, {
      whatsapp1Message: !!whatsapp1Message,
      whatsapp2Message: !!whatsapp2Message,
      whatsapp3Message: !!whatsapp3Message,
    })
    throw new Error('Campos obrigatórios de WhatsApp ausentes no payload')
  }

  // Buscar lead por ID, apifyId ou nome da empresa
  // Se buscar por nome, pegar o mais recente com status EXTRACTED (evita pegar de campanhas antigas)
  const whereClause = leadId
    ? { id: leadId }
    : apifyId
    ? { apifyLeadId: apifyId }
    : { nomeEmpresa: companyName, status: LeadStatus.EXTRACTED }

  const lead = await prisma.lead.findFirst({
    where: whereClause,
    orderBy: { createdAt: 'desc' } // Pegar o mais recente
  })

  if (!lead) {
    console.error(`[Lead Enriched WhatsApp] Lead não encontrado para: ${JSON.stringify({ leadId, apifyId, companyName })}`)
    return
  }

  // Verificar telefone (usar do payload se disponível, senão do lead)
  const phoneNumber = telefone || lead.telefone
  if (!phoneNumber) {
    console.error(`[Lead Enriched WhatsApp] Lead sem telefone, impossível enviar WhatsApp`)
    return
  }

  // Buscar configurações do usuário
  const userSettings = await prisma.userSettings.findFirst()
  if (!userSettings) {
    console.error(`[Lead Enriched WhatsApp] UserSettings não encontrado`)
    throw new Error('Configurações do usuário não encontradas')
  }

  // Parse Evolution instances com suporte para AMBOS formatos (string[] ou objeto[])
  let evolutionInstances: Array<{ url: string }> = []
  try {
    const parsed = JSON.parse(userSettings.evolutionInstances || '[]')

    if (!Array.isArray(parsed)) {
      console.error(`[Lead Enriched WhatsApp] evolutionInstances não é um array:`, parsed)
      throw new Error('Evolution instances tem formato inválido')
    }

    // Normalizar: aceitar strings simples OU objetos com campo 'url'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    evolutionInstances = parsed.map((instance: any) => {
      if (typeof instance === 'string') {
        // Formato antigo: array de strings (URLs diretas)
        return { url: instance }
      } else if (typeof instance === 'object' && instance.url) {
        // Formato novo: array de objetos com campo 'url'
        return { url: instance.url }
      } else {
        console.error(`[Lead Enriched WhatsApp] Instância inválida:`, instance)
        return null
      }
    }).filter((i): i is { url: string } => i !== null)

  } catch (error) {
    console.error(`[Lead Enriched WhatsApp] Erro ao parsear evolutionInstances:`, error)
    throw new Error('Evolution instances inválidas')
  }

  console.log(`[Lead Enriched WhatsApp] Instâncias Evolution disponíveis: ${evolutionInstances.length}`)
  console.log(`[Lead Enriched WhatsApp] URLs normalizadas:`, evolutionInstances.map(i => i.url))

  if (evolutionInstances.length === 0) {
    console.error(`[Lead Enriched WhatsApp] Nenhuma instância Evolution configurada`)
    throw new Error('Nenhuma instância Evolution API configurada. Vá em /whatsapp > Instâncias para configurar.')
  }

  // Determinar instância usando round-robin ou valor fornecido pelo N8N
  let assignedInstance: string

  console.log(`[Lead Enriched WhatsApp] sender_whatsapp fornecido pelo N8N: ${sender_whatsapp || 'NÃO FORNECIDO'}`)

  if (sender_whatsapp) {
    assignedInstance = sender_whatsapp
    console.log(`[Lead Enriched WhatsApp] ✅ Usando instância atribuída pelo N8N: ${assignedInstance}`)
  } else {
    // Contar apenas leads ENRIQUECIDOS na campanha para fazer round-robin correto
    const enrichedLeadsCount = await prisma.lead.count({
      where: {
        campaignId: lead.campaignId,
        status: LeadStatus.ENRICHED
      }
    })

    const instanceIndex = enrichedLeadsCount % evolutionInstances.length
    assignedInstance = evolutionInstances[instanceIndex].url

    console.log(`[Lead Enriched WhatsApp] Round-robin calculado:`)
    console.log(`[Lead Enriched WhatsApp]   - Leads enriquecidos: ${enrichedLeadsCount}`)
    console.log(`[Lead Enriched WhatsApp]   - Instâncias disponíveis: ${evolutionInstances.length}`)
    console.log(`[Lead Enriched WhatsApp]   - Índice calculado: ${instanceIndex}`)
    console.log(`[Lead Enriched WhatsApp]   - ✅ Instância selecionada: ${assignedInstance}`)
  }

  // Determinar tipo de cadência baseado em email e telefone disponíveis
  let cadenceType: CadenceType = CadenceType.WHATSAPP_ONLY

  const hasEmail = !!lead.email
  const hasPhone = !!phoneNumber

  if (hasEmail && hasPhone) {
    if (userSettings?.useHybridCadence) {
      cadenceType = CadenceType.HYBRID
    } else {
      cadenceType = CadenceType.WHATSAPP_ONLY
    }
  } else if (hasEmail) {
    cadenceType = CadenceType.EMAIL_ONLY
  } else if (hasPhone) {
    cadenceType = CadenceType.WHATSAPP_ONLY
  }

  // Normalizar campos antes de salvar (converter "Não Informado" para null)
  const normalizedTelefone = normalizeToNull(telefone)
  const normalizedLinkedin = normalizeToNull(linkedinUrl)
  const normalizedTwitter = normalizeToNull(twitterUrl)
  const normalizedInstagram = normalizeToNull(instagramUrl)
  const normalizedFacebook = normalizeToNull(facebookUrl)
  const normalizedYoutube = normalizeToNull(youtubeUrl)
  const normalizedTiktok = normalizeToNull(tiktokUrl)
  const normalizedPinterest = normalizeToNull(pinterestUrl)

  // Atualizar lead com dados enriquecidos + REDES SOCIAIS (se disponíveis)
  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      // Só atualizar telefone se veio com valor válido (não sobrescrever existente)
      ...(normalizedTelefone && { telefone: normalizedTelefone }),

      companyResearch: companyResearch || null,
      strategicAnalysis: strategicAnalysis || null,
      personalization: personalization || null,
      analysisLink: analysisLink || null,

      // Redes sociais (só atualizar se vieram com valor válido - não sobrescrever existentes)
      ...(normalizedLinkedin && { linkedinUrl: normalizedLinkedin }),
      ...(normalizedTwitter && { twitterUrl: normalizedTwitter }),
      ...(normalizedInstagram && { instagramUrl: normalizedInstagram }),
      ...(normalizedFacebook && { facebookUrl: normalizedFacebook }),
      ...(normalizedYoutube && { youtubeUrl: normalizedYoutube }),
      ...(normalizedTiktok && { tiktokUrl: normalizedTiktok }),
      ...(normalizedPinterest && { pinterestUrl: normalizedPinterest }),

      assignedSender: assignedInstance,
      optOutToken,
      cadenceType,
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
        phoneNumber,
        message: whatsapp1Message,
        senderInstance: assignedInstance,
        status: WhatsAppStatus.PENDING,
      },
      {
        leadId: lead.id,
        sequenceNumber: 2,
        phoneNumber,
        message: whatsapp2Message,
        senderInstance: assignedInstance,
        status: WhatsAppStatus.PENDING,
      },
      {
        leadId: lead.id,
        sequenceNumber: 3,
        phoneNumber,
        message: whatsapp3Message,
        senderInstance: assignedInstance,
        status: WhatsAppStatus.PENDING,
      },
    ],
  })

  console.log(`[Lead Enriched WhatsApp] Lead ${lead.id} enriquecido e 3 mensagens WhatsApp criadas`)
}

// Handler: Lead enriquecido para Híbrido (Email + WhatsApp)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleLeadEnrichedHybrid(data: any) {
  // Extrair mensagens WhatsApp (podem vir como string ou objeto)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extractWhatsAppMessage = (msg: any): string => {
    if (typeof msg === 'string') return msg
    if (typeof msg === 'object' && msg.mensagem) return msg.mensagem
    return ''
  }

  const whatsappMessage1 = extractWhatsAppMessage(data.whatsapp1)
  const whatsappMessage2 = extractWhatsAppMessage(data.whatsapp2)

  // Validar dados críticos com Zod
  try {
    const validatedData = LeadEnrichedHybridSchema.parse({
      leadId: data.leadId,
      email1Subject: data.email1Subject,
      email1Body: data.email1Body,
      email2Subject: data.email2Subject,
      email2Body: data.email2Body,
      email3Subject: data.email3Subject,
      email3Body: data.email3Body,
      whatsappMessage1,
      whatsappMessage2,
      companyResearch: data.companyResearch,
      strategicAnalysis: data.strategicAnalysis,
      personalization: data.personalization,
      analysisLink: data.analysisLink || '',
      senderAccount: data.assignedSender,
      senderInstance: data.sender_whatsapp,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[Lead Enriched Hybrid] Validation error:', error.issues)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      throw new Error(`Dados inválidos: ${error.issues.map((e: any) => e.message).join(', ')}`)
    }
    throw error
  }

  const {
    leadId,
    apifyId,
    companyName,
    email,
    telefone,
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
    whatsapp1,
    whatsapp2,
    whatsapp3,
    sender_email,
    sender_whatsapp,
    optOutToken,
  } = data

  console.log(`[Lead Enriched Hybrid] Lead: ${leadId || apifyId || companyName}`)
  console.log(`[Lead Enriched Hybrid] Payload recebido:`, JSON.stringify(data, null, 2))

  // Parse WhatsApp messages
  const parseWhatsAppMessage = (field: string | { mensagem: string } | undefined): string | null => {
    if (!field) return null

    if (typeof field === 'string') {
      try {
        const parsed = JSON.parse(field)
        return parsed.mensagem || field
      } catch {
        return field
      }
    }

    if (typeof field === 'object' && 'mensagem' in field) {
      return field.mensagem
    }

    return null
  }

  const whatsapp1Message = parseWhatsAppMessage(whatsapp1)
  const whatsapp2Message = parseWhatsAppMessage(whatsapp2)
  const whatsapp3Message = parseWhatsAppMessage(whatsapp3)

  // Buscar lead por ID, apifyId ou nome da empresa
  // Se buscar por nome, pegar o mais recente com status EXTRACTED (evita pegar de campanhas antigas)
  const whereClause = leadId
    ? { id: leadId }
    : apifyId
    ? { apifyLeadId: apifyId }
    : { nomeEmpresa: companyName, status: LeadStatus.EXTRACTED }

  const lead = await prisma.lead.findFirst({
    where: whereClause,
    orderBy: { createdAt: 'desc' } // Pegar o mais recente
  })

  if (!lead) {
    console.error(`[Lead Enriched Hybrid] Lead não encontrado para: ${JSON.stringify({ leadId, apifyId, companyName })}`)
    return
  }

  // Buscar configurações do usuário
  const userSettings = await prisma.userSettings.findFirst()
  if (!userSettings) {
    console.error(`[Lead Enriched Hybrid] UserSettings não encontrado`)
    throw new Error('Configurações do usuário não encontradas')
  }

  // Parse hybrid cadence
  let hybridCadence: Array<{ day: number; type: 'email' | 'whatsapp'; sequenceNumber: number }> = []
  try {
    hybridCadence = JSON.parse(userSettings.hybridCadence || '[]')
  } catch (error) {
    console.error(`[Lead Enriched Hybrid] Erro ao parsear hybridCadence:`, error)
  }

  console.log(`[Lead Enriched Hybrid] Cadência híbrida:`, hybridCadence)

  // Validar dados baseado na cadência configurada
  const needsEmail = hybridCadence.some(c => c.type === 'email')
  const needsWhatsApp = hybridCadence.some(c => c.type === 'whatsapp')

  if (needsEmail && (!email1Subject || !email1Body || !email2Body || !email3Subject || !email3Body)) {
    console.error(`[Lead Enriched Hybrid] Cadência requer emails mas dados ausentes`)
    throw new Error('Campos de email obrigatórios ausentes no payload')
  }

  if (needsWhatsApp && (!whatsapp1Message || !whatsapp2Message)) {
    console.error(`[Lead Enriched Hybrid] Cadência requer WhatsApp mas dados ausentes`)
    throw new Error('Campos de WhatsApp obrigatórios ausentes no payload')
  }

  // Determinar senders (usar round-robin se não fornecidos)
  let assignedEmailSender: string | undefined
  let assignedWhatsAppSender: string | undefined

  if (needsEmail) {
    if (sender_email) {
      assignedEmailSender = sender_email
    } else {
      // Round-robin para email
      let senderEmails: string[] = []
      try {
        senderEmails = JSON.parse(userSettings.senderEmails || '[]')
      } catch { }

      if (senderEmails.length > 0) {
        const campaign = await prisma.campaign.findUnique({
          where: { id: lead.campaignId },
          select: { _count: { select: { leads: true } } }
        })
        const leadIndex = campaign?._count.leads || 0
        assignedEmailSender = senderEmails[leadIndex % senderEmails.length]
      }
    }
  }

  if (needsWhatsApp) {
    if (sender_whatsapp) {
      assignedWhatsAppSender = sender_whatsapp
    } else {
      // Round-robin para WhatsApp
      let evolutionInstances: Array<{ url: string; apiKey: string; name: string }> = []
      try {
        evolutionInstances = JSON.parse(userSettings.evolutionInstances || '[]')
      } catch { }

      if (evolutionInstances.length > 0) {
        const campaign = await prisma.campaign.findUnique({
          where: { id: lead.campaignId },
          select: { _count: { select: { leads: true } } }
        })
        const leadIndex = campaign?._count.leads || 0
        assignedWhatsAppSender = evolutionInstances[leadIndex % evolutionInstances.length].url
      }
    }
  }

  // Normalizar campos antes de salvar (converter "Não Informado" para null)
  const normalizedEmail = normalizeToNull(email)
  const normalizedTelefone = normalizeToNull(telefone)
  const normalizedLinkedin = normalizeToNull(linkedinUrl)
  const normalizedTwitter = normalizeToNull(twitterUrl)
  const normalizedInstagram = normalizeToNull(instagramUrl)
  const normalizedFacebook = normalizeToNull(facebookUrl)
  const normalizedYoutube = normalizeToNull(youtubeUrl)
  const normalizedTiktok = normalizeToNull(tiktokUrl)
  const normalizedPinterest = normalizeToNull(pinterestUrl)

  // Atualizar lead
  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      // Só atualizar email e telefone se vieram com valor válido (não sobrescrever existentes)
      ...(normalizedEmail && { email: normalizedEmail }),
      ...(normalizedTelefone && { telefone: normalizedTelefone }),

      companyResearch: companyResearch || null,
      strategicAnalysis: strategicAnalysis || null,
      personalization: personalization || null,
      analysisLink: analysisLink || null,

      // Redes sociais (só atualizar se vieram com valor válido - não sobrescrever existentes)
      ...(normalizedLinkedin && { linkedinUrl: normalizedLinkedin }),
      ...(normalizedTwitter && { twitterUrl: normalizedTwitter }),
      ...(normalizedInstagram && { instagramUrl: normalizedInstagram }),
      ...(normalizedFacebook && { facebookUrl: normalizedFacebook }),
      ...(normalizedYoutube && { youtubeUrl: normalizedYoutube }),
      ...(normalizedTiktok && { tiktokUrl: normalizedTiktok }),
      ...(normalizedPinterest && { pinterestUrl: normalizedPinterest }),

      assignedSender: assignedEmailSender || assignedWhatsAppSender || null,
      optOutToken,
      cadenceType: CadenceType.HYBRID,
      status: LeadStatus.ENRICHED,
      enrichedAt: new Date(),
    },
  })

  // Criar registros de Email e WhatsApp baseado na cadência
  if (needsEmail && email1Subject && email1Body && email2Body && email3Subject && email3Body && assignedEmailSender) {
    await prisma.email.createMany({
      data: [
        {
          leadId: lead.id,
          sequenceNumber: 1,
          subject: email1Subject,
          body: email1Body,
          senderAccount: assignedEmailSender,
          status: EmailStatus.PENDING,
        },
        {
          leadId: lead.id,
          sequenceNumber: 2,
          subject: `Re: ${email1Subject}`,
          body: email2Body,
          senderAccount: assignedEmailSender,
          status: EmailStatus.PENDING,
        },
        {
          leadId: lead.id,
          sequenceNumber: 3,
          subject: email3Subject,
          body: email3Body,
          senderAccount: assignedEmailSender,
          status: EmailStatus.PENDING,
        },
      ],
    })
    console.log(`[Lead Enriched Hybrid] 3 emails criados para lead ${lead.id}`)
  }

  if (needsWhatsApp && whatsapp1Message && whatsapp2Message && (telefone || lead.telefone)) {
    const phoneNumber = telefone || lead.telefone!
    await prisma.whatsAppMessage.createMany({
      data: [
        {
          leadId: lead.id,
          sequenceNumber: 1,
          phoneNumber,
          message: whatsapp1Message,
          senderInstance: assignedWhatsAppSender,
          status: WhatsAppStatus.PENDING,
        },
        {
          leadId: lead.id,
          sequenceNumber: 2,
          phoneNumber,
          message: whatsapp2Message,
          senderInstance: assignedWhatsAppSender,
          status: WhatsAppStatus.PENDING,
        },
      ],
    })
    console.log(`[Lead Enriched Hybrid] 2 mensagens WhatsApp criadas para lead ${lead.id}`)
  }

  console.log(`[Lead Enriched Hybrid] Lead ${lead.id} enriquecido com cadência híbrida`)
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
