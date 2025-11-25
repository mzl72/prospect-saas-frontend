"use client";

// Force dynamic rendering (não fazer SSG)
export const dynamic = "force-dynamic";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Download, RefreshCw, Mail, Info, ExternalLink, MapPin, Phone, Globe, Calendar, Star, MessageSquare } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { generateSecureCSV } from "@/lib/sanitization";

// CSV export with injection protection (OWASP A05:2025)
interface LeadForExport {
  nomeEmpresa?: string;
  email?: string;
  telefone?: string;
  website?: string;
  endereco?: string;
  categoria?: string;
  notaMedia?: string;
  totalReviews?: string;
}

function exportLeadsToCSV(leads: LeadForExport[], campaignTitle: string) {
  try {
    const headers = ["Nome Empresa", "Email", "Telefone", "Website", "Endereço", "Categoria", "Nota Média", "Total Reviews"];
    const fields = ["nomeEmpresa", "email", "telefone", "website", "endereco", "categoria", "notaMedia", "totalReviews"];

    // Usar função segura que previne CSV Injection
    const csvContent = generateSecureCSV(
      leads as Record<string, unknown>[],
      headers,
      fields
    );

    // Adicionar BOM UTF-8 para correta exibição de acentos no Excel
    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    // Sanitizar nome do arquivo (remover caracteres perigosos)
    const sanitizedTitle = campaignTitle.replace(/[^a-z0-9_-]/gi, "_");
    link.download = `${sanitizedTitle}_leads.csv`;

    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("[CSV Export] Erro ao exportar:", error);
    toast.error("Erro ao exportar CSV. Tente novamente.");
  }
}

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
  email: string | null;
  endereco: string | null;
  website: string | null;
  telefone: string | null;
  categoria: string | null;
  totalReviews: string | null;
  notaMedia: string | null;
  linkGoogleMaps: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  youtubeUrl: string | null;
  tiktokUrl: string | null;
  pinterestUrl: string | null;
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
  whatsappMessages?: Array<{
    id: string;
    sequenceNumber: number;
    message: string;
    status: string;
    sentAt: string | null;
  }>;
  cadenceType?: string | null;
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
  EXTRACTED: "bg-blue-100 text-blue-800",
  ENRICHED: "bg-purple-100 text-purple-800",
  EMAIL_1_SENT: "bg-cyan-100 text-cyan-800",
  EMAIL_2_SENT: "bg-indigo-100 text-indigo-800",
  EMAIL_3_SENT: "bg-violet-100 text-violet-800",
  REPLIED: "bg-green-100 text-green-800",
  OPTED_OUT: "bg-gray-100 text-gray-800",
  BOUNCED: "bg-red-100 text-red-800",
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
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Auto-refresh state (useState local - sem persistência entre reloads)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

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
      // OWASP A06:2025 - Insecure Design: aumentado de 10s para 30s para reduzir carga
      return autoRefreshEnabled ? 30000 : false;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-muted-foreground">Carregando campanha...</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Campanha não encontrada</p>
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
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {campaign.title}
            </h1>
            <p className="text-muted-foreground">
              Criada em {new Date(campaign.createdAt).toLocaleDateString("pt-BR")}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {campaign.status === "PROCESSING" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAutoRefreshEnabled(!autoRefreshEnabled);
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {campaign.stats.extracted}/{campaign.stats.total}
            </div>
            <Progress value={progressPercentage} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {progressPercentage.toFixed(1)}% extraído
            </p>
          </CardContent>
        </Card>

        <Card className={campaign.tipo === "BASICO" ? "opacity-65" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Enriquecidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {campaign.stats.enriched}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {campaign.tipo === "COMPLETO" ? "Com IA" : "Não aplicável (Básico)"}
            </p>
            {campaign.stats.extracted > 0 && campaign.tipo === "COMPLETO" && (
              <p className="text-xs text-muted-foreground mt-1">
                {((campaign.stats.enriched / campaign.stats.extracted) * 100).toFixed(1)}% do total
              </p>
            )}
          </CardContent>
        </Card>

        <Card className={campaign.tipo === "BASICO" ? "opacity-65" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Emails Enviados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-cyan-600">
              {campaign.tipo === "BASICO" ? 0 : campaign.stats.email1Sent + campaign.stats.email2Sent + campaign.stats.email3Sent}
            </div>
            <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
              {campaign.tipo === "BASICO" ? (
                <span>Não aplicável (Básico)</span>
              ) : (
                <>
                  <span>#1: {campaign.stats.email1Sent}</span>
                  <span>#2: {campaign.stats.email2Sent}</span>
                  <span>#3: {campaign.stats.email3Sent}</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={campaign.tipo === "BASICO" ? "opacity-50" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Respostas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {campaign.tipo === "BASICO" ? 0 : campaign.stats.replied}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {campaign.tipo === "BASICO"
                ? "Não aplicável (Básico)"
                : campaign.stats.email1Sent > 0
                ? `${((campaign.stats.replied / campaign.stats.email1Sent) * 100).toFixed(1)}% taxa de resposta`
                : "Aguardando envios"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className={campaign.tipo === "BASICO" ? "opacity-65" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Opt-outs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {campaign.tipo === "BASICO" ? 0 : campaign.stats.optedOut}
            </div>
            {campaign.tipo !== "BASICO" && campaign.stats.email1Sent > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {((campaign.stats.optedOut / campaign.stats.email1Sent) * 100).toFixed(1)}% dos enviados
              </p>
            )}
            {campaign.tipo === "BASICO" && (
              <p className="text-xs text-muted-foreground mt-1">
                Não aplicável (Básico)
              </p>
            )}
          </CardContent>
        </Card>

        <Card className={campaign.tipo === "BASICO" ? "opacity-65" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bounces
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {campaign.tipo === "BASICO" ? 0 : campaign.stats.bounced}
            </div>
            {campaign.tipo !== "BASICO" && campaign.stats.email1Sent > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {((campaign.stats.bounced / campaign.stats.email1Sent) * 100).toFixed(1)}% dos enviados
              </p>
            )}
            {campaign.tipo === "BASICO" && (
              <p className="text-xs text-muted-foreground mt-1">
                Não aplicável (Básico)
              </p>
            )}
          </CardContent>
        </Card>

        <Card className={campaign.tipo === "BASICO" ? "opacity-65" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Entrega
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {campaign.tipo === "BASICO"
                ? "0%"
                : campaign.stats.email1Sent > 0
                ? `${(((campaign.stats.email1Sent - campaign.stats.bounced) / campaign.stats.email1Sent) * 100).toFixed(1)}%`
                : "0%"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {campaign.tipo === "BASICO" ? "Não aplicável (Básico)" : "Emails entregues com sucesso"}
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
                exportLeadsToCSV(campaign.leads as LeadForExport[], campaign.title);
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
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Empresa
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Contato
                  </th>
                  {campaign.tipo === "COMPLETO" && (
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Email
                    </th>
                  )}
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Categoria
                  </th>
                  {campaign.tipo === "COMPLETO" && (
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Avaliação
                    </th>
                  )}
                  {campaign.tipo === "COMPLETO" && (
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      Redes Sociais
                    </th>
                  )}
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {campaign.leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-border hover:bg-muted/50"
                  >
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-foreground">
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
                        {lead.telefone ? (
                          <div className="text-foreground">{lead.telefone}</div>
                        ) : (
                          <div className="text-muted-foreground">Telefone não informado</div>
                        )}
                        {lead.endereco && (
                          <div className="text-muted-foreground truncate max-w-xs">
                            {lead.endereco}
                          </div>
                        )}
                      </div>
                    </td>
                    {campaign.tipo === "COMPLETO" && (
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {lead.email || <span className="text-muted-foreground">-</span>}
                      </td>
                    )}
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {lead.categoria || "-"}
                    </td>
                    {campaign.tipo === "COMPLETO" && (
                      <td className="py-3 px-4">
                        {lead.notaMedia && lead.totalReviews ? (
                          <div className="text-sm">
                            <span className="font-medium text-yellow-600">★ {lead.notaMedia}</span>
                            <span className="text-muted-foreground ml-1">
                              ({lead.totalReviews})
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    )}
                    {campaign.tipo === "COMPLETO" && (
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          {lead.linkedinUrl && (
                            <a href={lead.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700" title="LinkedIn">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                            </a>
                          )}
                          {lead.instagramUrl && (
                            <a href={lead.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:text-pink-700" title="Instagram">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                            </a>
                          )}
                          {lead.facebookUrl && (
                            <a href={lead.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:text-blue-800" title="Facebook">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
                            </a>
                          )}
                          {lead.twitterUrl && (
                            <a href={lead.twitterUrl} target="_blank" rel="noopener noreferrer" className="text-sky-500 hover:text-sky-600" title="Twitter/X">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                            </a>
                          )}
                          {lead.youtubeUrl && (
                            <a href={lead.youtubeUrl} target="_blank" rel="noopener noreferrer" className="text-red-600 hover:text-red-700" title="YouTube">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
                            </a>
                          )}
                          {!lead.linkedinUrl && !lead.instagramUrl && !lead.facebookUrl && !lead.twitterUrl && !lead.youtubeUrl && (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </div>
                      </td>
                    )}
                    <td className="py-3 px-4">
                      <Badge className={statusColors[lead.status]}>
                        {statusLabels[lead.status]}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedLead(lead)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Info className="w-4 h-4 mr-1" />
                          Mais Informações
                        </Button>
                        {lead.cadenceType === 'HYBRID' && ((lead.emails?.length ?? 0) > 0 || (lead.whatsappMessages?.length ?? 0) > 0) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/campanhas/${campaignId}/leads/${lead.id}`)}
                            className="text-purple-600 hover:text-purple-700"
                          >
                            <Mail className="w-4 h-4 mr-1" />
                            <MessageSquare className="w-4 h-4 mr-1" />
                            Ver Híbrido
                          </Button>
                        )}
                        {lead.cadenceType === 'EMAIL_ONLY' && lead.emails && lead.emails.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/campanhas/${campaignId}/leads/${lead.id}`)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Mail className="w-4 h-4 mr-1" />
                            Ver Emails
                          </Button>
                        )}
                        {lead.cadenceType === 'WHATSAPP_ONLY' && lead.whatsappMessages && lead.whatsappMessages.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/campanhas/${campaignId}/leads/${lead.id}/whatsapp`)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <MessageSquare className="w-4 h-4 mr-1" />
                            Ver WhatsApp
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {campaign.leads.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  Nenhum lead extraído ainda. Aguarde o processamento...
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lead Details Modal */}
      <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Info className="w-6 h-6 text-blue-600" />
              {selectedLead?.nomeEmpresa}
            </DialogTitle>
            <DialogDescription>
              Informações completas do lead
            </DialogDescription>
          </DialogHeader>

          {selectedLead && (
            <div className="space-y-6 mt-4">
              {/* Status Section */}
              <div className="bg-muted/30 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 text-foreground">Status</h3>
                <div className="flex items-center gap-4">
                  <Badge className={statusColors[selectedLead.status]}>
                    {statusLabels[selectedLead.status]}
                  </Badge>
                  {selectedLead.extractedAt && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      Extraído em: {new Date(selectedLead.extractedAt).toLocaleString('pt-BR')}
                    </div>
                  )}
                  {selectedLead.enrichedAt && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      Enriquecido em: {new Date(selectedLead.enrichedAt).toLocaleString('pt-BR')}
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-muted/30 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 text-foreground">Informações de Contato</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      {selectedLead.email ? (
                        <a href={`mailto:${selectedLead.email}`} className="text-blue-600 hover:underline">
                          {selectedLead.email}
                        </a>
                      ) : (
                        <p className="text-muted-foreground">Não Informado</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Telefone</p>
                      {selectedLead.telefone ? (
                        <a href={`tel:${selectedLead.telefone}`} className="text-foreground hover:text-green-600">
                          {selectedLead.telefone}
                        </a>
                      ) : (
                        <p className="text-muted-foreground">Não Informado</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Globe className="w-5 h-5 text-purple-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Website</p>
                      {selectedLead.website ? (
                        <a href={selectedLead.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                          {selectedLead.website}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <p className="text-muted-foreground">Não Informado</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Endereço</p>
                      {selectedLead.endereco ? (
                        <p className="text-foreground">{selectedLead.endereco}</p>
                      ) : (
                        <p className="text-muted-foreground">Não Informado</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Information */}
              <div className="bg-muted/30 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 text-foreground">Informações do Negócio</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Categoria</p>
                    {selectedLead.categoria ? (
                      <Badge variant="secondary">{selectedLead.categoria}</Badge>
                    ) : (
                      <p className="text-muted-foreground">Não Informado</p>
                    )}
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Avaliação</p>
                    {selectedLead.notaMedia && selectedLead.totalReviews ? (
                      <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                        <span className="font-semibold text-lg text-foreground">{selectedLead.notaMedia}</span>
                        <span className="text-muted-foreground">({selectedLead.totalReviews} avaliações)</span>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Não Informado</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <p className="text-sm text-muted-foreground mb-1">Google Maps</p>
                    {selectedLead.linkGoogleMaps ? (
                      <a href={selectedLead.linkGoogleMaps} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                        Ver no Google Maps
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <p className="text-muted-foreground">Não Informado</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Social Media */}
              <div className="bg-muted/30 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 text-foreground">Redes Sociais</h3>
                {(selectedLead.linkedinUrl || selectedLead.twitterUrl || selectedLead.instagramUrl ||
                  selectedLead.facebookUrl || selectedLead.youtubeUrl || selectedLead.tiktokUrl ||
                  selectedLead.pinterestUrl) ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {selectedLead.linkedinUrl && (
                      <a href={selectedLead.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 border rounded-lg hover:bg-white transition-colors">
                        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                        <span className="text-sm">LinkedIn</span>
                      </a>
                    )}
                    {selectedLead.instagramUrl && (
                      <a href={selectedLead.instagramUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 border rounded-lg hover:bg-white transition-colors">
                        <svg className="w-5 h-5 text-pink-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                        <span className="text-sm">Instagram</span>
                      </a>
                    )}
                    {selectedLead.facebookUrl && (
                      <a href={selectedLead.facebookUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 border rounded-lg hover:bg-white transition-colors">
                        <svg className="w-5 h-5 text-blue-700" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
                        <span className="text-sm">Facebook</span>
                      </a>
                    )}
                    {selectedLead.twitterUrl && (
                      <a href={selectedLead.twitterUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 border rounded-lg hover:bg-white transition-colors">
                        <svg className="w-5 h-5 text-sky-500" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                        <span className="text-sm">Twitter/X</span>
                      </a>
                    )}
                    {selectedLead.youtubeUrl && (
                      <a href={selectedLead.youtubeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 border rounded-lg hover:bg-white transition-colors">
                        <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
                        <span className="text-sm">YouTube</span>
                      </a>
                    )}
                    {selectedLead.tiktokUrl && (
                      <a href={selectedLead.tiktokUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 border rounded-lg hover:bg-white transition-colors">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
                        <span className="text-sm">TikTok</span>
                      </a>
                    )}
                    {selectedLead.pinterestUrl && (
                      <a href={selectedLead.pinterestUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 border rounded-lg hover:bg-white transition-colors">
                        <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.627 0-12 5.372-12 12 0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146 1.124.347 2.317.535 3.554.535 6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/></svg>
                        <span className="text-sm">Pinterest</span>
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Não Informado</p>
                )}
              </div>

              {/* Email History */}
              {selectedLead.emails && selectedLead.emails.length > 0 && (
                <div className="bg-muted/30 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3 text-foreground">Histórico de Emails</h3>
                  <div className="space-y-2">
                    {selectedLead.emails.map((email) => (
                      <div key={email.id} className="flex items-center justify-between p-3 bg-card rounded-lg border border-border">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium text-sm text-foreground">Email #{email.sequenceNumber}</span>
                            <Badge variant={email.status === 'SENT' ? 'default' : 'secondary'} className="text-xs">
                              {email.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{email.subject}</p>
                          {email.sentAt && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Enviado: {new Date(email.sentAt).toLocaleString('pt-BR')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setSelectedLead(null)}
                  className="flex-1"
                >
                  Fechar
                </Button>
                {selectedLead.emails && selectedLead.emails.length > 0 && (
                  <Button
                    onClick={() => {
                      setSelectedLead(null);
                      router.push(`/campanhas/${campaignId}/leads/${selectedLead.id}`);
                    }}
                    className="flex-1"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Ver Todos os Emails
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
