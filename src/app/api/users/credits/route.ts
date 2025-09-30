// src/app/api/users/credits/route.ts
import { prisma } from "@/lib/prisma-db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// TODO: Pegar da sessão autenticada
const DEMO_USER_ID = "user-1";

// GET - Consultar saldo de créditos
export async function GET() {
  try {
    // Buscar ou criar usuário
    let user = await prisma.user.findUnique({
      where: { id: DEMO_USER_ID },
      select: { credits: true },
    });

    // Se não existir, criar
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: DEMO_USER_ID,
          email: "user@example.com",
          name: "Usuário Padrão",
          credits: 150,
        },
        select: { credits: true },
      });
    }

    return NextResponse.json({
      success: true,
      credits: user.credits,
    });
  } catch (error) {
    console.error("Erro ao consultar créditos:", error);
    return NextResponse.json(
      { error: "Erro ao consultar créditos" },
      { status: 500 }
    );
  }
}

// PUT - Debitar créditos
export async function PUT(request: NextRequest) {
  try {
    const { amount } = await request.json();

    const user = await prisma.user.update({
      where: { id: DEMO_USER_ID },
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
    console.error("Erro ao debitar créditos:", error);
    return NextResponse.json(
      { error: "Erro ao debitar créditos" },
      { status: 500 }
    );
  }
}
