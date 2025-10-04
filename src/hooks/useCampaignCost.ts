/**
 * Hook para cálculo de custo de campanhas
 * Usa o serviço centralizado de pricing
 */

import { calculateCampaignCost } from "@/lib/pricing-service";
import { PRICING } from "@/lib/constants";

// Re-export constants para compatibilidade
export { PRICING } from "@/lib/constants";
export const CUSTO_BASICO = PRICING.BASICO;
export const CUSTO_COMPLETO = PRICING.COMPLETO;

/**
 * Hook para calcular custo da campanha
 * @deprecated Use calculateCampaignCost from pricing-service directly
 */
export function useCampaignCost(
  quantidade: number,
  nivelServico: "basico" | "completo"
): number {
  return calculateCampaignCost(quantidade, nivelServico.toUpperCase() as 'BASICO' | 'COMPLETO');
}
