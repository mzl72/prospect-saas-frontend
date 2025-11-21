/**
 * Cron Job Unificado: Processamento e envio automático de mensagens (Email + WhatsApp)
 * Executa a cada 5 minutos via crontab do servidor
 *
 * IMPORTANTE: Mantém configurações separadas por canal (email, whatsapp, hybrid)
 * para permitir que usuários escolham usar apenas um dos 3
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-db'
import { EmailStatus, WhatsAppStatus, LeadStatus, CadenceType } from '@prisma/client'
import { sendEmailViaResend } from '@/lib/email-service'
import { sendWhatsAppMessage } from '@/lib/whatsapp-service'
import { canSendEmail, addUnsubscribeFooter } from '@/lib/email-scheduler'
import { canSendWhatsApp, addOptOutFooter } from '@/lib/whatsapp-scheduler'
import {
  canSendMoreToday,
  canSendNow,
  calculateNextAllowedSendTime,
  getNextSequenceToSend,
} from '@/lib/scheduling-utils'
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

type ChannelType = 'email' | 'whatsapp'

/**
 * Processa envio de emails
 */
async function processEmailSending(userSettings: {
  dailyEmailLimit: number;
  emailBusinessHourStart: number;
  emailBusinessHourEnd: number;
  sendOnlyBusinessHours: boolean;
  emailOnlyCadence: string;
  [key: string]: unknown;
}) {
  const channel: ChannelType = 'email'
  console.log(`[Unified Cron - ${channel}] Starting processing...`)

  // 1. Verificar quantos emails já foram enviados hoje
  const { seq1: sentSeq1, seq2: sentSeq2, seq3: sentSeq3, total: sentToday } =
    await getSentTodayStats(channel)

  console.log(
    `[${channel}] Sent today: ${sentToday}/${userSettings.dailyEmailLimit} (Seq1: ${sentSeq1}, Seq2: ${sentSeq2}, Seq3: ${sentSeq3})`
  )

  if (!canSendMoreToday(sentToday, userSettings.dailyEmailLimit)) {
    console.log(`[${channel}] Daily limit reached, skipping`)
    return {
      channel,
      status: 'limit_reached',
      data: buildLimitReachedResponse(sentToday, userSettings.dailyEmailLimit),
    }
  }

  // 2. Verificar se já pode enviar (delay automático)
  const sendLog = await getSendLog(channel)
  if (sendLog && !canSendNow(sendLog.nextAllowedAt)) {
    const waitTimeMs = sendLog.nextAllowedAt.getTime() - Date.now()
    const waitMinutes = Math.ceil(waitTimeMs / 60000)
    console.log(`[${channel}] Too soon to send, waiting ${waitMinutes} minutes`)
    return {
      channel,
      status: 'waiting',
      data: buildWaitingResponse(sentToday, userSettings.dailyEmailLimit, sendLog.nextAllowedAt),
    }
  }

  // 3. Determinar próxima sequência (distribuição equilibrada)
  const nextSeq = getNextSequenceToSend(
    { seq1: sentSeq1, seq2: sentSeq2, seq3: sentSeq3 },
    userSettings.dailyEmailLimit
  )

  console.log(`[${channel}] Next sequence to send: ${nextSeq}`)

  // 4. Buscar 1 email pendente da sequência escolhida
  const pendingEmails = await prisma.email.findMany({
    where: {
      status: EmailStatus.PENDING,
      sequenceNumber: nextSeq,
      lead: {
        cadenceType: {
          in: [CadenceType.EMAIL_ONLY, CadenceType.HYBRID],
        },
      },
    },
    include: {
      lead: {
        include: {
          emails: true,
          whatsappMessages: true,
        },
      },
    },
    take: 1,
    orderBy: { createdAt: 'asc' },
  })

  if (pendingEmails.length === 0) {
    console.log(`[${channel}] No pending emails found`)
    return {
      channel,
      status: 'no_pending',
      data: buildNoPendingResponse(sentToday, userSettings.dailyEmailLimit),
    }
  }

  // 5. Processar email
  const email = pendingEmails[0]
  let sent = 0
  let failed = 0
  const errors: string[] = []

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!canSendEmail(email, userSettings as any)) {
      console.log(`[${channel}] Email not ready (timing/rules)`)
      return {
        channel,
        status: 'not_ready',
        data: buildNotReadyResponse(sentToday, userSettings.dailyEmailLimit, 1),
      }
    }

    if (!email.lead.email) {
      console.error(`[${channel}] Lead has no email address`)
      await prisma.email.update({
        where: { id: email.id },
        data: { status: EmailStatus.FAILED },
      })
      return {
        channel,
        status: 'error',
        data: { error: 'Lead has no email address' },
      }
    }

    const bodyWithFooter = addUnsubscribeFooter(email.body, email.lead.optOutToken!)

    console.log(`[${channel}] Sending email ${email.id} to ${email.lead.nomeEmpresa}`)

    const result = await sendEmailViaResend({
      from: email.senderAccount,
      to: email.lead.email,
      subject: email.subject,
      html: bodyWithFooter,
      tags: [
        { name: 'campaign', value: email.lead.campaignId },
        { name: 'lead', value: email.leadId },
        { name: 'sequence', value: email.sequenceNumber.toString() },
      ],
    })

    if (result.success) {
      await prisma.email.update({
        where: { id: email.id },
        data: {
          status: EmailStatus.SENT,
          sentAt: new Date(),
          messageId: result.messageId,
        },
      })

      const newLeadStatus =
        email.sequenceNumber === 1
          ? LeadStatus.EMAIL_1_SENT
          : email.sequenceNumber === 2
          ? LeadStatus.EMAIL_2_SENT
          : LeadStatus.EMAIL_3_SENT

      await prisma.lead.update({
        where: { id: email.leadId },
        data: { status: newLeadStatus },
      })

      const emailHourStart = userSettings.emailBusinessHourStart || 9
      const emailHourEnd = userSettings.emailBusinessHourEnd || 18
      const nextAllowed = calculateNextAllowedSendTime(
        emailHourStart,
        emailHourEnd,
        userSettings.dailyEmailLimit
      )

      await updateSendLog('email', nextAllowed)

      console.log(`[${channel}] Sent successfully (messageId: ${result.messageId})`)
      sent++
    } else {
      failed++
      errors.push(`Email ${email.id}: ${result.error}`)
      await prisma.email.update({
        where: { id: email.id },
        data: { status: EmailStatus.FAILED },
      })
    }
  } catch (error) {
    failed++
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    errors.push(`Email ${email.id}: ${errorMsg}`)
    console.error(`[${channel}] Error:`, error)
  }

  return {
    channel,
    status: 'success',
    data: buildSuccessResponse({
      sent,
      skipped: 0,
      failed,
      total: pendingEmails.length,
      duration: '0ms',
      sentToday: sentToday + sent,
      dailyLimit: userSettings.dailyEmailLimit,
    }),
    errors: errors.length > 0 ? errors : undefined,
  }
}

