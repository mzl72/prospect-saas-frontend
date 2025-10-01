"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Download, RefreshCw, Mail } from "lucide-react";
import { useState, useEffect } from "react";
import { exportLeadsToCSV } from "@/lib/csv-export";
import { toast } from "sonner";
import { useUIStore } from "@/lib/store";

type LeadStatus =
  | "EXTRACTED"
  | "ENRICHED"
  | "EMAIL_1_SENT"
  | "EMAIL_2_SENT"
  | "EMAIL_3_SENT"
  | "REPLIED"
  | "OPTED_OUT"
  | "BOUNCED";

interface Lead {
  id: string;
  nomeEmpresa: string;
  endereco: string | null;
  website: string | null;
  telefone: string | null;
  categoria: string | null;
  totalReviews: string | null;
  notaMedia: string | null;
  linkGoogleMaps: string | null;
  status: LeadStatus;
  extractedAt: string | null;
  enrichedAt: string | null;
  emails: Array<{
    id: string;
    sequenceNumber: number;
    subject: string;
    status: string;
    sentAt: string | null;
  }>;
}

interface Campaign {
  id: string;
  title: string;
  status: string;
  quantidade: number;
  tipo: string;
  createdAt: string;
  leads: Lead[];
  stats: {
    total: number;
    extracted: number;
    enriched: number;
    email1Sent: number;
    email2Sent: number;
    email3Sent: number;
    replied: number;
    optedOut: number;
    bounced: number;
  };
}

const statusColors: Record<LeadStatus, string> = {
  EXTRACTED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  ENRICHED: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  EMAIL_1_SENT: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
  EMAIL_2_SENT: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
  EMAIL_3_SENT: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300",
  REPLIED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  OPTED_OUT: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  BOUNCED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const statusLabels: Record<LeadStatus, string> = {
  EXTRACTED: "Extraído",
  ENRICHED: "Enriquecido",
  EMAIL_1_SENT: "Email 1 Enviado",
  EMAIL_2_SENT: "Email 2 Enviado",
  EMAIL_3_SENT: "Email 3 Enviado",
  REPLIED: "Respondeu",
  OPTED_OUT: "Opt-out",
  BOUNCED: "Bounce",
};

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  // Zustand: persistir auto-refresh entre reloads
  const autoRefreshEnabled = useUIStore((s) => s.autoRefreshEnabled[campaignId] ?? true);
  const setAutoRefresh = useUIStore((s) => s.setAutoRefresh);
  const newDataAvailable = useUIStore((s) => s.newDataAvailable[campaignId] ?? false);
  const markDataAsRead = useUIStore((s) => s.markDataAsRead);

  const { data: campaign, isLoading, refetch } = useQuery<Campaign>({
    queryKey: ["campaign", campaignId],
    queryFn: async () => {
      const res = await fetch(`/api/campaigns/${campaignId}`);
      if (!res.ok) throw new Error("Erro ao buscar campanha");
      const data = await res.json();
      return data.campaign;
    },
    refetchInterval: (query) => {
      // Parar auto-refresh se campanha estiver COMPLETED ou FAILED
      const campaign = query.state.data as Campaign | undefined;
      if (campaign?.status === "COMPLETED" || campaign?.status === "FAILED") {
        return false;
      }
      return autoRefreshEnabled ? 10000 : false;
    },
  });

  // Marcar dados como lidos quando componente monta
  useEffect(() => {
    if (newDataAvailable) {
      markDataAsRead(campaignId);
    }
  }, [newDataAvailable, campaignId, markDataAsRead]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600 dark:text-blue-400" />
          <p className="text-gray-600 dark:text-gray-400">Carregando campanha...</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Campanha não encontrada</p>
          <Button onClick={() => router.push("/campanhas")} className="mt-4">
            Voltar para Campanhas
          </Button>
        </div>
      </div>
    );
  }

  const progressPercentage = (campaign.stats.extracted / campaign.stats.total) * 100;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push("/campanhas")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {campaign.title}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Criada em {new Date(campaign.createdAt).toLocaleDateString("pt-BR")}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {campaign.status === "PROCESSING" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAutoRefresh(campaignId, !autoRefreshEnabled);
                  if (!autoRefreshEnabled) refetch();
                }}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${autoRefreshEnabled ? "animate-spin" : ""}`} />
                {autoRefreshEnabled ? "Auto-refresh ON" : "Auto-refresh OFF"}
              </Button>
            )}

            {campaign.status !== "PROCESSING" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
            )}

            <Badge className={campaign.status === "COMPLETED" ? "bg-green-500" : campaign.status === "FAILED" ? "bg-red-500" : "bg-yellow-500"}>
              {campaign.status}
            </Badge>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total de Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {campaign.stats.extracted}/{campaign.stats.total}
            </div>
            <Progress value={progressPercentage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Enriquecidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {campaign.stats.enriched}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {campaign.tipo === "COMPLETO" ? "Com IA" : "Não aplicável"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Emails Enviados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
              {campaign.stats.email1Sent}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Email #1 enviado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Respostas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {campaign.stats.replied}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {campaign.stats.email1Sent > 0
                ? `${((campaign.stats.replied / campaign.stats.email1Sent) * 100).toFixed(1)}% taxa`
                : "Aguardando envios"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Leads ({campaign.leads.length})</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (campaign.leads.length === 0) {
                  toast.error("Nenhum lead para exportar");
                  return;
                }
                exportLeadsToCSV(campaign.leads, campaign.title);
                toast.success("CSV exportado com sucesso!");
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">
                    Empresa
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">
                    Contato
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">
                    Categoria
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">
                    Avaliação
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {campaign.leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {lead.nomeEmpresa}
                        </div>
                        {lead.website && (
                          <a
                            href={lead.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            {lead.website}
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm">
                        {lead.telefone && (
                          <div className="text-gray-900 dark:text-white">{lead.telefone}</div>
                        )}
                        {lead.endereco && (
                          <div className="text-gray-500 dark:text-gray-400 truncate max-w-xs">
                            {lead.endereco}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {lead.categoria || "-"}
                    </td>
                    <td className="py-3 px-4">
                      {lead.notaMedia && lead.totalReviews ? (
                        <div className="text-sm">
                          <span className="font-medium text-yellow-600">★ {lead.notaMedia}</span>
                          <span className="text-gray-500 dark:text-gray-400 ml-1">
                            ({lead.totalReviews})
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={statusColors[lead.status]}>
                        {statusLabels[lead.status]}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      {lead.emails && lead.emails.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/campanhas/${campaignId}/leads/${lead.id}`)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Mail className="w-4 h-4 mr-1" />
                          Ver Emails
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {campaign.leads.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">
                  Nenhum lead extraído ainda. Aguarde o processamento...
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
