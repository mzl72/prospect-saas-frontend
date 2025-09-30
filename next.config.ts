import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // Para Docker
  poweredByHeader: false, // Remove X-Powered-By header (segurança)
  reactStrictMode: true,
  compress: true, // Compressão gzip
};

export default nextConfig;
