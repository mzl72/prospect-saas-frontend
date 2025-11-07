// src/app/api/campaigns/route.ts
import { prisma } from "@/lib/prisma-db";
import { NextRequest, NextResponse } from "next/server";
import { DEMO_USER_ID, ensureDemoUser } from "@/lib/demo-user";
import { calculateCampaignTimeout } from "@/lib/constants";
import { calculateCampaignCost } from "@/lib/pricing-service";
import { checkRateLimit, getClientIp, getRateLimitHeaders } from '@/lib/rate-limit';
import { CreateCampaignSchema } from '@/lib/validation-schemas';
import { ZodError } from 'zod';

export const dynamic = "force-dynamic";

// GET - Listar campanhas
export async function GET() {
  try {
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

    return NextResponse.json({
      success: true,
      campaigns,
    });
  } catch (error) {
    console.error("[API /campaigns GET] Erro ao buscar campanhas:", {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
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
    // Rate limiting: 10 campanhas por hora por IP
    const clientIp = getClientIp(request)
    const rateLimitResult = checkRateLimit({
      identifier: `create-campaign:${clientIp}`,
      maxRequests: 10,
      windowMs: 60 * 60 * 1000, // 1 hora
    })

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Você atingiu o limite de criação de campanhas. Tente novamente mais tarde.' },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      )
    }

    const body = await request.json();

    // Validação com Zod - mais robusta e com mensagens de erro claras
    try {
      CreateCampaignSchema.parse(body);
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

    // Calcular custo usando serviço centralizado
    const custo = calculateCampaignCost(
      body.quantidade,
      body.nivelServico.toUpperCase() as 'BASICO' | 'COMPLETO'
    );

    // Garante que usuário existe antes da transação
    await ensureDemoUser();

    // Buscar configurações do usuário para enviar ao N8N
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: DEMO_USER_ID },
    });

    // Validação: modo completo requer configurações
    if (body.nivelServico === "completo") {
      const missingFieldsByPage: Record<string, string[]> = {};

      // Se não tem userSettings, todos os campos estão faltando
      if (!userSettings) {
        missingFieldsByPage["/configuracoes"] = [
          "Informações da Sua Empresa (aba Empresa)"
        ];
        missingFieldsByPage["/emails#settings"] = [
          "Pelo menos 1 Email Remetente (aba Configurações)"
        ];
        missingFieldsByPage["/whatsapp#instances"] = [
          "Pelo menos 1 Instância Evolution API (aba Instâncias)"
        ];
        missingFieldsByPage["/emails"] = [
          "Email 1 (Título e Corpo)",
          "Email 2 (Corpo)",
          "Email 3 (Título e Corpo)"
        ];
        missingFieldsByPage["/whatsapp"] = [
          "WhatsApp Mensagem 1",
          "WhatsApp Mensagem 2"
        ];
        missingFieldsByPage["/cadencia-hibrida"] = [
          "Híbrido Email 1 (Título e Corpo)",
          "Híbrido Email 2 (Corpo)",
          "Híbrido Email 3 (Título e Corpo)",
          "Híbrido WhatsApp Mensagem 1",
          "Híbrido WhatsApp Mensagem 2"
        ];
        missingFieldsByPage["/configuracoes#prompts"] = [
          "Template de Pesquisa",
          "Template de Análise de Empresa"
        ];

        return NextResponse.json(
          {
            success: false,
            error: "Configurações necessárias para o modo completo",
            missingFieldsByPage,
          },
          { status: 400 }
        );
      }

      // Se tem userSettings, verificar quais campos estão faltando

      // Helper para adicionar campo vazio
      function addMissingField(page: string, fieldName: string) {
        if (!missingFieldsByPage[page]) {
          missingFieldsByPage[page] = [];
        }
        missingFieldsByPage[page].push(fieldName);
      }

      // Validar Templates de IA (aba Prompts)
      if (!userSettings.templatePesquisa?.trim()) {
        addMissingField("/configuracoes#prompts", "Template de Pesquisa");
      }
      if (!userSettings.templateAnaliseEmpresa?.trim()) {
        addMissingField("/configuracoes#prompts", "Template de Análise de Empresa");
      }

      // Validar Informações da Empresa (aba Empresa)
      if (!userSettings.informacoesPropria?.trim()) {
        addMissingField("/configuracoes", "Informações da Sua Empresa");
      }

      // Validar Emails (aba Email)
      if (!userSettings.emailTitulo1?.trim() || !userSettings.emailCorpo1?.trim()) {
        addMissingField("/emails", "Email 1 (Título e Corpo)");
      }
      if (!userSettings.emailCorpo2?.trim()) {
        addMissingField("/emails", "Email 2 (Corpo)");
      }
      if (!userSettings.emailTitulo3?.trim() || !userSettings.emailCorpo3?.trim()) {
        addMissingField("/emails", "Email 3 (Título e Corpo)");
      }

      // Validar WhatsApp (aba WhatsApp)
      if (!userSettings.whatsappMessage1?.trim()) {
        addMissingField("/whatsapp", "WhatsApp Mensagem 1");
      }
      if (!userSettings.whatsappMessage2?.trim()) {
        addMissingField("/whatsapp", "WhatsApp Mensagem 2");
      }

      // Validar Híbrido (aba Cadência Híbrida)
      if (!userSettings.hybridEmailTitulo1?.trim() || !userSettings.hybridEmailCorpo1?.trim()) {
        addMissingField("/cadencia-hibrida", "Híbrido Email 1 (Título e Corpo)");
      }
      if (!userSettings.hybridEmailCorpo2?.trim()) {
        addMissingField("/cadencia-hibrida", "Híbrido Email 2 (Corpo)");
      }
      if (!userSettings.hybridEmailTitulo3?.trim() || !userSettings.hybridEmailCorpo3?.trim()) {
        addMissingField("/cadencia-hibrida", "Híbrido Email 3 (Título e Corpo)");
      }
      if (!userSettings.hybridWhatsappMessage1?.trim()) {
        addMissingField("/cadencia-hibrida", "Híbrido WhatsApp Mensagem 1");
      }
      if (!userSettings.hybridWhatsappMessage2?.trim()) {
        addMissingField("/cadencia-hibrida", "Híbrido WhatsApp Mensagem 2");
      }

      // Validar Emails Remetentes (OBRIGATÓRIO para envio de emails)
      const senderEmails = (() => {
        try {
          const parsed = JSON.parse(userSettings.senderEmails || "[]");
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })();

      if (senderEmails.length === 0) {
        addMissingField("/emails#settings", "Pelo menos 1 Email Remetente (aba Configurações)");
      }

      // Validar Evolution Instances (OBRIGATÓRIO para envio de WhatsApp)
      const evolutionInstances = (() => {
        try {
          const parsed = JSON.parse(userSettings.evolutionInstances || "[]");
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })();

      if (evolutionInstances.length === 0) {
        addMissingField("/whatsapp#instances", "Pelo menos 1 Instância Evolution API (aba Instâncias)");
      }

      // Retornar erro estruturado se houver campos vazios
      if (Object.keys(missingFieldsByPage).length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Campos obrigatórios não preenchidos",
            missingFieldsByPage,
          },
          { status: 400 }
        );
      }
    }

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
      const campaignType = body.nivelServico.toUpperCase() as "BASICO" | "COMPLETO";
      const { estimatedSeconds, timeoutDate } = calculateCampaignTimeout(
        body.quantidade,
        campaignType
      );

      // 4. Criar campanha
      const campaign = await tx.campaign.create({
        data: {
          userId: DEMO_USER_ID,
          title: body.titulo,
          quantidade: body.quantidade,
          tipo: campaignType,
          termos: body.tipoNegocio.join(","),
          locais: body.localizacao.join(","),
          status: "PROCESSING",
          processStartedAt: new Date(),
          estimatedCompletionTime: estimatedSeconds,
          timeoutAt: timeoutDate,
          creditsCost: custo,
          leadsRequested: body.quantidade, // quantidade solicitada pelo usuário
        },
      });

      return campaign;
    });

    // 5. Chamar N8N para processar (paralelo, não bloqueia resposta)
    const n8nUrl = process.env.N8N_WEBHOOK_URL || "https://n8n.fflow.site/webhook/interface";
    const n8nPayload = {
      // Dados da campanha
      campaignId: result.id,
      termos: body.tipoNegocio.join(","),
      locais: body.localizacao.join(","),
      quantidade: body.quantidade,
      nivelServico: body.nivelServico,
      consolidado: body.nivelServico === "completo" ? "true" : "false",
      timestamp: new Date().toLocaleString("pt-BR"),
      titulo: body.titulo,

      // Configurações do usuário (templates de IA)
      settings: userSettings ? {
        // Informações Críticas da Empresa
        nomeEmpresa: userSettings.nomeEmpresa,
        assinatura: userSettings.assinatura,
        telefoneContato: userSettings.telefoneContato,
        websiteEmpresa: userSettings.websiteEmpresa,
        senderEmails: (() => {
          try {
            const parsed = JSON.parse(userSettings.senderEmails || "[]");
            return Array.isArray(parsed) ? parsed : [];
          } catch (error) {
            console.error('[Campaigns] Invalid senderEmails JSON:', error);
            return [];
          }
        })(),

        // Prompts específicos por canal - Email
        emailPromptOverview: userSettings.emailPromptOverview,
        emailPromptTatica: userSettings.emailPromptTatica,
        emailPromptDiretrizes: userSettings.emailPromptDiretrizes,

        // Prompts específicos por canal - WhatsApp
        whatsappPromptOverview: userSettings.whatsappPromptOverview,
        whatsappPromptTatica: userSettings.whatsappPromptTatica,
        whatsappPromptDiretrizes: userSettings.whatsappPromptDiretrizes,

        // Prompts específicos por canal - Híbrido
        hybridPromptOverview: userSettings.hybridPromptOverview,
        hybridPromptTatica: userSettings.hybridPromptTatica,
        hybridPromptDiretrizes: userSettings.hybridPromptDiretrizes,

        // Templates de pesquisa e análise (genéricos)
        templatePesquisa: userSettings.templatePesquisa,
        templateAnaliseEmpresa: userSettings.templateAnaliseEmpresa,
        informacoesPropria: userSettings.informacoesPropria,

        // Email templates
        emailTemplates: [
          {
            titulo: userSettings.emailTitulo1,
            corpo: userSettings.emailCorpo1,
          },
          {
            corpo: userSettings.emailCorpo2, // Email 2 não tem título (resposta na thread)
          },
          {
            titulo: userSettings.emailTitulo3,
            corpo: userSettings.emailCorpo3,
          },
        ],

        // WhatsApp templates
        whatsappMessages: [
          userSettings.whatsappMessage1,
          userSettings.whatsappMessage2,
          userSettings.whatsappMessage3,
        ],

        // Hybrid templates (dedicados - separados de email/whatsapp)
        hybridEmailTemplates: [
          {
            titulo: userSettings.hybridEmailTitulo1,
            corpo: userSettings.hybridEmailCorpo1,
          },
          {
            corpo: userSettings.hybridEmailCorpo2, // Email 2 não tem título (resposta na thread)
          },
          {
            titulo: userSettings.hybridEmailTitulo3,
            corpo: userSettings.hybridEmailCorpo3,
          },
        ],
        hybridWhatsappMessages: [
          userSettings.hybridWhatsappMessage1,
          userSettings.hybridWhatsappMessage2,
        ],

        // Evolution API instances
        evolutionInstances: (() => {
          try {
            const parsed = JSON.parse(userSettings.evolutionInstances || "[]");
            return Array.isArray(parsed) ? parsed : [];
          } catch (error) {
            console.error('[Campaigns] Invalid evolutionInstances JSON:', error);
            return [];
          }
        })(),

        // Cadências (JSON)
        emailOnlyCadence: (() => {
          try {
            return JSON.parse(userSettings.emailOnlyCadence || "[]");
          } catch (error) {
            console.error('[Campaigns] Invalid emailOnlyCadence JSON:', error);
            return [];
          }
        })(),
        whatsappOnlyCadence: (() => {
          try {
            return JSON.parse(userSettings.whatsappOnlyCadence || "[]");
          } catch (error) {
            console.error('[Campaigns] Invalid whatsappOnlyCadence JSON:', error);
            return [];
          }
        })(),
        hybridCadence: (() => {
          try {
            return JSON.parse(userSettings.hybridCadence || "[]");
          } catch (error) {
            console.error('[Campaigns] Invalid hybridCadence JSON:', error);
            return [];
          }
        })(),

        // Configurações de envio
        useHybridCadence: userSettings.useHybridCadence,
        sendOnlyBusinessHours: userSettings.sendOnlyBusinessHours,

        // Business hours por canal
        emailBusinessHourStart: userSettings.emailBusinessHourStart,
        emailBusinessHourEnd: userSettings.emailBusinessHourEnd,
        whatsappBusinessHourStart: userSettings.whatsappBusinessHourStart,
        whatsappBusinessHourEnd: userSettings.whatsappBusinessHourEnd,
        hybridBusinessHourStart: userSettings.hybridBusinessHourStart,
        hybridBusinessHourEnd: userSettings.hybridBusinessHourEnd,

        // Limites diários por canal
        dailyEmailLimit: userSettings.dailyEmailLimit,
        whatsappDailyLimit: userSettings.whatsappDailyLimit,
        hybridDailyLimit: userSettings.hybridDailyLimit,
      } : null, // Se não houver settings, envia null (N8N pode usar defaults)
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
      stack: error instanceof Error ? error.stack : undefined,
      body: request.body,
      timestamp: new Date().toISOString(),
    });
    const message = error instanceof Error ? error.message : "Erro ao criar campanha";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
