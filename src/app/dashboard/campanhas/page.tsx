"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { Plus, MoreVertical } from "lucide-react";
import Link from "next/link";
import { LeadGenerationWizard } from "@/components/wizard/LeadGenerationWizard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Campaign type
interface Campaign {
  id: string;
  title: string;
  status: string;
  tipo: string;
  createdAt: string;
  creditsCost?: number;
  creditsRefunded?: number;
  leadsRequested?: number;
  _count?: {
    leads: number;
  };
}

// Status colors (Meta Ads style)
const statusColors: Record<string, string> = {
  PROCESSING: "bg-blue-100 text-blue-800",
  EXTRACTION_COMPLETED: "bg-cyan-100 text-cyan-800",
  COMPLETED: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
  PAUSED: "bg-gray-100 text-gray-800",
};

const statusLabels: Record<string, string> = {
  PROCESSING: "Em Processamento",
  EXTRACTION_COMPLETED: "Extração Concluída",
  COMPLETED: "Concluída",
  FAILED: "Falhou",
  PAUSED: "Pausada",
};

type TabType = "all" | "active" | "paused" | "completed";

export default function CampanhasPage() {
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const res = await fetch("/api/campaigns");
      if (!res.ok) throw new Error("Erro ao buscar campanhas");
      const data = await res.json();
      return data.campaigns || [];
    },
    refetchInterval: 30000, // Refetch a cada 30s
  });

  // Filtrar campanhas por tab
  const filteredCampaigns = campaigns.filter((campaign) => {
    if (activeTab === "all") return true;
    if (activeTab === "active") return campaign.status === "PROCESSING" || campaign.status === "EXTRACTION_COMPLETED";
    if (activeTab === "paused") return campaign.status === "PAUSED";
    if (activeTab === "completed") return campaign.status === "COMPLETED" || campaign.status === "FAILED";
    return true;
  });

  // Contar por status
  const counts = {
    all: campaigns.length,
    active: campaigns.filter((c) => c.status === "PROCESSING" || c.status === "EXTRACTION_COMPLETED").length,
    paused: campaigns.filter((c) => c.status === "PAUSED").length,
    completed: campaigns.filter((c) => c.status === "COMPLETED" || c.status === "FAILED").length,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header com botão Criar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Campanhas</h1>
          <p className="text-gray-400">Gerencie suas campanhas de prospecção</p>
        </div>

        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Criar
        </Button>
      </div>

      {/* Tabs (Meta Ads style) */}
      <Tabs
        tabs={[
          { label: "Todas", value: "all", count: counts.all },
          { label: "Ativas", value: "active", count: counts.active },
          { label: "Pausadas", value: "paused", count: counts.paused },
          { label: "Concluídas", value: "completed", count: counts.completed },
        ]}
        activeTab={activeTab}
        onChange={(value) => setActiveTab(value as TabType)}
        variant="underline"
        className="mb-6"
      />

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-400">Carregando campanhas...</div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredCampaigns.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-400 mb-4">
              {activeTab === "all"
                ? "Você ainda não criou nenhuma campanha"
                : `Nenhuma campanha ${activeTab === "active" ? "ativa" : activeTab === "paused" ? "pausada" : "concluída"}`}
            </p>
            {activeTab === "all" && (
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Campanha
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lista de Campanhas */}
      {!isLoading && filteredCampaigns.length > 0 && (
        <div className="space-y-4">
          {filteredCampaigns.map((campaign) => (
            <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  {/* Info da Campanha */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Link
                        href={`/dashboard/campanhas/${campaign.id}`}
                        className="text-lg font-semibold text-white hover:text-blue-600 transition-colors"
                      >
                        {campaign.title.substring(0, 200)}
                      </Link>
                      <Badge className={statusColors[campaign.status]}>
                        {statusLabels[campaign.status]}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-6 text-sm text-gray-400">
                      <span>Tipo: {campaign.tipo === "BASICO" ? "Básico" : "Completo"}</span>
                      <span>•</span>
                      <span>
                        {campaign._count?.leads || 0} leads
                        {campaign.leadsRequested && ` / ${campaign.leadsRequested} solicitados`}
                      </span>
                      <span>•</span>
                      <span>
                        {new Date(campaign.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2">
                    <Link href={`/dashboard/campanhas/${campaign.id}`}>
                      <Button variant="outline" size="sm">
                        Ver Detalhes
                      </Button>
                    </Link>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Métricas Inline (placeholder) */}
                <div className="mt-4 pt-4 border-t border-gray-700 flex items-center gap-8 text-sm">
                  <div>
                    <span className="text-gray-400">Gasto: </span>
                    <span className="font-semibold text-white">
                      {campaign.creditsCost || 0} créditos
                    </span>
                  </div>
                  {(campaign.creditsRefunded ?? 0) > 0 && (
                    <div>
                      <span className="text-gray-400">Reembolsado: </span>
                      <span className="font-semibold text-green-600">
                        +{campaign.creditsRefunded} créditos
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de Criação de Campanha */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Nova Campanha de Extração</DialogTitle>
          </DialogHeader>
          <LeadGenerationWizard />
        </DialogContent>
      </Dialog>
    </div>
  );
}
