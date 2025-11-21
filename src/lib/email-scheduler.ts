/**
 * Email Scheduler - Wrapper simplificado que usa base-scheduler
 * Mantido para compatibilidade com código existente (usado em cron)
 */

import { Email, Lead, UserSettings } from '@prisma/client';
import { canSendMessage, getEmailDelay, addFooter } from './base-scheduler';

type EmailWithLead = Email & {
  lead: Lead & {
    emails: Email[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    whatsappMessages: any[];
  };
};

/**
 * Verifica se um email pode ser enviado agora
 */
export function canSendEmail(email: EmailWithLead, userSettings: UserSettings): boolean {
  return canSendMessage(email, userSettings, 'email');
}

/**
 * Calcula delay aleatório para emails
 */
export function getRandomDelay(userSettings: UserSettings): number {
  return getEmailDelay(userSettings);
}

/**
 * Adiciona footer de unsubscribe no corpo do email
 */
export function addUnsubscribeFooter(body: string, optOutToken: string): string {
  return addFooter(body, 'email', optOutToken);
}

/**
 * Calcula quanto tempo falta para o próximo email poder ser enviado
 * Útil para logging e debugging
 * NOTA: Usa delays padrão de 3 e 7 dias (sistema antigo - novo sistema usa JSON cadences)
 */
export function getTimeUntilNextEmail(
  email: EmailWithLead,
  _userSettings: UserSettings
): number | null {
  const { sequenceNumber, lead } = email;

  if (sequenceNumber === 1) {
    return 0; // Pode enviar imediatamente
  }

  if (sequenceNumber === 2) {
    const email1 = lead.emails.find((e) => e.sequenceNumber === 1);
    if (!email1?.sentAt) return null;

    const delayMs = 3 * 24 * 60 * 60 * 1000; // Default: 3 dias
    const timeSinceEmail1 = Date.now() - email1.sentAt.getTime();
    return Math.max(0, delayMs - timeSinceEmail1);
  }

  if (sequenceNumber === 3) {
    const email2 = lead.emails.find((e) => e.sequenceNumber === 2);
    if (!email2?.sentAt) return null;

    const delayMs = 7 * 24 * 60 * 60 * 1000; // Default: 7 dias
    const timeSinceEmail2 = Date.now() - email2.sentAt.getTime();
    return Math.max(0, delayMs - timeSinceEmail2);
  }

  return null;
}

/**
 * Formata milissegundos para string legível (ex: "2 dias, 5 horas")
 */
export function formatTimeRemaining(ms: number): string {
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));

  if (days > 0) {
    return `${days} dia${days > 1 ? 's' : ''}, ${hours} hora${hours !== 1 ? 's' : ''}`;
  }
  if (hours > 0) {
    return `${hours} hora${hours !== 1 ? 's' : ''}, ${minutes} minuto${minutes !== 1 ? 's' : ''}`;
  }
  return `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
}
