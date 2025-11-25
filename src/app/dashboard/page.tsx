"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Users, TrendingUp, CreditCard } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";

// Force dynamic rendering (não fazer SSG)
export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const { data: creditos = 0 } = useCredits();

  interface Campaign {
    id: string;
    status: string;
    _count?: { leads: number };
  }

  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const res = await fetch("/api/campaigns");
      if (!res.ok) throw new Error("Erro ao buscar campanhas");
      const data = await res.json();
      return data.campaigns || [];
    },
  });

  // Métricas básicas
  const totalCampanhas = campaigns.length;
  const campanhasAtivas = campaigns.filter((c) => c.status === "PROCESSING").length;
  const totalLeads = campaigns.reduce((acc, c) => acc + (c._count?.leads || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral das suas campanhas e métricas</p>
      </div>

      {/* Métricas Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Campanhas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Campanhas
            </CardTitle>
            <Target className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalCampanhas}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {campanhasAtivas} ativas
            </p>
          </CardContent>
        </Card>

        {/* Total Leads */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Leads
            </CardTitle>
            <Users className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalLeads}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Extraídos e enriquecidos
            </p>
          </CardContent>
        </Card>

        {/* Taxa de Conversão (placeholder) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Resposta
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">--%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Em breve
            </p>
          </CardContent>
        </Card>

        {/* Créditos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Créditos Disponíveis
            </CardTitle>
            <CreditCard className="w-4 h-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{creditos}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Saldo atual
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Placeholder para gráficos futuros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Atividade Recente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p>Gráficos e métricas detalhadas em breve...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
