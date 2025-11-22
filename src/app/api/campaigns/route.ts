// src/app/api/campaigns/route.ts
import { prisma } from "@/lib/prisma-db";
import { NextRequest, NextResponse } from "next/server";
import { DEMO_USER_ID, ensureDemoUser } from "@/lib/demo-user";
import { calculateCampaignTimeout } from "@/lib/constants";
import { calculateCampaignCost } from "@/lib/pricing-service";
// Rate limiting imports removidos (usando checkUserRateLimit de security.ts)
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

export const dynamic = "force-dynamic";

// GET - Listar campanhas
export async function GET(_request: NextRequest) {
  try {
    // Rate limiting: 100 req/min por usuário
    const rateLimitResult = checkUserRateLimit({
      userId: DEMO_USER_ID,
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

    // Garante que usuário existe
    await ensureDemoUser();

    const campaigns = await prisma.campaign.findMany({
      where: { userId: DEMO_USER_ID },
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
    // 1. Rate limiting por usuário: 10 campanhas/hora
    const rateLimitResult = checkUserRateLimit({
      userId: DEMO_USER_ID,
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

    // 2. Validação de payload size (previne JSON bombing)
    const bodyText = await request.text();
    const payloadValidation = validatePayloadSize(bodyText, 100 * 1024); // 100KB max

    if (!payloadValidation.valid) {
      return NextResponse.json(
        { success: false, error: payloadValidation.error },
        { status: 413 }
      );
    }

    const body = JSON.parse(bodyText) as Record<string, unknown>;

    // 3. Sanitização contra NoSQL injection
    const sanitizedBody = sanitizeForDatabase(body) as typeof body;

    // 4. Validação com Zod
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

    // 5. Validações adicionais de tamanho (previne DoS)
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

    // Calcular custo usando serviço centralizado
    const validData = sanitizedBody as { quantidade: number; nivelServico: string; tipoNegocio: string[]; localizacao: string[]; titulo?: string };
    const custo = calculateCampaignCost(
      validData.quantidade,
      validData.nivelServico.toUpperCase() as 'BASICO' | 'COMPLETO'
    );

    // Garante que usuário existe antes da transação
    await ensureDemoUser();

    // Modo COMPLETO: enriquecimento com IA será processado pelo N8N
    // N8N vai chamar o webhook handleLeadEnrichment após processar cada lead

    // Transação atômica: criar campanha + debitar créditos
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verificar saldo
      const user = await tx.user.findUnique({
        where: { id: DEMO_USER_ID },
        select: { credits: true },
      });

      if (!user || user.credits < custo) {
        throw new Error("Créditos insuficientes");
      }

      // 2. Debitar créditos
      await tx.user.update({
        where: { id: DEMO_USER_ID },
        data: { credits: { decrement: custo } },
      });

      // 3. Calcular timeout da campanha
      const campaignType = validData.nivelServico.toUpperCase() as "BASICO" | "COMPLETO";
      const { estimatedSeconds, timeoutDate } = calculateCampaignTimeout(
        validData.quantidade,
        campaignType
      );

      // 4. Criar campanha
      const campaign = await tx.campaign.create({
        data: {
          userId: DEMO_USER_ID,
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
          leadsRequested: validData.quantidade, // quantidade solicitada pelo usuário
        },
      });

      return campaign;
    });

    // 5. Chamar N8N para processar (paralelo, não bloqueia resposta)
    const n8nUrl = process.env.N8N_WEBHOOK_URL || "https://n8n.fflow.site/webhook/interface";
    const n8nPayload = {
      // Dados da campanha
      campaignId: result.id,
      termos: validData.tipoNegocio.join(","),
      locais: validData.localizacao.join(","),
      quantidade: validData.quantidade,
      nivelServico: validData.nivelServico,
      consolidado: validData.nivelServico === "completo" ? "true" : "false",
      timestamp: new Date().toLocaleString("pt-BR"),
      titulo: validData.titulo || result.title,

      // TODO: Adicionar configurações de templates quando implementar UserSettings
      // Por enquanto, N8N usará templates padrão para enriquecimento
    };

    fetch(n8nUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: n8nPayload }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`N8N returned status ${response.status}`);
        }
        console.log(`[API /campaigns POST] ✅ N8N webhook called successfully for campaign ${result.id}`);
      })
      .catch(async (error) => {
        console.error("[API /campaigns POST] ❌ Erro ao chamar N8N:", {
          error: error instanceof Error ? error.message : error,
          campaignId: result.id,
          n8nUrl,
          timestamp: new Date().toISOString(),
        });

        try {
          // Reembolsar créditos e marcar campanha como falha
          await prisma.$transaction([
            // Devolver créditos ao usuário
            prisma.user.update({
              where: { id: DEMO_USER_ID },
              data: {
                credits: {
                  increment: custo,
                },
              },
            }),
            // Marcar campanha como falha
            prisma.campaign.update({
              where: { id: result.id },
              data: { status: "FAILED" },
            }),
          ]);

          console.log(`[API /campaigns POST] 💰 Refunded ${custo} credits to user due to N8N failure`);
        } catch (updateError) {
          console.error("[API /campaigns POST] ❌ Failed to refund credits:", updateError);
        }
      });

    // 6. Resposta imediata para frontend
    return NextResponse.json({
      success: true,
      campaignId: result.id,
      message: "Campanha criada e enviada para processamento!",
    });
  } catch (error) {
    console.error("[API /campaigns POST] Erro ao criar campanha:", {
      error: error instanceof Error ? error.message : error,
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined,
      body: request.body,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      { success: false, error: "Erro ao criar campanha" },
      { status: 500 }
    );
  }
}
