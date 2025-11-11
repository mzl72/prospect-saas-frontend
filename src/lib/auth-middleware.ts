/**
 * Middleware de autenticação e validação de ownership
 * Para MVP com DEMO_USER_ID fixo, valida que recursos pertencem ao usuário correto
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-db';
import { DEMO_USER_ID } from '@/lib/demo-user';

/**
 * Valida que uma campanha pertence ao DEMO_USER_ID
 * @param campaignId ID da campanha
 * @returns true se campanha pertence ao usuário, false caso contrário
 */
export async function validateCampaignOwnership(campaignId: string): Promise<boolean> {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { userId: true },
    });

    if (!campaign) {
      console.warn(`[Auth] Campanha ${campaignId} não encontrada`);
      return false;
    }

    if (campaign.userId !== DEMO_USER_ID) {
      console.warn(`[Auth] Campanha ${campaignId} não pertence ao usuário ${DEMO_USER_ID}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Auth] Erro ao validar ownership de campanha:', error);
    return false;
  }
}

/**
 * Valida que um lead pertence ao DEMO_USER_ID (via campanha)
 * @param leadId ID do lead
 * @returns true se lead pertence ao usuário, false caso contrário
 */
export async function validateLeadOwnership(leadId: string): Promise<boolean> {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        campaign: {
          select: { userId: true },
        },
      },
    });

    if (!lead) {
      console.warn(`[Auth] Lead ${leadId} não encontrado`);
      return false;
    }

    if (lead.campaign.userId !== DEMO_USER_ID) {
      console.warn(`[Auth] Lead ${leadId} não pertence ao usuário ${DEMO_USER_ID}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Auth] Erro ao validar ownership de lead:', error);
    return false;
  }
}

/**
 * Helper para retornar resposta de erro de ownership
 */
export function ownershipErrorResponse() {
  return NextResponse.json(
    { error: 'Acesso negado: você não tem permissão para acessar este recurso' },
    { status: 403 }
  );
}
