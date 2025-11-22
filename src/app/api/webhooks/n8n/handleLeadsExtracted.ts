// Helper function para o webhook N8N - HandleLeadsExtracted com lógica completa de reembolso
import { prisma } from '@/lib/prisma-db'
import { LeadStatus } from '@prisma/client'
import { calculateRefund } from '@/lib/pricing-service'
import { normalizeToNull } from '@/lib/sanitization'

// Simple email validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Alias para compatibilidade com código existente
const normalizeValue = normalizeToNull

// Validação de dados do lead
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const validateLeadData = (lead: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = []

  // Verificar se tem algum identificador (qualquer um serve)
  const hasId = !!(lead.apifyId || lead.placeId || lead.title || lead.nomeEmpresa || lead.nome_empresa)

  if (!hasId) {
    errors.push('Lead precisa ter pelo menos um identificador (apifyId, placeId, title, nomeEmpresa ou nome_empresa)')
  }

  // Email e URLs inválidos não devem bloquear o lead
  // Eles serão normalizados ou o lead poderá ser usado para WhatsApp

  return {
    valid: errors.length === 0,
    errors
  }
}

export async function handleLeadsExtracted(data: {
  campaignId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  leads: any
}) {
  const { campaignId, leads } = data

  console.log(`[Leads Extracted] Recebido:`, { campaignId, leadsType: typeof leads })

  // Normalizar formato dos leads
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  } else if (typeof leads === 'object' && leads !== null) {
    // N8N pode enviar como objeto com propriedade 'leads' ou 'data'
    console.log('[Leads Extracted] Leads veio como objeto, tentando extrair array...')
    console.log('[Leads Extracted] Keys do objeto:', Object.keys(leads))

    if (Array.isArray(leads.leads)) {
      leadsArray = leads.leads
    } else if (Array.isArray(leads.data)) {
      leadsArray = leads.data
    } else if (Array.isArray(leads.items)) {
      leadsArray = leads.items
    } else {
      // Tentar converter valores do objeto em array
      const values = Object.values(leads)
      if (values.length > 0 && typeof values[0] === 'object') {
        leadsArray = values
      } else {
        console.error('[Leads Extracted] Não foi possível extrair array de leads do objeto:', leads)
        throw new Error('Formato inválido de leads - esperado array')
      }
    }
  }

  console.log(`[Leads Extracted] Campaign ${campaignId}: ${leadsArray.length} leads recebidos da API`)

  if (leadsArray.length > 0) {
    console.log(`[Leads Extracted] Exemplo de lead (primeiro):`, JSON.stringify(leadsArray[0], null, 2))
  }

  // Buscar campanha para obter informações de custo e quantidade solicitada
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      userId: true,
      tipo: true,
      leadsRequested: true,
      creditsCost: true,
      creditsRefunded: true,
    },
  })

  if (!campaign) {
    console.error(`[Leads Extracted] Campanha ${campaignId} não encontrada`)
    throw new Error(`Campanha ${campaignId} não encontrada`)
  }

  // Verificar quais leads já existem no banco (evitar duplicatas)
  // Criar IDs únicos de forma consistente (sem usar Date.now() que pode duplicar)
  const leadsWithIds = leadsArray.map((lead, index) => ({
    ...lead,
    _uniqueId: lead.apifyId || lead.placeId || `${lead.title || 'unknown'}-${index}`
  }))

  const apifyIds = leadsWithIds.map(lead => lead._uniqueId)
  const existingLeads = await prisma.lead.findMany({
    where: {
      apifyLeadId: { in: apifyIds }
    },
    select: { apifyLeadId: true }
  })

  const existingApifyIds = new Set(existingLeads.map(l => l.apifyLeadId))

  const duplicatesCount = existingLeads.length
  const newLeadsCount = leadsWithIds.length - duplicatesCount
  const leadsRequested = campaign.leadsRequested ?? 0
  const insufficientCount = Math.max(0, leadsRequested - leadsWithIds.length) // leads que API não conseguiu encontrar

  console.log(`[Leads Extracted] Estatísticas:`)
  console.log(`  - Solicitado: ${leadsRequested}`)
  console.log(`  - Recebido da API: ${leadsWithIds.length}`)
  console.log(`  - Duplicados: ${duplicatesCount}`)
  console.log(`  - Novos: ${newLeadsCount}`)
  console.log(`  - API não encontrou: ${insufficientCount}`)

  // Calcular créditos a reembolsar usando pricing-service centralizado
  const creditsToRefund = calculateRefund(
    leadsRequested,
    leadsWithIds.length,
    duplicatesCount,
    campaign.tipo
  )

  console.log(`[Leads Extracted] Créditos a reembolsar: ${creditsToRefund}`)

  // Filtrar apenas leads NOVOS que não existem no banco
  const newLeadsArray = leadsWithIds.filter(lead => {
    return !existingApifyIds.has(lead._uniqueId)
  })

  // CASO ESPECIAL: ZERO leads novos (todos duplicados OU API não encontrou nenhum)
  if (newLeadsArray.length === 0) {
    console.log(`[Leads Extracted] ⚠️ ZERO leads novos para criar!`)

    // Marcar campanha como FAILED e reembolsar créditos em transação atômica
    await prisma.$transaction(async (tx) => {
      // Marcar campanha como FAILED
      await tx.campaign.update({
        where: { id: campaignId },
        data: {
          status: 'FAILED',
          leadsCreated: 0,
          leadsDuplicated: duplicatesCount,
          creditsRefunded: campaign.creditsCost || 0,
        },
      })

      // Devolver 100% dos créditos
      await tx.user.update({
        where: { id: campaign.userId },
        data: {
          credits: {
            increment: campaign.creditsCost || 0,
          },
        },
      })
    })

    console.log(`[Leads Extracted] ✅ Campanha marcada como FAILED e ${campaign.creditsCost} créditos devolvidos`)

    if (duplicatesCount > 0 && insufficientCount === 0) {
      console.log(`[Leads Extracted] Motivo: Todos os ${duplicatesCount} leads já existiam no banco (duplicados)`)
    } else if (duplicatesCount === 0 && insufficientCount > 0) {
      console.log(`[Leads Extracted] Motivo: API não encontrou nenhum lead para os critérios especificados`)
    } else {
      console.log(`[Leads Extracted] Motivo: ${duplicatesCount} duplicados + ${insufficientCount} não encontrados pela API`)
    }

    return
  }

  // Validar e preparar dados dos leads NOVOS
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const validLeadsData: any[] = []
  let invalidLeadsCount = 0

  for (const lead of newLeadsArray) {
    // Validar dados do lead
    const validation = validateLeadData(lead)
    if (!validation.valid) {
      console.warn(`[Leads Extracted] Lead inválido ignorado:`, {
        lead: lead.title || lead._uniqueId,
        errors: validation.errors
      })
      invalidLeadsCount++
      continue
    }

    const leadData = {
      apifyId: lead._uniqueId, // Usar o ID único que já geramos antes
      title: lead.title || lead.nomeEmpresa || lead.nome_empresa,
      address: normalizeValue(lead.address || lead.endereco || lead.endereco_completo),
      website: normalizeValue(lead.website),
      phone: normalizeValue(lead.phoneUnformatted || lead.telefone_desformatado || lead.phone || lead.telefone),
      category: normalizeValue(lead.categoryName || lead.category || lead.categoria),
      totalScore: normalizeValue(lead.totalScore || lead.nota_media),
      reviewsCount: normalizeValue(lead.reviewsCount || lead.total_reviews),
      url: normalizeValue(lead.url || lead.linkGoogleMaps || lead.link_google_maps),
      email: (() => {
        const rawEmail = Array.isArray(lead.emails) && lead.emails.length > 0
          ? normalizeValue(lead.emails[0])
          : normalizeValue(lead.email);
        return rawEmail && isValidEmail(rawEmail) ? rawEmail : null;
      })(),
      linkedinUrl: Array.isArray(lead.linkedIns) && lead.linkedIns.length > 0
        ? normalizeValue(lead.linkedIns[0])
        : normalizeValue(lead.linkedinUrl || lead.linkedin_url),
      twitterUrl: Array.isArray(lead.twitters) && lead.twitters.length > 0
        ? normalizeValue(lead.twitters[0])
        : normalizeValue(lead.twitterUrl || lead.twitter_url),
      instagramUrl: Array.isArray(lead.instagrams) && lead.instagrams.length > 0
        ? normalizeValue(lead.instagrams[0])
        : normalizeValue(lead.instagramUrl || lead.instagram_url),
      facebookUrl: Array.isArray(lead.facebooks) && lead.facebooks.length > 0
        ? normalizeValue(lead.facebooks[0])
        : normalizeValue(lead.facebookUrl || lead.facebook_url),
      youtubeUrl: Array.isArray(lead.youtubes) && lead.youtubes.length > 0
        ? normalizeValue(lead.youtubes[0])
        : normalizeValue(lead.youtubeUrl || lead.youtube_url),
      tiktokUrl: Array.isArray(lead.tiktoks) && lead.tiktoks.length > 0
        ? normalizeValue(lead.tiktoks[0])
        : normalizeValue(lead.tiktokUrl || lead.tiktok_url),
      pinterestUrl: Array.isArray(lead.pinterests) && lead.pinterests.length > 0
        ? normalizeValue(lead.pinterests[0])
        : normalizeValue(lead.pinterestUrl || lead.pinterest_url),
    }

    console.log(`[Leads Extracted] Lead "${leadData.title}" - Dados mapeados:`, {
      hasEmail: !!leadData.email,
      hasAddress: !!leadData.address,
      hasPhone: !!leadData.phone,
      hasSocial: !!(leadData.linkedinUrl || leadData.instagramUrl || leadData.facebookUrl),
    })

    validLeadsData.push(leadData)
  }

  if (invalidLeadsCount > 0) {
    console.warn(`[Leads Extracted] ${invalidLeadsCount} leads foram ignorados por dados inválidos`)
  }

  // Criar leads em lote (mais eficiente e evita race conditions)
  const createdLeads = await prisma.lead.createMany({
    data: validLeadsData.map(leadData => ({
      campaignId,
      apifyLeadId: leadData.apifyId,
      nomeEmpresa: leadData.title,
      email: leadData.email,
      endereco: leadData.address,
      website: leadData.website,
      telefone: leadData.phone,
      categoria: leadData.category,
      totalReviews: leadData.reviewsCount ? String(leadData.reviewsCount) : null,
      notaMedia: leadData.totalScore ? String(leadData.totalScore) : null,
      linkGoogleMaps: leadData.url,
      linkedinUrl: leadData.linkedinUrl,
      twitterUrl: leadData.twitterUrl,
      instagramUrl: leadData.instagramUrl,
      facebookUrl: leadData.facebookUrl,
      youtubeUrl: leadData.youtubeUrl,
      tiktokUrl: leadData.tiktokUrl,
      pinterestUrl: leadData.pinterestUrl,
      status: LeadStatus.EXTRACTED,
      extractedAt: new Date(),
    })),
    skipDuplicates: true, // Ignora duplicatas em vez de falhar
  })

  const validCreatedLeads = createdLeads.count

  // Determinar novo status da campanha
  const newCampaignStatus = campaign.tipo === 'BASICO' ? 'EXTRACTION_COMPLETED' : 'PROCESSING'

  // Atualizar campanha com estatísticas + reembolsar créditos em transação atômica
  // Isso previne race conditions se múltiplos webhooks chegarem simultaneamente
  await prisma.$transaction(async (tx) => {
    // Atualizar campanha
    await tx.campaign.update({
      where: { id: campaignId },
      data: {
        status: newCampaignStatus,
        leadsCreated: newLeadsCount,
        leadsDuplicated: duplicatesCount,
        creditsRefunded: creditsToRefund,
      },
    })

    // Reembolsar créditos se houver duplicatas ou leads insuficientes
    if (creditsToRefund > 0) {
      await tx.user.update({
        where: { id: campaign.userId },
        data: {
          credits: {
            increment: creditsToRefund,
          },
        },
      })
    }
  })

  console.log(`[Leads Extracted] ✅ ${validCreatedLeads} leads criados (${invalidLeadsCount} ignorados)`)
  console.log(`[Leads Extracted] ✅ Campanha atualizada para status: ${newCampaignStatus}`)

  if (creditsToRefund > 0) {
    console.log(`[Leads Extracted] 💰 ${creditsToRefund} créditos reembolsados ao usuário`)
    console.log(`[Leads Extracted]    Motivo: ${duplicatesCount} duplicados + ${insufficientCount} não encontrados pela API`)
  }
}
