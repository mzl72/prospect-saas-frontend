// src/app/api/users/credits/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ensureDemoUser, DEMO_USER_ID } from "@/lib/demo-user";
import { checkUserRateLimit, getUserRateLimitHeaders } from '@/lib/security';

export const dynamic = "force-dynamic";

// GET - Consultar saldo de créditos
export async function GET(_request: NextRequest) {
  try {
    // 1. Rate limiting: 120 req/min por usuário
    const rateLimitResult = checkUserRateLimit({
      userId: DEMO_USER_ID,
      endpoint: 'credits:get',
      maxRequests: 120,
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

    // 2. Garante que usuário existe e retorna dados
    const user = await ensureDemoUser();

    return NextResponse.json(
      {
        success: true,
        credits: user.credits,
      },
      {
        headers: getUserRateLimitHeaders(rateLimitResult),
      }
    );
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
