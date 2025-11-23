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

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // CSRF Protection (OWASP A02:2025)
    if (!validateCSRFHeaders(req)) {
      return NextResponse.json(
        { success: false, error: "CSRF validation failed" },
        { status: 403 }
      );
    }

    // Se está tentando acessar /dashboard sem autenticação
    if (path.startsWith("/dashboard") && !token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Se está autenticado e tenta acessar /login, redireciona para dashboard
    if (path === "/login" && token) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
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
