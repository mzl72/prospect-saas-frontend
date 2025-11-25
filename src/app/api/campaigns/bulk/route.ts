// src/app/api/campaigns/bulk/route.ts
import { prisma } from "@/lib/prisma-db";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";
import { checkUserRateLimit, getUserRateLimitHeaders, isValidCUID } from "@/lib/security";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

// Schema de validação
const BulkActionSchema = z.object({
  ids: z.array(z.string()).min(1, "Pelo menos uma campanha deve ser selecionada").max(50, "Máximo de 50 campanhas por ação"),
  action: z.enum(["pause", "resume", "archive"]),
});

/**
 * PATCH /api/campaigns/bulk
 * Ações em massa: pausar, retomar, arquivar campanhas
 */
export async function PATCH(request: NextRequest) {
  try {
    // 1. Autenticação e validação de role
    const { userId, role } = await requireAuth();

    // Apenas ADMIN e MANAGER podem executar ações em massa
    if (role === "OPERATOR") {
      return NextResponse.json(
        { success: false, error: "Você não tem permissão para executar ações em massa. Apenas ADMIN e MANAGER podem realizar essa operação." },
        { status: 403 }
      );
    }

    // 2. Rate limiting: 10 ações em massa/hora por usuário
    const rateLimitResult = checkUserRateLimit({
      userId,
      endpoint: "campaigns:bulk",
      maxRequests: 10,
      windowMs: 60 * 60 * 1000, // 1 hora
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: "Limite de ações em massa excedido. Aguarde antes de tentar novamente." },
        {
          status: 429,
          headers: getUserRateLimitHeaders(rateLimitResult),
        }
      );
    }

    // 3. Parse e validação do body (com tratamento de JSON inválido)
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      logger.warn("Tentativa de ação em massa com JSON inválido", {
        userId,
        error: jsonError instanceof Error ? jsonError.message : String(jsonError),
      });

      return NextResponse.json(
        { success: false, error: "Payload JSON inválido" },
        { status: 400 }
      );
    }

    const validation = BulkActionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error.issues[0].message,
          validationErrors: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { ids, action } = validation.data;

    // 4. Validar CUIDs para prevenir injection
    const invalidIds = ids.filter(id => !isValidCUID(id));
    if (invalidIds.length > 0) {
      logger.warn("Tentativa de ação em massa com IDs inválidos", {
        userId,
        invalidIds,
      });

      return NextResponse.json(
        { success: false, error: "Um ou mais IDs de campanha são inválidos" },
        { status: 400 }
      );
    }

    // 5. Verificar ownership: todas as campanhas devem pertencer ao usuário
    const campaigns = await prisma.campaign.findMany({
      where: {
        id: { in: ids },
        userId,
      },
      select: { id: true },
    });

    if (campaigns.length !== ids.length) {
      logger.error("Tentativa de ação em massa em campanhas não autorizadas", {
        userId,
        requestedIds: ids,
        foundIds: campaigns.map((c) => c.id),
      });

      return NextResponse.json(
        { success: false, error: "Você não tem permissão para executar esta ação em uma ou mais campanhas" },
        { status: 403 }
      );
    }

    // 6. Executar ação em massa
    let updateData: Record<string, unknown> = {};
    let resultMessage = "";

    switch (action) {
      case "pause":
        // TODO (DIA 4): Adicionar status PAUSED ao enum CampaignStatus
        // Por enquanto, marca como FAILED temporariamente
        updateData = { status: "FAILED" };
        await prisma.campaign.updateMany({
          where: {
            id: { in: ids },
            status: "PROCESSING",
          },
          data: updateData,
        });
        resultMessage = `${campaigns.length} campanha(s) pausada(s) temporariamente (marcadas como FAILED até DIA 4)`;
        break;

      case "resume":
        // TODO (DIA 4): Adicionar status PAUSED ao enum CampaignStatus
        // Por enquanto, retoma campanhas marcadas como FAILED
        updateData = { status: "PROCESSING" };
        await prisma.campaign.updateMany({
          where: {
            id: { in: ids },
            status: "FAILED",
          },
          data: updateData,
        });
        resultMessage = `${campaigns.length} campanha(s) retomada(s) com sucesso`;
        break;

      case "archive":
        // TODO (DIA 4): Adicionar campo isArchived ao schema
        // Por enquanto, marcar como COMPLETED
        updateData = { status: "COMPLETED" };
        await prisma.campaign.updateMany({
          where: {
            id: { in: ids },
          },
          data: updateData,
        });
        resultMessage = `${campaigns.length} campanha(s) arquivada(s) com sucesso (marcadas como COMPLETED até DIA 4)`;
        break;
    }

    // 7. Log de auditoria
    logger.info("Ação em massa executada", {
      userId,
      action,
      campaignIds: ids,
      affectedCount: campaigns.length,
    });

    return NextResponse.json(
      {
        success: true,
        message: resultMessage,
        affectedCount: campaigns.length,
      },
      {
        headers: getUserRateLimitHeaders(rateLimitResult),
      }
    );
  } catch (error) {
    // Erros de autenticação
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    console.error("[API /campaigns/bulk PATCH] Erro:", {
      error: error instanceof Error ? error.message : error,
      stack: process.env.NODE_ENV === "development" ? (error instanceof Error ? error.stack : undefined) : undefined,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { success: false, error: "Erro ao executar ação em massa" },
      { status: 500 }
    );
  }
}
