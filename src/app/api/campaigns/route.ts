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
    });

    return NextResponse.json({
      success: true,
      campaigns,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Erro ao buscar campanhas" },
      { status: 500 }
    );
  }
}

// POST - Criar nova campanha
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const campaign = await prisma.campaign.create({
      data: {
        userId: DEMO_USER_ID,
        title: body.titulo,
        quantidade: body.quantidade,
        tipo: body.nivelServico.toUpperCase(),
        termos: body.tipoNegocio.join(","),
        locais: body.localizacao.join(","),
        status: "PROCESSING",
      },
    });

    return NextResponse.json({
      success: true,
      campaignId: campaign.id,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Erro ao criar campanha" },
      { status: 500 }
    );
  }
}
