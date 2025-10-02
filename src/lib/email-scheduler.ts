/**
 * Lógica de scheduling e timing de emails
 * Determina quando cada email deve ser enviado baseado em configurações do usuário
 */

import { Email, EmailStatus, Lead, LeadStatus, UserSettings } from '@prisma/client';

type EmailWithLead = Email & {
  lead: Lead & {
    emails: Email[];
  };
};

/**
 * Verifica se um email pode ser enviado agora
 * Considera: timing, opt-out, replies, horário comercial, etc
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
  if (!lead.email) return false; // Sem email do lead

  // Verificar horário comercial (se configurado)
  if (userSettings.sendOnlyBusinessHours) {
    if (!isWithinBusinessHours(userSettings)) {
      console.log('[Scheduler] Outside business hours, skipping');
      return false;
    }
  }

  // Email 1: Envia imediatamente após enrichment
  if (sequenceNumber === 1) {
    return lead.status === LeadStatus.ENRICHED;
  }

  // Email 2: Aguardar delay configurado após Email 1
  if (sequenceNumber === 2) {
    const email1 = lead.emails.find((e) => e.sequenceNumber === 1);
    if (!email1 || email1.status !== EmailStatus.SENT) return false;
    if (!email1.sentAt) return false;

    const delayMs = userSettings.email2DelayDays * 24 * 60 * 60 * 1000;
    const timeSinceEmail1 = Date.now() - email1.sentAt.getTime();
    return timeSinceEmail1 >= delayMs;
  }

  // Email 3: Aguardar delay configurado após Email 2
  if (sequenceNumber === 3) {
    const email2 = lead.emails.find((e) => e.sequenceNumber === 2);
    if (!email2 || email2.status !== EmailStatus.SENT) return false;
    if (!email2.sentAt) return false;

    const delayMs = userSettings.email3DelayDays * 24 * 60 * 60 * 1000;
    const timeSinceEmail2 = Date.now() - email2.sentAt.getTime();
    return timeSinceEmail2 >= delayMs;
  }

  return false;
}

/**
 * Verifica se está dentro do horário comercial configurado
 */
function isWithinBusinessHours(userSettings: UserSettings): boolean {
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.getDay(); // 0 = Domingo, 6 = Sábado

  // Não enviar nos fins de semana
  if (currentDay === 0 || currentDay === 6) {
    return false;
  }

  // Verificar hora
  return (
    currentHour >= userSettings.businessHourStart &&
    currentHour < userSettings.businessHourEnd
  );
}

/**
 * Gera um delay aleatório entre envios (humaniza o envio)
 * @param userSettings Configurações do usuário
 * @returns Delay em milissegundos
 */
export function getRandomDelay(userSettings: UserSettings): number {
  const min = userSettings.sendDelayMinMs;
  const max = userSettings.sendDelayMaxMs;
  return Math.floor(Math.random() * (max - min + 1)) + min;
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
 * Verifica se o limite diário de emails foi atingido
 * @param sentToday Quantidade de emails enviados hoje
 * @param userSettings Configurações do usuário
 * @returns true se ainda pode enviar
 */
export function canSendMoreToday(
  sentToday: number,
  userSettings: UserSettings
): boolean {
  return sentToday < userSettings.dailyEmailLimit;
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
