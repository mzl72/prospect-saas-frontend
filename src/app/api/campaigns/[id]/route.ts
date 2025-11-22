import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-db'
import { DEMO_USER_ID } from '@/lib/demo-user'
import {
  checkUserRateLimit,
  getUserRateLimitHeaders,
  isValidCUID,
  validatePayloadSize,
  sanitizeForDatabase,
} from '@/lib/security'
import { z } from 'zod'

// Inline helper functions
function calculateCampaignStats(campaign: any) {
  const total = campaign.leadsRequested || 0;
  const created = campaign.leadsCreated || 0;
  const duplicated = campaign.leadsDuplicated || 0;
  const progress = total > 0 ? Math.round((created / total) * 100) : 0;
  return { total, created, duplicated, progress };
}

function determineCampaignStatus(campaign: any): string {
  if (campaign.status === 'FAILED') return 'FAILED';
  if (campaign.tipo === 'BASICO' && campaign.status === 'EXTRACTION_COMPLETED') return 'COMPLETED';
  return campaign.status;
}

async function validateCampaignOwnership(campaignId: string, userId: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  return campaign?.userId === userId;
}

function ownershipErrorResponse() {
  return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
}

export const dynamic = 'force-dynamic'

// Schema de validação para PATCH
const UpdateCampaignSchema = z.object({
  status: z.enum(['PROCESSING', 'COMPLETED', 'FAILED']),
})

// GET - Buscar campanha específica com leads e calcular status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params

    // 1. Rate limiting: 200 req/min por usuário
    const rateLimitResult = checkUserRateLimit({
      userId: DEMO_USER_ID,
      endpoint: 'campaigns:get',
      maxRequests: 200,
      windowMs: 60 * 1000,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: 'Limite de requisições excedido' },
        {
          status: 429,
          headers: getUserRateLimitHeaders(rateLimitResult),
        }
      );
    }

    // 2. Validar formato CUID (previne injection)
    if (!isValidCUID(campaignId)) {
      return NextResponse.json(
        { success: false, error: 'ID de campanha inválido' },
        { status: 400 }
      );
    }

    // 3. Validar ownership
    const isOwner = await validateCampaignOwnership(campaignId)
    if (!isOwner) {
      return ownershipErrorResponse()
    }

    const url = new URL(request.url)

    // 4. Validar paginação (previne DoS com valores absurdos)
    const page = Math.max(1, Math.min(10000, parseInt(url.searchParams.get('page') || '1', 10)))
    const pageSize = Math.max(1, Math.min(100, parseInt(url.searchParams.get('pageSize') || '50', 10)))
    const skip = (page - 1) * pageSize

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        leads: {
          include: {
            emails: {
              orderBy: { sequenceNumber: 'asc' },
            },
            whatsappMessages: {
              orderBy: { sequenceNumber: 'asc' },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: pageSize,
        },
        _count: {
          select: { leads: true },
        },
      },
    })

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campanha não encontrada' },
        { status: 404 }
      )
    }

    // Buscar TODOS os leads apenas para cálculo de stats (sem paginação)
    // Necessário para estatísticas precisas
    const allLeads = await prisma.lead.findMany({
      where: { campaignId },
      select: { status: true },
    })

    // Calcular estatísticas usando serviço centralizado com TODOS os leads
    const stats = calculateCampaignStats(allLeads, campaign.quantidade)

    // Determinar status correto usando serviço centralizado
    const newStatus = determineCampaignStatus(campaign.status, campaign.tipo, stats)

    // Atualizar no banco se mudou (mas não sobrescrever COMPLETED/FAILED)
    if (newStatus !== campaign.status &&
        campaign.status !== 'COMPLETED' &&
        campaign.status !== 'FAILED') {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: newStatus },
      })
      campaign.status = newStatus
    }

    return NextResponse.json(
      {
        success: true,
        campaign: {
          ...campaign,
          stats,
        },
        pagination: {
          page,
          pageSize,
          total: campaign._count.leads,
          totalPages: Math.ceil(campaign._count.leads / pageSize),
          hasMore: skip + campaign.leads.length < campaign._count.leads,
        },
      },
      {
        headers: getUserRateLimitHeaders(rateLimitResult),
      }
    )
  } catch (error) {
    console.error('[API /campaigns/[id] GET] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar campanha' },
      { status: 500 }
    )
  }
}

// PATCH - Atualizar status manualmente (ex: cancelar, pausar)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params

    // 1. Rate limiting: 30 req/min por usuário
    const rateLimitResult = checkUserRateLimit({
      userId: DEMO_USER_ID,
      endpoint: 'campaigns:update',
      maxRequests: 30,
      windowMs: 60 * 1000,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: 'Limite de requisições excedido' },
        {
          status: 429,
          headers: getUserRateLimitHeaders(rateLimitResult),
        }
      );
    }

    // 2. Validar formato CUID
    if (!isValidCUID(campaignId)) {
      return NextResponse.json(
        { success: false, error: 'ID de campanha inválido' },
        { status: 400 }
      );
    }

    // 3. Validar ownership
    const isOwner = await validateCampaignOwnership(campaignId)
    if (!isOwner) {
      return ownershipErrorResponse()
    }

    // 4. Validar payload size
    const bodyText = await request.text();
    const payloadValidation = validatePayloadSize(bodyText, 10 * 1024); // 10KB max

    if (!payloadValidation.valid) {
      return NextResponse.json(
        { success: false, error: payloadValidation.error },
        { status: 413 }
      );
    }

    const body = JSON.parse(bodyText);

    // 5. Sanitizar
    const sanitizedBody = sanitizeForDatabase(body);

    // 6. Validar com Zod
    const validation = UpdateCampaignSchema.safeParse(sanitizedBody)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Dados inválidos', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { status } = validation.data

    const campaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: { status },
    })

    return NextResponse.json(
      {
        success: true,
        campaign,
      },
      {
        headers: getUserRateLimitHeaders(rateLimitResult),
      }
    )
  } catch (error) {
    console.error('[API /campaigns/[id] PATCH] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar campanha' },
      { status: 500 }
    )
  }
}
