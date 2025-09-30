// src/app/api/users/credits/route.ts
import { prisma } from "@/lib/prisma-db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEMO_USER_ID = "user_demo_123";

// GET - Consultar saldo de créditos
export async function GET() {
  try {
    const user = await prisma.user.findUnique({
      where: { id: DEMO_USER_ID },
      select: { credits: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      credits: user.credits,
    });
  } catch (error) {
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
    return NextResponse.json(
      { error: "Erro ao debitar créditos" },
      { status: 500 }
    );
  }
}
