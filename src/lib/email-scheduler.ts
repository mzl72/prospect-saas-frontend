/**
 * Lógica de scheduling e timing de emails
 * Determina quando cada email deve ser enviado baseado em configurações do usuário
 */

import { Email, EmailStatus, Lead, LeadStatus, UserSettings, CadenceType } from '@prisma/client';
import { isWithinBusinessHours, isCorrectDayAndTime, hasCorrectDaysPassed, calculateAutoDelay } from './scheduling-utils';

type EmailWithLead = Email & {
  lead: Lead & {
    emails: Email[];
  };
};

interface CadenceItem {
  type: "email" | "whatsapp";
  messageNumber: 1 | 2 | 3;
  dayOfWeek: number; // 0-6 (0=Dom)
  timeWindow: string; // "09:00-11:00"
}

/**
 * Verifica se um email pode ser enviado agora
 * Usa o novo sistema de cadências JSON
 */
export function canSendEmail(
  email: EmailWithLead,
  userSettings: UserSettings
): boolean {
  const { sequenceNumber, lead } = email;

  // Verificações básicas - sempre bloqueiam envio
  if (lead.optedOutAt) return false;
  if (lead.status === LeadStatus.REPLIED) return false;
  if (lead.status === LeadStatus.OPTED_OUT) return false;
  if (lead.status === LeadStatus.BOUNCED) return false;
  if (!lead.email) return false;

  // Verificar horário comercial (se configurado)
  if (userSettings.sendOnlyBusinessHours) {
    const emailHourStart = (userSettings as any).emailBusinessHourStart || 9;
    const emailHourEnd = (userSettings as any).emailBusinessHourEnd || 18;
    if (!isWithinBusinessHours(emailHourStart, emailHourEnd)) {
      console.log('[Scheduler] Outside business hours, skipping');
      return false;
    }
  }

  // Determinar qual cadência usar
  const cadenceType = lead.cadenceType || CadenceType.EMAIL_ONLY;
  let cadenceItems: CadenceItem[] = [];

  try {
    if (cadenceType === CadenceType.EMAIL_ONLY) {
      cadenceItems = JSON.parse(userSettings.emailOnlyCadence);
    } else if (cadenceType === CadenceType.HYBRID) {
      cadenceItems = JSON.parse(userSettings.hybridCadence);
    } else {
      return false; // WhatsApp only não envia emails
    }
  } catch (error) {
    console.error('[Scheduler] Failed to parse cadence JSON:', error);
    return false;
  }

  // Filtrar apenas emails desta sequência
  const emailCadenceItem = cadenceItems.find(
    (item) => item.type === "email" && item.messageNumber === sequenceNumber
  );

  if (!emailCadenceItem) {
    console.log(`[Scheduler] No cadence item for email ${sequenceNumber}`);
    return false;
  }

  // Email 1: Envia imediatamente após enrichment (se for o dia correto)
  if (sequenceNumber === 1) {
    if (lead.status !== LeadStatus.ENRICHED) return false;
    return isCorrectDayAndTime(emailCadenceItem);
  }

  // Email 2 ou 3: Verificar se mensagem anterior foi enviada
  const previousEmailNumber = sequenceNumber - 1;
  const previousEmail = lead.emails.find((e) => e.sequenceNumber === previousEmailNumber);

  if (!previousEmail || previousEmail.status !== EmailStatus.SENT || !previousEmail.sentAt) {
    return false;
  }

  // Verificar se já passou o dia correto desde a última mensagem
  return hasCorrectDaysPassed(previousEmail.sentAt, emailCadenceItem);
}

/**
 * Calcula o delay automático para emails baseado na janela de horário e limite
 * @param userSettings Configurações do usuário
 * @returns Delay em milissegundos
 */
export function getRandomDelay(userSettings: UserSettings): number {
  return calculateAutoDelay(
    (userSettings as any).emailBusinessHourStart || 9,
    (userSettings as any).emailBusinessHourEnd || 18,
    userSettings.dailyEmailLimit
  );
}

/**
 * Adiciona footer de unsubscribe no corpo do email
 */
export function addUnsubscribeFooter(
  body: string,
  optOutToken: string
): string {
  const unsubUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/unsubscribe?token=${optOutToken}`;

  return `
    ${body}

    <hr style="margin-top: 40px; border: none; border-top: 1px solid #eee;">
    <p style="font-size: 11px; color: #999; text-align: center;">
      Se não deseja receber mais emails,
      <a href="${unsubUrl}" style="color: #666; text-decoration: underline;">clique aqui para cancelar</a>.
    </p>
  `;
}


/**
 * Calcula quanto tempo falta para o próximo email poder ser enviado
 * Útil para logging e debugging
 */
export function getTimeUntilNextEmail(
  email: EmailWithLead,
  userSettings: UserSettings
): number | null {
  const { sequenceNumber, lead } = email;

  if (sequenceNumber === 1) {
    return 0; // Pode enviar imediatamente
  }

  if (sequenceNumber === 2) {
    const email1 = lead.emails.find((e) => e.sequenceNumber === 1);
    if (!email1?.sentAt) return null;

    const delayMs = userSettings.email2DelayDays * 24 * 60 * 60 * 1000;
    const timeSinceEmail1 = Date.now() - email1.sentAt.getTime();
    return Math.max(0, delayMs - timeSinceEmail1);
  }

  if (sequenceNumber === 3) {
    const email2 = lead.emails.find((e) => e.sequenceNumber === 2);
    if (!email2?.sentAt) return null;

    const delayMs = userSettings.email3DelayDays * 24 * 60 * 60 * 1000;
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
