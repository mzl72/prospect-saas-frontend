// src/app/api/users/credits/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma-db";
import { checkUserRateLimit, getUserRateLimitHeaders } from '@/lib/security';

export const dynamic = "force-dynamic";

// GET - Consultar saldo de créditos
export async function GET(_request: NextRequest) {
  try {
    // 1. Autenticação
    const { userId } = await requireAuth();

    // 2. Rate limiting: 120 req/min por usuário
    const rateLimitResult = checkUserRateLimit({
      userId,
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

    // 3. Buscar créditos do usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

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
    // Erros de autenticação/autorização
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      );
    }

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
