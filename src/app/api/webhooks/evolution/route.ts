/**
 * Webhook Evolution API: Recebe eventos de status de mensagens WhatsApp
 * Eventos: message.sent, message.delivered, message.read, message.received (reply)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-db'
import { WhatsAppStatus, LeadStatus } from '@prisma/client'

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
    key: {
      remoteJid: string // Número do destinatário
      fromMe: boolean
      id: string // messageId
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    message?: any
    messageTimestamp?: number
  }
}

/**
 * Valida webhook secret da Evolution API
 */
function validateEvolutionWebhook(request: NextRequest): boolean {
  const apiKey = request.headers.get('apikey')
  const expectedApiKey = process.env.EVOLUTION_API_KEY

  if (!expectedApiKey) {
    throw new Error('EVOLUTION_API_KEY must be configured in environment variables')
  }

  return apiKey === expectedApiKey
}

export async function POST(request: NextRequest) {
  try {
    // Validar webhook secret
    if (!validateEvolutionWebhook(request)) {
      console.error('[Evolution Webhook] Unauthorized access attempt')
      return NextResponse.json(
        { error: 'Unauthorized - Invalid API key' },
        { status: 401 }
      )
    }

    const body: EvolutionWebhookEvent = await request.json()

    console.log('[Evolution Webhook] Received event:', {
      event: body.event,
      messageId: body.data?.key?.id,
      fromMe: body.data?.key?.fromMe,
    })

    const messageId = body.data?.key?.id
    const fromMe = body.data?.key?.fromMe

    if (!messageId) {
      console.error('[Evolution Webhook] No messageId in event')
      return NextResponse.json({ received: true })
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

    // Processar evento baseado no tipo
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
