"use client";

import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MessageIntervals, MessageInterval } from "@/components/cadence/MessageIntervals";
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Loader2, MessageCircle, Calendar, Settings, Send, Plus, Trash2, ExternalLink, Info, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

type TabType = "templates" | "cadence" | "settings" | "instances" | "prompts";

export default function WhatsAppPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>("templates");

  const [config, setConfig] = useState({
    // Templates
    whatsappMessage1: "",
    whatsappMessage2: "",
    whatsappMessage3: "",

    // Cadence (JSON)
    whatsappOnlyCadence: [] as MessageInterval[],

    // Evolution API Instances
    evolutionInstances: [] as string[],

    // WhatsApp-specific Settings
    whatsappDailyLimit: 50,
    whatsappBusinessHourStart: 9,
    whatsappBusinessHourEnd: 18,
    sendOnlyBusinessHours: true,

    // Prompts específicos de WhatsApp
    whatsappPromptOverview: "",
    whatsappPromptTatica: "",
    whatsappPromptDiretrizes: "",
  });

  const [newInstance, setNewInstance] = useState("");

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
        whatsappMessage1: s.whatsappMessage1 || "",
        whatsappMessage2: s.whatsappMessage2 || "",
        whatsappMessage3: s.whatsappMessage3 || "",
        whatsappOnlyCadence: JSON.parse(s.whatsappOnlyCadence || '[{"messageNumber":1,"dayOfWeek":1,"timeWindow":"10:00-12:00","daysAfterPrevious":0},{"messageNumber":2,"dayOfWeek":3,"timeWindow":"15:00-17:00","daysAfterPrevious":2},{"messageNumber":3,"dayOfWeek":5,"timeWindow":"10:00-12:00","daysAfterPrevious":2}]'),
        evolutionInstances: JSON.parse(s.evolutionInstances || "[]"),
        whatsappDailyLimit: s.whatsappDailyLimit || 50,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        whatsappBusinessHourStart: (s as any).whatsappBusinessHourStart || 9,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        whatsappBusinessHourEnd: (s as any).whatsappBusinessHourEnd || 18,
        sendOnlyBusinessHours: s.sendOnlyBusinessHours ?? true,
        whatsappPromptOverview: s.whatsappPromptOverview || "",
        whatsappPromptTatica: s.whatsappPromptTatica || "",
        whatsappPromptDiretrizes: s.whatsappPromptDiretrizes || "",
      });
    }
  }, [settingsData]);

  const saveMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        whatsappOnlyCadence: JSON.stringify(data.whatsappOnlyCadence),
        evolutionInstances: JSON.stringify(data.evolutionInstances),
      };

      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!result.success) {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      console.error("Erro ao salvar configurações:", error);
      toast.error(error.message || "Erro ao salvar");
    },
  });

  const addInstance = () => {
    if (!newInstance.trim()) {
      toast.error("Digite a URL da instância");
      return;
    }
    setConfig((prev) => ({
      ...prev,
      evolutionInstances: [...prev.evolutionInstances, newInstance.trim()],
    }));
    setNewInstance("");
    toast.success("Instância adicionada");
  };

  const removeInstance = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      evolutionInstances: prev.evolutionInstances.filter((_, i) => i !== index),
    }));
    toast.success("Instância removida");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(config);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="py-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
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
              <MessageCircle className="w-8 h-8 text-green-600" />
              WhatsApp
            </h1>
            <p className="text-gray-300 mt-2">
              Configure templates, cadência e configurações de envio via WhatsApp
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-gray-700">
            <button
              onClick={() => setActiveTab("templates")}
              className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 ${
                activeTab === "templates"
                  ? "border-b-2 border-green-600 text-green-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              Templates
            </button>
            <button
              onClick={() => setActiveTab("cadence")}
              className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 ${
                activeTab === "cadence"
                  ? "border-b-2 border-green-600 text-green-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Calendar className="w-4 h-4" />
              Cadência
            </button>
            <button
              onClick={() => setActiveTab("instances")}
              className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 ${
                activeTab === "instances"
                  ? "border-b-2 border-green-600 text-green-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Send className="w-4 h-4" />
              Instâncias
            </button>
            <button
              onClick={() => setActiveTab("prompts")}
              className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 ${
                activeTab === "prompts"
                  ? "border-b-2 border-purple-600 text-purple-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Prompts IA
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 ${
                activeTab === "settings"
                  ? "border-b-2 border-green-600 text-green-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Settings className="w-4 h-4" />
              Configurações
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tab: Templates */}
            {activeTab === "templates" && (
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <p className="text-sm text-green-800">
                    💬 <strong>Dica:</strong> Mensagens de WhatsApp devem ser curtas, informais e objetivas.
                  </p>
                </div>

                {/* WhatsApp 1 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Badge className="bg-green-600">1</Badge>
                      WhatsApp 1 - Primeiro Contato
                    </CardTitle>
                    <CardDescription>Mensagem inicial via WhatsApp</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Label>Instruções para IA</Label>
                    <textarea
                      value={config.whatsappMessage1}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, whatsappMessage1: e.target.value }))
                      }
                      rows={8}
                      className="w-full mt-2 px-3 py-2 border rounded-md"
                      placeholder="Instruções para gerar mensagem...&#10;&#10;Dicas:&#10;- Tom informal mas profissional&#10;- Máximo 200 caracteres&#10;- Call-to-action claro"
                    />
                  </CardContent>
                </Card>

                {/* WhatsApp 2 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Badge className="bg-green-700">2</Badge>
                      WhatsApp 2 - Follow-up
                    </CardTitle>
                    <CardDescription>Segunda mensagem (mais urgente)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Label>Instruções para IA</Label>
                    <textarea
                      value={config.whatsappMessage2}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, whatsappMessage2: e.target.value }))
                      }
                      rows={6}
                      className="w-full mt-2 px-3 py-2 border rounded-md"
                      placeholder="Instruções para follow-up..."
                    />
                  </CardContent>
                </Card>

                {/* WhatsApp 3 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Badge className="bg-green-800">3</Badge>
                      WhatsApp 3 - Última Tentativa
                    </CardTitle>
                    <CardDescription>Última mensagem antes de desistir</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Label>Instruções para IA</Label>
                    <textarea
                      value={config.whatsappMessage3}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, whatsappMessage3: e.target.value }))
                      }
                      rows={6}
                      className="w-full mt-2 px-3 py-2 border rounded-md"
                      placeholder="Instruções para última tentativa..."
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tab: Cadence */}
            {activeTab === "cadence" && (
              <div>
                <MessageIntervals
                  intervals={config.whatsappOnlyCadence}
                  onChange={(intervals) =>
                    setConfig((prev) => ({ ...prev, whatsappOnlyCadence: intervals }))
                  }
                  messageType="whatsapp"
                  showMessage3={true}
                />
              </div>
            )}

            {/* Tab: Instances */}
            {activeTab === "instances" && (
              <Card>
                <CardHeader>
                  <CardTitle>Instâncias da Evolution API</CardTitle>
                  <CardDescription>
                    Gerencie as instâncias conectadas da Evolution API para envio de mensagens WhatsApp
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Add new instance */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://evolution.example.com"
                      value={newInstance}
                      onChange={(e) => setNewInstance(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addInstance();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={addInstance}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>

                  {/* List instances */}
                  {config.evolutionInstances.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Send className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Nenhuma instância configurada</p>
                      <p className="text-sm mt-1">Adicione uma URL da Evolution API acima</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {config.evolutionInstances.map((instance, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border border-gray-600 rounded-lg bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <Send className="w-4 h-4 text-green-600" />
                            <span className="font-mono text-sm">{instance}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(instance, "_blank")}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeInstance(index)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-sm text-blue-900">
                    <p className="font-semibold mb-1">💡 Dica</p>
                    <p>
                      As instâncias serão usadas em round-robin (rotação) para distribuir o envio de mensagens
                      e evitar bloqueios do WhatsApp.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tab: Settings */}
            {activeTab === "settings" && (
              <div className="space-y-6">
                {/* WhatsApp-specific Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle>Configurações de Envio WhatsApp</CardTitle>
                    <CardDescription>
                      Configure timing e limites específicos para WhatsApp
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Limite Diário de Mensagens WhatsApp</Label>
                      <Input
                        type="number"
                        value={config.whatsappDailyLimit}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            whatsappDailyLimit: parseInt(e.target.value) || 0,
                          }))
                        }
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Máximo de mensagens WhatsApp por dia
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Hora Início</Label>
                        <Input
                          type="number"
                          min="0"
                          max="23"
                          value={config.whatsappBusinessHourStart}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              whatsappBusinessHourStart: parseInt(e.target.value) || 0,
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
                          value={config.whatsappBusinessHourEnd}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              whatsappBusinessHourEnd: parseInt(e.target.value) || 0,
                            }))
                          }
                        />
                      </div>
                    </div>

                    {/* Mostrar cálculo automático */}
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <p className="text-xs text-green-700 font-medium mb-1">
                        ⏱️ Delay calculado automaticamente
                      </p>
                      <p className="text-xs text-green-600">
                        {(() => {
                          const hours = config.whatsappBusinessHourEnd - config.whatsappBusinessHourStart;
                          const avgMinutes = (hours * 60) / config.whatsappDailyLimit;
                          const minDelay = Math.floor(avgMinutes * 0.75);
                          const maxDelay = Math.ceil(avgMinutes * 1.10);
                          return `${minDelay}-${maxDelay} minutos entre mensagens (baseado em ${hours}h de janela e ${config.whatsappDailyLimit} msgs/dia)`;
                        })()}
                      </p>
                    </div>

                    <div className="bg-green-50 border border-green-200 p-3 rounded-lg text-sm text-green-900">
                      <p className="font-semibold mb-1">💡 Dica</p>
                      <p>
                        WhatsApp tem políticas de envio mais restritivas que email. Configure delays maiores
                        e limites menores para evitar bloqueios.
                      </p>
                    </div>
                  </CardContent>
                </Card>

              </div>
            )}

            {/* Tab: Prompts IA */}
            {activeTab === "prompts" && (
              <div className="space-y-6">
                <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
                  <p className="text-sm text-purple-800">
                    <strong>🤖 Prompts Personalizados:</strong> Configure como a IA deve gerar mensagens WhatsApp para este canal específico.
                  </p>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Prompt Overview</CardTitle>
                    <CardDescription>
                      Contexto geral sobre você, sua empresa e como abordar por WhatsApp
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Label>Contexto</Label>
                    <textarea
                      value={config.whatsappPromptOverview}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, whatsappPromptOverview: e.target.value }))
                      }
                      rows={8}
                      className="w-full mt-2 px-3 py-2 border rounded-md font-mono text-sm"
                      placeholder="Ex: Você é um especialista em vendas conversacionais via WhatsApp, com tom informal mas profissional..."
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Tática de Abordagem</CardTitle>
                    <CardDescription>
                      Estratégia de sequência e timing das mensagens WhatsApp
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Label>Tática</Label>
                    <textarea
                      value={config.whatsappPromptTatica}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, whatsappPromptTatica: e.target.value }))
                      }
                      rows={6}
                      className="w-full mt-2 px-3 py-2 border rounded-md font-mono text-sm"
                      placeholder="Ex: Mensagens curtas e diretas, use emojis com moderação, crie urgência suave..."
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Diretrizes de Escrita</CardTitle>
                    <CardDescription>
                      Regras específicas de como escrever as mensagens WhatsApp
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Label>Diretrizes</Label>
                    <textarea
                      value={config.whatsappPromptDiretrizes}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, whatsappPromptDiretrizes: e.target.value }))
                      }
                      rows={8}
                      className="w-full mt-2 px-3 py-2 border rounded-md font-mono text-sm"
                      placeholder="Ex: - Máximo 200 caracteres&#10;- Tom informal e amigável&#10;- Usar emojis estrategicamente..."
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end sticky bottom-4">
              <Button
                type="submit"
                size="lg"
                disabled={saveMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
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
