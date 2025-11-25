"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function TemplatesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // SECURITY (A01): Access Control - apenas MANAGER+ acessa
  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login");
      return;
    }
    if (session.user.role === "OPERATOR") {
      router.push("/dashboard");
    }
  }, [session, status, router]);
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Templates</h1>
        <p className="text-gray-400">
          Gerencie templates de email, WhatsApp e prompts de IA
        </p>
      </div>

      {/* Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-blue-600" />
            Templates em Desenvolvimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-400 space-y-4">
            <p>Esta página será implementada no DIA 4 e DIA 5:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>CRUD de templates (Email, WhatsApp, Prompts IA)</li>
              <li>Editor com syntax highlight de variáveis</li>
              <li>Preview de templates com dados de exemplo</li>
              <li>Biblioteca de templates prontos</li>
              <li>Validação de variáveis {"{variavel}"}</li>
            </ul>
            <p className="text-sm text-gray-500 mt-6">
              Status: Aguardando implementação (Semana 1, DIA 4-5)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
