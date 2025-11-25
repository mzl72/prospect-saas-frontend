/**
 * Serviço centralizado de cálculo de preços e créditos
 * SINGLE SOURCE OF TRUTH para todos os cálculos de custo
 */

import { CampaignType } from '@prisma/client'
import { PRICING } from './constants'

/**
 * Calcula o custo total de uma campanha em créditos
 * @param quantidade Número de leads solicitados
 * @param tipo Tipo da campanha (BASICO ou COMPLETO)
 * @returns Custo total em créditos
 */
export function calculateCampaignCost(
  quantidade: number,
  tipo: CampaignType | 'BASICO' | 'COMPLETO'
): number {
  const pricePerLead = tipo === 'BASICO' ? PRICING.BASICO : PRICING.COMPLETO
  return quantidade * pricePerLead
}

/**
 * Calcula o custo de leads individuais
 * @param count Número de leads
 * @param tipo Tipo da campanha
 * @returns Custo em créditos
 */
export function calculateLeadsCost(
  count: number,
  tipo: CampaignType | 'BASICO' | 'COMPLETO'
): number {
  return calculateCampaignCost(count, tipo)
}

/**
 * Calcula reembolso baseado em duplicatas e leads insuficientes
 * @param leadsRequested Quantidade solicitada
 * @param leadsReceived Quantidade recebida da API
 * @param leadsDuplicated Quantidade de duplicados
 * @param tipo Tipo da campanha
 * @returns Créditos a reembolsar
 */
export function calculateRefund(
  leadsRequested: number,
  leadsReceived: number,
  leadsDuplicated: number,
  tipo: CampaignType | 'BASICO' | 'COMPLETO'
): number {
  const insufficientCount = Math.max(0, leadsRequested - leadsReceived)
  const totalNotCreated = leadsDuplicated + insufficientCount
  const pricePerLead = tipo === 'BASICO' ? PRICING.BASICO : PRICING.COMPLETO

  return totalNotCreated * pricePerLead
}

/**
 * Valida se usuário tem créditos suficientes
 * @param userCredits Créditos disponíveis do usuário
 * @param quantidade Quantidade de leads
 * @param tipo Tipo da campanha
 * @returns true se tem créditos suficientes
 */
export function hasEnoughCredits(
  userCredits: number,
  quantidade: number,
  tipo: CampaignType | 'BASICO' | 'COMPLETO'
): boolean {
  const cost = calculateCampaignCost(quantidade, tipo)
  return userCredits >= cost
}

/**
 * Calcula créditos restantes após operação
 * @param currentCredits Créditos atuais
 * @param cost Custo da operação
 * @returns Créditos restantes
 */
export function calculateRemainingCredits(
  currentCredits: number,
  cost: number
): number {
  return Math.max(0, currentCredits - cost)
}

/**
 * Formata valor de créditos para exibição
 * @param credits Quantidade de créditos
 * @returns String formatada (ex: "10.50")
 */
export function formatCredits(credits: number): string {
  return credits.toFixed(2)
}

/**
 * Calcula desconto baseado em quantidade (exemplo de lógica de negócio futura)
 * @param quantidade Número de leads
 * @returns Percentual de desconto (0-1)
 */
export function calculateDiscount(quantidade: number): number {
  if (quantidade >= 200) return 0.15 // 15% de desconto para 200+
  if (quantidade >= 100) return 0.10 // 10% de desconto para 100+
  if (quantidade >= 40) return 0.05  // 5% de desconto para 40+
  return 0 // Sem desconto
}

/**
 * Calcula preço final com desconto aplicado
 * @param quantidade Número de leads
 * @param tipo Tipo da campanha
 * @returns Custo com desconto aplicado
 */
export function calculateFinalPrice(
  quantidade: number,
  tipo: CampaignType | 'BASICO' | 'COMPLETO'
): {
  baseCost: number
  discount: number
  discountAmount: number
  finalCost: number
} {
  const baseCost = calculateCampaignCost(quantidade, tipo)
  const discount = calculateDiscount(quantidade)
  const discountAmount = baseCost * discount
  const finalCost = baseCost - discountAmount

  return {
    baseCost,
    discount,
    discountAmount,
    finalCost,
  }
}
