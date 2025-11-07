/**
 * Scheduler Base Unificado - Consolida lógica de email-scheduler e whatsapp-scheduler
 * Centraliza validações, cálculos de timing e manipulação de cadências
 */

import {
  Email,
  EmailStatus,
  WhatsAppMessage,
  WhatsAppStatus,
  Lead,
  LeadStatus,
  UserSettings,
  CadenceType,
} from '@prisma/client';
import {
  isWithinBusinessHours,
  isCorrectDayAndTime,
  hasCorrectDaysPassed,
  calculateAutoDelay,
} from './scheduling-utils';

// ========================================
// TYPES
// ========================================

export interface CadenceItem {
  type: 'email' | 'whatsapp';
  messageNumber: 1 | 2 | 3;
  dayOfWeek: number; // 0-6 (0=Dom)
  timeWindow: string; // "09:00-11:00"
  daysAfterPrevious: number;
}

type MessageWithLead =
  | (Email & { lead: Lead & { emails: Email[]; whatsappMessages: WhatsAppMessage[] } })
  | (WhatsAppMessage & { lead: Lead & { emails: Email[]; whatsappMessages: WhatsAppMessage[] } });

// ========================================
// UNIFIED SCHEDULER LOGIC
// ========================================

/**
 * Verifica se uma mensagem (email ou whatsapp) pode ser enviada agora
 */
export function canSendMessage(
  message: MessageWithLead,
  userSettings: UserSettings,
  channel: 'email' | 'whatsapp'
): boolean {
  const { sequenceNumber, lead } = message;

  // Verificações básicas - sempre bloqueiam envio
  if (lead.optedOutAt) return false;
  if (lead.status === LeadStatus.REPLIED) return false;
  if (lead.status === LeadStatus.OPTED_OUT) return false;
  if (lead.status === LeadStatus.BOUNCED && channel === 'email') return false;

  // Validar campo obrigatório específico do canal
  if (channel === 'email' && !lead.email) return false;
  if (channel === 'whatsapp' && !lead.telefone) return false;

  // Verificar horário comercial (se configurado)
  if (userSettings.sendOnlyBusinessHours) {
    const hourStart =
      channel === 'email'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? (userSettings as any).emailBusinessHourStart || 9
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        : (userSettings as any).whatsappBusinessHourStart || 9;
    const hourEnd =
      channel === 'email'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? (userSettings as any).emailBusinessHourEnd || 18
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        : (userSettings as any).whatsappBusinessHourEnd || 18;

    if (!isWithinBusinessHours(hourStart, hourEnd)) {
      console.log(`[${channel} Scheduler] Outside business hours, skipping`);
      return false;
    }
  }

  // Obter e validar cadência
  const cadenceItems = getCadenceItems(lead.cadenceType, userSettings, channel);
  if (!cadenceItems) return false;

  // Filtrar item da cadência para este canal + sequência
  const cadenceItem = cadenceItems.find(
    (item) => item.type === channel && item.messageNumber === sequenceNumber
  );

  if (!cadenceItem) {
    console.log(`[Scheduler] No cadence item for ${channel} ${sequenceNumber}`);
    return false;
  }

  // Mensagem 1: Envia após enrichment (se for o dia correto)
  if (sequenceNumber === 1) {
    if (lead.status !== LeadStatus.ENRICHED) return false;

    // Modo híbrido pode exigir mensagem anterior
    if (lead.cadenceType === CadenceType.HYBRID) {
      const previousMessage = findPreviousMessageInCadence(cadenceItems, cadenceItem);
      if (previousMessage) {
        return hasPreviousMessageBeenSent(lead, previousMessage, cadenceItem);
      }
    }

    return isCorrectDayAndTime(cadenceItem);
  }

  // Mensagem 2 ou 3: Verificar se mensagem anterior foi enviada
  const previousMessage = findPreviousMessageInCadence(cadenceItems, cadenceItem);
  if (!previousMessage) {
    console.log(`[${channel} Scheduler] No previous message in cadence`);
    return false;
  }

  return hasPreviousMessageBeenSent(lead, previousMessage, cadenceItem);
}

/**
 * Obtém e valida cadência JSON do usuário
 */
