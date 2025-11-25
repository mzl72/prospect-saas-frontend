"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, MessageSquare, ExternalLink, Calendar, CheckCircle2 } from "lucide-react";

interface Email {
  id: string;
  sequenceNumber: number;
  subject: string;
  body: string;
  senderAccount: string;
  status: string;
  sentAt: string | null;
  openedAt: string | null;
  repliedAt: string | null;
}

interface WhatsAppMessage {
  id: string;
  sequenceNumber: number;
  phoneNumber: string;
  message: string;
  senderInstance: string | null;
  status: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  repliedAt: string | null;
}

interface Lead {
  id: string;
  nomeEmpresa: string;
  endereco: string | null;
  website: string | null;
  telefone: string | null;
  categoria: string | null;
  status: string;
  cadenceType: string | null;
  companyResearch: string | null;
  strategicAnalysis: string | null;
  personalization: string | null;
  analysisLink: string | null;
  emails: Email[];
  whatsappMessages: WhatsAppMessage[];
  campaign: {
    id: string;
    title: string;
  };
}

const emailStatusColors: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-800",
  SENT: "bg-blue-100 text-blue-800",
  OPENED: "bg-cyan-100 text-cyan-800",
  REPLIED: "bg-green-100 text-green-800",
  BOUNCED: "bg-red-100 text-red-800",
  FAILED: "bg-red-100 text-red-800",
};

const emailStatusLabels: Record<string, string> = {
  PENDING: "Pendente",
  SENT: "Enviado",
  OPENED: "Aberto",
  REPLIED: "Respondido",
  BOUNCED: "Bounce",
  FAILED: "Falhou",
};

const whatsappStatusColors: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-800",
  SENT: "bg-blue-100 text-blue-800",
  DELIVERED: "bg-cyan-100 text-cyan-800",
  READ: "bg-purple-100 text-purple-800",
  REPLIED: "bg-green-100 text-green-800",
  FAILED: "bg-red-100 text-red-800",
};

const whatsappStatusLabels: Record<string, string> = {
  PENDING: "Pendente",
  SENT: "Enviado",
  DELIVERED: "Entregue",
  READ: "Lido",
  REPLIED: "Respondido",
  FAILED: "Falhou",
};

export default function LeadEmailsPage() {
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
    staleTime: 2 * 60 * 1000, // 2 minutos (emails não mudam frequentemente)
    gcTime: 15 * 60 * 1000, // 15 minutos (cache longo)
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando emails...</p>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Lead não encontrado</p>
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
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {lead.nomeEmpresa}
            </h1>
            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
              {lead.categoria && <span>📂 {lead.categoria}</span>}
              {lead.telefone && <span>📞 {lead.telefone}</span>}
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
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
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

      {/* Emails */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground">
          Emails Personalizados ({lead.emails.length})
        </h2>

        {lead.emails.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Mail className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Nenhum email gerado ainda. Os emails serão criados após o enriquecimento do lead.
              </p>
            </CardContent>
          </Card>
        )}

        {lead.emails
          .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
          .map((email) => (
            <Card key={email.id} className="overflow-hidden">
              <CardHeader className="bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-sm">
                      Email #{email.sequenceNumber}
                    </Badge>
                    <Badge className={emailStatusColors[email.status]}>
                      {emailStatusLabels[email.status]}
                    </Badge>
                  </div>

                  {email.sentAt && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {new Date(email.sentAt).toLocaleString("pt-BR")}
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Remetente */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      DE:
                    </label>
                    <p className="text-sm font-medium text-foreground">
                      {email.senderAccount}
                    </p>
                  </div>

                  {/* Assunto */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      ASSUNTO:
                    </label>
                    <p className="text-base font-semibold text-foreground">
                      {email.subject}
                    </p>
                  </div>

                  {/* Corpo do Email */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      MENSAGEM:
                    </label>
                    <div className="mt-2 p-4 bg-muted border border-border rounded-lg">
                      <pre className="text-sm text-foreground whitespace-pre-wrap font-sans">
                        {email.body}
                      </pre>
                    </div>
                  </div>

                  {/* Status detalhado */}
                  {(email.openedAt || email.repliedAt) && (
                    <div className="pt-4 border-t border-border">
                      <div className="flex items-center gap-4 text-sm">
                        {email.openedAt && (
                          <div className="flex items-center gap-2 text-cyan-600">
                            <CheckCircle2 className="w-4 h-4" />
                            Aberto em {new Date(email.openedAt).toLocaleString("pt-BR")}
                          </div>
                        )}
                        {email.repliedAt && (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle2 className="w-4 h-4" />
                            Respondido em {new Date(email.repliedAt).toLocaleString("pt-BR")}
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

      {/* WhatsApp Messages (se for HYBRID ou WHATSAPP_ONLY) */}
      {lead.cadenceType && ['HYBRID', 'WHATSAPP_ONLY'].includes(lead.cadenceType) && (
        <div className="space-y-6 mt-12">
          <h2 className="text-2xl font-bold text-foreground">
            Mensagens WhatsApp ({lead.whatsappMessages.length})
          </h2>

          {lead.whatsappMessages.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Nenhuma mensagem WhatsApp gerada ainda.
                </p>
              </CardContent>
            </Card>
          )}

          {lead.whatsappMessages
            .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
            .map((whatsapp) => (
              <Card key={whatsapp.id} className="overflow-hidden">
                <CardHeader className="bg-green-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-sm">
                        WhatsApp #{whatsapp.sequenceNumber}
                      </Badge>
                      <Badge className={whatsappStatusColors[whatsapp.status]}>
                        {whatsappStatusLabels[whatsapp.status]}
                      </Badge>
                    </div>

                    {whatsapp.sentAt && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {new Date(whatsapp.sentAt).toLocaleString("pt-BR")}
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {/* Instância Remetente */}
                    {whatsapp.senderInstance && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">
                          DE:
                        </label>
                        <p className="text-sm font-medium text-foreground">
                          {whatsapp.senderInstance}
                        </p>
                      </div>
                    )}

                    {/* Telefone */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        PARA:
                      </label>
                      <p className="text-sm font-medium text-foreground">
                        {whatsapp.phoneNumber}
                      </p>
                    </div>

                    {/* Mensagem */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        MENSAGEM:
                      </label>
                      <div className="mt-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <pre className="text-sm text-foreground whitespace-pre-wrap font-sans">
                          {whatsapp.message}
                        </pre>
                      </div>
                    </div>

                    {/* Status detalhado */}
                    {(whatsapp.deliveredAt || whatsapp.readAt || whatsapp.repliedAt) && (
                      <div className="pt-4 border-t border-border">
                        <div className="flex items-center gap-4 text-sm">
                          {whatsapp.deliveredAt && (
                            <div className="flex items-center gap-2 text-cyan-600">
                              <CheckCircle2 className="w-4 h-4" />
                              Entregue em {new Date(whatsapp.deliveredAt).toLocaleString("pt-BR")}
                            </div>
                          )}
                          {whatsapp.readAt && (
                            <div className="flex items-center gap-2 text-purple-600">
                              <CheckCircle2 className="w-4 h-4" />
                              Lido em {new Date(whatsapp.readAt).toLocaleString("pt-BR")}
                            </div>
                          )}
                          {whatsapp.repliedAt && (
                            <div className="flex items-center gap-2 text-green-600">
                              <CheckCircle2 className="w-4 h-4" />
                              Respondido em {new Date(whatsapp.repliedAt).toLocaleString("pt-BR")}
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
      )}
    </div>
  );
}
