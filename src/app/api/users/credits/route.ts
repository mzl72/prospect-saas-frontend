// src/app/api/users/credits/route.ts
import { NextResponse } from "next/server";
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
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      { success: false, error: "Erro ao consultar créditos" },
      { status: 500 }
    );
  }
}

// PUT removido - era código morto que nunca foi usado
// Créditos são debitados diretamente em POST /api/campaigns
