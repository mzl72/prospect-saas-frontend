/**
 * Cron Job: Processamento e envio automático de emails
 * Executa a cada 5 minutos via crontab do servidor
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-db';
import { EmailStatus, LeadStatus } from '@prisma/client';
import { sendEmailViaResend } from '@/lib/email-service';
import {
  canSendEmail,
  addUnsubscribeFooter,
  getRandomDelay,
  canSendMoreToday,
} from '@/lib/email-scheduler';
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

    // 2. Verificar quantos emails já foram enviados hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sentToday = await prisma.email.count({
      where: {
        status: EmailStatus.SENT,
        sentAt: {
          gte: today,
        },
      },
    });

    console.log(`[Cron] 📊 Sent today: ${sentToday}/${userSettings.dailyEmailLimit}`);

    if (!canSendMoreToday(sentToday, userSettings)) {
      console.log('[Cron] ⚠️ Daily limit reached, skipping');
      return NextResponse.json({
        success: true,
        message: 'Daily limit reached',
        stats: { sentToday, limit: userSettings.dailyEmailLimit },
      });
    }

    // 3. Buscar emails pendentes (com todas as relações necessárias)
    const remainingQuota = userSettings.dailyEmailLimit - sentToday;
    const batchSize = Math.min(EMAIL_TIMING.BATCH_SIZE, remainingQuota);

    const pendingEmails = await prisma.email.findMany({
      where: {
        status: EmailStatus.PENDING,
      },
      include: {
        lead: {
          include: {
            emails: true, // Precisamos dos outros emails para verificar timing
          },
        },
      },
      take: batchSize,
      orderBy: [
        { sequenceNumber: 'asc' }, // Email 1 primeiro
        { createdAt: 'asc' }, // Mais antigos primeiro
      ],
    });

    console.log(`[Cron] 📧 Found ${pendingEmails.length} pending emails (batch size: ${batchSize})`);

    let sent = 0;
    let skipped = 0;
    let failed = 0;
    const errors: string[] = [];

    // 4. Processar cada email
    for (const email of pendingEmails) {
      try {
        // Verificar se pode enviar (timing, horário comercial, etc)
        if (!canSendEmail(email, userSettings)) {
          skipped++;
          console.log(
            `[Cron] ⏭️ Skipped email ${email.id} (seq ${email.sequenceNumber}) - timing not ready`
          );
          continue;
        }

        // Validar que lead tem email
        if (!email.lead.email) {
          console.error(
            `[Cron] ❌ Lead ${email.lead.id} has no email address, skipping`
          );
          skipped++;
          continue;
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

          sent++;
          console.log(
            `[Cron] ✅ Sent email ${email.id} (messageId: ${result.messageId})`
          );
        } else {
          failed++;
          errors.push(
            `Email ${email.id}: ${result.error}`
          );
          console.error(
            `[Cron] ❌ Failed to send email ${email.id}:`,
            result.error
          );

          // TODO: Implementar retry logic
          // Por enquanto, mantém como PENDING para próxima execução
        }

        // Rate limiting: delay aleatório entre envios (humaniza)
        const delay = getRandomDelay(userSettings);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } catch (emailError) {
        failed++;
        const errorMsg = emailError instanceof Error ? emailError.message : 'Unknown error';
        errors.push(`Email ${email.id}: ${errorMsg}`);
        console.error(`[Cron] ❌ Error processing email ${email.id}:`, emailError);
      }
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
