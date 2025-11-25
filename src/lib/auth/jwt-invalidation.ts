/**
 * Sistema de invalidação de JWT
 * Invalida tokens antigos quando usuário troca senha ou revoga sessões
 */

import { prisma } from "@/lib/prisma-db";

/**
 * Atualiza tokenVersion do usuário (invalida todos os JWTs antigos)
 */
export async function invalidateUserTokens(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      tokenVersion: {
        increment: 1,
      },
      updatedAt: new Date(),
    },
  });
}

/**
 * Verifica se o JWT ainda é válido comparando tokenVersion
 */
export async function isTokenValid(userId: string, tokenVersion?: number): Promise<boolean> {
  if (tokenVersion === undefined) {
    // Tokens antigos sem tokenVersion são considerados inválidos
    return false;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tokenVersion: true },
  });

  if (!user) {
    return false;
  }

  return user.tokenVersion === tokenVersion;
}
