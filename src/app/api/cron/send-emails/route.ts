/**
 * Cron Job: Processamento e envio automático de emails
 * Executa a cada 5 minutos via crontab do servidor
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-db';
import { EmailStatus, LeadStatus, UserSettings } from '@prisma/client';
import { sendEmailViaResend } from '@/lib/email-service';
import {
  canSendEmail,
  addUnsubscribeFooter,
} from '@/lib/email-scheduler';
import { canSendMoreToday, canSendNow, calculateNextAllowedSendTime, getNextSequenceToSend } from '@/lib/scheduling-utils';
import { EMAIL_TIMING } from '@/lib/constants';
import { DEMO_USER_ID } from '@/lib/demo-user';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutos timeout

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Segurança: Só permite chamadas autenticadas (cron ou admin)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.error('[Cron] Unauthorized access attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[Cron] ⏰ Starting email sending job...');

  try {
    // 1. Buscar configurações do usuário
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: DEMO_USER_ID },
    });

    if (!userSettings) {
      console.error('[Cron] User settings not found');
      return NextResponse.json(
        { error: 'User settings not configured' },
        { status: 500 }
      );
    }

    // 2. Verificar quantos emails já foram enviados hoje (por sequência)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sentTodayBySeq = await prisma.email.groupBy({
      by: ['sequenceNumber'],
      where: {
        status: EmailStatus.SENT,
        sentAt: {
          gte: today,
        },
      },
      _count: {
        id: true,
      },
    });

    const sentSeq1 = sentTodayBySeq.find(s => s.sequenceNumber === 1)?._count.id || 0;
    const sentSeq2 = sentTodayBySeq.find(s => s.sequenceNumber === 2)?._count.id || 0;
    const sentSeq3 = sentTodayBySeq.find(s => s.sequenceNumber === 3)?._count.id || 0;
    const sentToday = sentSeq1 + sentSeq2 + sentSeq3;

    console.log(`[Cron] 📊 Sent today: ${sentToday}/${userSettings.dailyEmailLimit} (Seq1: ${sentSeq1}, Seq2: ${sentSeq2}, Seq3: ${sentSeq3})`);

    if (!canSendMoreToday(sentToday, userSettings.dailyEmailLimit)) {
      console.log('[Cron] ⚠️ Daily limit reached, skipping');
      return NextResponse.json({
        success: true,
        message: 'Daily limit reached',
        stats: { sentToday, limit: userSettings.dailyEmailLimit },
      });
    }

    // 3. Verificar se já pode enviar (baseado no delay automático)
    const sendLog = await prisma.channelSendLog.findUnique({
      where: {
        userId_channel: {
          userId: DEMO_USER_ID,
          channel: 'email',
        },
      },
    });

    if (sendLog && !canSendNow(sendLog.nextAllowedAt)) {
      const waitTimeMs = sendLog.nextAllowedAt.getTime() - Date.now();
      const waitMinutes = Math.ceil(waitTimeMs / 60000);
      console.log(`[Cron] ⏳ Too soon to send, waiting ${waitMinutes} minutes`);
      return NextResponse.json({
        success: true,
        message: 'Waiting for next send window',
        stats: {
          sentToday,
          limit: userSettings.dailyEmailLimit,
          nextAllowedAt: sendLog.nextAllowedAt,
          waitMinutes,
        },
      });
    }

    // 4. Determinar qual sequenceNumber deve ser enviado a seguir (distribuição equilibrada)
    const nextSeq = getNextSequenceToSend(
      { seq1: sentSeq1, seq2: sentSeq2, seq3: sentSeq3 },
      userSettings.dailyEmailLimit
    );

    console.log(`[Cron] 🎯 Next sequence to send: ${nextSeq} (balancing daily sends)`);

    // 5. Buscar apenas 1 email pendente da sequência escolhida
    const pendingEmails = await prisma.email.findMany({
      where: {
        status: EmailStatus.PENDING,
        sequenceNumber: nextSeq, // Buscar apenas da sequência equilibrada
      },
      include: {
        lead: {
          include: {
            emails: true, // Precisamos dos outros emails para verificar timing
          },
        },
      },
      take: 1, // APENAS 1 EMAIL POR EXECUÇÃO
      orderBy: {
        createdAt: 'asc', // Mais antigos primeiro
      },
    });

    if (pendingEmails.length === 0) {
      console.log('[Cron] ✅ No pending emails found');
      return NextResponse.json({
        success: true,
        message: 'No pending emails',
        stats: { sentToday, limit: userSettings.dailyEmailLimit },
      });
    }

    console.log(`[Cron] 📧 Found 1 pending email to process`);

    // 5. Processar o email único
    const email = pendingEmails[0];
    let sent = 0;
    let skipped = 0;
    let failed = 0;
    const errors: string[] = [];

    try {
      // Verificar se pode enviar (timing, horário comercial, etc)
      if (!canSendEmail(email, userSettings)) {
        console.log(
          `[Cron] ⏭️ Skipped email ${email.id} (seq ${email.sequenceNumber}) - timing not ready`
        );
        return NextResponse.json({
          success: true,
          message: 'Email not ready to send yet',
          stats: { sentToday, limit: userSettings.dailyEmailLimit, skipped: 1 },
        });
      }

      // Validar que lead tem email
      if (!email.lead.email) {
        console.error(
          `[Cron] ❌ Lead ${email.lead.id} has no email address, marking as failed`
        );
        await prisma.email.update({
          where: { id: email.id },
          data: { status: EmailStatus.FAILED },
        });
        return NextResponse.json({
          success: false,
          error: 'Lead has no email address',
        });
      }

      // Adicionar footer de unsubscribe
      const bodyWithFooter = addUnsubscribeFooter(
        email.body,
        email.lead.optOutToken!
      );

      // Enviar via Resend
      console.log(
        `[Cron] 📤 Sending email ${email.id} (seq ${email.sequenceNumber}) to ${email.lead.nomeEmpresa}`
      );

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
      });

      if (result.success) {
        // Atualizar email no banco
        await prisma.email.update({
          where: { id: email.id },
          data: {
            status: EmailStatus.SENT,
            sentAt: new Date(),
            messageId: result.messageId,
          },
        });

        // Atualizar status do lead
        const newLeadStatus =
          email.sequenceNumber === 1
            ? LeadStatus.EMAIL_1_SENT
            : email.sequenceNumber === 2
            ? LeadStatus.EMAIL_2_SENT
            : LeadStatus.EMAIL_3_SENT;

        await prisma.lead.update({
          where: { id: email.leadId },
          data: { status: newLeadStatus },
        });

        // Atualizar log de envio (calcular próximo horário permitido)
        const emailHourStart = userSettings.emailBusinessHourStart || 9;
        const emailHourEnd = userSettings.emailBusinessHourEnd || 18;
        const nextAllowed = calculateNextAllowedSendTime(
          emailHourStart,
          emailHourEnd,
          userSettings.dailyEmailLimit
        );

        await prisma.channelSendLog.upsert({
          where: {
            userId_channel: {
              userId: DEMO_USER_ID,
              channel: 'email',
            },
          },
          create: {
            userId: DEMO_USER_ID,
            channel: 'email',
            lastSentAt: new Date(),
            nextAllowedAt: nextAllowed,
          },
          update: {
            lastSentAt: new Date(),
            nextAllowedAt: nextAllowed,
          },
        });

        console.log(
          `[Cron] ✅ Sent email ${email.id} (messageId: ${result.messageId}). Next send allowed at: ${nextAllowed.toLocaleString()}`
        );

        sent++;
      } else {
        failed++;
        errors.push(`Email ${email.id}: ${result.error}`);
        console.error(
          `[Cron] ❌ Failed to send email ${email.id}:`,
          result.error
        );

        // Marcar como failed após 3 tentativas (TODO: implementar retry counter)
        await prisma.email.update({
          where: { id: email.id },
          data: { status: EmailStatus.FAILED },
        });
      }
    } catch (emailError) {
      failed++;
      const errorMsg = emailError instanceof Error ? emailError.message : 'Unknown error';
      errors.push(`Email ${email.id}: ${errorMsg}`);
      console.error(`[Cron] ❌ Error processing email ${email.id}:`, emailError);
    }

    const duration = Date.now() - startTime;

    console.log(`[Cron] ✨ Job completed in ${duration}ms`);
    console.log(`[Cron] 📊 Stats: ${sent} sent, ${skipped} skipped, ${failed} failed`);

    return NextResponse.json({
      success: true,
      stats: {
        sent,
        skipped,
        failed,
        total: pendingEmails.length,
        duration: `${duration}ms`,
        sentToday: sentToday + sent,
        dailyLimit: userSettings.dailyEmailLimit,
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[Cron] ❌ Job failed:', error);
    return NextResponse.json(
      {
        error: 'Internal error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
