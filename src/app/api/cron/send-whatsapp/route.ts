/**
 * Cron Job: Processamento e envio automático de mensagens WhatsApp
 * Executa a cada 5 minutos via crontab do servidor
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-db'
import { WhatsAppStatus, LeadStatus } from '@prisma/client'
import { sendWhatsAppMessage } from '@/lib/whatsapp-service'
import {
  canSendWhatsApp,
  addOptOutFooter,
  getRandomDelay,
  canSendMoreToday,
} from '@/lib/whatsapp-scheduler'
import { EMAIL_TIMING } from '@/lib/constants'
import { DEMO_USER_ID } from '@/lib/demo-user'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutos timeout

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  // Segurança: Só permite chamadas autenticadas (cron ou admin)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.error('[WhatsApp Cron] Unauthorized access attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[WhatsApp Cron] ⏰ Starting WhatsApp sending job...')

  try {
    // 1. Buscar configurações do usuário
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: DEMO_USER_ID },
    })

    if (!userSettings) {
      console.error('[WhatsApp Cron] User settings not found')
      return NextResponse.json(
        { error: 'User settings not configured' },
        { status: 500 }
      )
    }

    // 2. Verificar quantas mensagens já foram enviadas hoje
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const sentToday = await prisma.whatsAppMessage.count({
      where: {
        status: WhatsAppStatus.SENT,
        sentAt: {
          gte: today,
        },
      },
    })

    console.log(
      `[WhatsApp Cron] 📊 Sent today: ${sentToday}/${userSettings.dailyEmailLimit}`
    )

    if (!canSendMoreToday(sentToday, userSettings)) {
      console.log('[WhatsApp Cron] ⚠️ Daily limit reached, skipping')
      return NextResponse.json({
        success: true,
        message: 'Daily limit reached',
        stats: { sentToday, limit: userSettings.dailyEmailLimit },
      })
    }

    // 3. Buscar mensagens pendentes (com todas as relações necessárias)
    const remainingQuota = userSettings.dailyEmailLimit - sentToday
    const batchSize = Math.min(EMAIL_TIMING.BATCH_SIZE, remainingQuota)

    const pendingMessages = await prisma.whatsAppMessage.findMany({
      where: {
        status: WhatsAppStatus.PENDING,
      },
      include: {
        lead: {
          include: {
            whatsappMessages: true,
          },
        },
      },
      take: batchSize,
      orderBy: {
        createdAt: 'asc',
      },
    })

    console.log(`[WhatsApp Cron] 📨 Found ${pendingMessages.length} pending messages`)

    let sentCount = 0
    let skippedCount = 0
    let failedCount = 0

    // 4. Processar cada mensagem
    for (const message of pendingMessages) {
      // Validar se pode enviar (timing, opt-out, replies, etc)
      if (!canSendWhatsApp(message, userSettings)) {
        skippedCount++
        continue
      }

      // Adicionar rodapé de opt-out
      const messageWithFooter = addOptOutFooter(
        message.message,
        message.lead.optOutToken || ''
      )

      // Enviar via Evolution API
      const result = await sendWhatsAppMessage({
        phone: message.phoneNumber,
        message: messageWithFooter,
      })

      if (result.success) {
        // Atualizar status da mensagem para SENT
        await prisma.whatsAppMessage.update({
          where: { id: message.id },
          data: {
            status: WhatsAppStatus.SENT,
            messageId: result.messageId,
            sentAt: new Date(),
          },
        })

        // Atualizar status do lead baseado na sequência
        if (message.sequenceNumber === 1) {
          await prisma.lead.update({
            where: { id: message.leadId },
            data: { status: LeadStatus.EMAIL_1_SENT },
          })
        } else if (message.sequenceNumber === 2) {
          await prisma.lead.update({
            where: { id: message.leadId },
            data: { status: LeadStatus.EMAIL_2_SENT },
          })
        } else if (message.sequenceNumber === 3) {
          await prisma.lead.update({
            where: { id: message.leadId },
            data: { status: LeadStatus.EMAIL_3_SENT },
          })
        }

        sentCount++
        console.log(
          `[WhatsApp Cron] ✅ Sent message ${message.sequenceNumber} to ${message.phoneNumber}`
        )
      } else {
        // Marcar como falha
        await prisma.whatsAppMessage.update({
          where: { id: message.id },
          data: {
            status: WhatsAppStatus.FAILED,
            errorMessage: result.error,
          },
        })

        failedCount++
        console.error(
          `[WhatsApp Cron] ❌ Failed to send to ${message.phoneNumber}: ${result.error}`
        )
      }

      // Rate limiting: delay aleatório entre envios
      const delay = getRandomDelay(userSettings)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }

    const duration = Date.now() - startTime

    console.log('[WhatsApp Cron] ✅ Job completed:', {
      duration: `${duration}ms`,
      sent: sentCount,
      skipped: skippedCount,
      failed: failedCount,
      total: pendingMessages.length,
    })

    return NextResponse.json({
      success: true,
      stats: {
        duration,
        sent: sentCount,
        skipped: skippedCount,
        failed: failedCount,
        total: pendingMessages.length,
        sentToday: sentToday + sentCount,
        dailyLimit: userSettings.dailyEmailLimit,
      },
    })
  } catch (error) {
    console.error('[WhatsApp Cron] ❌ Unexpected error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
