import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // Para Docker
  poweredByHeader: false, // Remove X-Powered-By header (segurança)
  reactStrictMode: true,
  compress: true, // Compressão gzip
  async headers() {
    return [
      {
        // Aplica headers de segurança a todas as rotas API
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Webhook-Secret, X-Cron-Secret',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        // Headers de segurança para todas as páginas
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Content-Security-Policy',
            // CSP rigoroso (OWASP A02:2025)
            // Permite apenas recursos do mesmo origin, com exceções necessárias
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // unsafe-inline necessário para Next.js
              "style-src 'self' 'unsafe-inline'", // unsafe-inline necessário para Tailwind/styled-components
              "img-src 'self' data: https:", // Permite imagens de CDNs
              "font-src 'self' data:",
              "connect-src 'self' https://n8n-prospect.easycheck.site https://evolution-prospect.easycheck.site",
              "frame-ancestors 'none'", // Previne clickjacking
              "base-uri 'self'", // Previne ataques de injeção de base tag
              "form-action 'self'", // Apenas submissões para mesmo origin
              "upgrade-insecure-requests", // Força HTTPS
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
