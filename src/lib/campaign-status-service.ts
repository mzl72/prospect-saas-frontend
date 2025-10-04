/**
 * Serviço centralizado para lógica de status de campanhas
 * Evita duplicação e inconsistências na determinação de status
 */

import { CampaignStatus, CampaignType, LeadStatus } from '@prisma/client';

export interface CampaignStats {
  total: number;
  extracted: number;
  enriched: number;
  email1Sent: number;
  email2Sent: number;
  email3Sent: number;
  whatsapp1Sent: number;
  whatsapp2Sent: number;
  whatsapp3Sent: number;
  replied: number;
  optedOut: number;
  bounced: number;
}

export interface Lead {
  status: LeadStatus;
}

/**
 * Calcula estatísticas de uma campanha baseado nos leads
 */
export function calculateCampaignStats(
  leads: Lead[],
  totalRequested: number
): CampaignStats {
  return {
    total: totalRequested,
    extracted: leads.length,
    enriched: leads.filter(l => l.status !== LeadStatus.EXTRACTED).length,
    email1Sent: leads.filter(l =>
      l.status === LeadStatus.EMAIL_1_SENT ||
      l.status === LeadStatus.EMAIL_2_SENT ||
      l.status === LeadStatus.EMAIL_3_SENT ||
      l.status === LeadStatus.REPLIED
    ).length,
    email2Sent: leads.filter(l =>
      l.status === LeadStatus.EMAIL_2_SENT ||
      l.status === LeadStatus.EMAIL_3_SENT ||
      l.status === LeadStatus.REPLIED
    ).length,
    email3Sent: leads.filter(l =>
      l.status === LeadStatus.EMAIL_3_SENT ||
      l.status === LeadStatus.REPLIED
    ).length,
    whatsapp1Sent: leads.filter(l =>
      l.status === LeadStatus.WHATSAPP_1_SENT ||
      l.status === LeadStatus.WHATSAPP_2_SENT ||
      l.status === LeadStatus.WHATSAPP_3_SENT ||
      l.status === LeadStatus.REPLIED
    ).length,
    whatsapp2Sent: leads.filter(l =>
      l.status === LeadStatus.WHATSAPP_2_SENT ||
      l.status === LeadStatus.WHATSAPP_3_SENT ||
      l.status === LeadStatus.REPLIED
    ).length,
    whatsapp3Sent: leads.filter(l =>
      l.status === LeadStatus.WHATSAPP_3_SENT ||
      l.status === LeadStatus.REPLIED
    ).length,
    replied: leads.filter(l => l.status === LeadStatus.REPLIED).length,
    optedOut: leads.filter(l => l.status === LeadStatus.OPTED_OUT).length,
    bounced: leads.filter(l => l.status === LeadStatus.BOUNCED).length,
  };
}

/**
 * Determina o status correto de uma campanha baseado em suas estatísticas
 * Centraliza toda a lógica de transição de status
 */
export function determineCampaignStatus(
  currentStatus: CampaignStatus,
  campaignType: CampaignType,
  stats: CampaignStats
): CampaignStatus {
  // Se já está FAILED, não mudar
  if (currentStatus === 'FAILED') {
    return 'FAILED';
  }

  // Se todos os leads foram extraídos
  if (stats.extracted >= stats.total) {
    // Se modo COMPLETO e todos foram enriquecidos
    if (campaignType === 'COMPLETO' && stats.enriched >= stats.total) {
      return 'COMPLETED';
    }
    // Se modo BASICO e todos foram extraídos
    else if (campaignType === 'BASICO' && stats.extracted >= stats.total) {
      return 'COMPLETED';
    }
  }

  // Se ainda está processando
  if (currentStatus === 'PROCESSING' || currentStatus === 'EXTRACTION_COMPLETED') {
    return currentStatus;
  }

  return 'PROCESSING';
}

/**
 * Verifica se uma campanha está completa (todos os leads processados)
 */
export function isCampaignComplete(
  campaignType: CampaignType,
  stats: CampaignStats
): boolean {
  if (campaignType === 'COMPLETO') {
    return stats.enriched >= stats.total;
  }
  return stats.extracted >= stats.total;
}

/**
 * Calcula porcentagem de progresso da campanha
 */
export function calculateProgress(
  campaignType: CampaignType,
  stats: CampaignStats
): number {
  if (stats.total === 0) return 0;

  if (campaignType === 'COMPLETO') {
    return Math.round((stats.enriched / stats.total) * 100);
  }
  return Math.round((stats.extracted / stats.total) * 100);
}

/**
 * Retorna mensagem de status legível para o usuário
 */
export function getCampaignStatusMessage(
  status: CampaignStatus,
  progress: number
): string {
  switch (status) {
    case 'PENDING':
      return 'Aguardando processamento...';
    case 'PROCESSING':
      return `Processando... ${progress}%`;
    case 'EXTRACTION_COMPLETED':
      return 'Extração concluída';
    case 'COMPLETED':
      return 'Concluída';
    case 'FAILED':
      return 'Falhou';
    default:
      return 'Status desconhecido';
  }
}
