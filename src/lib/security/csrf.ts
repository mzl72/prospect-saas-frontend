/**
 * CSRF Protection
 * NextAuth já fornece proteção CSRF para rotas de autenticação
 * Este módulo adiciona proteção adicional para outras rotas sensíveis
 */

import { NextRequest } from "next/server";
import { getServerSession } from "@/lib/auth";

/**
 * Lista de métodos HTTP que requerem proteção CSRF
 */
const CSRF_PROTECTED_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

/**
 * Valida CSRF token em requisições state-changing
 * NextAuth já gerencia CSRF automaticamente para /api/auth/*
 */
export async function validateCSRF(request: NextRequest): Promise<boolean> {
  const method = request.method;

  // Métodos GET, HEAD, OPTIONS não precisam CSRF
  if (!CSRF_PROTECTED_METHODS.includes(method)) {
    return true;
  }

  // Rotas /api/auth/* já são protegidas pelo NextAuth
  if (request.nextUrl.pathname.startsWith("/api/auth/")) {
    return true;
  }

  // Webhooks externos não usam sessão (usam secret header)
  if (request.nextUrl.pathname.startsWith("/api/webhooks/")) {
    return true;
  }

  // Para outras rotas, validar que existe sessão válida
  // NextAuth já valida o CSRF token automaticamente na sessão
  const session = await getServerSession();

  if (!session) {
    // Sem sessão, sem proteção CSRF necessária (401 será retornado por requireAuth)
    return true;
  }

  // Validar origin header (Double Submit Cookie pattern)
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  const referer = request.headers.get("referer");

  // Para requisições com sessão, validar que origin/referer correspondem ao host
  if (origin) {
    const originHost = new URL(origin).host;
    if (originHost !== host) {
      console.warn(`[CSRF] Origin mismatch - Origin: ${originHost}, Host: ${host}`);
      return false;
    }
  } else if (referer) {
    const refererHost = new URL(referer).host;
    if (refererHost !== host) {
      console.warn(`[CSRF] Referer mismatch - Referer: ${refererHost}, Host: ${host}`);
      return false;
    }
  } else {
    // Requisições state-changing devem ter origin ou referer
    console.warn(`[CSRF] Missing origin and referer headers for ${method} ${request.nextUrl.pathname}`);
    return false;
  }

  return true;
}

/**
 * Helper para gerar mensagem de erro CSRF
 */
export function csrfError() {
  return {
    success: false,
    error: "CSRF validation failed",
  };
}
