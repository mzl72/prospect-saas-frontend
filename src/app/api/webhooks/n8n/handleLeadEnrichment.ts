/**
 * Handler de Enriquecimento de Leads
 * Recebe dados enriquecidos pelo N8N e salva no banco
 */

import { prisma } from '@/lib/prisma-db'
import { LeadStatus } from '@prisma/client'
import { normalizeToNull } from '@/lib/sanitization'

/**
 * Busca lead por ID ou apifyId
 */
async function findLead(leadId?: string, apifyId?: string, companyName?: string) {
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
 * Handler de Enriquecimento
 * Aceita dados de qualquer tipo de cadência (email, whatsapp, hybrid)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handleLeadEnrichment(cadenceType: 'email' | 'whatsapp' | 'hybrid', data: any) {
  console.log(`[Lead Enrichment - ${cadenceType}] Iniciando processamento`)
  console.log(`[Lead Enrichment] Dados recebidos:`, {
    leadId: data.leadId,
    apifyId: data.apifyId,
    companyName: data.companyName
  })

  // 1. Buscar lead
  const lead = await findLead(data.leadId, data.apifyId, data.companyName)
  if (!lead) {
    throw new Error('Lead não encontrado')
  }

  console.log(`[Lead Enrichment] Lead encontrado: ${lead.id}`)

  // 2. Normalizar campos opcionais
  const normalizedData = {
    email: normalizeToNull(data.email),
    telefone: normalizeToNull(data.telefone),
    linkedinUrl: normalizeToNull(data.linkedinUrl),
    twitterUrl: normalizeToNull(data.twitterUrl),
    instagramUrl: normalizeToNull(data.instagramUrl),
    facebookUrl: normalizeToNull(data.facebookUrl),
    youtubeUrl: normalizeToNull(data.youtubeUrl),
    tiktokUrl: normalizeToNull(data.tiktokUrl),
    pinterestUrl: normalizeToNull(data.pinterestUrl),
  }

  // 3. Atualizar lead com dados enriquecidos
  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      // Atualizar campos básicos se enviados
      ...(normalizedData.email && { email: normalizedData.email }),
      ...(normalizedData.telefone && { telefone: normalizedData.telefone }),

      // Dados enriquecidos pela IA
      companyResearch: data.companyResearch || null,
      strategicAnalysis: data.strategicAnalysis || null,
      personalization: data.personalization || null,
      analysisLink: data.analysisLink || null,

      // Redes sociais
      ...(normalizedData.linkedinUrl && { linkedinUrl: normalizedData.linkedinUrl }),
      ...(normalizedData.twitterUrl && { twitterUrl: normalizedData.twitterUrl }),
      ...(normalizedData.instagramUrl && { instagramUrl: normalizedData.instagramUrl }),
      ...(normalizedData.facebookUrl && { facebookUrl: normalizedData.facebookUrl }),
      ...(normalizedData.youtubeUrl && { youtubeUrl: normalizedData.youtubeUrl }),
      ...(normalizedData.tiktokUrl && { tiktokUrl: normalizedData.tiktokUrl }),
      ...(normalizedData.pinterestUrl && { pinterestUrl: normalizedData.pinterestUrl }),

      // Marcar como enriquecido
      status: LeadStatus.ENRICHED,
      enrichedAt: new Date(),
    },
  })

  console.log(`[Lead Enrichment] Lead ${lead.id} enriquecido com sucesso`)

  // Log dos dados salvos
  if (data.companyResearch) {
    console.log(`[Lead Enrichment] ✅ Company Research salvo (${data.companyResearch.length} chars)`)
  }
  if (data.strategicAnalysis) {
    console.log(`[Lead Enrichment] ✅ Strategic Analysis salvo (${data.strategicAnalysis.length} chars)`)
  }
  if (data.personalization) {
    console.log(`[Lead Enrichment] ✅ Personalization salvo (${data.personalization.length} chars)`)
  }
}
