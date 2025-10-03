/**
 * Utilitários compartilhados para scheduling de mensagens (Email e WhatsApp)
 * Centraliza lógica comum para evitar duplicação
 */

import { UserSettings } from '@prisma/client'

/**
 * Verifica se está dentro do horário comercial configurado
 * Aplicável tanto para emails quanto para WhatsApp
 */
export function isWithinBusinessHours(userSettings: UserSettings): boolean {
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
 * Gera um delay aleatório entre envios para humanizar o comportamento
 * Usado tanto em emails quanto em WhatsApp
 *
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
 * Usado para emails e WhatsApp
 *
 * @param sentToday Quantidade já enviada hoje
 * @param userSettings Configurações do usuário
 * @returns true se pode enviar mais
 */
export function canSendMoreToday(
  sentToday: number,
  userSettings: UserSettings
): boolean {
  return sentToday < userSettings.dailyEmailLimit
}

/**
 * Calcula o delay em milissegundos baseado em dias
 *
 * @param days Número de dias
 * @returns Milissegundos equivalentes
 */
export function daysToMilliseconds(days: number): number {
  return days * 24 * 60 * 60 * 1000
}

/**
 * Formata milissegundos para string legível (ex: "2 dias, 5 horas")
 * Útil para logs e debugging
 */
export function formatTimeRemaining(ms: number): string {
  const days = Math.floor(ms / (24 * 60 * 60 * 1000))
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000))

  if (days > 0) {
    return `${days} dia${days > 1 ? 's' : ''}, ${hours} hora${hours !== 1 ? 's' : ''}`
  }
  if (hours > 0) {
    return `${hours} hora${hours !== 1 ? 's' : ''}, ${minutes} minuto${minutes !== 1 ? 's' : ''}`
  }
  return `${minutes} minuto${minutes !== 1 ? 's' : ''}`
}

/**
 * Verifica se já passou tempo suficiente desde o último envio
 *
 * @param lastSentAt Data do último envio
 * @param delayDays Número de dias de delay configurado
 * @returns true se pode enviar
 */
export function hasPassedDelay(lastSentAt: Date, delayDays: number): boolean {
  const delayMs = daysToMilliseconds(delayDays)
  const timeSinceLast = Date.now() - lastSentAt.getTime()
  return timeSinceLast >= delayMs
}
