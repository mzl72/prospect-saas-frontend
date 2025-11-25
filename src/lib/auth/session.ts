import { getServerSession as nextAuthGetServerSession } from "next-auth";
import { authOptions } from "./config";
import type { Session } from "next-auth";
import { isTokenValid } from "./jwt-invalidation";

/**
 * Helper para obter session do servidor
 * Retorna null se não autenticado
 */
export async function getServerSession(): Promise<Session | null> {
  return await nextAuthGetServerSession(authOptions);
}

/**
 * Helper para obter userId da session
 * Lança erro se não autenticado
 * Valida tokenVersion para invalidar JWTs antigos
 */
export async function requireAuth(): Promise<{
  userId: string;
  role: string;
  tenancyId: string | null;
}> {
  const session = await getServerSession();

  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }

  // Validar tokenVersion (invalida JWTs após troca de senha)
  const tokenIsValid = await isTokenValid(
    session.user.id,
    session.user.tokenVersion
  );

  if (!tokenIsValid) {
    throw new Error("UNAUTHORIZED");
  }

  return {
    userId: session.user.id,
    role: session.user.role,
    tenancyId: session.user.tenancyId,
  };
}

/**
 * Helper para verificar role mínima
 * ADMIN > MANAGER > OPERATOR
 */
export async function requireRole(
  minRole: "ADMIN" | "MANAGER" | "OPERATOR"
): Promise<{
  userId: string;
  role: string;
  tenancyId: string | null;
}> {
  const auth = await requireAuth();

  const roleHierarchy = { ADMIN: 3, MANAGER: 2, OPERATOR: 1 };
  const userLevel = roleHierarchy[auth.role as keyof typeof roleHierarchy] || 0;
  const requiredLevel = roleHierarchy[minRole];

  if (userLevel < requiredLevel) {
    throw new Error("FORBIDDEN");
  }

  return auth;
}
