import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-db'

export const dynamic = 'force-dynamic'

// CUID validation regex (formato: c + 24 caracteres alfanuméricos)
const CUID_REGEX = /^c[a-z0-9]{24}$/i;

// GET - Buscar lead específico com emails
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; leadId: string }> }
) {
  try {
    const { leadId } = await params

    // Validate CUID format
    if (!CUID_REGEX.test(leadId)) {
      return NextResponse.json(
        { error: 'ID de lead inválido' },
        { status: 400 }
      )
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        emails: {
          orderBy: { sequenceNumber: 'asc' },
        },
        campaign: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    })

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      lead,
    })
  } catch (error) {
    console.error('[API /campaigns/[id]/leads/[leadId] GET] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar lead' },
      { status: 500 }
    )
  }
}
