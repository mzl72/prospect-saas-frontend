import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-db';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';
import {
  checkUserRateLimit,
  getUserRateLimitHeaders,
  validatePayloadSize,
  sanitizeForDatabase,
  isValidCUID,
} from '@/lib/security';

export const dynamic = 'force-dynamic';

// Schema de validação
const BulkActionSchema = z.object({
  ids: z.array(z.string()).min(1).max(50), // Máximo 50 campanhas por operação
  action: z.enum(['pause', 'resume', 'archive', 'unarchive', 'delete']),
});

// PATCH - Ações em massa
export async function PATCH(request: NextRequest) {
  try {
    // 1. Autenticação
    const { userId } = await requireAuth();

    // 2. Rate limiting: 20 req/min por usuário
    const rateLimitResult = checkUserRateLimit({
      userId,
      endpoint: 'campaigns:bulk',
      maxRequests: 20,
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

    // 3. Validar payload size
    const bodyText = await request.text();
    const payloadValidation = validatePayloadSize(bodyText, 10 * 1024); // 10KB max

    if (!payloadValidation.valid) {
      return NextResponse.json(
        { success: false, error: payloadValidation.error },
        { status: 413 }
      );
    }

    const body = JSON.parse(bodyText);

    // 4. Sanitizar
    const sanitizedBody = sanitizeForDatabase(body);

    // 5. Validar com Zod
    const validation = BulkActionSchema.safeParse(sanitizedBody);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Dados inválidos', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { ids, action } = validation.data;

    // 6. Validar CUIDs
    for (const id of ids) {
      if (!isValidCUID(id)) {
        return NextResponse.json(
          { success: false, error: `ID inválido detectado: ${id}` },
          { status: 400 }
        );
      }
    }

    // 7. Verificar ownership de TODAS as campanhas
    const campaigns = await prisma.campaign.findMany({
      where: { id: { in: ids }, userId },
      select: { id: true, tipo: true, status: true },
    });

    if (campaigns.length !== ids.length) {
      // SECURITY: Algumas campanhas não pertencem ao usuário ou não existem
      return NextResponse.json(
        { success: false, error: 'Acesso negado a uma ou mais campanhas' },
        { status: 403 }
      );
    }

    // 8. Validação de regras de negócio para pause/resume
    if (action === 'pause' || action === 'resume') {
      // Apenas campanhas ENVIO podem ser pausadas/retomadas
      // Por enquanto, ENVIO ainda não existe (será implementado), então bloqueamos todas
      const basicoOrCompleto = campaigns.filter(c => c.tipo === 'BASICO' || c.tipo === 'COMPLETO');

      if (basicoOrCompleto.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Campanhas de extração (BASICO) e enriquecimento (COMPLETO) não podem ser pausadas após iniciarem. Apenas campanhas de ENVIO poderão ser pausadas.'
          },
          { status: 400 }
        );
      }
    }

    // 9. Executar ação
    let result;

    switch (action) {
      case 'pause':
        // FUTURE: Quando ENVIO existir, filtrar por tipo: 'ENVIO'
        // Por enquanto, nenhuma campanha pode ser pausada (BASICO/COMPLETO não pausam)
        result = await prisma.campaign.updateMany({
          where: {
            id: { in: ids },
            userId,
            NOT: {
              OR: [
                { tipo: 'BASICO' },
                { tipo: 'COMPLETO' }
              ]
            },
            status: 'PROCESSING'
          },
          data: { status: 'PAUSED' },
        });
        break;

      case 'resume':
        // FUTURE: Quando ENVIO existir, filtrar por tipo: 'ENVIO'
        result = await prisma.campaign.updateMany({
          where: {
            id: { in: ids },
            userId,
            NOT: {
              OR: [
                { tipo: 'BASICO' },
                { tipo: 'COMPLETO' }
              ]
            },
            status: 'PAUSED'
          },
          data: { status: 'PROCESSING' },
        });
        break;

      case 'archive':
        // Soft delete
        result = await prisma.campaign.updateMany({
          where: { id: { in: ids }, userId },
          data: { isArchived: true },
        });
        break;

      case 'unarchive':
        // Restaurar campanhas arquivadas
        result = await prisma.campaign.updateMany({
          where: { id: { in: ids }, userId, isArchived: true },
          data: { isArchived: false },
        });
        break;

      case 'delete':
        // SECURITY: Não permitir deletar campanhas PROCESSING (podem estar sendo processadas pelo N8N)
        // Validar se todas as campanhas estão em status permitido para exclusão
        const processingCampaigns = campaigns.filter(c => c.status === 'PROCESSING');

        if (processingCampaigns.length > 0) {
          return NextResponse.json(
            {
              success: false,
              error: 'Não é possível excluir campanhas em processamento. Aguarde a conclusão ou arquive-as.'
            },
            { status: 400 }
          );
        }

        // Hard delete - remove permanentemente (CASCADE deleta leads automaticamente)
        result = await prisma.campaign.deleteMany({
          where: {
            id: { in: ids },
            userId,
            status: { not: 'PROCESSING' } // Proteção adicional no banco
          },
        });
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Ação inválida' },
          { status: 400 }
        );
    }

    return NextResponse.json(
      {
        success: true,
        message: `${result.count} campanha(s) atualizada(s)`,
        count: result.count,
      },
      {
        headers: getUserRateLimitHeaders(rateLimitResult),
      }
    );
  } catch (error) {
    // Erros de autenticação
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      );
    }

    console.error('[API /campaigns/bulk PATCH] Erro:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao executar ação em massa' },
      { status: 500 }
    );
  }
}
