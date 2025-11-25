"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Force dynamic rendering (prevent SSG with useSession)
export const dynamic = "force-dynamic";

export default function ConfiguracoesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // SECURITY (A01): Access Control - apenas ADMIN acessa
  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login");
      return;
    }
    if (session?.user?.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [session, status, router]);

  // Loading state durante autenticação
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Configurações</h1>
        <p className="text-muted-foreground">
          Configure instâncias Evolution, Email Senders, dados da empresa e usuários
        </p>
      </div>

      {/* Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-blue-600" />
            Configurações em Desenvolvimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground space-y-4">
            <p>Esta página será implementada no DIA 6 e DIA 7:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Gerenciar instâncias Evolution API (WhatsApp)</li>
              <li>Configurar Email Senders (Resend)</li>
              <li>Dados da empresa (nome, site, descrição)</li>
              <li>Gerenciar usuários (convidar, alterar roles, remover)</li>
              <li>Teste de conexão de instâncias</li>
              <li>Indicadores visuais de status (verde/vermelho)</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-6">
              Status: Aguardando implementação (Semana 1, DIA 6-7)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
