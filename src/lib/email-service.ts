/**
 * Email Service - Wrapper simplificado que usa message-service
 * Mantido para compatibilidade com código existente (usado em cron)
 */

import {
  sendEmailViaResend as sendEmailUnified,
  isValidEmail as isValidEmailUnified,
  sanitizeEmail as sanitizeEmailUnified,
  type SendEmailParams as SendEmailParamsUnified,
  type SendMessageResult,
} from './message-service';

// Re-exportar tipos e funções para compatibilidade
export type SendEmailParams = SendEmailParamsUnified;
export type SendEmailResult = SendMessageResult;

export const sendEmailViaResend = sendEmailUnified;
export const isValidEmail = isValidEmailUnified;
export const sanitizeEmail = sanitizeEmailUnified;
