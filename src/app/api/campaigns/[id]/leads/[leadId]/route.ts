import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-db'
import { DEMO_USER_ID } from '@/lib/demo-user'
import { checkUserRateLimit, getUserRateLimitHeaders, isValidCUID } from '@/lib/security'

// Inline helper functions
async function validateLeadOwnership(leadId: string, userId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { campaign: true }
  });
  return lead?.campaign.userId === userId;
}

function ownershipErrorResponse() {
  return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
}

export const dynamic = 'force-dynamic'

// GET - Buscar lead específico com emails
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; leadId: string }> }
) {
  try {
    const { leadId } = await params

    // 1. Rate limiting: 300 req/min por usuário
    const rateLimitResult = checkUserRateLimit({
      userId: DEMO_USER_ID,
      endpoint: 'leads:get',
      maxRequests: 300,
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
    if (!isValidCUID(leadId)) {
      return NextResponse.json(
        { success: false, error: 'ID de lead inválido' },
        { status: 400 }
      )
    }

    // 3. Validar ownership
    const isOwner = await validateLeadOwnership(leadId)
    if (!isOwner) {
      return ownershipErrorResponse()
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        emails: {
          orderBy: { sequenceNumber: 'asc' },
        },
        whatsappMessages: {
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

    return NextResponse.json(
      {
        success: true,
        lead,
      },
      {
        headers: getUserRateLimitHeaders(rateLimitResult),
      }
    )
  } catch (error) {
    console.error('[API /campaigns/[id]/leads/[leadId] GET] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar lead' },
      { status: 500 }
    )
  }
}