/**
 * Processa envio de WhatsApp
 */
async function processWhatsAppSending(userSettings: {
  whatsappDailyLimit: number;
  whatsappBusinessHourStart: number;
  whatsappBusinessHourEnd: number;
  sendOnlyBusinessHours: boolean;
  whatsappOnlyCadence: string;
  evolutionInstances: string;
  dailyEmailLimit: number;
  [key: string]: unknown;
}) {
  const channel: ChannelType = 'whatsapp'
  console.log(`[Unified Cron - ${channel}] Starting processing...`)

  // 1. Verificar quantas mensagens já foram enviadas hoje
  const { seq1: sentSeq1, seq2: sentSeq2, seq3: sentSeq3, total: sentToday } =
    await getSentTodayStats(channel)

  const whatsappLimit = userSettings.whatsappDailyLimit || userSettings.dailyEmailLimit

  console.log(
    `[${channel}] Sent today: ${sentToday}/${whatsappLimit} (Seq1: ${sentSeq1}, Seq2: ${sentSeq2}, Seq3: ${sentSeq3})`
  )

  if (!canSendMoreToday(sentToday, whatsappLimit)) {
    console.log(`[${channel}] Daily limit reached, skipping`)
    return {
      channel,
      status: 'limit_reached',
      data: buildLimitReachedResponse(sentToday, whatsappLimit),
    }
  }

  // 2. Verificar delay automático
  const sendLog = await getSendLog(channel)
  if (sendLog && !canSendNow(sendLog.nextAllowedAt)) {
    const waitTimeMs = sendLog.nextAllowedAt.getTime() - Date.now()
    const waitMinutes = Math.ceil(waitTimeMs / 60000)
    console.log(`[${channel}] Too soon to send, waiting ${waitMinutes} minutes`)
    return {
      channel,
      status: 'waiting',
      data: buildWaitingResponse(sentToday, whatsappLimit, sendLog.nextAllowedAt),
    }
  }

  // 3. Determinar próxima sequência
  const nextSeq = getNextSequenceToSend(
    { seq1: sentSeq1, seq2: sentSeq2, seq3: sentSeq3 },
    whatsappLimit
  )

  console.log(`[${channel}] Next sequence to send: ${nextSeq}`)

  // 4. Buscar 1 mensagem pendente
  const pendingMessages = await prisma.whatsAppMessage.findMany({
    where: {
      status: WhatsAppStatus.PENDING,
      sequenceNumber: nextSeq,
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
          emails: true,
        },
      },
    },
    take: 1,
    orderBy: { createdAt: 'asc' },
  })

  if (pendingMessages.length === 0) {
    console.log(`[${channel}] No pending messages found`)
    return {
      channel,
      status: 'no_pending',
      data: buildNoPendingResponse(sentToday, whatsappLimit),
    }
  }

  // 5. Processar mensagem
  const message = pendingMessages[0]
  let sentCount = 0
  let failedCount = 0
  const errors: string[] = []

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!canSendWhatsApp(message, userSettings as any)) {
      console.log(`[${channel}] Message not ready (timing/rules)`)
      return {
        channel,
        status: 'not_ready',
        data: buildNotReadyResponse(sentToday, whatsappLimit, 1),
      }
    }

    const messageWithFooter = addOptOutFooter(message.message, message.lead.optOutToken || '')

    console.log(`[${channel}] Sending message ${message.id} to ${message.phoneNumber}`)

    const result = await sendWhatsAppMessage({
      phone: message.phoneNumber,
      message: messageWithFooter,
    })

    if (result.success) {
      await prisma.whatsAppMessage.update({
        where: { id: message.id },
        data: {
          status: WhatsAppStatus.SENT,
          sentAt: new Date(),
          messageId: result.messageId,
        },
      })

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

      const whatsappHourStart = userSettings.whatsappBusinessHourStart || 9
      const whatsappHourEnd = userSettings.whatsappBusinessHourEnd || 18
      const nextAllowed = calculateNextAllowedSendTime(
        whatsappHourStart,
        whatsappHourEnd,
        whatsappLimit
      )

      await updateSendLog('whatsapp', nextAllowed)

      console.log(`[${channel}] Sent successfully`)
      sentCount++
    } else {
      failedCount++
      errors.push(`Message ${message.id}: ${result.error}`)
      await prisma.whatsAppMessage.update({
        where: { id: message.id },
        data: { status: WhatsAppStatus.FAILED },
      })
    }
  } catch (error) {
    failedCount++
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    errors.push(`Message ${message.id}: ${errorMsg}`)
    console.error(`[${channel}] Error:`, error)
  }

  return {
    channel,
    status: 'success',
    data: buildSuccessResponse({
      sent: sentCount,
      skipped: 0,
      failed: failedCount,
      total: pendingMessages.length,
      duration: '0ms',
      sentToday: sentToday + sentCount,
      dailyLimit: whatsappLimit,
    }),
    errors: errors.length > 0 ? errors : undefined,
  }
}

/**
 * Handler principal - processa ambos os canais em paralelo
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  // Segurança: Só permite chamadas autenticadas
  if (!validateCronAuth(request)) {
    console.error('[Unified Cron] Unauthorized access attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[Unified Cron] ⏰ Starting unified message sending job...')

  try {
    // 1. Buscar configurações do usuário
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: DEMO_USER_ID },
    })

    if (!userSettings) {
      console.error('[Unified Cron] User settings not found')
      return NextResponse.json({ error: 'User settings not configured' }, { status: 500 })
    }

    // 2. Processar ambos os canais (sequencialmente para evitar conflitos de DB)
    const emailResult = await processEmailSending(userSettings)
    const whatsappResult = await processWhatsAppSending(userSettings)

    const duration = Date.now() - startTime

    console.log(`[Unified Cron] ✨ Job completed in ${duration}ms`)
    console.log(`[Unified Cron] Email: ${emailResult.status}`)
    console.log(`[Unified Cron] WhatsApp: ${whatsappResult.status}`)

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      results: {
        email: emailResult,
        whatsapp: whatsappResult,
      },
    })
  } catch (error) {
    console.error('[Unified Cron] ❌ Job failed:', error)
    return NextResponse.json(
      {
        error: 'Internal error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
