/**
 * Utilitários compartilhados para componentes de cadência
 * Centraliza lógica de cores, labels e formatação
 */

import type { CadenceItem } from '@/lib/base-scheduler';

// ========================================
// TYPES
// ========================================

export interface HybridCadenceItem extends Omit<CadenceItem, 'messageNumber'> {
  messageNumber: number; // Número sequencial geral (1, 2, 3, 4, 5...)
  emailNumber?: number; // Se for email: 1, 2 ou 3
  whatsappNumber?: number; // Se for whatsapp: 1 ou 2
}

export interface MessageInterval {
  messageNumber: 1 | 2 | 3;
  dayOfWeek: number; // 0-6 (0=Dom, 1=Seg, ..., 6=Sáb)
  timeWindow: string; // "HH:MM-HH:MM" (ex: "09:00-11:00")
  daysAfterPrevious: number; // Dias após a mensagem anterior
}

// ========================================
// COLOR UTILITIES
// ========================================

export interface ColorClasses {
  bg: string;
  text: string;
  icon: string;
  border?: string;
  hover?: string;
}

/**
 * Retorna classes Tailwind para colorização de email/whatsapp
 */
export function getChannelColors(type: 'email' | 'whatsapp'): ColorClasses {
  return type === 'email'
    ? {
        bg: 'bg-blue-100',
        text: 'text-blue-600',
        icon: 'text-blue-600',
        border: 'border-blue-300',
        hover: 'hover:bg-blue-200'
      }
    : {
        bg: 'bg-green-100',
        text: 'text-green-600',
        icon: 'text-green-600',
        border: 'border-green-300',
        hover: 'hover:bg-green-200'
      };
}

/**
 * Retorna string completa de classes para items de cadência
 */
export function getItemColorClasses(type: 'email' | 'whatsapp'): string {
  const colors = getChannelColors(type);
  return `${colors.bg} ${colors.border} ${colors.text} ${colors.hover}`;
}

// ========================================
// LABEL UTILITIES
// ========================================

/**
 * Gera label para mensagem (Email 1, WhatsApp 2, etc.)
 */
export function getMessageLabel(type: 'email' | 'whatsapp', messageNumber: number): string {
  const prefix = type === 'email' ? 'Email' : 'WhatsApp';
  return `${prefix} ${messageNumber}`;
}

/**
 * Gera label para item de cadência híbrida
 */
export function getHybridItemLabel(item: HybridCadenceItem): string {
  if (item.type === 'email') {
    return `Email ${item.emailNumber}`;
  }
  return `WhatsApp ${item.whatsappNumber}`;
}

// ========================================
// TIME UTILITIES
// ========================================

/**
 * Calcula total de dias desde o início da cadência
 */
export function calculateTotalDays(
  messageNumber: number,
  intervals: Array<{ messageNumber: number; daysAfterPrevious: number }>
): number {
  let total = 0;
  for (let i = 1; i <= messageNumber; i++) {
    const interval = intervals.find(int => int.messageNumber === i);
    total += interval?.daysAfterPrevious || 1;
  }
  return total;
}

/**
 * Formata intervalo de tempo em texto legível
 */
export function formatInterval(days: number): string {
  if (days === 1) {
    return '📅 1 dia de intervalo';
  }
  return `📅 ${days} dias de intervalo`;
}
