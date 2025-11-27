import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// CSRF Protection helper (inline para evitar problemas de importação no middleware edge)
function validateCSRFHeaders(req: NextRequest): boolean {
  const method = req.method;
  const path = req.nextUrl.pathname;

  // Métodos GET, HEAD, OPTIONS não precisam CSRF
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return true;
  }

  // Webhooks externos não usam CSRF (usam secret header)
  if (path.startsWith("/api/webhooks/") || path.startsWith("/api/auth/")) {
    return true;
  }

  // Validar origin/referer para prevenir CSRF
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  const referer = req.headers.get("referer");

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
  } else if (path.startsWith("/api/")) {
    // Requisições API state-changing devem ter origin ou referer
    console.warn(`[CSRF] Missing origin/referer for ${method} ${path}`);
    return false;
  }

  return true;
}

/**
 * Adiciona security headers nas respostas (A02:2025)
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  // SECURITY: Content Security Policy (CSP) - Mais restrito em produção
  const isDev = process.env.NODE_ENV === 'development';

  const cspDirectives = [
    "default-src 'self'",
    // Em prod: remove unsafe-eval (A05:2025 - previne XSS via eval)
    isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://n8n.fflow.site",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests", // Force HTTPS em prod
  ];
  response.headers.set('Content-Security-Policy', cspDirectives.join('; '));

  // SECURITY: X-Content-Type-Options (previne MIME sniffing)
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // SECURITY: X-Frame-Options (previne clickjacking)
  response.headers.set('X-Frame-Options', 'DENY');

  // SECURITY: X-XSS-Protection (legado mas útil)
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // SECURITY: Referrer-Policy (controla info vazada em referer)
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // SECURITY: Permissions-Policy (controla features do navegador)
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // CSRF Protection (OWASP A02:2025)
    if (!validateCSRFHeaders(req)) {
      const response = NextResponse.json(
        { success: false, error: "CSRF validation failed" },
        { status: 403 }
      );
      return addSecurityHeaders(response);
    }

    // Se está tentando acessar /dashboard sem autenticação
    if (path.startsWith("/dashboard") && !token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Se está autenticado e tenta acessar /login, redireciona para dashboard
    if (path === "/login" && token) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Adicionar security headers em todas as respostas
    const response = NextResponse.next();
    return addSecurityHeaders(response);
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;

        // Permitir acesso público à landing page e login
        if (path === "/" || path === "/login") {
          return true;
        }

        // Rotas /dashboard requerem autenticação
        if (path.startsWith("/dashboard")) {
          return !!token;
        }

        // Rotas API não são protegidas pelo middleware (proteção interna)
        if (path.startsWith("/api")) {
          return true;
        }

        return true;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
