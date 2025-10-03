/**
 * Webhook Evolution API: Recebe eventos de status de mensagens WhatsApp
 * Eventos: message.sent, message.delivered, message.read, message.received (reply)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-db'
import { WhatsAppStatus, LeadStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

interface EvolutionWebhookEvent {
  event: string
  instance: string
  data: {
    key: {
      remoteJid: string // Número do destinatário
      fromMe: boolean
      id: string // messageId
    }
    message?: any
    messageTimestamp?: number
  }
}

export async function POST(request: NextRequest) {
  try {
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

      case 'messages.update': // Status atualizado (entregue, lido, etc)
        const updateData = body.data as any

        // Entregue (delivered)
        if (updateData.update?.status === 3) {
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
        if (updateData.update?.status === 4) {
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
