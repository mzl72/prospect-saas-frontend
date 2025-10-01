// src/app/api/campaigns/route.ts
import { prisma } from "@/lib/prisma-db";
import { NextRequest, NextResponse } from "next/server";
import { DEMO_USER_ID, ensureDemoUser } from "@/lib/demo-user";
import { CUSTO_BASICO, CUSTO_COMPLETO } from "@/hooks/useCampaignCost";

export const dynamic = "force-dynamic";

// Quantidades permitidas
const ALLOWED_QUANTITIES = [4, 20, 40, 100, 200] as const;

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
    const body = await request.json();

    // Validação: quantidade deve estar na lista permitida
    if (!ALLOWED_QUANTITIES.includes(body.quantidade)) {
      return NextResponse.json(
        {
          success: false,
          error: `Quantidade inválida. Permitido: ${ALLOWED_QUANTITIES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validação: campos obrigatórios
    if (!body.tipoNegocio || !body.localizacao || !body.nivelServico) {
      return NextResponse.json(
        { success: false, error: "Campos obrigatórios ausentes" },
        { status: 400 }
      );
    }

    // Calcular custo
    const custo = body.nivelServico === "basico"
      ? body.quantidade * CUSTO_BASICO
      : body.quantidade * CUSTO_COMPLETO;

    // Garante que usuário existe antes da transação
    await ensureDemoUser();

    // Buscar configurações do usuário para enviar ao N8N
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: DEMO_USER_ID },
    });

    // Validação: modo completo requer configurações
    if (body.nivelServico === "completo" && !userSettings) {
      return NextResponse.json(
        {
          success: false,
          error: "Configurações necessárias para o modo completo. Acesse /configuracoes e configure os templates de IA antes de criar uma campanha completa.",
        },
        { status: 400 }
      );
    }

    // Validação adicional: verificar se templates estão preenchidos (modo completo)
    if (body.nivelServico === "completo" && userSettings) {
      const templatesVazios = [];

      if (!userSettings.templatePesquisa?.trim()) {
        templatesVazios.push("Template de Pesquisa");
      }
      if (!userSettings.templateAnaliseEmpresa?.trim()) {
        templatesVazios.push("Template de Análise de Empresa");
      }
      if (!userSettings.emailTitulo1?.trim() || !userSettings.emailCorpo1?.trim()) {
        templatesVazios.push("Email 1");
      }
      if (!userSettings.emailTitulo2?.trim() || !userSettings.emailCorpo2?.trim()) {
        templatesVazios.push("Email 2");
      }
      if (!userSettings.emailTitulo3?.trim() || !userSettings.emailCorpo3?.trim()) {
        templatesVazios.push("Email 3");
      }
      if (!userSettings.informacoesPropria?.trim()) {
        templatesVazios.push("Informações da Sua Empresa");
      }

      if (templatesVazios.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Os seguintes campos estão vazios em /configuracoes: ${templatesVazios.join(", ")}. Preencha-os antes de criar uma campanha completa.`,
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

      // 3. Criar campanha
      const campaign = await tx.campaign.create({
        data: {
          userId: DEMO_USER_ID,
          title: body.titulo,
          quantidade: body.quantidade,
          tipo: body.nivelServico.toUpperCase() as "BASICO" | "COMPLETO",
          termos: body.tipoNegocio.join(","),
          locais: body.localizacao.join(","),
          status: "PROCESSING",
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
        templatePesquisa: userSettings.templatePesquisa,
        templateAnaliseEmpresa: userSettings.templateAnaliseEmpresa,
        emailTemplates: [
          {
            titulo: userSettings.emailTitulo1,
            corpo: userSettings.emailCorpo1,
          },
          {
            titulo: userSettings.emailTitulo2,
            corpo: userSettings.emailCorpo2,
          },
          {
            titulo: userSettings.emailTitulo3,
            corpo: userSettings.emailCorpo3,
          },
        ],
        informacoesPropria: userSettings.informacoesPropria,
      } : null, // Se não houver settings, envia null (N8N pode usar defaults)
    };

    fetch(n8nUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: n8nPayload }),
    }).catch((error) => {
      console.error("[API /campaigns POST] Erro ao chamar N8N (não crítico):", {
        error: error instanceof Error ? error.message : error,
        campaignId: result.id,
        n8nUrl,
        timestamp: new Date().toISOString(),
      });
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
