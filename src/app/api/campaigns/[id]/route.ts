import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-db'
import { calculateCampaignStats, determineCampaignStatus } from '@/lib/campaign-status-service'

export const dynamic = 'force-dynamic'

// GET - Buscar campanha específica com leads e calcular status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const url = new URL(request.url)

    // Paginação para evitar N+1 queries em campanhas grandes
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const pageSize = parseInt(url.searchParams.get('pageSize') || '50', 10)
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

    return NextResponse.json({
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
    })
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
    const body = await request.json()

    const { status } = body

    if (!status || !['PROCESSING', 'COMPLETED', 'FAILED'].includes(status)) {
      return NextResponse.json(
        { error: 'Status inválido' },
        { status: 400 }
      )
    }

    const campaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: { status },
    })

    return NextResponse.json({
      success: true,
      campaign,
    })
  } catch (error) {
    console.error('[API /campaigns/[id] PATCH] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar campanha' },
      { status: 500 }
    )
  }
}
