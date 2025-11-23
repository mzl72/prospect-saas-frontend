import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

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
