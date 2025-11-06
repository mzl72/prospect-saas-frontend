/**
 * Cron Job: Processamento e envio automático de mensagens WhatsApp
 * Executa a cada 5 minutos via crontab do servidor
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-db'
import { WhatsAppStatus, LeadStatus, UserSettings, CadenceType } from '@prisma/client'
import { sendWhatsAppMessage } from '@/lib/whatsapp-service'
import { canSendWhatsApp, addOptOutFooter } from '@/lib/whatsapp-scheduler'
import { canSendMoreToday, canSendNow, calculateNextAllowedSendTime, getNextSequenceToSend } from '@/lib/scheduling-utils'
import { DEMO_USER_ID } from '@/lib/demo-user'
import {
  validateCronAuth,
  getSentTodayStats,
  getSendLog,
  updateSendLog,
  buildLimitReachedResponse,
  buildWaitingResponse,
  buildNoPendingResponse,
  buildNotReadyResponse,
  buildSuccessResponse,
} from '@/lib/cron-utils'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutos timeout

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  // Segurança: Só permite chamadas autenticadas (cron ou admin)
  if (!validateCronAuth(request)) {
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

    // 2. Verificar quantas mensagens já foram enviadas hoje (por sequência)
    const { seq1: sentSeq1, seq2: sentSeq2, seq3: sentSeq3, total: sentToday } = await getSentTodayStats('whatsapp')

    // Usar limite específico de WhatsApp se disponível
    const whatsappLimit = userSettings.whatsappDailyLimit || userSettings.dailyEmailLimit

    console.log(
      `[WhatsApp Cron] 📊 Sent today: ${sentToday}/${whatsappLimit} (Seq1: ${sentSeq1}, Seq2: ${sentSeq2}, Seq3: ${sentSeq3})`
    )

    if (!canSendMoreToday(sentToday, whatsappLimit)) {
      console.log('[WhatsApp Cron] ⚠️ Daily limit reached, skipping')
      return NextResponse.json(buildLimitReachedResponse(sentToday, whatsappLimit))
    }

    // 3. Verificar se já pode enviar (baseado no delay automático)
    const sendLog = await getSendLog('whatsapp')

    if (sendLog && !canSendNow(sendLog.nextAllowedAt)) {
      const waitTimeMs = sendLog.nextAllowedAt.getTime() - Date.now()
      const waitMinutes = Math.ceil(waitTimeMs / 60000)
      console.log(`[WhatsApp Cron] ⏳ Too soon to send, waiting ${waitMinutes} minutes`)
      return NextResponse.json(buildWaitingResponse(sentToday, whatsappLimit, sendLog.nextAllowedAt))
    }

    // 4. Determinar qual sequenceNumber deve ser enviado a seguir (distribuição equilibrada)
    const nextSeq = getNextSequenceToSend(
      { seq1: sentSeq1, seq2: sentSeq2, seq3: sentSeq3 },
      whatsappLimit
    )

    console.log(`[WhatsApp Cron] 🎯 Next sequence to send: ${nextSeq} (balancing daily sends)`)

    // 5. Buscar apenas 1 mensagem pendente da sequência escolhida
    // Incluir leads WHATSAPP_ONLY e HYBRID
    const pendingMessages = await prisma.whatsAppMessage.findMany({
      where: {
        status: WhatsAppStatus.PENDING,
        sequenceNumber: nextSeq, // Buscar apenas da sequência equilibrada
        lead: {
          cadenceType: {
            in: [CadenceType.WHATSAPP_ONLY, CadenceType.HYBRID],
          },
        },
      },
      include: {
        lead: {
          include: {
            whatsappMessages: true,
            emails: true, // Necessário para verificar sequência no modo híbrido
          },
        },
      },
      take: 1, // APENAS 1 MENSAGEM POR EXECUÇÃO
      orderBy: {
        createdAt: 'asc',
      },
    })

    if (pendingMessages.length === 0) {
      console.log('[WhatsApp Cron] ✅ No pending messages found')
      return NextResponse.json(buildNoPendingResponse(sentToday, whatsappLimit))
    }

    console.log(`[WhatsApp Cron] 📨 Found 1 pending message to process`)

    // 5. Processar a mensagem única
    const message = pendingMessages[0]
    let sentCount = 0
    let skippedCount = 0
    let failedCount = 0

    try {
      // Validar se pode enviar (timing, opt-out, replies, etc)
      if (!canSendWhatsApp(message, userSettings)) {
        console.log(
          `[WhatsApp Cron] ⏭️ Skipped message ${message.id} (seq ${message.sequenceNumber}) - not ready`
        )
        return NextResponse.json(buildNotReadyResponse(sentToday, whatsappLimit, 1))
      }

      // Adicionar rodapé de opt-out
      const messageWithFooter = addOptOutFooter(
        message.message,
        message.lead.optOutToken || ''
      )

      // Enviar via Evolution API
      console.log(
        `[WhatsApp Cron] 📤 Sending message ${message.id} (seq ${message.sequenceNumber}) to ${message.phoneNumber}`
      )

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
        const newLeadStatus =
          message.sequenceNumber === 1
            ? LeadStatus.WHATSAPP_1_SENT
            : message.sequenceNumber === 2
            ? LeadStatus.WHATSAPP_2_SENT
            : LeadStatus.WHATSAPP_3_SENT

        await prisma.lead.update({
          where: { id: message.leadId },
          data: { status: newLeadStatus },
        })

        // Atualizar log de envio (calcular próximo horário permitido)
        const whatsappHourStart = userSettings.whatsappBusinessHourStart || 9
        const whatsappHourEnd = userSettings.whatsappBusinessHourEnd || 18
        const nextAllowed = calculateNextAllowedSendTime(
          whatsappHourStart,
          whatsappHourEnd,
          whatsappLimit
        )

        await updateSendLog('whatsapp', nextAllowed)

        console.log(
          `[WhatsApp Cron] ✅ Sent message ${message.id} (messageId: ${result.messageId}). Next send allowed at: ${nextAllowed.toLocaleString()}`
        )

        sentCount++
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
    } catch (error) {
      failedCount++
      console.error('[WhatsApp Cron] ❌ Error processing message:', error)
    }

    const duration = Date.now() - startTime

    console.log('[WhatsApp Cron] ✅ Job completed:', {
      duration: `${duration}ms`,
      sent: sentCount,
      skipped: skippedCount,
      failed: failedCount,
    })

    return NextResponse.json(buildSuccessResponse({
      sent: sentCount,
      skipped: skippedCount,
      failed: failedCount,
      duration: `${duration}ms`,
      sentToday: sentToday + sentCount,
      dailyLimit: whatsappLimit,
    }))
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
