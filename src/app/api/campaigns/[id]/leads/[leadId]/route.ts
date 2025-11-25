import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-db'
import { requireAuth } from '@/lib/auth'
import { checkUserRateLimit, getUserRateLimitHeaders, isValidCUID, constantTimeCompare } from '@/lib/security'

// Inline helper functions
async function validateLeadOwnership(leadId: string, userId: string): Promise<boolean> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { campaign: true }
  });
  if (!lead) return false;

  // Timing-safe comparison para prevenir timing attacks durante enumeration
  return constantTimeCompare(lead.campaign.userId, userId);
}

function ownershipErrorResponse() {
  return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 403 });
}

export const dynamic = 'force-dynamic'

// GET - Buscar lead específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; leadId: string }> }
) {
  try {
    const { leadId } = await params

    // 1. Autenticação
    const { userId } = await requireAuth();

    // 2. Rate limiting: 150 req/min por usuário (reduzido para prevenir enumeration)
    // OWASP A01:2025 - Enumeration Protection
    const rateLimitResult = checkUserRateLimit({
      userId,
      endpoint: 'leads:get',
      maxRequests: 150,
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

    // 3. Validar formato CUID
    if (!isValidCUID(leadId)) {
      return NextResponse.json(
        { success: false, error: 'ID de lead inválido' },
        { status: 400 }
      )
    }

    // 4. Validar ownership
    const isOwner = await validateLeadOwnership(leadId, userId)
    if (!isOwner) {
      return ownershipErrorResponse()
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
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
    // Erros de autenticação
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      );
    }

    console.error('[API /campaigns/[id]/leads/[leadId] GET] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar lead' },
      { status: 500 }
    )
  }
}
