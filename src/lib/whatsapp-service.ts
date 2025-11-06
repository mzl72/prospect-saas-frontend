/**
 * WhatsApp Service - Wrapper simplificado que usa message-service
 * Mantido para compatibilidade com código existente (usado em cron)
 */

import {
  sendWhatsAppMessage as sendWhatsAppUnified,
  isValidPhone as isValidPhoneUnified,
  sanitizePhone as sanitizePhoneUnified,
  formatPhone as formatPhoneUnified,
  type SendWhatsAppParams as SendWhatsAppParamsUnified,
  type SendMessageResult,
} from './message-service';

// Re-exportar tipos e funções para compatibilidade
export type SendWhatsAppParams = SendWhatsAppParamsUnified;
export type SendWhatsAppResult = SendMessageResult;

export const sendWhatsAppMessage = sendWhatsAppUnified;
export const isValidPhone = isValidPhoneUnified;
export const sanitizePhone = sanitizePhoneUnified;
export const formatPhone = formatPhoneUnified;
