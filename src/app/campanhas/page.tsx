"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface CampaignResponse {
  id: string;
  title: string;
  status: string;
  quantidade: number;
  tipo: string;
  createdAt: string;
  planilhaUrl: string | null;
}

function calcularTempoEstimado(quantidade: number, tipo: string): string {
  let segundosPorLead: number;

  if (tipo === "basico") {
    segundosPorLead = 15;
  } else {
    segundosPorLead = 45;
  }

  const totalSegundos = quantidade * segundosPorLead;
  const minutos = Math.ceil(totalSegundos / 60);

  if (minutos < 1) return "menos de 1 min";
  if (minutos === 1) return "1 min";
  if (minutos <= 3) return `${minutos - 1}-${minutos} min`;
  return `${Math.floor(minutos * 0.9)}-${minutos} min`;
}

export default function CampanhasPage() {
  const { data: campanhas = [], isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const response = await fetch("/api/campaigns");
      const data = await response.json();

      if (!data.success) return [];

      return data.campaigns.map((c: CampaignResponse) => ({
        id: c.id,
        titulo: c.title,
        status: c.status === "PROCESSING" ? "processando" : "concluido",
        quantidade: c.quantidade,
        tipo: c.tipo.toLowerCase(),
        criadoEm: new Date(c.createdAt).toLocaleString("pt-BR"),
        planilhaUrl: c.planilhaUrl,
      }));
    },
    refetchInterval: (query) => {
      const hasProcessing = query.state.data?.some(
        (c: { status: string }) => c.status === "processando"
      );
      return hasProcessing ? 10000 : false; // Atualiza a cada 10s se tiver campanha processando
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <div className="text-lg">Carregando campanhas...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Minhas Campanhas</h1>
          <p className="text-gray-600 mt-2">
            Acompanhe o status das suas campanhas
          </p>
        </div>

        <div className="space-y-4">
          {campanhas.map(
            (campanha: {
              id: string;
              titulo: string;
              status: "processando" | "concluido";
              quantidade: number;
              tipo: "basico" | "completo";
              criadoEm: string;
              planilhaUrl?: string;
            }) => (
              <Card key={campanha.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {campanha.titulo}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        {campanha.quantidade} leads • {campanha.tipo} •{" "}
                        {campanha.criadoEm}
                      </p>
                    </div>

                    {campanha.status === "processando" && (
                      <Badge
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        <Clock className="w-3 h-3" />
                        Processando
                      </Badge>
                    )}

                    {campanha.status === "concluido" && (
                      <Badge
                        variant="default"
                        className="flex items-center gap-1"
                      >
                        <CheckCircle className="w-3 h-3" />
                        Concluído
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent>
                  {campanha.status === "processando" && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span>Iniciando extração de dados...</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-400">
                        <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                        <span>Aguardando processamento</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Tempo estimado:{" "}
                        {calcularTempoEstimado(
                          campanha.quantidade,
                          campanha.tipo
                        )}
                      </p>
                    </div>
                  )}

                  {campanha.status === "concluido" && (
                    <>
                      {campanha.planilhaUrl ? (
                        <Button
                          className="flex items-center gap-2"
                          onClick={() => window.open(campanha.planilhaUrl, "_blank")}
                        >
                          <Download className="w-4 h-4" />
                          Abrir Planilha
                        </Button>
                      ) : (
                        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                          <p className="text-yellow-700 text-sm">
                            Planilha ainda não disponível
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )
          )}

          {campanhas.length === 0 && !isLoading && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">Nenhuma campanha encontrada</p>
                <p className="text-sm text-gray-400 mt-1">
                  Gere sua primeira campanha para ver o histórico aqui
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="mt-8">
          <Button
            onClick={() => (window.location.href = "/gerar")}
            variant="outline"
          >
            Nova Campanha
          </Button>
        </div>
      </div>
    </div>
  );
}
