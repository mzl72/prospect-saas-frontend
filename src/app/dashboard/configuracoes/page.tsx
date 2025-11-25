"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

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
    if (session.user.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [session, status, router]);
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Configurações</h1>
        <p className="text-gray-400">
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
          <div className="text-gray-400 space-y-4">
            <p>Esta página será implementada no DIA 6 e DIA 7:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Gerenciar instâncias Evolution API (WhatsApp)</li>
              <li>Configurar Email Senders (Resend)</li>
              <li>Dados da empresa (nome, site, descrição)</li>
              <li>Gerenciar usuários (convidar, alterar roles, remover)</li>
              <li>Teste de conexão de instâncias</li>
              <li>Indicadores visuais de status (verde/vermelho)</li>
            </ul>
            <p className="text-sm text-gray-500 mt-6">
              Status: Aguardando implementação (Semana 1, DIA 6-7)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
