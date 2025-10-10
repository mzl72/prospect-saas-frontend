/**
 * Serviço de envio de emails via Resend
 * Wrapper simplificado para a API do Resend com tratamento de erros
 */

import { Resend } from 'resend';

// Inicializar Resend com API key
const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendEmailParams {
  from: string;
  to: string;
  subject: string;
  html: string;
  tags?: { name: string; value: string }[];
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Envia um email via Resend
 * @param params Parâmetros do email
 * @returns Resultado do envio com messageId ou erro
 */
export async function sendEmailViaResend(
  params: SendEmailParams
): Promise<SendEmailResult> {
  try {
    // Validação básica
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }

    if (!params.to || !params.from || !params.subject || !params.html) {
      throw new Error('Missing required email parameters');
    }

    console.log('[Resend] Sending email:', {
      to: params.to,
      from: params.from,
      subject: params.subject,
      tags: params.tags,
    });

    // Enviar via Resend
    const { data, error } = await resend.emails.send({
      from: params.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      tags: params.tags,
      replyTo: params.replyTo,
    });

    if (error) {
      console.error('[Resend] Send failed:', error);
      return {
        success: false,
        error: error.message || 'Unknown Resend error',
      };
    }

    console.log('[Resend] Email sent successfully:', data?.id);
    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    console.error('[Resend] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Valida se um email é válido (formato RFC 5322 mais rigoroso)
 * @param email Email para validar
 * @returns true se válido
 */
export function isValidEmail(email: string): boolean {
  // Regex mais rigoroso baseado em RFC 5322
  // Valida: local-part@domain.tld
  // Permite: letras, números, pontos, hífens, underscores
  // Rejeita: espaços, caracteres especiais inválidos, múltiplos pontos consecutivos
  const emailRegex = /^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/;

  if (!emailRegex.test(email)) {
    return false;
  }

  // Validações adicionais
  const [localPart, domain] = email.split('@');

  // Local part não pode ter mais de 64 caracteres
  if (localPart.length > 64) {
    return false;
  }

  // Domain não pode ter mais de 255 caracteres
  if (domain.length > 255) {
    return false;
  }

  // Não pode ter pontos consecutivos
  if (email.includes('..')) {
    return false;
  }

  return true;
}

/**
 * Sanitiza email removendo espaços e convertendo para lowercase
 * @param email Email para sanitizar
 * @returns Email sanitizado
 */
export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
