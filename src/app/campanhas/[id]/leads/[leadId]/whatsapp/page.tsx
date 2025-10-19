"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare, ExternalLink, Calendar, CheckCircle2, Phone } from "lucide-react";

interface WhatsAppMessage {
  id: string;
  sequenceNumber: number;
  message: string;
  phoneNumber: string;
  status: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
}

interface Lead {
  id: string;
  nomeEmpresa: string;
  endereco: string | null;
  website: string | null;
  telefone: string | null;
  categoria: string | null;
  status: string;
  companyResearch: string | null;
  strategicAnalysis: string | null;
  personalization: string | null;
  analysisLink: string | null;
  whatsappMessages: WhatsAppMessage[];
  campaign: {
    id: string;
    title: string;
  };
}

const whatsappStatusColors: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  SENT: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  DELIVERED: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
  READ: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  FAILED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const whatsappStatusLabels: Record<string, string> = {
  PENDING: "Pendente",
  SENT: "Enviado",
  DELIVERED: "Entregue",
  READ: "Lido",
  FAILED: "Falhou",
};

export default function LeadWhatsAppPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;
  const leadId = params.leadId as string;

  const { data: lead, isLoading } = useQuery<Lead>({
    queryKey: ["lead", leadId],
    queryFn: async () => {
      const res = await fetch(`/api/campaigns/${campaignId}/leads/${leadId}`);
      if (!res.ok) throw new Error("Erro ao buscar lead");
      const data = await res.json();
      return data.lead;
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 15 * 60 * 1000, // 15 minutos
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-600 dark:border-green-400 border-t-transparent dark:border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando mensagens WhatsApp...</p>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Lead não encontrado</p>
          <Button onClick={() => router.back()} className="mt-4">
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Campanha
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {lead.nomeEmpresa}
            </h1>
            <div className="flex flex-col gap-1 text-sm text-gray-600 dark:text-gray-400">
              {lead.categoria && <span>📂 {lead.categoria}</span>}
              {lead.telefone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {lead.telefone}
                </span>
              )}
              {lead.website && (
                <a
                  href={lead.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-1"
                >
                  🌐 {lead.website}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {lead.endereco && <span>📍 {lead.endereco}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Análise Estratégica (se existir) */}
      {lead.companyResearch && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-purple-600" />
              Análise de IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
              {lead.companyResearch}
            </p>

            {lead.analysisLink && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(lead.analysisLink!, "_blank")}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Ver Análise Completa
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Mensagens WhatsApp */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Mensagens WhatsApp ({lead.whatsappMessages.length})
        </h2>

        {lead.whatsappMessages.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 dark:text-gray-400">
                Nenhuma mensagem WhatsApp gerada ainda. As mensagens serão criadas após o enriquecimento do lead.
              </p>
            </CardContent>
          </Card>
        )}

        {lead.whatsappMessages
          .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
          .map((message) => (
            <Card key={message.id} className="overflow-hidden">
              <CardHeader className="bg-green-50 dark:bg-green-900/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-sm">
                      Mensagem #{message.sequenceNumber}
                    </Badge>
                    <Badge className={whatsappStatusColors[message.status]}>
                      {whatsappStatusLabels[message.status]}
                    </Badge>
                  </div>

                  {message.sentAt && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Calendar className="w-4 h-4" />
                      {new Date(message.sentAt).toLocaleString("pt-BR")}
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Telefone */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      PARA:
                    </label>
                    <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {message.phoneNumber}
                    </p>
                  </div>

                  {/* Mensagem */}
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      MENSAGEM:
                    </label>
                    <div className="mt-2 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans">
                        {message.message}
                      </pre>
                    </div>
                  </div>

                  {/* Status detalhado */}
                  {(message.deliveredAt || message.readAt) && (
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-4 text-sm">
                        {message.deliveredAt && (
                          <div className="flex items-center gap-2 text-cyan-600">
                            <CheckCircle2 className="w-4 h-4" />
                            Entregue em {new Date(message.deliveredAt).toLocaleString("pt-BR")}
                          </div>
                        )}
                        {message.readAt && (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle2 className="w-4 h-4" />
                            Lido em {new Date(message.readAt).toLocaleString("pt-BR")}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}
