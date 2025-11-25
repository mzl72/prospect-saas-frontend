/**
 * Handler de Enriquecimento de Leads
 * Recebe dados enriquecidos pelo N8N e salva no banco
 */

import { prisma } from '@/lib/prisma-db'
import { LeadStatus } from '@prisma/client'
import { normalizeToNull } from '@/lib/sanitization'
import { LeadEnrichmentSchema } from '@/lib/validation-schemas'

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

  // SECURITY (OWASP A05:2025 - Injection): Validar com Zod antes de processar
  const validation = LeadEnrichmentSchema.safeParse(data);
  if (!validation.success) {
    console.error(`[Lead Enrichment] Validation failed:`, validation.error.flatten());
    throw new Error(`Dados inválidos: ${validation.error.issues.map(i => i.message).join(', ')}`);
  }

  const validatedData = validation.data;
  console.log(`[Lead Enrichment] Dados validados:`, {
    leadId: validatedData.leadId,
    apifyId: validatedData.apifyId,
    companyName: validatedData.companyName
  })

  // 1. Buscar lead com campanha para validação de ownership (usa dados validados)
  const lead = await findLead(validatedData.leadId, validatedData.apifyId, validatedData.companyName)
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

  // 3. Zod JÁ validou tamanhos (max 50KB), não precisa truncar novamente
  // Se chegou aqui, os dados estão dentro dos limites

  // 4. Normalizar campos opcionais (usa dados validados)
  const normalizedData = {
    email: normalizeToNull(validatedData.email),
    telefone: normalizeToNull(validatedData.telefone),
    linkedinUrl: normalizeToNull(validatedData.linkedinUrl),
    twitterUrl: normalizeToNull(validatedData.twitterUrl),
    instagramUrl: normalizeToNull(validatedData.instagramUrl),
    facebookUrl: normalizeToNull(validatedData.facebookUrl),
    youtubeUrl: normalizeToNull(validatedData.youtubeUrl),
    tiktokUrl: normalizeToNull(validatedData.tiktokUrl),
    pinterestUrl: normalizeToNull(validatedData.pinterestUrl),
  }

  // 5. Atualizar lead com dados enriquecidos (usa dados validados)
  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      // Atualizar campos básicos se enviados
      ...(normalizedData.email && { email: normalizedData.email }),
      ...(normalizedData.telefone && { telefone: normalizedData.telefone }),

      // Dados enriquecidos pela IA (Zod já validou tamanhos)
      companyResearch: validatedData.companyResearch || null,
      strategicAnalysis: validatedData.strategicAnalysis || null,
      personalization: validatedData.personalization || null,
      analysisLink: validatedData.analysisLink || null,

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

  // Log dos dados salvos (usa dados validados)
  if (validatedData.companyResearch) {
    console.log(`[Lead Enrichment] ✅ Company Research salvo (${validatedData.companyResearch.length} chars)`)
  }
  if (validatedData.strategicAnalysis) {
    console.log(`[Lead Enrichment] ✅ Strategic Analysis salvo (${validatedData.strategicAnalysis.length} chars)`)
  }
  if (validatedData.personalization) {
    console.log(`[Lead Enrichment] ✅ Personalization salvo (${validatedData.personalization.length} chars)`)
  }
}
