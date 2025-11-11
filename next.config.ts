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
        ],
      },
    ];
  },
};

export default nextConfig;
