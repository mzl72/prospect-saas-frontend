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

  // 1. Buscar lead com campanha para validação de ownership
  const lead = await findLead(data.leadId, data.apifyId, data.companyName)
  if (!lead) {
    throw new Error('Lead não encontrado')
  }

  console.log(`[Lead Enrichment] Lead encontrado: ${lead.id}`)

  // 2. Validar que o lead pertence a uma campanha válida
  const campaign = await prisma.campaign.findUnique({
    where: { id: lead.campaignId },
    select: { id: true, userId: true, status: true },
  })

  if (!campaign) {
    throw new Error('Campanha do lead não encontrada')
  }

  // Validação de segurança: apenas processar se campanha está em processamento
  if (campaign.status !== 'PROCESSING' && campaign.status !== 'EXTRACTION_COMPLETED') {
    console.error(`[Lead Enrichment] Campanha ${campaign.id} não está em status válido (${campaign.status})`)
    throw new Error('Campanha não está em status válido para enriquecimento')
  }

  // 3. Validar length limits (OWASP A06:2025 - previne DoS via payloads gigantes)
  const MAX_TEXT_LENGTH = 50000; // 50KB por campo de IA
  const MAX_URL_LENGTH = 2048;

  if (data.companyResearch && data.companyResearch.length > MAX_TEXT_LENGTH) {
    console.warn(`[Lead Enrichment] companyResearch truncado de ${data.companyResearch.length} para ${MAX_TEXT_LENGTH} chars`);
    data.companyResearch = data.companyResearch.substring(0, MAX_TEXT_LENGTH);
  }

  if (data.strategicAnalysis && data.strategicAnalysis.length > MAX_TEXT_LENGTH) {
    console.warn(`[Lead Enrichment] strategicAnalysis truncado de ${data.strategicAnalysis.length} para ${MAX_TEXT_LENGTH} chars`);
    data.strategicAnalysis = data.strategicAnalysis.substring(0, MAX_TEXT_LENGTH);
  }

  if (data.personalization && data.personalization.length > MAX_TEXT_LENGTH) {
    console.warn(`[Lead Enrichment] personalization truncado de ${data.personalization.length} para ${MAX_TEXT_LENGTH} chars`);
    data.personalization = data.personalization.substring(0, MAX_TEXT_LENGTH);
  }

  if (data.analysisLink && data.analysisLink.length > MAX_URL_LENGTH) {
    console.warn(`[Lead Enrichment] analysisLink truncado`);
    data.analysisLink = data.analysisLink.substring(0, MAX_URL_LENGTH);
  }

  // 4. Normalizar campos opcionais
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

  // 5. Atualizar lead com dados enriquecidos
  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      // Atualizar campos básicos se enviados
      ...(normalizedData.email && { email: normalizedData.email }),
      ...(normalizedData.telefone && { telefone: normalizedData.telefone }),

      // Dados enriquecidos pela IA (com length limits aplicados)
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
