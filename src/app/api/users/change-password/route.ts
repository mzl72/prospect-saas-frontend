import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma-db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import {
  checkUserRateLimit,
  getUserRateLimitHeaders,
  validatePayloadSize,
  sanitizeForDatabase,
} from "@/lib/security";

export const dynamic = "force-dynamic";

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Senha atual é obrigatória"),
  newPassword: z
    .string()
    .min(8, "Nova senha deve ter no mínimo 8 caracteres")
    .max(128, "Nova senha deve ter no máximo 128 caracteres")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Nova senha deve conter letras maiúsculas, minúsculas e números"
    ),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Autenticação
    const { userId } = await requireAuth();

    // 2. Rate limiting: 5 tentativas por hora (previne brute force de senha atual)
    const rateLimitResult = checkUserRateLimit({
      userId,
      endpoint: "users:change-password",
      maxRequests: 5,
      windowMs: 60 * 60 * 1000,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Limite de tentativas excedido. Aguarde 1 hora.",
        },
        {
          status: 429,
          headers: getUserRateLimitHeaders(rateLimitResult),
        }
      );
    }

    // 3. Validar payload size
    const bodyText = await request.text();
    const payloadValidation = validatePayloadSize(bodyText, 1024); // 1KB max

    if (!payloadValidation.valid) {
      return NextResponse.json(
        { success: false, error: payloadValidation.error },
        { status: 413 }
      );
    }

    const body = JSON.parse(bodyText);

    // 4. Sanitizar
    const sanitizedBody = sanitizeForDatabase(body);

    // 5. Validar com Zod
    const validation = ChangePasswordSchema.safeParse(sanitizedBody);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Dados inválidos",
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = validation.data;

    // 6. Buscar usuário com senha atual
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { success: false, error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    // 7. Validar senha atual
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isCurrentPasswordValid) {
      console.warn(`[Change Password] Senha atual incorreta - UserId: ${userId}`);
      return NextResponse.json(
        { success: false, error: "Senha atual incorreta" },
        { status: 401 }
      );
    }

    // 8. Hash da nova senha com bcrypt rounds 14 (OWASP 2025)
    const hashedPassword = await bcrypt.hash(newPassword, 14);

    // 9. Atualizar senha e invalidar todos os JWTs antigos (transação atômica)
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
          tokenVersion: { increment: 1 }, // Invalida JWTs antigos
          updatedAt: new Date(),
        },
      });
    });

    console.info(`[Change Password] Senha alterada com sucesso - UserId: ${userId}`);

    return NextResponse.json(
      {
        success: true,
        message: "Senha alterada com sucesso. Faça login novamente.",
      },
      {
        headers: getUserRateLimitHeaders(rateLimitResult),
      }
    );
  } catch (error) {
    // Erros de autenticação
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: "Não autenticado" },
        { status: 401 }
      );
    }

    console.error("[API /users/change-password] Erro:", {
      error: error instanceof Error ? error.message : error,
      stack:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.stack
          : undefined,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { success: false, error: "Erro ao trocar senha" },
      { status: 500 }
    );
  }
}
