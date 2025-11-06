/**
 * WhatsApp Scheduler - Wrapper simplificado que usa base-scheduler
 * Mantido para compatibilidade com código existente (usado em cron)
 */

import { WhatsAppMessage, Lead, UserSettings } from '@prisma/client';
import { canSendMessage, getWhatsAppDelay, addFooter } from './base-scheduler';

type WhatsAppMessageWithLead = WhatsAppMessage & {
  lead: Lead & {
    whatsappMessages: WhatsAppMessage[];
    emails: any[];
  };
};

/**
 * Verifica se uma mensagem WhatsApp pode ser enviada agora
 */
export function canSendWhatsApp(
  message: WhatsAppMessageWithLead,
  userSettings: UserSettings
): boolean {
  return canSendMessage(message, userSettings, 'whatsapp');
}

/**
 * Calcula delay aleatório para WhatsApp
 */
export function getRandomDelay(userSettings: UserSettings): number {
  return getWhatsAppDelay(userSettings);
}

/**
 * Adiciona rodapé de opt-out na mensagem WhatsApp
 */
export function addOptOutFooter(message: string, optOutToken: string): string {
  return addFooter(message, 'whatsapp', optOutToken);
}
