/**
 * Webhook Evolution API: Recebe eventos de status de mensagens WhatsApp
 * Eventos: message.sent, message.delivered, message.read, message.received (reply)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-db'
import { WhatsAppStatus, LeadStatus } from '@prisma/client'
import { checkRateLimit, getClientIp, getRateLimitHeaders } from '@/lib/rate-limit'
import { validatePayloadSize, validateStringLength, constantTimeCompare } from '@/lib/security'
import { DEMO_USER_ID } from '@/lib/demo-user'
import {
  notifyEvolutionQRCode,
  notifyEvolutionConnected,
  notifyEvolutionDisconnected,
  notifyEvolutionStatus,
  notifyMessageSent,
  notifyMessageDelivered,
  notifyMessageReplied,
} from '@/lib/notification-service'

export const dynamic = 'force-dynamic'

// WhatsApp Message Status Constants (Evolution API)
const WHATSAPP_MESSAGE_STATUS = {
  DELIVERED: 3,
  READ: 4,
} as const

interface EvolutionWebhookEvent {
  event: string
  instance: string
  data: {
    key?: {
      remoteJid: string // Número do destinatário
      fromMe: boolean
      id: string // messageId
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    message?: any
    messageTimestamp?: number
    // Para eventos QRCODE_UPDATED
    qrcode?: {
      code: string
      base64: string
    }
    // Para eventos CONNECTION_UPDATE
    state?: 'connecting' | 'open' | 'close'
    statusReason?: number
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    update?: any
  }
}

/**
 * Valida webhook secret da Evolution API (usando constant-time compare)
 */
function validateEvolutionWebhook(request: NextRequest): boolean {
  const apiKey = request.headers.get('apikey')
  const expectedApiKey = process.env.EVOLUTION_API_KEY

  if (!expectedApiKey) {
    throw new Error('EVOLUTION_API_KEY must be configured in environment variables')
  }

  if (!apiKey) {
    return false
  }

  // Usa constant-time compare para prevenir timing attacks
  return constantTimeCompare(apiKey, expectedApiKey)
}

