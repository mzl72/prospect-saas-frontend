/**
 * Handler Universal de Enriquecimento de Leads
 * Consolida lógica de email, whatsapp e híbrido em um único lugar
 */

import { prisma } from '@/lib/prisma-db'
import { LeadStatus, EmailStatus, WhatsAppStatus, CadenceType } from '@prisma/client'
import { normalizeToNull } from '@/lib/sanitization'
import { z } from 'zod'

// ==================== Schemas de Validação ====================

const BaseLeadEnrichmentSchema = z.object({
  leadId: z.string().optional(),
  apifyId: z.string().optional(),
  companyName: z.string().optional(),
  email: z.string().optional(),
  telefone: z.string().optional(),
  companyResearch: z.string().optional(),
  strategicAnalysis: z.string().optional(),
  personalization: z.string().optional(),
  analysisLink: z.string().url().optional().or(z.literal('')),
  linkedinUrl: z.string().optional(),
  twitterUrl: z.string().optional(),
  instagramUrl: z.string().optional(),
  facebookUrl: z.string().optional(),
  youtubeUrl: z.string().optional(),
  tiktokUrl: z.string().optional(),
  pinterestUrl: z.string().optional(),
  optOutToken: z.string().optional(),
})

const EmailFieldsSchema = z.object({
  email1Subject: z.string().min(1),
  email1Body: z.string().min(1),
  email2Body: z.string().min(1),
  email3Subject: z.string().min(1),
  email3Body: z.string().min(1),
  assignedSender: z.string().email(),
})

const WhatsAppFieldsSchema = z.object({
  whatsappMessage1: z.string().min(1),
  whatsappMessage2: z.string().min(1),
  whatsappMessage3: z.string().min(1),
  sender_whatsapp: z.string().min(1),
})

const HybridFieldsSchema = EmailFieldsSchema.merge(
  z.object({
    whatsappMessage1: z.string().min(1),
    whatsappMessage2: z.string().min(1),
    sender_whatsapp: z.string().min(1),
  })
)

// ==================== Helper Functions ====================

/**
 * Extrai mensagem WhatsApp de diferentes formatos (string, objeto, JSON)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseWhatsAppMessage(field: any): string | null {
  if (!field) return null

  // Se já é string, tentar fazer parse como JSON
  if (typeof field === 'string') {
    try {
      const parsed = JSON.parse(field)
      return parsed.mensagem || field
    } catch {
      return field
    }
  }

  // Se é objeto, extrair mensagem
  if (typeof field === 'object' && 'mensagem' in field) {
    return field.mensagem
  }

  return null
}

/**
 * Normaliza instâncias Evolution API (suporta string[] ou object[])
 * @deprecated - Função não utilizada, mantida para referência futura
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function normalizeEvolutionInstances(instancesJson: string): Array<{ url: string }> {
  try {
    const parsed = JSON.parse(instancesJson || '[]')

    if (!Array.isArray(parsed)) {
      console.error('[Evolution Instances] Não é um array:', parsed)
      return []
    }

     
    return parsed
      .map((instance: string | { url?: string }) => {
        if (typeof instance === 'string') {
          return { url: instance }
        } else if (typeof instance === 'object' && instance.url) {
          return { url: instance.url }
        }
        return null
      })
      .filter((i): i is { url: string } => i !== null)
  } catch (error) {
    console.error('[Evolution Instances] Erro ao parsear:', error)
    return []
  }
}

/**
 * Busca lead por ID, apifyId ou nome
 */
async function findLead(
  leadId?: string,
  apifyId?: string,
  companyName?: string
) {
  const whereClause = leadId
    ? { id: leadId }
    : apifyId
    ? { apifyLeadId: apifyId }
    : companyName
    ? { nomeEmpresa: companyName, status: LeadStatus.EXTRACTED }
    : null

  if (!whereClause) {
    throw new Error('leadId, apifyId ou companyName são obrigatórios')
  }

  const lead = await prisma.lead.findFirst({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
  })

  return lead
}

/**
 * Determina tipo de cadência baseado em canais disponíveis e configuração
 */
