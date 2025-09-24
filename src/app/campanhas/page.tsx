"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { useCampaignStatus } from "@/lib/hooks/useCampaignStatus";

interface Campanha {
  id: string;
  titulo: string;
  status: "processando" | "concluido";
  quantidade: number;
  tipo: "basico" | "completo";
  criadoEm: string;
  planilhaUrl?: string;
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

function CampanhaStatus({ campanha }: { campanha: Campanha }) {
  const { status } = useCampaignStatus(
    campanha.id,
    campanha.status !== "concluido"
  );

  const currentStatus = status?.status || campanha.status;

  if (currentStatus === "processando") {
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <Clock className="w-3 h-3" />
        Processando
      </Badge>
    );
  }

  return (
    <Badge variant="default" className="flex items-center gap-1">
      <CheckCircle className="w-3 h-3" />
      Concluído
    </Badge>
  );
}

function CampanhaContent({ campanha }: { campanha: Campanha }) {
  const { status } = useCampaignStatus(
    campanha.id,
    campanha.status !== "concluido"
  );

  const currentStatus = status?.status || campanha.status;
  const planilhaUrl = status?.planilhaUrl || campanha.planilhaUrl;

  if (currentStatus === "processando") {
    return (
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-sm">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span>{status?.message || "Iniciando extração de dados..."}</span>
          </div>
          <p className="text-xs text-gray-500">
            Tempo estimado:{" "}
            {calcularTempoEstimado(campanha.quantidade, campanha.tipo)}
          </p>
        </div>
      </CardContent>
    );
  }

  return (
    <CardContent>
      <Button
        className="flex items-center gap-2"
        onClick={() => {
          if (planilhaUrl) {
            window.open(planilhaUrl, "_blank");
          } else {
            alert("Link da planilha não disponível");
          }
        }}
      >
        <Download className="w-4 h-4" />
        Abrir Planilha
      </Button>
    </CardContent>
  );
}

export default function CampanhasPage() {
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);

  useEffect(() => {
    const ultimaCampanha = localStorage.getItem("ultimaCampanha");

    if (ultimaCampanha) {
      try {
        const campanha: Campanha = JSON.parse(ultimaCampanha);
        setCampanhas([campanha]);
      } catch (error) {
        console.error("Erro ao ler campanha do localStorage:", error);
      }
    }
  }, []);

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
          {campanhas.map((campanha) => (
            <Card key={campanha.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{campanha.titulo}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {campanha.quantidade} leads • {campanha.tipo} •{" "}
                      {campanha.criadoEm}
                    </p>
                  </div>

                  <CampanhaStatus campanha={campanha} />
                </div>
              </CardHeader>

              <CampanhaContent campanha={campanha} />
            </Card>
          ))}

          {campanhas.length === 0 && (
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