export async function POST(request: NextRequest) {
  try {
    // 1. Rate limiting por IP: 300 requisições por minuto (WhatsApp pode ter muitos eventos)
    const clientIp = getClientIp(request)
    const rateLimitResult = checkRateLimit({
      identifier: `evolution-webhook:${clientIp}`,
      maxRequests: 300,
      windowMs: 60000, // 1 minuto
    })

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      )
    }

    // 2. Validar webhook secret (constant-time compare)
    if (!validateEvolutionWebhook(request)) {
      console.error('[Evolution Webhook] Unauthorized access attempt from IP:', clientIp)
      return NextResponse.json(
        { error: 'Unauthorized - Invalid API key' },
        { status: 401 }
      )
    }

    // 3. Validar payload size (previne JSON bombing) - 2MB max
    const bodyText = await request.text()
    const payloadValidation = validatePayloadSize(bodyText, 2 * 1024 * 1024) // 2MB max

    if (!payloadValidation.valid) {
      console.error('[Evolution Webhook] Payload too large:', payloadValidation.error)
      return NextResponse.json(
        { error: payloadValidation.error },
        { status: 413 }
      )
    }

    const body: EvolutionWebhookEvent = JSON.parse(bodyText)

    // 4. Validar estrutura do payload
    if (!body.event || typeof body.event !== 'string') {
      console.error('[Evolution Webhook] Invalid payload: missing event')
      return NextResponse.json(
        { error: 'Invalid payload: event is required' },
        { status: 400 }
      )
    }

    console.log('[Evolution Webhook] Received event:', {
      event: body.event,
      instance: body.instance,
      hasKey: !!body.data?.key,
      state: body.data?.state,
    })

    const instanceName = body.instance

    // Processar evento baseado no tipo
    switch (body.event) {
      // ========================================
      // QRCODE_UPDATED: Novo QR Code gerado
      // ========================================
      case 'qrcode.updated':
      case 'QRCODE_UPDATED': {
        if (body.data?.qrcode?.code) {
          console.log('[Evolution Webhook] 📱 QR Code atualizado para:', instanceName)
          notifyEvolutionQRCode(DEMO_USER_ID, instanceName, body.data.qrcode.code)
        }
        return NextResponse.json({ received: true })
      }

      // ========================================
      // CONNECTION_UPDATE: Status de conexão alterado
      // ========================================
      case 'connection.update':
      case 'CONNECTION_UPDATE': {
        const state = body.data?.state
        if (state) {
          console.log('[Evolution Webhook] 🔌 Conexão atualizada:', { instanceName, state })
          notifyEvolutionStatus(DEMO_USER_ID, instanceName, state)

          if (state === 'open') {
            // Conexão estabelecida com sucesso
            notifyEvolutionConnected(DEMO_USER_ID, instanceName)
          } else if (state === 'close') {
            // Desconectado
            notifyEvolutionDisconnected(DEMO_USER_ID, instanceName, 'connection closed')
          }
        }
        return NextResponse.json({ received: true })
      }
    }

    // ========================================
    // EVENTOS DE MENSAGENS (requer messageId)
    // ========================================

    if (!body.data || !body.data.key) {
      console.log('[Evolution Webhook] No key in data, skipping message processing')
      return NextResponse.json({ received: true })
    }

    const messageId = body.data?.key?.id
    const fromMe = body.data?.key?.fromMe

    if (!messageId) {
      console.log('[Evolution Webhook] No messageId in event')
      return NextResponse.json({ received: true })
    }

    // 5. Validar tamanho do messageId (previne DoS)
    const messageIdValidation = validateStringLength(messageId, 'messageId', 200)
    if (!messageIdValidation.valid) {
      console.error('[Evolution Webhook] messageId too long:', messageIdValidation.error)
      return NextResponse.json(
        { error: messageIdValidation.error },
        { status: 400 }
      )
    }

    // Buscar mensagem no banco de dados
    const whatsappMessage = await prisma.whatsAppMessage.findUnique({
      where: { messageId },
      include: { lead: true },
    })

    if (!whatsappMessage) {
      console.log('[Evolution Webhook] Message not found in database:', messageId)
      return NextResponse.json({ received: true })
    }

    // Processar evento de mensagem baseado no tipo
    switch (body.event) {
      case 'messages.upsert': // Mensagem enviada
        if (fromMe && whatsappMessage.status === WhatsAppStatus.PENDING) {
          await prisma.whatsAppMessage.update({
            where: { id: whatsappMessage.id },
            data: {
              status: WhatsAppStatus.SENT,
              sentAt: new Date(),
            },
          })
          console.log('[Evolution Webhook] ✅ Message marked as SENT:', messageId)

          // Notificar via Socket.io
          notifyMessageSent(
            DEMO_USER_ID,
            'whatsapp',
            whatsappMessage.leadId,
            whatsappMessage.lead.campaignId
          )
        }
        break

      case 'messages.update': { // Status atualizado (entregue, lido, etc)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData = body.data as any

        // Entregue (delivered)
        if (updateData.update?.status === WHATSAPP_MESSAGE_STATUS.DELIVERED) {
          await prisma.whatsAppMessage.update({
            where: { id: whatsappMessage.id },
            data: {
              status: WhatsAppStatus.DELIVERED,
              deliveredAt: new Date(),
            },
          })
          console.log('[Evolution Webhook] 📨 Message DELIVERED:', messageId)

          // Notificar via Socket.io
          notifyMessageDelivered(DEMO_USER_ID, 'whatsapp', whatsappMessage.leadId)
        }

        // Lido (read)
        if (updateData.update?.status === WHATSAPP_MESSAGE_STATUS.READ) {
          await prisma.whatsAppMessage.update({
            where: { id: whatsappMessage.id },
            data: {
              status: WhatsAppStatus.READ,
              readAt: new Date(),
            },
          })
          console.log('[Evolution Webhook] 👀 Message READ:', messageId)
        }
        break
      }

      case 'messages.receive': // Resposta recebida
        // Se a mensagem foi enviada por nós E recebemos uma resposta
        if (fromMe === false) {
          await prisma.whatsAppMessage.update({
            where: { id: whatsappMessage.id },
            data: {
              status: WhatsAppStatus.REPLIED,
              repliedAt: new Date(),
            },
          })

          // Atualizar lead como REPLIED (para parar a sequência)
          await prisma.lead.update({
            where: { id: whatsappMessage.leadId },
            data: {
              status: LeadStatus.REPLIED,
              repliedAt: new Date(),
            },
          })

          console.log('[Evolution Webhook] 💬 Lead REPLIED via WhatsApp:', messageId)

          // Notificar via Socket.io
          notifyMessageReplied(DEMO_USER_ID, 'whatsapp', whatsappMessage.leadId)
        }
        break

      default:
        console.log('[Evolution Webhook] Unhandled event:', body.event)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Evolution Webhook] Error processing webhook:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
