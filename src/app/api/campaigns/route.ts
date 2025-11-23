// src/app/api/campaigns/route.ts
import { prisma } from "@/lib/prisma-db";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { calculateCampaignTimeout } from "@/lib/constants";
import { calculateCampaignCost } from "@/lib/pricing-service";
import { CreateCampaignSchema } from '@/lib/validation-schemas';
import { ZodError } from 'zod';
import {
  checkUserRateLimit,
  getUserRateLimitHeaders,
  validateStringLength,
  validateArrayLength,
  validatePayloadSize,
  sanitizeForDatabase,
} from '@/lib/security';
import { fetchWithRetry } from '@/lib/retry';
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

// GET - Listar campanhas
export async function GET(_request: NextRequest) {
  try {
    // 1. Autenticação
    const { userId } = await requireAuth();

    // 2. Rate limiting: 100 req/min por usuário
    const rateLimitResult = checkUserRateLimit({
      userId,
      endpoint: 'campaigns:list',
      maxRequests: 100,
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

    // 3. Buscar campanhas do usuário
    const campaigns = await prisma.campaign.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { leads: true },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        campaigns,
      },
      {
        headers: getUserRateLimitHeaders(rateLimitResult),
      }
    );
  } catch (error) {
    // Erros de autenticação
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      );
    }

    console.error("[API /campaigns GET] Erro ao buscar campanhas:", {
      error: error instanceof Error ? error.message : error,
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      { success: false, error: "Erro ao buscar campanhas" },
      { status: 500 }
    );
  }
}

// POST - Criar nova campanha + Chamar N8N
export async function POST(request: NextRequest) {
  try {
    // 1. Autenticação
    const { userId } = await requireAuth();

    // 2. Rate limiting por usuário: 10 campanhas/hora
    const rateLimitResult = checkUserRateLimit({
      userId,
      endpoint: 'campaigns:create',
      maxRequests: 10,
      windowMs: 60 * 60 * 1000,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: 'Limite de criação de campanhas excedido. Aguarde antes de criar outra.' },
        {
          status: 429,
          headers: getUserRateLimitHeaders(rateLimitResult),
        }
      );
    }

    // 3. Validação de payload size (previne JSON bombing)
    const bodyText = await request.text();
    const payloadValidation = validatePayloadSize(bodyText, 100 * 1024); // 100KB max

    if (!payloadValidation.valid) {
      return NextResponse.json(
        { success: false, error: payloadValidation.error },
        { status: 413 }
      );
    }

    const body = JSON.parse(bodyText) as Record<string, unknown>;

    // 4. Sanitização contra NoSQL injection
    const sanitizedBody = sanitizeForDatabase(body) as typeof body;

    // 5. Validação com Zod
    try {
      CreateCampaignSchema.parse(sanitizedBody);
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        return NextResponse.json(
          { success: false, error: errorMessages, validationErrors: error.issues },
          { status: 400 }
        );
      }
      throw error;
    }

    // 6. Validações adicionais de tamanho (previne DoS)
    const titleValidation = validateStringLength(sanitizedBody.titulo as string, 'título', 200);
    if (!titleValidation.valid) {
      return NextResponse.json({ success: false, error: titleValidation.error }, { status: 400 });
    }

    const arrayValidations = [
      validateArrayLength(sanitizedBody.tipoNegocio as string[], 'tipoNegocio', 10),
      validateArrayLength(sanitizedBody.localizacao as string[], 'localizacao', 10),
    ];

    for (const validation of arrayValidations) {
      if (!validation.valid) {
        return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
      }
    }

    // 7. Calcular custo usando serviço centralizado
    const validData = sanitizedBody as { quantidade: number; nivelServico: string; tipoNegocio: string[]; localizacao: string[]; titulo?: string };
    const custo = calculateCampaignCost(
      validData.quantidade,
      validData.nivelServico.toUpperCase() as 'BASICO' | 'COMPLETO'
    );

    // 8. Transação atômica: criar campanha + debitar créditos
    const result = await prisma.$transaction(async (tx) => {
      // Verificar saldo
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      });

      if (!user || user.credits < custo) {
        throw new Error("Créditos insuficientes");
      }

      // Debitar créditos
      await tx.user.update({
        where: { id: userId },
        data: { credits: { decrement: custo } },
      });

      // Calcular timeout da campanha
      const campaignType = validData.nivelServico.toUpperCase() as "BASICO" | "COMPLETO";
      const { estimatedSeconds, timeoutDate } = calculateCampaignTimeout(
        validData.quantidade,
        campaignType
      );

      // Criar campanha
      const campaign = await tx.campaign.create({
        data: {
          userId,
          title: validData.titulo || `${validData.tipoNegocio.join(", ")} em ${validData.localizacao.join(", ")}`,
          quantidade: validData.quantidade,
          tipo: campaignType,
          termos: validData.tipoNegocio.join(","),
          locais: validData.localizacao.join(","),
          status: "PROCESSING",
          processStartedAt: new Date(),
          estimatedCompletionTime: estimatedSeconds,
          timeoutAt: timeoutDate,
          creditsCost: custo,
          leadsRequested: validData.quantidade,
        },
      });

      return campaign;
    });

    // 9. Chamar N8N para processar (paralelo, não bloqueia resposta)
    // OWASP A10:2025 - Retry com exponential backoff
    const n8nUrl = process.env.N8N_WEBHOOK_URL || "https://n8n.fflow.site/webhook/interface";
    const n8nPayload = {
      campaignId: result.id,
      termos: validData.tipoNegocio.join(","),
      locais: validData.localizacao.join(","),
      quantidade: validData.quantidade,
      nivelServico: validData.nivelServico,
      consolidado: validData.nivelServico === "completo" ? "true" : "false",
      timestamp: new Date().toLocaleString("pt-BR"),
      titulo: validData.titulo || result.title,
    };

    // Executar N8N call com retry (não bloqueia resposta ao cliente)
    fetchWithRetry(
      n8nUrl,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: n8nPayload }),
      },
      {
        maxAttempts: 3,
        initialDelayMs: 1000,
        maxDelayMs: 5000,
      }
    )
      .then((response) => {
        logger.info("N8N webhook called successfully", {
          campaignId: result.id,
          status: response.status,
        });
      })
      .catch(async (error) => {
        logger.error("N8N webhook failed after retries", error, {
          campaignId: result.id,
          n8nUrl,
        });

        try {
          // Reembolsar créditos e marcar campanha como falha
          await prisma.$transaction([
            prisma.user.update({
              where: { id: userId },
              data: { credits: { increment: custo } },
            }),
            prisma.campaign.update({
              where: { id: result.id },
              data: { status: "FAILED" },
            }),
          ]);

          logger.info("Credits refunded due to N8N failure", {
            userId,
            campaignId: result.id,
            creditsRefunded: custo,
          });
        } catch (updateError) {
          logger.error("Failed to refund credits after N8N failure", updateError, {
            userId,
            campaignId: result.id,
          });
        }
      });

    // 10. Resposta imediata para frontend
    return NextResponse.json({
      success: true,
      campaignId: result.id,
      message: "Campanha criada e enviada para processamento!",
    });
  } catch (error) {
    // Erros de autenticação/autorização
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // Erros de créditos insuficientes
    if (error instanceof Error && error.message === "Créditos insuficientes") {
      return NextResponse.json(
        { success: false, error: 'Créditos insuficientes' },
        { status: 402 }
      );
    }

    console.error("[API /campaigns POST] Erro ao criar campanha:", {
      error: error instanceof Error ? error.message : error,
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      { success: false, error: "Erro ao criar campanha" },
      { status: 500 }
    );
  }
}
