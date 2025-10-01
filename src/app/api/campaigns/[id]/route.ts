import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-db'
import { LeadStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET - Buscar campanha específica com leads e calcular status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        leads: {
          include: {
            emails: {
              orderBy: { sequenceNumber: 'asc' },
            },
          },
          orderBy: { createdAt: 'desc' },
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

    // Calcular estatísticas da campanha
    const stats = {
      total: campaign.quantidade,
      extracted: campaign.leads.length,
      enriched: campaign.leads.filter(l => l.status !== LeadStatus.EXTRACTED).length,
      email1Sent: campaign.leads.filter(l =>
        l.status === LeadStatus.EMAIL_1_SENT ||
        l.status === LeadStatus.EMAIL_2_SENT ||
        l.status === LeadStatus.EMAIL_3_SENT ||
        l.status === LeadStatus.REPLIED
      ).length,
      email2Sent: campaign.leads.filter(l =>
        l.status === LeadStatus.EMAIL_2_SENT ||
        l.status === LeadStatus.EMAIL_3_SENT ||
        l.status === LeadStatus.REPLIED
      ).length,
      email3Sent: campaign.leads.filter(l =>
        l.status === LeadStatus.EMAIL_3_SENT ||
        l.status === LeadStatus.REPLIED
      ).length,
      replied: campaign.leads.filter(l => l.status === LeadStatus.REPLIED).length,
      optedOut: campaign.leads.filter(l => l.status === LeadStatus.OPTED_OUT).length,
      bounced: campaign.leads.filter(l => l.status === LeadStatus.BOUNCED).length,
    }

    // Atualizar status da campanha se necessário
    let newStatus = campaign.status

    // Se todos os leads foram extraídos e processados
    if (stats.extracted >= campaign.quantidade) {
      // Se modo COMPLETO e todos foram enriquecidos
      if (campaign.tipo === 'COMPLETO' && stats.enriched >= campaign.quantidade) {
        newStatus = 'COMPLETED'
      }
      // Se modo BASICO e todos foram extraídos
      else if (campaign.tipo === 'BASICO' && stats.extracted >= campaign.quantidade) {
        newStatus = 'COMPLETED'
      }
    }

    // Atualizar no banco se mudou
    if (newStatus !== campaign.status) {
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
