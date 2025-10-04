import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ReactQueryProvider } from "@/lib/react-query";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Prospect SaaS - Geração de Leads B2B com IA",
    template: "%s | Prospect SaaS"
  },
  description: "Plataforma completa de prospecção B2B: extração automática de leads do Google Maps, enriquecimento com IA, e cadências personalizadas por Email e WhatsApp. Automatize sua geração de leads.",
  keywords: [
    "geração de leads",
    "prospecção B2B",
    "automação de vendas",
    "leads Google Maps",
    "cold email",
    "WhatsApp Business",
    "enriquecimento de leads",
    "cadência de vendas",
    "IA para vendas"
  ],
  authors: [{ name: "Prospect SaaS" }],
  creator: "Prospect SaaS",
  publisher: "Prospect SaaS",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),

  openGraph: {
    title: "Prospect SaaS - Geração de Leads B2B com IA",
    description: "Extraia leads do Google Maps, enriqueça com IA e automatize campanhas personalizadas por Email e WhatsApp",
    url: "/",
    siteName: "Prospect SaaS",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Prospect SaaS - Plataforma de Geração de Leads"
      }
    ]
  },

  twitter: {
    card: "summary_large_image",
    title: "Prospect SaaS - Geração de Leads B2B com IA",
    description: "Automatize sua prospecção: Google Maps + IA + Email + WhatsApp",
    images: ["/og-image.png"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  verification: {
    // google: "your-google-verification-code", // Adicionar quando tiver
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <ThemeProvider>
            <ReactQueryProvider>{children}</ReactQueryProvider>
            <Toaster />
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
