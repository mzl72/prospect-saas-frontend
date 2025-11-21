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
import { checkRateLimit, getClientIp, getRateLimitHeaders } from '@/lib/rate-limit';
import { validatePayloadSize, validateStringLength } from '@/lib/security';

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
    // 1. Rate limiting por IP: 200 requisições por minuto (webhooks podem ter bursts)
    const clientIp = getClientIp(request);
    const rateLimitResult = checkRateLimit({
      identifier: `resend-webhook:${clientIp}`,
      maxRequests: 200,
      windowMs: 60000, // 1 minuto
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    // 2. Validar webhook signature (HMAC)
    const signature = request.headers.get('svix-signature') || request.headers.get('webhook-signature')
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET

    if (!webhookSecret) {
      throw new Error('RESEND_WEBHOOK_SECRET must be configured in environment variables')
    }

    // 3. Validar payload size (previne JSON bombing) - 1MB max
    const rawBody = await request.text()
    const payloadValidation = validatePayloadSize(rawBody, 1024 * 1024); // 1MB max

    if (!payloadValidation.valid) {
      console.error('[Resend Webhook] Payload too large:', payloadValidation.error);
      return NextResponse.json(
        { error: payloadValidation.error },
        { status: 413 }
      );
    }

    // 4. Validar signature
    if (!validateResendWebhookSignature(rawBody, signature, webhookSecret)) {
      console.error('[Resend Webhook] Invalid signature - unauthorized access attempt from IP:', clientIp)
      return NextResponse.json(
        { error: 'Unauthorized - Invalid webhook signature' },
        { status: 401 }
      )
    }

    const body: ResendWebhookEvent = JSON.parse(rawBody);

    // 5. Validar estrutura do payload
    if (!body.type || typeof body.type !== 'string') {
      console.error('[Resend Webhook] Invalid payload: missing type');
      return NextResponse.json(
        { error: 'Invalid payload: type is required' },
        { status: 400 }
      );
    }

    if (!body.data || !body.data.email_id) {
      console.error('[Resend Webhook] Invalid payload: missing email_id');
      return NextResponse.json(
        { error: 'Invalid payload: email_id is required' },
        { status: 400 }
      );
    }

    // 6. Validar tamanho do emailId (previne DoS)
    const emailIdValidation = validateStringLength(body.data.email_id, 'email_id', 200);
    if (!emailIdValidation.valid) {
      console.error('[Resend Webhook] email_id too long:', emailIdValidation.error);
      return NextResponse.json(
        { error: emailIdValidation.error },
        { status: 400 }
      );
    }

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
