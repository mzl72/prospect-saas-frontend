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
} from '@prisma/client'

type WhatsAppMessageWithLead = WhatsAppMessage & {
  lead: Lead & {
    whatsappMessages: WhatsAppMessage[]
  }
}

/**
 * Verifica se uma mensagem WhatsApp pode ser enviada agora
 * Considera: timing, opt-out, replies, horário comercial, etc
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
  if (!lead.telefone) return false // Sem telefone do lead

  // Verificar horário comercial (se configurado)
  if (userSettings.sendOnlyBusinessHours) {
    if (!isWithinBusinessHours(userSettings)) {
      console.log('[WhatsApp Scheduler] Outside business hours, skipping')
      return false
    }
  }

  // WhatsApp 1: Envia imediatamente após enrichment
  if (sequenceNumber === 1) {
    return lead.status === LeadStatus.ENRICHED
  }

  // WhatsApp 2: Aguardar delay configurado após WhatsApp 1
  if (sequenceNumber === 2) {
    const whatsapp1 = lead.whatsappMessages.find((w) => w.sequenceNumber === 1)
    if (!whatsapp1 || whatsapp1.status !== WhatsAppStatus.SENT) return false
    if (!whatsapp1.sentAt) return false

    const delayMs = userSettings.email2DelayDays * 24 * 60 * 60 * 1000
    const timeSinceWhatsApp1 = Date.now() - whatsapp1.sentAt.getTime()
    return timeSinceWhatsApp1 >= delayMs
  }

  // WhatsApp 3: Aguardar delay configurado após WhatsApp 2
  if (sequenceNumber === 3) {
    const whatsapp2 = lead.whatsappMessages.find((w) => w.sequenceNumber === 2)
    if (!whatsapp2 || whatsapp2.status !== WhatsAppStatus.SENT) return false
    if (!whatsapp2.sentAt) return false

    const delayMs = userSettings.email3DelayDays * 24 * 60 * 60 * 1000
    const timeSinceWhatsApp2 = Date.now() - whatsapp2.sentAt.getTime()
    return timeSinceWhatsApp2 >= delayMs
  }

  return false
}

/**
 * Verifica se está dentro do horário comercial configurado
 */
function isWithinBusinessHours(userSettings: UserSettings): boolean {
  const now = new Date()
  const currentHour = now.getHours()
  const currentDay = now.getDay() // 0 = Domingo, 6 = Sábado

  // Não enviar nos fins de semana
  if (currentDay === 0 || currentDay === 6) {
    return false
  }

  // Verificar hora
  return (
    currentHour >= userSettings.businessHourStart &&
    currentHour < userSettings.businessHourEnd
  )
}

/**
 * Gera um delay aleatório entre envios (humaniza o envio)
 * @param userSettings Configurações do usuário
 * @returns Delay em milissegundos
 */
export function getRandomDelay(userSettings: UserSettings): number {
  const min = userSettings.sendDelayMinMs
  const max = userSettings.sendDelayMaxMs
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Verifica se ainda pode enviar mais mensagens hoje (limite diário)
 * @param sentToday Quantidade já enviada hoje
 * @param userSettings Configurações do usuário
 * @returns true se pode enviar mais
 */
export function canSendMoreToday(
  sentToday: number,
  userSettings: UserSettings
): boolean {
  return sentToday < userSettings.dailyEmailLimit // Usa mesmo limite que emails
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
