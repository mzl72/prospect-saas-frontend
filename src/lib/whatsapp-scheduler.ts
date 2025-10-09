/**
 * Lógica de scheduling e timing de mensagens WhatsApp
 * Determina quando cada mensagem deve ser enviada baseado em configurações do usuário
 */

import {
  WhatsAppMessage,
  WhatsAppStatus,
  Lead,
  LeadStatus,
  UserSettings,
  CadenceType,
  EmailStatus,
} from '@prisma/client'
import { isWithinBusinessHours, isCorrectDayAndTime, hasCorrectDaysPassed, calculateAutoDelay } from './scheduling-utils';

type WhatsAppMessageWithLead = WhatsAppMessage & {
  lead: Lead & {
    whatsappMessages: WhatsAppMessage[]
    emails: any[] // Para verificar no modo híbrido
  }
}

interface CadenceItem {
  type: "email" | "whatsapp";
  messageNumber: 1 | 2 | 3;
  dayOfWeek: number; // 0-6 (0=Dom)
  timeWindow: string; // "09:00-11:00"
  daysAfterPrevious: number; // Dias desde a mensagem anterior
}

/**
 * Verifica se uma mensagem WhatsApp pode ser enviada agora
 * Usa o novo sistema de cadências JSON
 */
export function canSendWhatsApp(
  message: WhatsAppMessageWithLead,
  userSettings: UserSettings
): boolean {
  const { sequenceNumber, lead } = message

  // Verificações básicas - sempre bloqueiam envio
  if (lead.optedOutAt) return false
  if (lead.status === LeadStatus.REPLIED) return false
  if (lead.status === LeadStatus.OPTED_OUT) return false
  if (!lead.telefone) return false

  // Verificar horário comercial (se configurado)
  if (userSettings.sendOnlyBusinessHours) {
    const whatsappHourStart = (userSettings as any).whatsappBusinessHourStart || 9;
    const whatsappHourEnd = (userSettings as any).whatsappBusinessHourEnd || 18;
    if (!isWithinBusinessHours(whatsappHourStart, whatsappHourEnd)) {
      console.log('[WhatsApp Scheduler] Outside business hours, skipping')
      return false
    }
  }

  // Determinar qual cadência usar
  const cadenceType = lead.cadenceType || CadenceType.WHATSAPP_ONLY
  let cadenceItems: CadenceItem[] = []

  try {
    if (cadenceType === CadenceType.WHATSAPP_ONLY) {
      if (!userSettings.whatsappOnlyCadence) {
        console.error('[WhatsApp Scheduler] whatsappOnlyCadence is empty or undefined')
        return false
      }
      cadenceItems = JSON.parse(userSettings.whatsappOnlyCadence)
    } else if (cadenceType === CadenceType.HYBRID) {
      if (!userSettings.hybridCadence) {
        console.error('[WhatsApp Scheduler] hybridCadence is empty or undefined')
        return false
      }
      cadenceItems = JSON.parse(userSettings.hybridCadence)
    } else {
      return false // Email only não envia WhatsApp
    }

    // Validar se é array
    if (!Array.isArray(cadenceItems)) {
      console.error('[WhatsApp Scheduler] Cadence is not an array:', cadenceItems)
      return false
    }

    // Validar se array não está vazio
    if (cadenceItems.length === 0) {
      console.error('[WhatsApp Scheduler] Cadence array is empty')
      return false
    }
  } catch (error) {
    console.error('[WhatsApp Scheduler] Failed to parse cadence JSON:', error)
    return false
  }

  // Filtrar apenas WhatsApp desta sequência
  const whatsappCadenceItem = cadenceItems.find(
    (item) => item.type === "whatsapp" && item.messageNumber === sequenceNumber
  )

  if (!whatsappCadenceItem) {
    console.log(`[WhatsApp Scheduler] No cadence item for whatsapp ${sequenceNumber}`)
    return false
  }

  // WhatsApp 1: Envia após enrichment (se for o dia correto)
  if (sequenceNumber === 1) {
    if (lead.status !== LeadStatus.ENRICHED) return false

    // No modo híbrido, pode precisar esperar o Email 1
    if (cadenceType === CadenceType.HYBRID) {
      const previousMessageInCadence = findPreviousMessageInCadence(cadenceItems, whatsappCadenceItem)
      if (previousMessageInCadence) {
        return hasPreviousMessageBeenSent(lead, previousMessageInCadence, whatsappCadenceItem)
      }
    }

    return isCorrectDayAndTime(whatsappCadenceItem)
  }

  // WhatsApp 2 ou 3: Verificar se mensagem anterior foi enviada
  const previousMessageInCadence = findPreviousMessageInCadence(cadenceItems, whatsappCadenceItem)

  if (!previousMessageInCadence) {
    console.log('[WhatsApp Scheduler] No previous message in cadence')
    return false
  }

  return hasPreviousMessageBeenSent(lead, previousMessageInCadence, whatsappCadenceItem)
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
  )

  if (currentIndex <= 0) return null
  return cadenceItems[currentIndex - 1]
}

/**
 * Verifica se a mensagem anterior (email ou whatsapp) foi enviada
 */
function hasPreviousMessageBeenSent(
  lead: Lead & { whatsappMessages: WhatsAppMessage[], emails: any[] },
  previousMessage: CadenceItem,
  currentMessage: CadenceItem
): boolean {
  let previousSentAt: Date | null = null

  if (previousMessage.type === "whatsapp") {
    const prevWhatsApp = lead.whatsappMessages.find(
      (w) => w.sequenceNumber === previousMessage.messageNumber
    )
    if (!prevWhatsApp || prevWhatsApp.status !== WhatsAppStatus.SENT || !prevWhatsApp.sentAt) {
      return false
    }
    previousSentAt = prevWhatsApp.sentAt
  } else {
    const prevEmail = lead.emails.find(
      (e: any) => e.sequenceNumber === previousMessage.messageNumber
    )
    if (!prevEmail || prevEmail.status !== EmailStatus.SENT || !prevEmail.sentAt) {
      return false
    }
    previousSentAt = prevEmail.sentAt
  }

  // Verificar se já passou o dia correto desde a última mensagem
  return hasCorrectDaysPassed(previousSentAt, currentMessage)
}

/**
 * Calcula o delay automático para WhatsApp baseado na janela de horário e limite
 * @param userSettings Configurações do usuário
 * @returns Delay em milissegundos
 */
export function getRandomDelay(userSettings: UserSettings): number {
  return calculateAutoDelay(
    (userSettings as any).whatsappBusinessHourStart || 9,
    (userSettings as any).whatsappBusinessHourEnd || 18,
    (userSettings as any).whatsappDailyLimit || userSettings.dailyEmailLimit
  );
}


/**
 * Adiciona rodapé de opt-out na mensagem WhatsApp
 * @param message Mensagem original
 * @param optOutToken Token de opt-out do lead
 * @returns Mensagem com rodapé
 */
export function addOptOutFooter(message: string, optOutToken: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const optOutUrl = `${appUrl}/api/unsubscribe?token=${optOutToken}`

  return `${message}

---
_Para não receber mais mensagens, clique aqui: ${optOutUrl}_`
}
