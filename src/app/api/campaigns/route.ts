// src/app/api/campaigns/route.ts
import { prisma } from "@/lib/prisma-db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Usuário fixo por enquanto (sem auth)
const DEMO_USER_ID = "user_demo_123";

// GET - Listar campanhas
export async function GET() {
  try {
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
    console.log("Erro ao buscar campanhas:", error);
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

    // Calcular custo
    const custo = body.nivelServico === "basico"
      ? body.quantidade * 0.25
      : body.quantidade * 1;

    // Transação atômica: criar campanha + debitar créditos
    const result = await prisma.$transaction(async (tx) => {
      // 1. Criar usuário se não existir
      await tx.user.upsert({
        where: { id: DEMO_USER_ID },
        create: {
          id: DEMO_USER_ID,
          email: "demo@test.com",
          name: "Demo User",
          credits: 150,
        },
        update: {},
      });

      // 2. Verificar saldo
      const user = await tx.user.findUnique({
        where: { id: DEMO_USER_ID },
        select: { credits: true },
      });

      if (!user || user.credits < custo) {
        throw new Error("Créditos insuficientes");
      }

      // 3. Debitar créditos
      await tx.user.update({
        where: { id: DEMO_USER_ID },
        data: { credits: { decrement: custo } },
      });

      // 4. Criar campanha
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
      campaignId: result.id,
      termos: body.tipoNegocio.join(","),
      locais: body.localizacao.join(","),
      quantidade: body.quantidade,
      nivelServico: body.nivelServico,
      consolidado: body.nivelServico === "completo" ? "true" : "false",
      timestamp: new Date().toLocaleString("pt-BR"),
      titulo: body.titulo,
    };

    fetch(n8nUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: n8nPayload }),
    }).catch((error) => {
      console.log("Erro N8N (não crítico):", error);
    });

    // 6. Resposta imediata para frontend
    return NextResponse.json({
      success: true,
      campaignId: result.id,
      message: "Campanha criada e enviada para processamento!",
    });
  } catch (error) {
    console.log("Erro ao criar campanha:", error);
    const message = error instanceof Error ? error.message : "Erro ao criar campanha";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
