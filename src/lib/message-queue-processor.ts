/**
 * Processador genérico de fila de mensagens (Email e WhatsApp)
 * Elimina duplicação de 90% do código entre send-emails e send-whatsapp cron jobs
 */

import { prisma } from '@/lib/prisma-db';
import { EmailStatus, WhatsAppStatus, LeadStatus } from '@prisma/client';
import { canSendMoreToday, canSendNow, calculateNextAllowedSendTime, getNextSequenceToSend } from '@/lib/scheduling-utils';
import { DEMO_USER_ID } from '@/lib/demo-user';
import type { UserSettingsExtended } from '@/types/settings';

type MessageChannel = 'email' | 'whatsapp';
type MessageStatus = EmailStatus | WhatsAppStatus;

interface MessageQueueConfig<TMessage, TSendResult> {
  channel: MessageChannel;
  messageModel: 'email' | 'whatsAppMessage';
  statusEnum: typeof EmailStatus | typeof WhatsAppStatus;

  // Business logic específico do canal
  getDailyLimit: (settings: UserSettingsExtended) => number;
  getBusinessHours: (settings: UserSettingsExtended) => { start: number; end: number };
  canSendMessage: (message: TMessage, settings: UserSettingsExtended) => boolean;
  sendMessage: (message: TMessage) => Promise<TSendResult>;
  getLeadStatusForSequence: (sequenceNumber: 1 | 2 | 3) => LeadStatus;

  // Callbacks para atualizar DB após envio
  onSent: (message: TMessage, result: TSendResult) => Promise<void>;
  onFailed: (message: TMessage, error?: string) => Promise<void>;
}

interface ProcessResult {
  success: boolean;
  stats: {
    sent: number;
    skipped: number;
    failed: number;
    duration: number;
    sentToday: number;
    dailyLimit: number;
    nextAllowedAt?: Date;
    waitMinutes?: number;
  };
  message?: string;
  errors?: string[];
}

/**
 * Processador genérico de fila de mensagens
 * Template pattern para reutilizar lógica comum entre email e WhatsApp
 */
