/**
 * Webhook Resend: Recebe eventos de emails
 * - email.sent
 * - email.delivered
 * - email.opened
 * - email.clicked
 * - email.bounced
 * - email.complained (marcado como spam)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-db';
import { EmailStatus, LeadStatus } from '@prisma/client';
import { validateResendWebhookSignature } from '@/lib/webhook-validation';

export const dynamic = 'force-dynamic';

interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at?: string;
    link?: string; // Para eventos de click
  };
}

export async function POST(request: NextRequest) {
  try {
    // Validar webhook signature (HMAC)
    const signature = request.headers.get('svix-signature') || request.headers.get('webhook-signature')
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET

    if (!webhookSecret) {
      throw new Error('RESEND_WEBHOOK_SECRET must be configured in environment variables')
    }

    const rawBody = await request.text()

    if (!validateResendWebhookSignature(rawBody, signature, webhookSecret)) {
      console.error('[Resend Webhook] Invalid signature - unauthorized access attempt')
      return NextResponse.json(
        { error: 'Unauthorized - Invalid webhook signature' },
        { status: 401 }
      )
    }

    const body: ResendWebhookEvent = JSON.parse(rawBody);

    console.log('[Resend Webhook] 📨 Event received:', {
      type: body.type,
      emailId: body.data.email_id,
      to: body.data.to,
    });

    const emailId = body.data.email_id;

    // Processar evento baseado no tipo
    switch (body.type) {
      case 'email.sent':
        // Email foi aceito pelo Resend (não é delivery ainda)
        console.log(`[Resend] Email ${emailId} accepted by Resend`);
        break;

      case 'email.delivered':
        // Email foi entregue ao servidor destinatário
        console.log(`[Resend] Email ${emailId} delivered to recipient server`);
        // Opcional: atualizar algum campo de tracking
        break;

      case 'email.opened':
        // Lead ABRIU o email!
        await handleEmailOpened(emailId);
        break;

      case 'email.clicked':
        // Lead CLICOU em um link no email!
        await handleEmailClicked(emailId, body.data.link);
        break;

      case 'email.bounced':
        // Email não pôde ser entregue (bounce)
        await handleEmailBounced(emailId);
        break;

      case 'email.complained':
        // Lead marcou como spam
        await handleEmailComplained(emailId);
        break;

      case 'email.delivery_delayed':
        // Delivery atrasada (servidor destinatário temporariamente indisponível)
        console.log(`[Resend] Email ${emailId} delivery delayed`);
        break;

      default:
        console.log(`[Resend] Unknown event type: ${body.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Resend Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

/**
 * Lead abriu o email
 */
async function handleEmailOpened(emailId: string) {
  try {
    const email = await prisma.email.findUnique({
      where: { messageId: emailId },
    });

    if (!email) {
      console.error(`[Resend] Email not found: ${emailId}`);
      return;
    }

    // Só atualiza se ainda não foi marcado como aberto
    if (!email.openedAt) {
      await prisma.email.update({
        where: { messageId: emailId },
        data: {
          status: EmailStatus.OPENED,
          openedAt: new Date(),
        },
      });

      console.log(`[Resend] ✅ Email ${emailId} marked as OPENED`);
    }
  } catch (error) {
    console.error(`[Resend] Error handling opened event:`, error);
  }
}

/**
 * Lead clicou em um link no email
 */
async function handleEmailClicked(emailId: string, link?: string) {
  try {
    const email = await prisma.email.findUnique({
      where: { messageId: emailId },
      include: { lead: true },
    });

    if (!email) {
      console.error(`[Resend] Email not found: ${emailId}`);
      return;
    }

    console.log(`[Resend] 🖱️ Email ${emailId} link clicked:`, link);
    console.log(
      `[Resend] 🎯 Lead "${email.lead.nomeEmpresa}" showing interest!`
    );

    // Atualizar para OPENED se ainda não foi
    if (!email.openedAt) {
      await prisma.email.update({
        where: { messageId: emailId },
        data: {
          status: EmailStatus.OPENED,
          openedAt: new Date(),
        },
      });
    }

    // TODO: Você pode criar uma tabela EmailClicks para rastrear cada clique
    // ou adicionar um campo "clickedAt" no modelo Email
  } catch (error) {
    console.error(`[Resend] Error handling clicked event:`, error);
  }
}

/**
 * Email bounced (endereço inválido/cheio)
 */
async function handleEmailBounced(emailId: string) {
  try {
    const email = await prisma.email.update({
      where: { messageId: emailId },
      data: {
        status: EmailStatus.BOUNCED,
        bouncedAt: new Date(),
      },
    });

    // Marcar lead como bounced (para de enviar próximos emails)
    await prisma.lead.update({
      where: { id: email.leadId },
      data: {
        status: LeadStatus.BOUNCED,
      },
    });

    console.log(
      `[Resend] ⚠️ Email ${emailId} BOUNCED - Lead marked as BOUNCED`
    );
  } catch (error) {
    console.error(`[Resend] Error handling bounced event:`, error);
  }
}

/**
 * Lead marcou como spam (complaint)
 */
async function handleEmailComplained(emailId: string) {
  try {
    const email = await prisma.email.findUnique({
      where: { messageId: emailId },
    });

    if (!email) {
      console.error(`[Resend] Email not found: ${emailId}`);
      return;
    }

    // Marcar email como failed
    await prisma.email.update({
      where: { messageId: emailId },
      data: {
        status: EmailStatus.FAILED,
      },
    });

    // Opt-out automático do lead
    await prisma.lead.update({
      where: { id: email.leadId },
      data: {
        status: LeadStatus.OPTED_OUT,
        optedOutAt: new Date(),
      },
    });

    console.log(
      `[Resend] 🚫 Email ${emailId} marked as SPAM - Lead auto opted-out`
    );
  } catch (error) {
    console.error(`[Resend] Error handling complained event:`, error);
  }
}
