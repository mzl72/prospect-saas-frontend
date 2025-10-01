// src/app/api/users/credits/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ensureDemoUser } from "@/lib/demo-user";

export const dynamic = "force-dynamic";

// GET - Consultar saldo de créditos
export async function GET() {
  try {
    // Garante que usuário existe e retorna dados
    const user = await ensureDemoUser();

    return NextResponse.json({
      success: true,
      credits: user.credits,
    });
  } catch (error) {
    console.error("[API /users/credits GET] Erro ao consultar créditos:", {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      { success: false, error: "Erro ao consultar créditos" },
      { status: 500 }
    );
  }
}

// PUT - Debitar créditos (não usado atualmente, mantido para compatibilidade)
export async function PUT(request: NextRequest) {
  try {
    const { amount } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Quantidade inválida" },
        { status: 400 }
      );
    }

    // Garante que usuário existe
    const demoUser = await ensureDemoUser();

    // Importa prisma apenas quando necessário
    const { prisma } = await import("@/lib/prisma-db");

    const user = await prisma.user.update({
      where: { id: demoUser.id },
      data: {
        credits: {
          decrement: amount,
        },
      },
      select: { credits: true },
    });

    return NextResponse.json({
      success: true,
      newBalance: user.credits,
    });
  } catch (error) {
    console.error("[API /users/credits PUT] Erro ao debitar créditos:", {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      { success: false, error: "Erro ao debitar créditos" },
      { status: 500 }
    );
  }
}
