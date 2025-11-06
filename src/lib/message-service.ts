/**
 * Serviço Unificado de Mensagens - Email (Resend) + WhatsApp (Evolution API)
 * Centraliza validação, sanitização e envio de mensagens em ambos canais
 */

import { Resend } from 'resend';
import axios from 'axios';

// ========================================
// CONFIGURAÇÃO E CLIENTES
// ========================================

const resend = new Resend(process.env.RESEND_API_KEY);

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE;

// ========================================
// TYPES
// ========================================

export interface SendEmailParams {
  from: string;
  to: string;
  subject: string;
  html: string;
  tags?: { name: string; value: string }[];
  replyTo?: string;
}

export interface SendWhatsAppParams {
  phone: string;
  message: string;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ========================================
// EMAIL - RESEND
// ========================================

/**
 * Envia um email via Resend
 */
export async function sendEmailViaResend(
  params: SendEmailParams
): Promise<SendMessageResult> {
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

// ========================================
// WHATSAPP - EVOLUTION API
// ========================================

/**
 * Envia uma mensagem de WhatsApp via Evolution API
 */
export async function sendWhatsAppMessage(
  params: SendWhatsAppParams
): Promise<SendMessageResult> {
  try {
    // Validação básica
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE) {
      throw new Error('Evolution API credentials not configured');
    }

    if (!params.phone || !params.message) {
      throw new Error('Missing required WhatsApp parameters');
    }

    // Sanitizar telefone (remover formatação)
    const cleanPhone = sanitizePhone(params.phone);

    console.log('[Evolution API] Sending WhatsApp:', {
      phone: cleanPhone,
      messageLength: params.message.length,
    });

    // Enviar via Evolution API
    const response = await axios.post(
      `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
      {
        number: cleanPhone,
        text: params.message,
      },
      {
        headers: {
          apikey: EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    const messageId = response.data?.key?.id;

    if (!messageId) {
      console.error('[Evolution API] No messageId returned:', response.data);
      return {
        success: false,
        error: 'No messageId returned from Evolution API',
      };
    }

    console.log('[Evolution API] Message sent successfully:', messageId);
    return {
      success: true,
      messageId,
    };
  } catch (error) {
    console.error('[Evolution API] Unexpected error:', error);

    if (axios.isAxiosError(error)) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message;

      return {
        success: false,
        error: `Evolution API error: ${errorMessage}`,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ========================================
// VALIDAÇÃO
// ========================================

/**
 * Valida se um email é válido (formato RFC 5322 mais rigoroso)
 */
export function isValidEmail(email: string): boolean {
  // Regex mais rigoroso baseado em RFC 5322
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
 * Valida se um número de telefone é válido (formato básico brasileiro)
 */
export function isValidPhone(phone: string): boolean {
  // Remove formatação e valida se tem 10-13 dígitos
  const cleanPhone = phone.replace(/\D/g, '');
  return cleanPhone.length >= 10 && cleanPhone.length <= 13;
}

// ========================================
// SANITIZAÇÃO
// ========================================

/**
 * Sanitiza email removendo espaços e convertendo para lowercase
 */
export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Sanitiza telefone removendo formatação e adicionando código do país se necessário
 * @returns Telefone no formato internacional (5511999999999)
 */
export function sanitizePhone(phone: string): string {
  // Remove todos os caracteres não numéricos
  let clean = phone.replace(/\D/g, '');

  // Se não tem código do país (55), adiciona
  if (!clean.startsWith('55') && clean.length <= 11) {
    clean = '55' + clean;
  }

  return clean;
}

// ========================================
// FORMATAÇÃO (DISPLAY)
// ========================================

/**
 * Formata telefone para exibição (+55 11 99999-9999)
 */
export function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '');

  // Formato: +55 11 99999-9999
  if (clean.length === 13) {
    return `+${clean.slice(0, 2)} ${clean.slice(2, 4)} ${clean.slice(4, 9)}-${clean.slice(9)}`;
  }

  // Formato: +55 11 9999-9999 (número fixo)
  if (clean.length === 12) {
    return `+${clean.slice(0, 2)} ${clean.slice(2, 4)} ${clean.slice(4, 8)}-${clean.slice(8)}`;
  }

  return phone;
}