export async function processMessageQueue<TMessage extends {
  id: string;
  sequenceNumber: 1 | 2 | 3;
  leadId: string;
  lead: any;
}, TSendResult extends {
  success: boolean;
  messageId?: string;
  error?: string;
}>(
  config: MessageQueueConfig<TMessage, TSendResult>
): Promise<ProcessResult> {
  const startTime = Date.now();

  try {
    // 1. Buscar configurações do usuário
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: DEMO_USER_ID },
    }) as UserSettingsExtended | null;

    if (!userSettings) {
      console.error(`[${config.channel} Queue] User settings not found`);
      throw new Error('User settings not configured');
    }

    const dailyLimit = config.getDailyLimit(userSettings);
    const { start: hourStart, end: hourEnd } = config.getBusinessHours(userSettings);

    // 2. Verificar quantas mensagens já foram enviadas hoje (por sequência)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const modelName = config.messageModel === 'email' ? 'email' : 'whatsAppMessage';
    const sentTodayBySeq = await (prisma[modelName] as any).groupBy({
      by: ['sequenceNumber'],
      where: {
        status: config.statusEnum.SENT,
        sentAt: {
          gte: today,
        },
      },
      _count: {
        id: true,
      },
    });

    const sentSeq1 = sentTodayBySeq.find((s: any) => s.sequenceNumber === 1)?._count.id || 0;
    const sentSeq2 = sentTodayBySeq.find((s: any) => s.sequenceNumber === 2)?._count.id || 0;
    const sentSeq3 = sentTodayBySeq.find((s: any) => s.sequenceNumber === 3)?._count.id || 0;
    const sentToday = sentSeq1 + sentSeq2 + sentSeq3;

    console.log(`[${config.channel} Queue] 📊 Sent today: ${sentToday}/${dailyLimit} (Seq1: ${sentSeq1}, Seq2: ${sentSeq2}, Seq3: ${sentSeq3})`);

    if (!canSendMoreToday(sentToday, dailyLimit)) {
      console.log(`[${config.channel} Queue] ⚠️ Daily limit reached, skipping`);
      return {
        success: true,
        message: 'Daily limit reached',
        stats: {
          sent: 0,
          skipped: 0,
          failed: 0,
          duration: Date.now() - startTime,
          sentToday,
          dailyLimit
        },
      };
    }

    // 3. Verificar se já pode enviar (baseado no delay automático)
    const sendLog = await prisma.channelSendLog.findUnique({
      where: {
        userId_channel: {
          userId: DEMO_USER_ID,
          channel: config.channel,
        },
      },
    });

    if (sendLog && !canSendNow(sendLog.nextAllowedAt)) {
      const waitTimeMs = sendLog.nextAllowedAt.getTime() - Date.now();
      const waitMinutes = Math.ceil(waitTimeMs / 60000);
      console.log(`[${config.channel} Queue] ⏳ Too soon to send, waiting ${waitMinutes} minutes`);
      return {
        success: true,
        message: 'Waiting for next send window',
        stats: {
          sent: 0,
          skipped: 0,
          failed: 0,
          duration: Date.now() - startTime,
          sentToday,
          dailyLimit,
          nextAllowedAt: sendLog.nextAllowedAt,
          waitMinutes,
        },
      };
    }

    // 4. Determinar qual sequenceNumber deve ser enviado a seguir (distribuição equilibrada)
    const nextSeq = getNextSequenceToSend(
      { seq1: sentSeq1, seq2: sentSeq2, seq3: sentSeq3 },
      dailyLimit
    );

    console.log(`[${config.channel} Queue] 🎯 Next sequence to send: ${nextSeq} (balancing daily sends)`);

    // 5. Buscar apenas 1 mensagem pendente da sequência escolhida
    const pendingMessages = await (prisma[modelName] as any).findMany({
      where: {
        status: config.statusEnum.PENDING,
        sequenceNumber: nextSeq,
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
      orderBy: {
        createdAt: 'asc',
      },
    }) as TMessage[];

    if (pendingMessages.length === 0) {
      console.log(`[${config.channel} Queue] ✅ No pending messages found`);
      return {
        success: true,
        message: 'No pending messages',
        stats: {
          sent: 0,
          skipped: 0,
          failed: 0,
          duration: Date.now() - startTime,
          sentToday,
          dailyLimit
        },
      };
    }

    console.log(`[${config.channel} Queue] 📨 Found 1 pending message to process`);

    // 6. Processar a mensagem única
    const message = pendingMessages[0];
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    try {
      // Verificar se pode enviar (timing, horário comercial, etc)
      if (!config.canSendMessage(message, userSettings)) {
        console.log(
          `[${config.channel} Queue] ⏭️ Skipped message ${message.id} (seq ${message.sequenceNumber}) - not ready`
        );
        skipped++;
        return {
          success: true,
          message: 'Message not ready to send yet',
          stats: {
            sent,
            skipped,
            failed,
            duration: Date.now() - startTime,
            sentToday,
            dailyLimit
          },
        };
      }

      // Enviar mensagem
      console.log(
        `[${config.channel} Queue] 📤 Sending message ${message.id} (seq ${message.sequenceNumber})`
      );

      const result = await config.sendMessage(message);

      if (result.success) {
        // Callback para atualizar status
        await config.onSent(message, result);

        // Atualizar log de envio (calcular próximo horário permitido)
        const nextAllowed = calculateNextAllowedSendTime(
          hourStart,
          hourEnd,
          dailyLimit
        );

        await prisma.channelSendLog.upsert({
          where: {
            userId_channel: {
              userId: DEMO_USER_ID,
              channel: config.channel,
            },
          },
          create: {
            userId: DEMO_USER_ID,
            channel: config.channel,
            lastSentAt: new Date(),
            nextAllowedAt: nextAllowed,
          },
          update: {
            lastSentAt: new Date(),
            nextAllowedAt: nextAllowed,
          },
        });

        console.log(
          `[${config.channel} Queue] ✅ Sent message ${message.id} (messageId: ${result.messageId}). Next send allowed at: ${nextAllowed.toLocaleString()}`
        );

        sent++;
      } else {
        // Callback para marcar como falha
        await config.onFailed(message, result.error);
        failed++;
        console.error(
          `[${config.channel} Queue] ❌ Failed to send message ${message.id}:`,
          result.error
        );
      }
    } catch (error) {
      failed++;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      await config.onFailed(message, errorMsg);
      console.error(`[${config.channel} Queue] ❌ Error processing message ${message.id}:`, error);
    }

    const duration = Date.now() - startTime;

    console.log(`[${config.channel} Queue] ✨ Job completed in ${duration}ms`);
    console.log(`[${config.channel} Queue] 📊 Stats: ${sent} sent, ${skipped} skipped, ${failed} failed`);

    return {
      success: true,
      stats: {
        sent,
        skipped,
        failed,
        duration,
        sentToday: sentToday + sent,
        dailyLimit,
      },
    };
  } catch (error) {
    console.error(`[${config.channel} Queue] ❌ Job failed:`, error);
    throw error;
  }
}
