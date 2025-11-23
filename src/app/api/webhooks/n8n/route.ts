import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-db'
import { LeadStatus } from '@prisma/client'
import { handleLeadsExtracted } from './handleLeadsExtracted'
import { handleLeadEnrichment } from './handleLeadEnrichment'
import { checkUserRateLimit, getUserRateLimitHeaders, validatePayloadSize, constantTimeCompare } from '@/lib/security'

// Helper para obter IP do cliente
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp
  return 'unknown'
}

// Validação de segurança do webhook (usando constant-time compare para prevenir timing attacks)
function validateWebhookSecret(request: NextRequest): boolean {
  const secret = request.headers.get('x-webhook-secret')
  const expectedSecret = process.env.N8N_WEBHOOK_SECRET

  if (!expectedSecret) {
    throw new Error('N8N_WEBHOOK_SECRET must be configured in environment variables')
  }

  if (!secret) {
    return false
  }

  // Usa constant-time compare para prevenir timing attacks
  return constantTimeCompare(secret, expectedSecret)
}

// Função de normalização movida para @/lib/sanitization

// Tipo dos payloads esperados do N8N (MVP: apenas extração e enriquecimento)
type WebhookPayload = {
  event: 'leads-extracted' | 'lead-enriched' | 'lead-enriched-whatsapp' | 'lead-enriched-hybrid' | 'campaign-completed'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
}

export async function POST(request: NextRequest) {
  let payload: WebhookPayload | undefined;

  try {
    // 1. Rate limiting: 100 requisições por minuto (endpoint dedicado para webhooks N8N)
    const clientIp = getClientIp(request)
    const rateLimitResult = checkUserRateLimit({
      userId: `webhook-n8n:${clientIp}`, // userId baseado em IP para webhooks
      endpoint: 'webhooks:n8n',
      maxRequests: 100,
      windowMs: 60 * 1000, // 1 minuto
    })

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        {
          status: 429,
          headers: getUserRateLimitHeaders(rateLimitResult),
        }
      )
    }

    // 2. Validar secret (constant-time compare para prevenir timing attacks)
    if (!validateWebhookSecret(request)) {
      console.error('[N8N Webhook] Unauthorized: Invalid webhook secret from IP:', clientIp)
      return NextResponse.json(
        { error: 'Webhook secret inválido' },
        { status: 401 }
      )
    }

    // 3. Validar payload size (previne JSON bombing) - 5MB max para leads
    const bodyText = await request.text()
    const payloadValidation = validatePayloadSize(bodyText, 5 * 1024 * 1024) // 5MB max

    if (!payloadValidation.valid) {
      console.error('[N8N Webhook] Payload too large:', payloadValidation.error)
      return NextResponse.json(
        { error: payloadValidation.error },
        { status: 413 }
      )
    }

    payload = JSON.parse(bodyText) as WebhookPayload;
    const { event, data } = payload

    // Validar estrutura do payload
    if (!event || typeof event !== 'string') {
      console.error('[N8N Webhook] Payload inválido: event ausente ou inválido')
      return NextResponse.json(
        { error: 'Payload inválido: campo "event" é obrigatório' },
        { status: 400 }
      )
    }

    if (!data || typeof data !== 'object') {
      console.error('[N8N Webhook] Payload inválido: data ausente ou inválido')
      return NextResponse.json(
        { error: 'Payload inválido: campo "data" é obrigatório' },
        { status: 400 }
      )
    }

    console.log(`[N8N Webhook] Recebido evento: ${event}`, {
      dataKeys: Object.keys(data),
      timestamp: new Date().toISOString()
    })

    try {
      switch (event) {
        case 'leads-extracted':
          await handleLeadsExtracted(data)
          break

        case 'lead-enriched':
          await handleLeadEnrichment('email', data)
          break

        case 'lead-enriched-whatsapp':
          await handleLeadEnrichment('whatsapp', data)
          break

        case 'lead-enriched-hybrid':
          await handleLeadEnrichment('hybrid', data)
          break

        case 'campaign-completed':
          await handleCampaignCompleted(data)
          break

        default:
          console.warn(`[N8N Webhook] Evento desconhecido: ${event}`)
          return NextResponse.json(
            { error: 'Evento não reconhecido' },
            { status: 400 }
          )
      }
    } catch (handlerError) {
      const handlerErrorMsg = handlerError instanceof Error ? handlerError.message : 'Unknown error'
      console.error(`[N8N Webhook] Erro no handler "${event}":`, {
        error: handlerErrorMsg,
        stack: handlerError instanceof Error ? handlerError.stack : undefined,
        data: JSON.stringify(data).substring(0, 500)
      })
      throw handlerError // Re-throw para o catch externo logar
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined

    console.error('[N8N Webhook] Erro crítico:', {
      event: payload?.event,
      error: errorMessage,
      stack: errorStack,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json(
      {
        error: 'Erro ao processar webhook',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
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

  // Validação de segurança: campaignId deve ser CUID válido
  if (!/^c[a-z0-9]{24}$/i.test(campaignId)) {
    console.error(`[Campaign Completed] ID de campanha inválido: ${campaignId}`)
    throw new Error('ID de campanha inválido')
  }

  // Buscar campanha com contagem de leads
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      status: true,
      tipo: true,
      leadsCreated: true,
      userId: true, // Para logging
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