function getCadenceItems(
  cadenceType: CadenceType | null,
  userSettings: UserSettings,
  channel: 'email' | 'whatsapp'
): CadenceItem[] | null {
  const type = cadenceType || (channel === 'email' ? CadenceType.EMAIL_ONLY : CadenceType.WHATSAPP_ONLY);

  let cadenceJson: string | null = null;

  if (type === CadenceType.EMAIL_ONLY && channel === 'email') {
    cadenceJson = userSettings.emailOnlyCadence;
  } else if (type === CadenceType.WHATSAPP_ONLY && channel === 'whatsapp') {
    cadenceJson = userSettings.whatsappOnlyCadence;
  } else if (type === CadenceType.HYBRID) {
    cadenceJson = userSettings.hybridCadence;
  } else {
    return null; // Canal incompatível com tipo de cadência
  }

  if (!cadenceJson) {
    console.error(`[Scheduler] ${type} cadence is empty or undefined`);
    return null;
  }

  try {
    const items = JSON.parse(cadenceJson);
    if (!Array.isArray(items) || items.length === 0) {
      console.error('[Scheduler] Cadence is not a valid array:', items);
      return null;
    }
    return items;
  } catch (error) {
    console.error('[Scheduler] Failed to parse cadence JSON:', error);
    return null;
  }
}

/**
 * Encontra a mensagem anterior na cadência (pode ser email ou whatsapp)
 */
function findPreviousMessageInCadence(
  cadenceItems: CadenceItem[],
  currentItem: CadenceItem
): CadenceItem | null {
  const currentIndex = cadenceItems.findIndex(
    (item) => item.type === currentItem.type && item.messageNumber === currentItem.messageNumber
  );

  if (currentIndex <= 0) return null;
  return cadenceItems[currentIndex - 1];
}

/**
 * Verifica se a mensagem anterior (email ou whatsapp) foi enviada
 */
function hasPreviousMessageBeenSent(
  lead: Lead & { whatsappMessages: WhatsAppMessage[]; emails: Email[] },
  previousMessage: CadenceItem,
  currentMessage: CadenceItem
): boolean {
  let previousSentAt: Date | null = null;

  if (previousMessage.type === 'whatsapp') {
    const prevWhatsApp = lead.whatsappMessages.find(
      (w) => w.sequenceNumber === previousMessage.messageNumber
    );
    if (!prevWhatsApp || prevWhatsApp.status !== WhatsAppStatus.SENT || !prevWhatsApp.sentAt) {
      return false;
    }
    previousSentAt = prevWhatsApp.sentAt;
  } else {
    const prevEmail = lead.emails.find((e) => e.sequenceNumber === previousMessage.messageNumber);
    if (!prevEmail || prevEmail.status !== EmailStatus.SENT || !prevEmail.sentAt) {
      return false;
    }
    previousSentAt = prevEmail.sentAt;
  }

  if (!previousSentAt) return false;
  return hasCorrectDaysPassed(previousSentAt, currentMessage);
}

// ========================================
// DELAY CALCULATIONS
// ========================================

/**
 * Calcula delay aleatório para email
 */
export function getEmailDelay(userSettings: UserSettings): number {
  return calculateAutoDelay(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (userSettings as any).emailBusinessHourStart || 9,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (userSettings as any).emailBusinessHourEnd || 18,
    userSettings.dailyEmailLimit
  );
}

/**
 * Calcula delay aleatório para WhatsApp
 */
export function getWhatsAppDelay(userSettings: UserSettings): number {
  return calculateAutoDelay(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (userSettings as any).whatsappBusinessHourStart || 9,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (userSettings as any).whatsappBusinessHourEnd || 18,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (userSettings as any).whatsappDailyLimit || userSettings.dailyEmailLimit
  );
}

/**
 * Gera delay aleatório dentro de uma janela de tempo (função legada)
 */
export function getRandomDelay(minMinutes: number, maxMinutes: number): number {
  const minMs = minMinutes * 60 * 1000;
  const maxMs = maxMinutes * 60 * 1000;
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

// ========================================
// FOOTER UTILITIES
// ========================================

/**
 * Adiciona footer padrão ao conteúdo
 */
export function addFooter(
  content: string,
  footerType: 'email' | 'whatsapp',
  optOutToken?: string
): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const unsubscribeLink = optOutToken ? `${baseUrl}/api/unsubscribe?token=${optOutToken}` : '';

  if (footerType === 'email') {
    const emailFooter = `

---

Se você não deseja mais receber nossos emails, clique aqui: ${unsubscribeLink || '[link de descadastro]'}`;
    return content + emailFooter;
  }

  // WhatsApp
  const whatsappFooter = `

_Para parar de receber mensagens, responda com "PARAR"_`;
  return content + whatsappFooter;
}

