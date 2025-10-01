export const CUSTO_BASICO = 0.25;
export const CUSTO_COMPLETO = 1;

export function useCampaignCost(
  quantidade: number,
  nivelServico: "basico" | "completo"
): number {
  return nivelServico === "basico"
    ? quantidade * CUSTO_BASICO
    : quantidade * CUSTO_COMPLETO;
}
