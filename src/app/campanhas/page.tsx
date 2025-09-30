"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { useRef, useEffect } from "react";

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
  // Rastreia tempo de polling para cada campanha
  const pollingStartTimes = useRef<Record<string, number>>({});
  const MAX_POLLING_TIME = 30 * 60 * 1000; // 30 minutos timeout

  const { data: campanhas = [], isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const response = await fetch("/api/campaigns");
      const data = await response.json();

      if (!data.success) return [];

      return data.campaigns.map((c: CampaignResponse) => {
        const status = c.status === "PROCESSING" ? "processando" :
                       c.status === "FAILED" ? "falhou" : "concluido";

        // Registra tempo de início do polling
        if (status === "processando" && !pollingStartTimes.current[c.id]) {
          pollingStartTimes.current[c.id] = Date.now();
        }

        // Remove do rastreamento se completou
        if (status !== "processando" && pollingStartTimes.current[c.id]) {
          delete pollingStartTimes.current[c.id];
        }

        return {
          id: c.id,
          titulo: c.title,
          status,
          quantidade: c.quantidade,
          tipo: c.tipo.toLowerCase(),
          criadoEm: new Date(c.createdAt).toLocaleString("pt-BR"),
          planilhaUrl: c.planilhaUrl,
        };
      });
    },
    refetchInterval: (query) => {
      const hasProcessing = query.state.data?.some(
        (c: { id: string; status: string }) => {
          if (c.status !== "processando") return false;

          // Verifica timeout
          const startTime = pollingStartTimes.current[c.id];
          if (startTime && Date.now() - startTime > MAX_POLLING_TIME) {
            console.warn(`Campanha ${c.id} atingiu timeout de polling`);
            return false; // Para de fazer polling
          }

          return true;
        }
      );
      return hasProcessing ? 10000 : false; // Atualiza a cada 10s
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="py-8">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center">
              <div className="text-lg">Carregando campanhas...</div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Minhas Campanhas</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Acompanhe o status das suas campanhas
            </p>
          </div>

          <div className="space-y-4">
          {campanhas.map(
            (campanha: {
              id: string;
              titulo: string;
              status: "processando" | "concluido" | "falhou";
              quantidade: number;
              tipo: "basico" | "completo";
              criadoEm: string;
              planilhaUrl?: string;
            }) => (
              <Card key={campanha.id} className="dark:bg-gray-800 dark:border-gray-700">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg dark:text-white">
                        {campanha.titulo}
                      </CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
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

                    {campanha.status === "falhou" && (
                      <Badge
                        variant="destructive"
                        className="flex items-center gap-1"
                      >
                        <Clock className="w-3 h-3" />
                        Falhou
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

                  {campanha.status === "falhou" && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-lg">
                      <p className="text-red-700 dark:text-red-400 text-sm font-medium">
                        Erro ao processar campanha
                      </p>
                      <p className="text-red-600 dark:text-red-300 text-xs mt-1">
                        A campanha pode ter falhado ou atingido o tempo limite.
                        Tente criar uma nova campanha.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          )}

          {campanhas.length === 0 && !isLoading && (
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">Nenhuma campanha encontrada</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
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
    </Layout>
  );
}
