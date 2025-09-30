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

    // 1. Criar usuário se não existir
    await prisma.user.upsert({
      where: { id: DEMO_USER_ID },
      create: {
        id: DEMO_USER_ID,
        email: "demo@test.com",
        name: "Demo User",
        credits: 150,
      },
      update: {},
    });

    // 2. Salvar campanha no banco PostgreSQL
    const campaign = await prisma.campaign.create({
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

    // 3. Chamar N8N para processar (paralelo, não bloqueia resposta)
    const n8nPayload = {
      campaignId: campaign.id, // ID real do banco
      termos: body.tipoNegocio.join(","),
      locais: body.localizacao.join(","),
      quantidade: body.quantidade,
      nivelServico: body.nivelServico,
      consolidado: body.nivelServico === "completo" ? "true" : "false",
      timestamp: new Date().toLocaleString("pt-BR"),
      titulo: body.titulo,
    };

    // Chama N8N sem aguardar resposta (async)
    fetch("https://n8n.fflow.site/webhook/interface", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: n8nPayload }),
    }).catch((error) => {
      console.log("Erro N8N (não crítico):", error);
    });

    // 4. Resposta imediata para frontend
    return NextResponse.json({
      success: true,
      campaignId: campaign.id,
      message: "Campanha criada e enviada para processamento!",
    });
  } catch (error) {
    console.log("Erro ao criar campanha:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao criar campanha" },
      { status: 500 }
    );
  }
}
