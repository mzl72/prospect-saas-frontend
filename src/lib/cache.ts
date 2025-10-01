/**
 * Utilitários para invalidação de cache do React Query
 * Usado principalmente por webhooks N8N para atualizar dados em tempo real
 */

import { getQueryClient } from "./react-query";

/**
 * Invalida cache de campanhas (lista e detalhes)
 */
export function invalidateCampaigns(campaignId?: string) {
  const queryClient = getQueryClient();
  if (!queryClient) return;

  // Invalida lista de campanhas
  queryClient.invalidateQueries({ queryKey: ["campaigns"] });

  // Se campaignId fornecido, invalida detalhes específicos
  if (campaignId) {
    queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });
  }
}

/**
 * Invalida cache de leads de uma campanha
 */
export function invalidateLeads(campaignId: string, leadId?: string) {
  const queryClient = getQueryClient();
  if (!queryClient) return;

  // Invalida detalhes da campanha (contém leads)
  queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });

  // Se leadId fornecido, invalida lead específico
  if (leadId) {
    queryClient.invalidateQueries({ queryKey: ["lead", leadId] });
  }
}

/**
 * Invalida todos os dados relacionados a uma campanha
 */
export function invalidateAllCampaignData(campaignId: string) {
  const queryClient = getQueryClient();
  if (!queryClient) return;

  queryClient.invalidateQueries({ queryKey: ["campaigns"] });
  queryClient.invalidateQueries({ queryKey: ["campaign", campaignId] });
}

/**
 * Atualiza otimisticamente o status de uma campanha no cache
 */
export function updateCampaignStatusOptimistic(
  campaignId: string,
  newStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"
) {
  const queryClient = getQueryClient();
  if (!queryClient) return;

  // Atualiza na lista de campanhas
  queryClient.setQueryData(["campaigns"], (oldData: any) => {
    if (!Array.isArray(oldData)) return oldData;
    return oldData.map((campaign: any) =>
      campaign.id === campaignId ? { ...campaign, status: newStatus } : campaign
    );
  });

  // Atualiza nos detalhes da campanha
  queryClient.setQueryData(["campaign", campaignId], (oldData: any) => {
    if (!oldData) return oldData;
    return { ...oldData, status: newStatus };
  });
}

/**
 * Atualiza otimisticamente contador de leads no cache
 */
export function updateLeadCountOptimistic(campaignId: string, increment: number) {
  const queryClient = getQueryClient();
  if (!queryClient) return;

  queryClient.setQueryData(["campaign", campaignId], (oldData: any) => {
    if (!oldData || !oldData.stats) return oldData;
    return {
      ...oldData,
      stats: {
        ...oldData.stats,
        extracted: (oldData.stats.extracted || 0) + increment,
      },
    };
  });
}
