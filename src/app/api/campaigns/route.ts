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

    // 3. Query params: includeArchived (opcional)
    const url = new URL(_request.url);
    const includeArchived = url.searchParams.get('includeArchived') === 'true';

    // 4. Buscar campanhas do usuário
    const campaigns = await prisma.campaign.findMany({
      where: {
        userId,
        // Se includeArchived=true, não filtrar por isArchived (traz todas)
        // Se false, apenas não arquivadas
        ...(includeArchived ? {} : { isArchived: false }),
      },
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

    // 2. Validação de Content-Type (SECURITY: A02:2025 - Security Misconfiguration)
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { success: false, error: 'Content-Type deve ser application/json' },
        { status: 415 }
      );
    }

    // 3. Rate limiting por usuário: 10 campanhas/hora
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

    // 4. Validação de payload size (previne JSON bombing)
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

    // 7. Validar templates para campanhas COMPLETO
    const validData = sanitizedBody as {
      quantidade: number;
      nivelServico: string;
      tipoNegocio: string[];
      localizacao: string[];
      titulo?: string;
      templateEmailId?: string | null;
      templateWhatsappId?: string | null;
      templatePromptId?: string | null;
    };

    if (validData.nivelServico === 'completo') {
      // SECURITY: Verificar se templates existem e pertencem ao usuário ou são defaults
      const templateIds = [
        validData.templateEmailId,
        validData.templateWhatsappId,
        validData.templatePromptId
      ].filter(Boolean) as string[];

      if (templateIds.length !== 3) {
        return NextResponse.json(
          {
            success: false,
            error: 'Templates são obrigatórios para campanhas com enriquecimento',
            missingTemplates: {
              email: !validData.templateEmailId,
              whatsapp: !validData.templateWhatsappId,
              prompt: !validData.templatePromptId,
            }
          },
          { status: 400 }
        );
      }

      const templates = await prisma.template.findMany({
        where: {
          id: { in: templateIds },
          isActive: true,
          OR: [
            { createdBy: userId },
            { isDefault: true }
          ]
        }
      });

      if (templates.length !== 3) {
        // SECURITY ALERT (A09:2025 - Logging & Alerting)
        // Log tentativa de acesso a templates não autorizados
        const foundIds = templates.map(t => t.id);
        const missingIds = templateIds.filter(id => !foundIds.includes(id));

        logger.warn('Tentativa de uso de templates não autorizados ou inexistentes', {
          userId,
          requestedTemplateIds: templateIds,
          foundTemplateIds: foundIds,
          missingTemplateIds: missingIds,
          timestamp: new Date().toISOString(),
        });

        return NextResponse.json(
          {
            success: false,
            error: 'Um ou mais templates selecionados não foram encontrados ou não estão acessíveis'
          },
          { status: 404 }
        );
      }
    }

    // 8. Calcular custo usando serviço centralizado
    const custo = calculateCampaignCost(
      validData.quantidade,
      validData.nivelServico.toUpperCase() as 'BASICO' | 'COMPLETO'
    );

    // 9. Transação atômica: criar campanha + debitar créditos
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
          // Templates para enriquecimento (apenas se COMPLETO)
          templateEmailId: validData.nivelServico === 'completo' ? validData.templateEmailId : null,
          templateWhatsappId: validData.nivelServico === 'completo' ? validData.templateWhatsappId : null,
          templatePromptId: validData.nivelServico === 'completo' ? validData.templatePromptId : null,
        },
      });

      return campaign;
    });

    // AUDIT LOG (A09:2025 - Logging & Alerting)
    if (validData.nivelServico === 'completo') {
      logger.info('Campanha COMPLETO criada com templates', {
        userId,
        campaignId: result.id,
        tipo: result.tipo,
        quantidade: result.quantidade,
        creditsCost: custo,
        templates: {
          emailId: validData.templateEmailId,
          whatsappId: validData.templateWhatsappId,
          promptId: validData.templatePromptId,
        },
      });
    } else {
      logger.info('Campanha BASICO criada', {
        userId,
        campaignId: result.id,
        tipo: result.tipo,
        quantidade: result.quantidade,
        creditsCost: custo,
      });
    }

    // 10. Chamar N8N para processar (paralelo, não bloqueia resposta)
    // OWASP A10:2025 - Retry com exponential backoff
    const n8nUrl = process.env.N8N_WEBHOOK_URL;
    const n8nSecret = process.env.N8N_WEBHOOK_SECRET;

    if (!n8nUrl || !n8nSecret) {
      logger.error('N8N_WEBHOOK_URL ou N8N_WEBHOOK_SECRET não configurados', {
        campaignId: result.id,
      });
      throw new Error('Configuração N8N inválida');
    }

    const n8nPayload = {
      campaignId: result.id,
      termos: validData.tipoNegocio.join(","),
      locais: validData.localizacao.join(","),
      quantidade: validData.quantidade,
      nivelServico: validData.nivelServico,
      consolidado: validData.nivelServico === "completo" ? "true" : "false",
      timestamp: new Date().toLocaleString("pt-BR"),
      titulo: validData.titulo || result.title,
      // Templates para enriquecimento (apenas se COMPLETO)
      ...(validData.nivelServico === "completo" && {
        templates: {
          emailId: validData.templateEmailId,
          whatsappId: validData.templateWhatsappId,
          promptId: validData.templatePromptId,
        }
      }),
    };

    // DEBUG: Log sempre visível
    console.log("🔔 [WEBHOOK] Chamando N8N:", { n8nUrl, campaignId: result.id, payload: n8nPayload });

    // Executar N8N call com retry (não bloqueia resposta ao cliente)
    fetchWithRetry(
      n8nUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-webhook-secret": n8nSecret,
        },
        body: JSON.stringify({ query: n8nPayload }),
      },
      {
        maxAttempts: 3,
        initialDelayMs: 1000,
        maxDelayMs: 5000,
      }
    )
      .then((response) => {
        console.log("✅ [WEBHOOK] N8N respondeu:", { campaignId: result.id, status: response.status });
        logger.info("N8N webhook called successfully", {
          campaignId: result.id,
          status: response.status,
        });
      })
      .catch(async (error) => {
        console.error("❌ [WEBHOOK] N8N falhou:", { campaignId: result.id, error: error.message });
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

    // 11. Resposta imediata para frontend com security headers (A02:2025)
    return NextResponse.json(
      {
        success: true,
        campaignId: result.id,
        message: "Campanha criada e enviada para processamento!",
      },
      {
        headers: {
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'no-store, no-cache, must-revalidate, private',
          'Pragma': 'no-cache',
        },
      }
    );
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
