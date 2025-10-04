/**
 * Utilitários para invalidação de cache do React Query
 * Usado principalmente por webhooks N8N para atualizar dados em tempo real
 */

import { getQueryClient } from "./react-query";
import { CampaignStatus } from "@prisma/client";

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

// Funções de atualização otimista removidas - não eram utilizadas no código
// O sistema usa invalidação simples via webhooks para atualizar dados
