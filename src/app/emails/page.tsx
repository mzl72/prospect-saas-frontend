"use client";

import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MessageIntervals, MessageInterval } from "@/components/cadence/MessageIntervals";
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Loader2, Mail, Calendar, Settings, X, Sparkles } from "lucide-react";
import { toast } from "sonner";

type TabType = "templates" | "cadence" | "settings" | "prompts";

export default function EmailsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>("templates");
  const [senderEmailInput, setSenderEmailInput] = useState("");

  const [config, setConfig] = useState({
    // Templates
    emailTitulo1: "",
    emailCorpo1: "",
    emailCorpo2: "",
    emailTitulo3: "",
    emailCorpo3: "",

    // Intervals (JSON)
    emailOnlyCadence: [] as MessageInterval[],

    // Settings
    senderEmails: [] as string[],
    dailyEmailLimit: 100,
    emailBusinessHourStart: 9,
    emailBusinessHourEnd: 18,
    sendOnlyBusinessHours: true,

    // Prompts específicos de Email
    emailPromptOverview: "",
    emailPromptTatica: "",
    emailPromptDiretrizes: "",
  });

  // Fetch settings
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await fetch("/api/settings");
      const data = await response.json();
      return data;
    },
  });

  useEffect(() => {
    if (settingsData?.success && settingsData?.settings) {
      const s = settingsData.settings;
      setConfig({
        emailTitulo1: s.emailTitulo1 || "",
        emailCorpo1: s.emailCorpo1 || "",
        emailCorpo2: s.emailCorpo2 || "",
        emailTitulo3: s.emailTitulo3 || "",
        emailCorpo3: s.emailCorpo3 || "",
        emailOnlyCadence: JSON.parse(s.emailOnlyCadence || '[{"messageNumber":1,"dayOfWeek":1,"timeWindow":"09:00-11:00","daysAfterPrevious":0},{"messageNumber":2,"dayOfWeek":3,"timeWindow":"14:00-16:00","daysAfterPrevious":2},{"messageNumber":3,"dayOfWeek":5,"timeWindow":"09:00-11:00","daysAfterPrevious":2}]'),
        senderEmails: JSON.parse(s.senderEmails || "[]"),
        dailyEmailLimit: s.dailyEmailLimit || 100,
        emailBusinessHourStart: (s as any).emailBusinessHourStart || 9,
        emailBusinessHourEnd: (s as any).emailBusinessHourEnd || 18,
        sendOnlyBusinessHours: s.sendOnlyBusinessHours ?? true,
        emailPromptOverview: s.emailPromptOverview || "",
        emailPromptTatica: s.emailPromptTatica || "",
        emailPromptDiretrizes: s.emailPromptDiretrizes || "",
      });
    }
  }, [settingsData]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        emailOnlyCadence: JSON.stringify(data.emailOnlyCadence),
        senderEmails: JSON.stringify(data.senderEmails),
      };

      console.log("📤 Sending to API:", payload);

      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      console.log("📥 API Response:", result);

      if (!result.success) {
        console.error("❌ API Error Details:", result.details || result.error);
        throw new Error(JSON.stringify(result.details || result.error) || "Erro ao salvar");
      }

      return result;
    },
    onSuccess: (data) => {
      // Atualizar cache diretamente ao invés de invalidar
      if (data?.success && data?.settings) {
        queryClient.setQueryData(["settings"], data);
      }
      toast.success("Configurações salvas!");
    },
    onError: (error: any) => {
      console.error("❌ Error saving settings:", error);
      toast.error(error.message || "Erro ao salvar");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(config);
  };

  const addSenderEmail = () => {
    const email = senderEmailInput.trim();
    if (!email) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Email inválido");
      return;
    }

    if (config.senderEmails.includes(email)) {
      toast.error("Email já adicionado");
      return;
    }

    setConfig((prev) => ({
      ...prev,
      senderEmails: [...prev.senderEmails, email],
    }));
    setSenderEmailInput("");
  };

  const removeSenderEmail = (emailToRemove: string) => {
    setConfig((prev) => ({
      ...prev,
      senderEmails: prev.senderEmails.filter((e) => e !== emailToRemove),
    }));
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="py-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <Mail className="w-8 h-8 text-blue-600" />
              Emails
            </h1>
            <p className="text-gray-300 mt-2">
              Configure templates, cadência e configurações de envio de emails
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-gray-700 overflow-x-auto">
            <button
              onClick={() => setActiveTab("templates")}
              className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === "templates"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-400 hover:text-gray-900"
              }`}
            >
              <Mail className="w-4 h-4" />
              Templates
            </button>
            <button
              onClick={() => setActiveTab("cadence")}
              className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === "cadence"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-400 hover:text-gray-900"
              }`}
            >
              <Calendar className="w-4 h-4" />
              Cadência
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === "settings"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-400 hover:text-gray-900"
              }`}
            >
              <Settings className="w-4 h-4" />
              Configurações
            </button>
            <button
              onClick={() => setActiveTab("prompts")}
              className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === "prompts"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-400 hover:text-gray-900"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Prompts IA
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tab: Templates */}
            {activeTab === "templates" && (
              <div className="space-y-6">
                {/* Email 1 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Badge variant="default">1</Badge>
                      Email 1 - Primeiro Contato
                    </CardTitle>
                    <CardDescription>Email inicial para captar atenção</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Assunto</Label>
                      <Input
                        value={config.emailTitulo1}
                        onChange={(e) =>
                          setConfig((prev) => ({ ...prev, emailTitulo1: e.target.value }))
                        }
                        placeholder="Ex: {{nome_empresa}} - oportunidade identificada"
                      />
                    </div>
                    <div>
                      <Label>Corpo do Email (Instruções para IA)</Label>
                      <textarea
                        value={config.emailCorpo1}
                        onChange={(e) =>
                          setConfig((prev) => ({ ...prev, emailCorpo1: e.target.value }))
                        }
                        rows={8}
                        className="w-full px-3 py-2 border rounded-md"
                        placeholder="Instruções para a IA gerar o email..."
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Email 2 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Badge variant="secondary">2</Badge>
                      Email 2 - Follow-up (Bump)
                    </CardTitle>
                    <CardDescription>Resposta curta na mesma thread</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <Label>Corpo do Email</Label>
                      <textarea
                        value={config.emailCorpo2}
                        onChange={(e) =>
                          setConfig((prev) => ({ ...prev, emailCorpo2: e.target.value }))
                        }
                        rows={6}
                        className="w-full px-3 py-2 border rounded-md"
                        placeholder="Email curto e amigável..."
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Email 3 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Badge variant="destructive">3</Badge>
                      Email 3 - Última Tentativa (Breakup)
                    </CardTitle>
                    <CardDescription>Última tentativa antes de desistir</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Assunto</Label>
                      <Input
                        value={config.emailTitulo3}
                        onChange={(e) =>
                          setConfig((prev) => ({ ...prev, emailTitulo3: e.target.value }))
                        }
                        placeholder="Ex: {{nome_empresa}} - é o momento certo?"
                      />
                    </div>
                    <div>
                      <Label>Corpo do Email</Label>
                      <textarea
                        value={config.emailCorpo3}
                        onChange={(e) =>
                          setConfig((prev) => ({ ...prev, emailCorpo3: e.target.value }))
                        }
                        rows={8}
                        className="w-full px-3 py-2 border rounded-md"
                        placeholder="Instruções para breakup email..."
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tab: Cadence */}
            {activeTab === "cadence" && (
              <div>
                <MessageIntervals
                  intervals={config.emailOnlyCadence}
                  onChange={(intervals) =>
                    setConfig((prev) => ({ ...prev, emailOnlyCadence: intervals }))
                  }
                  messageType="email"
                  showMessage3={true}
                />
              </div>
            )}

            {/* Tab: Settings */}
            {activeTab === "settings" && (
              <div className="space-y-6">
                {/* Sender Emails */}
                <Card>
                  <CardHeader>
                    <CardTitle>Emails Remetentes (Round-Robin)</CardTitle>
                    <CardDescription>
                      O sistema alternará entre estes emails automaticamente
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        value={senderEmailInput}
                        onChange={(e) => setSenderEmailInput(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSenderEmail())}
                        placeholder="Digite um email"
                      />
                      <Button type="button" onClick={addSenderEmail}>
                        Adicionar
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {config.senderEmails.map((email, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded"
                        >
                          <span className="dark:text-white">{email}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSenderEmail(email)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Timing & Limits */}
                <Card>
                  <CardHeader>
                    <CardTitle>Limite Diário</CardTitle>
                    <CardDescription>
                      O delay entre envios é calculado automaticamente
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Limite Diário de Emails</Label>
                      <Input
                        type="number"
                        value={config.dailyEmailLimit}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            dailyEmailLimit: parseInt(e.target.value) || 0,
                          }))
                        }
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Máximo de emails enviados por dia
                      </p>
                    </div>

                    {/* Mostrar cálculo automático */}
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-700 font-medium mb-1">
                        ⏱️ Delay calculado automaticamente
                      </p>
                      <p className="text-xs text-blue-600">
                        {(() => {
                          const hours = config.emailBusinessHourEnd - config.emailBusinessHourStart;
                          const avgMinutes = (hours * 60) / config.dailyEmailLimit;
                          const minDelay = Math.floor(avgMinutes * 0.75);
                          const maxDelay = Math.ceil(avgMinutes * 1.10);
                          return `${minDelay}-${maxDelay} minutos entre emails (baseado em ${hours}h de janela e ${config.dailyEmailLimit} emails/dia)`;
                        })()}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Business Hours */}
                <Card>
                  <CardHeader>
                    <CardTitle>Horário Comercial</CardTitle>
                    <CardDescription>
                      Defina quando os emails podem ser enviados
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="businessHours"
                        checked={config.sendOnlyBusinessHours}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            sendOnlyBusinessHours: e.target.checked,
                          }))
                        }
                        className="w-4 h-4"
                      />
                      <Label htmlFor="businessHours">
                        Enviar apenas em horário comercial
                      </Label>
                    </div>

                    {config.sendOnlyBusinessHours && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Hora Início</Label>
                          <Input
                            type="number"
                            min="0"
                            max="23"
                            value={config.emailBusinessHourStart}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                emailBusinessHourStart: parseInt(e.target.value) || 0,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label>Hora Fim</Label>
                          <Input
                            type="number"
                            min="0"
                            max="23"
                            value={config.emailBusinessHourEnd}
                            onChange={(e) =>
                              setConfig((prev) => ({
                                ...prev,
                                emailBusinessHourEnd: parseInt(e.target.value) || 0,
                              }))
                            }
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tab: Prompts IA */}
            {activeTab === "prompts" && (
              <div className="space-y-6">
                <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
                  <p className="text-sm text-purple-800">
                    <strong>🤖 Prompts Personalizados:</strong> Configure como a IA deve gerar emails para este canal específico.
                  </p>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Prompt Overview</CardTitle>
                    <CardDescription>
                      Contexto geral sobre você, sua empresa e como abordar por email
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Label>Contexto</Label>
                    <textarea
                      value={config.emailPromptOverview}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, emailPromptOverview: e.target.value }))
                      }
                      rows={8}
                      className="w-full mt-2 px-3 py-2 border rounded-md font-mono text-sm"
                      placeholder="Ex: Você é um Estrategista de Vendas B2B especializado em cold email..."
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Tática de Abordagem</CardTitle>
                    <CardDescription>
                      Estratégia de sequência e timing dos emails
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Label>Tática</Label>
                    <textarea
                      value={config.emailPromptTatica}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, emailPromptTatica: e.target.value }))
                      }
                      rows={6}
                      className="w-full mt-2 px-3 py-2 border rounded-md font-mono text-sm"
                      placeholder="Ex: Use abordagem consultiva no Email 1, bump no Email 2 e breakup no Email 3..."
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Diretrizes de Escrita</CardTitle>
                    <CardDescription>
                      Regras específicas de como escrever os emails
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Label>Diretrizes</Label>
                    <textarea
                      value={config.emailPromptDiretrizes}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, emailPromptDiretrizes: e.target.value }))
                      }
                      rows={8}
                      className="w-full mt-2 px-3 py-2 border rounded-md font-mono text-sm"
                      placeholder="Ex: - Máximo 150 palavras&#10;- Tom profissional mas amigável&#10;- Sempre incluir call-to-action clara..."
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end sticky bottom-4">
              <Button type="submit" size="lg" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    Salvar
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