async function determineCadenceType(
  hasEmail: boolean,
  hasPhone: boolean,
  cadenceType: 'email' | 'whatsapp' | 'hybrid'
): Promise<CadenceType> {
  // Se foi especificado explicitamente pelo N8N, usar
  if (cadenceType === 'email') return CadenceType.EMAIL_ONLY
  if (cadenceType === 'whatsapp') return CadenceType.WHATSAPP_ONLY
  if (cadenceType === 'hybrid') return CadenceType.HYBRID

  // Fallback automático baseado em dados disponíveis
  if (hasEmail && hasPhone) {
    const userSettings = await prisma.userSettings.findFirst()
    return userSettings?.useHybridCadence ? CadenceType.HYBRID : CadenceType.EMAIL_ONLY
  } else if (hasEmail) {
    return CadenceType.EMAIL_ONLY
  } else if (hasPhone) {
    return CadenceType.WHATSAPP_ONLY
  }

  return CadenceType.EMAIL_ONLY // Default
}

// ==================== Main Handler ====================

/**
 * Handler Universal de Enriquecimento
 * Suporta email-only, whatsapp-only e hybrid
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handleLeadEnrichment(cadenceType: 'email' | 'whatsapp' | 'hybrid', data: any) {
  console.log(`[Lead Enrichment - ${cadenceType}] Iniciando processamento`)
  console.log(`[Lead Enrichment] Payload:`, JSON.stringify(data, null, 2))

  // 1. Validar campos base
  const baseData = BaseLeadEnrichmentSchema.parse(data)

  // 2. Validar campos específicos por tipo
  let emailFields: z.infer<typeof EmailFieldsSchema> | null = null
  let whatsappFields: z.infer<typeof WhatsAppFieldsSchema> | null = null

  if (cadenceType === 'email') {
    emailFields = EmailFieldsSchema.parse({
      email1Subject: data.email1Subject,
      email1Body: data.email1Body,
      email2Body: data.email2Body,
      email3Subject: data.email3Subject,
      email3Body: data.email3Body,
      assignedSender: data.assignedSender,
    })
  } else if (cadenceType === 'whatsapp') {
    const whatsapp1Message = parseWhatsAppMessage(data.whatsapp1)
    const whatsapp2Message = parseWhatsAppMessage(data.whatsapp2)
    const whatsapp3Message = parseWhatsAppMessage(data.whatsapp3)

    whatsappFields = WhatsAppFieldsSchema.parse({
      whatsappMessage1: whatsapp1Message,
      whatsappMessage2: whatsapp2Message,
      whatsappMessage3: whatsapp3Message,
      sender_whatsapp: data.sender_whatsapp,
    })
  } else if (cadenceType === 'hybrid') {
    const whatsapp1Message = parseWhatsAppMessage(data.whatsapp1)
    const whatsapp2Message = parseWhatsAppMessage(data.whatsapp2)

    const hybridFields = HybridFieldsSchema.parse({
      email1Subject: data.email1Subject,
      email1Body: data.email1Body,
      email2Body: data.email2Body,
      email3Subject: data.email3Subject,
      email3Body: data.email3Body,
      assignedSender: data.assignedSender,
      whatsappMessage1: whatsapp1Message,
      whatsappMessage2: whatsapp2Message,
      sender_whatsapp: data.sender_whatsapp,
    })

    emailFields = {
      email1Subject: hybridFields.email1Subject,
      email1Body: hybridFields.email1Body,
      email2Body: hybridFields.email2Body,
      email3Subject: hybridFields.email3Subject,
      email3Body: hybridFields.email3Body,
      assignedSender: hybridFields.assignedSender,
    }

    whatsappFields = {
      whatsappMessage1: hybridFields.whatsappMessage1,
      whatsappMessage2: hybridFields.whatsappMessage2,
      whatsappMessage3: parseWhatsAppMessage(data.whatsapp3) || '', // Híbrido pode ter 3ª mensagem opcional
      sender_whatsapp: hybridFields.sender_whatsapp,
    }
  }

  // 3. Buscar lead
  const lead = await findLead(baseData.leadId, baseData.apifyId, baseData.companyName)
  if (!lead) {
    throw new Error('Lead não encontrado')
  }

  console.log(`[Lead Enrichment] Lead encontrado: ${lead.id}`)

  // 4. Determinar cadenceType final
  const hasEmail = !!(baseData.email || lead.email)
  const hasPhone = !!(baseData.telefone || lead.telefone)
  const finalCadenceType = await determineCadenceType(hasEmail, hasPhone, cadenceType)

  console.log(`[Lead Enrichment] CadenceType determinado: ${finalCadenceType}`)

  // 5. Normalizar campos
  const normalizedData = {
    email: normalizeToNull(baseData.email),
    telefone: normalizeToNull(baseData.telefone),
    linkedinUrl: normalizeToNull(baseData.linkedinUrl),
    twitterUrl: normalizeToNull(baseData.twitterUrl),
    instagramUrl: normalizeToNull(baseData.instagramUrl),
    facebookUrl: normalizeToNull(baseData.facebookUrl),
    youtubeUrl: normalizeToNull(baseData.youtubeUrl),
    tiktokUrl: normalizeToNull(baseData.tiktokUrl),
    pinterestUrl: normalizeToNull(baseData.pinterestUrl),
  }

  // 6. Atualizar lead
  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      ...(normalizedData.email && { email: normalizedData.email }),
      ...(normalizedData.telefone && { telefone: normalizedData.telefone }),
      companyResearch: baseData.companyResearch || null,
      strategicAnalysis: baseData.strategicAnalysis || null,
      personalization: baseData.personalization || null,
      analysisLink: baseData.analysisLink || null,
      ...(normalizedData.linkedinUrl && { linkedinUrl: normalizedData.linkedinUrl }),
      ...(normalizedData.twitterUrl && { twitterUrl: normalizedData.twitterUrl }),
      ...(normalizedData.instagramUrl && { instagramUrl: normalizedData.instagramUrl }),
      ...(normalizedData.facebookUrl && { facebookUrl: normalizedData.facebookUrl }),
      ...(normalizedData.youtubeUrl && { youtubeUrl: normalizedData.youtubeUrl }),
      ...(normalizedData.tiktokUrl && { tiktokUrl: normalizedData.tiktokUrl }),
      ...(normalizedData.pinterestUrl && { pinterestUrl: normalizedData.pinterestUrl }),
      assignedSender: emailFields?.assignedSender || whatsappFields?.sender_whatsapp || null,
      optOutToken: baseData.optOutToken,
      cadenceType: finalCadenceType,
      status: LeadStatus.ENRICHED,
      enrichedAt: new Date(),
    },
  })

  // 7. Criar registros de Email (se aplicável)
  if (emailFields && (finalCadenceType === CadenceType.EMAIL_ONLY || finalCadenceType === CadenceType.HYBRID)) {
    await prisma.email.createMany({
      data: [
        {
          leadId: lead.id,
          sequenceNumber: 1,
          subject: emailFields.email1Subject,
          body: emailFields.email1Body,
          senderAccount: emailFields.assignedSender,
          status: EmailStatus.PENDING,
        },
        {
          leadId: lead.id,
          sequenceNumber: 2,
          subject: `Re: ${emailFields.email1Subject}`,
          body: emailFields.email2Body,
          senderAccount: emailFields.assignedSender,
          status: EmailStatus.PENDING,
        },
        {
          leadId: lead.id,
          sequenceNumber: 3,
          subject: emailFields.email3Subject,
          body: emailFields.email3Body,
          senderAccount: emailFields.assignedSender,
          status: EmailStatus.PENDING,
        },
      ],
    })
    console.log(`[Lead Enrichment] 3 emails criados`)
  }

  // 8. Criar registros de WhatsApp (se aplicável)
  if (whatsappFields && (finalCadenceType === CadenceType.WHATSAPP_ONLY || finalCadenceType === CadenceType.HYBRID)) {
    const phoneNumber = baseData.telefone || lead.telefone
    if (!phoneNumber) {
      console.warn(`[Lead Enrichment] Lead sem telefone, pulando criação de WhatsApp`)
    } else {
      const messagesToCreate = [
        {
          leadId: lead.id,
          sequenceNumber: 1,
          phoneNumber,
          message: whatsappFields.whatsappMessage1,
          senderInstance: whatsappFields.sender_whatsapp,
          status: WhatsAppStatus.PENDING,
        },
        {
          leadId: lead.id,
          sequenceNumber: 2,
          phoneNumber,
          message: whatsappFields.whatsappMessage2,
          senderInstance: whatsappFields.sender_whatsapp,
          status: WhatsAppStatus.PENDING,
        },
      ]

      // Adicionar 3ª mensagem se existir (WhatsApp-only sempre tem 3, híbrido pode ter 2)
      if (whatsappFields.whatsappMessage3 && whatsappFields.whatsappMessage3.trim()) {
        messagesToCreate.push({
          leadId: lead.id,
          sequenceNumber: 3,
          phoneNumber,
          message: whatsappFields.whatsappMessage3,
          senderInstance: whatsappFields.sender_whatsapp,
          status: WhatsAppStatus.PENDING,
        })
      }

      await prisma.whatsAppMessage.createMany({ data: messagesToCreate })
      console.log(`[Lead Enrichment] ${messagesToCreate.length} mensagens WhatsApp criadas`)
    }
  }

  console.log(`[Lead Enrichment] Lead ${lead.id} enriquecido com sucesso`)
}
