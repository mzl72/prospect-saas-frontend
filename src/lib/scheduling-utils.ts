/**
 * Utilitários compartilhados para scheduling de mensagens (Email e WhatsApp)
 * Centraliza lógica comum para evitar duplicação
 */

import type { CadenceItem } from './base-scheduler'

// Constantes para cálculo de delay automático
const DELAY_VARIATION = {
  MIN: 0.75,  // -25% para garantir que não exceda o limite diário
  MAX: 1.10,  // +10% para randomização e naturalidade
} as const

/**
 * Verifica se está dentro do horário comercial configurado
 * Aplicável tanto para emails quanto para WhatsApp
 *
 * @param businessHourStart Hora de início (ex: 9)
 * @param businessHourEnd Hora de fim (ex: 18)
 */
export function isWithinBusinessHours(
  businessHourStart: number,
  businessHourEnd: number
): boolean {
  const now = new Date()
  const currentHour = now.getHours()
  const currentDay = now.getDay() // 0 = Domingo, 6 = Sábado

  // Não enviar nos fins de semana
  if (currentDay === 0 || currentDay === 6) {
    return false
  }

  // Verificar hora
  return (
    currentHour >= businessHourStart &&
    currentHour < businessHourEnd
  )
}

/**
 * Verifica se hoje é o dia correto da semana e se está dentro da janela de tempo
 */
export function isCorrectDayAndTime(cadenceItem: CadenceItem): boolean {
  try {
    const now = new Date();
    const currentDay = now.getDay(); // 0-6 (0=Dom)

    // Verificar dia da semana
    if (currentDay !== cadenceItem.dayOfWeek) {
      return false;
    }

    // Verificar janela de tempo
    if (!cadenceItem.timeWindow || typeof cadenceItem.timeWindow !== 'string') {
      console.error('[Scheduling Utils] Invalid timeWindow:', cadenceItem.timeWindow);
      return false;
    }

    const [startTime, endTime] = cadenceItem.timeWindow.split('-');
    if (!startTime || !endTime) {
      console.error('[Scheduling Utils] Invalid timeWindow format:', cadenceItem.timeWindow);
      return false;
    }

    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    // Validar se os números são válidos
    if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute)) {
      console.error('[Scheduling Utils] Invalid time values in timeWindow:', cadenceItem.timeWindow);
      return false;
    }

    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    const startTimeInMinutes = startHour * 60 + startMinute;
    const endTimeInMinutes = endHour * 60 + endMinute;

    return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes;
  } catch (error) {
    console.error('[Scheduling Utils] Error parsing cadence timeWindow:', error);
    return false;
  }
}

/**
 * Verifica se já passou tempo suficiente desde a última mensagem
 * para enviar a próxima no dia correto
 */
export function hasCorrectDaysPassed(lastSentAt: Date, cadenceItem: CadenceItem): boolean {
  const now = new Date();
  const currentDay = now.getDay();

  // Deve ser o dia correto
  if (currentDay !== cadenceItem.dayOfWeek) {
    return false;
  }

  // Calcular dias desde a última mensagem (arredondado)
  const daysSinceLastSent = Math.floor((now.getTime() - lastSentAt.getTime()) / (24 * 60 * 60 * 1000));

  // CORREÇÃO: Usar daysAfterPrevious da cadence ao invés de fixo em 1
  const requiredDays = cadenceItem.daysAfterPrevious;

  if (daysSinceLastSent < requiredDays) {
    console.log(`[Scheduling Utils] Not enough days passed: ${daysSinceLastSent}/${requiredDays}`);
    return false;
  }

  // Verificar janela de tempo
  return isCorrectDayAndTime(cadenceItem);
}

/**
 * Calcula o delay automático entre mensagens baseado na janela de horário e limite diário
 *
 * Exemplo:
 * - Janela: 9h - 18h (9 horas = 540 minutos)
 * - Limite: 60 mensagens/dia
 * - Intervalo médio: 540 / 60 = 9 minutos
 * - Delay retornado: aleatório entre 6.75-9.9 minutos (-25% a +10% para não extrapolar limite)
 *
 * @param businessHourStart Hora de início (ex: 9)
 * @param businessHourEnd Hora de fim (ex: 18)
 * @param dailyLimit Limite diário de mensagens (ex: 60)
 * @returns Delay em milissegundos
 */
export function calculateAutoDelay(
  businessHourStart: number,
  businessHourEnd: number,
  dailyLimit: number
): number {
  // Calcular total de minutos na janela de horário
  const totalHours = businessHourEnd - businessHourStart
  const totalMinutes = totalHours * 60

  // Calcular intervalo médio entre mensagens
  const avgIntervalMinutes = totalMinutes / dailyLimit

  // Variação assimétrica: -25% a +10% (para garantir que não extrapole o limite)
  const minInterval = avgIntervalMinutes * DELAY_VARIATION.MIN
  const maxInterval = avgIntervalMinutes * DELAY_VARIATION.MAX

  // Gerar intervalo aleatório
  const randomInterval = Math.random() * (maxInterval - minInterval) + minInterval

  // Converter para milissegundos
  return Math.floor(randomInterval * 60 * 1000)
}

/**
 * Verifica se ainda pode enviar mais mensagens hoje (limite diário)
 * Usado para emails, WhatsApp e híbrido
 *
 * @param sentToday Quantidade já enviada hoje
 * @param dailyLimit Limite diário configurado
 * @returns true se pode enviar mais
 */
export function canSendMoreToday(
  sentToday: number,
  dailyLimit: number
): boolean {
  return sentToday < dailyLimit
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

/**
 * Verifica se pode enviar mensagem agora baseado no log de último envio
 *
 * @param nextAllowedAt Próximo horário permitido para envio
 * @returns true se pode enviar
 */
export function canSendNow(nextAllowedAt: Date | null): boolean {
  if (!nextAllowedAt) return true; // Primeiro envio sempre permitido
  return Date.now() >= nextAllowedAt.getTime();
}

/**
 * Calcula o próximo horário permitido para envio
 *
 * @param businessHourStart Hora de início
 * @param businessHourEnd Hora de fim
 * @param dailyLimit Limite diário
 * @returns Data/hora do próximo envio permitido
 */
export function calculateNextAllowedSendTime(
  businessHourStart: number,
  businessHourEnd: number,
  dailyLimit: number
): Date {
  const delayMs = calculateAutoDelay(businessHourStart, businessHourEnd, dailyLimit);
  return new Date(Date.now() + delayMs);
}

/**
 * Determina qual sequenceNumber deve ser enviado a seguir para manter distribuição equilibrada
 *
 * @param sentTodayBySequence Contagem de envios por sequenceNumber hoje
 * @param dailyLimit Limite diário total
 * @returns sequenceNumber (1, 2 ou 3) que deve ser enviado a seguir
 */
export function getNextSequenceToSend(
  sentTodayBySequence: { seq1: number; seq2: number; seq3: number },
  dailyLimit: number
): 1 | 2 | 3 {
  const { seq1, seq2, seq3 } = sentTodayBySequence;
  const limitPerSequence = Math.floor(dailyLimit / 3);

  // Priorizar sequências que estão mais atrasadas em relação ao limite
  if (seq1 < limitPerSequence) return 1;
  if (seq2 < limitPerSequence) return 2;
  if (seq3 < limitPerSequence) return 3;

  // Se todos atingiram o limite equilibrado, escolher o menor
  if (seq1 <= seq2 && seq1 <= seq3) return 1;
  if (seq2 <= seq1 && seq2 <= seq3) return 2;
  return 3;
}
