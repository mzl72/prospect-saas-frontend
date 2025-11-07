"use client";

import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { HybridCadence, HybridCadenceItem } from "@/components/cadence/HybridCadence";
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Loader2, Zap, Info, Mail, MessageCircle, Calendar, Settings as SettingsIcon, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type TabType = "templates" | "cadence" | "settings" | "prompts";

export default function CadenciaHibridaPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>("templates");

  const [config, setConfig] = useState({
    useHybridCadence: false,
    hybridCadence: [] as HybridCadenceItem[],

    // Hybrid-specific Email templates (não reusar os de /emails)
    hybridEmailTitulo1: "",
    hybridEmailCorpo1: "",
    hybridEmailCorpo2: "",
    hybridEmailTitulo3: "",
    hybridEmailCorpo3: "",

    // Hybrid-specific WhatsApp templates (não reusar os de /whatsapp)
    hybridWhatsappMessage1: "",
    hybridWhatsappMessage2: "",

    // Settings
    hybridDailyLimit: 70,
    hybridBusinessHourStart: 9,
    hybridBusinessHourEnd: 18,
    sendOnlyBusinessHours: true,

    // Prompts específicos de Híbrido
    hybridPromptOverview: "",
    hybridPromptTatica: "",
    hybridPromptDiretrizes: "",
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
        useHybridCadence: s.useHybridCadence ?? false,
        hybridCadence: JSON.parse(s.hybridCadence || '[{"type":"email","messageNumber":1,"emailNumber":1,"dayOfWeek":1,"timeWindow":"09:00-11:00","daysAfterPrevious":0},{"type":"whatsapp","messageNumber":2,"whatsappNumber":1,"dayOfWeek":2,"timeWindow":"14:00-16:00","daysAfterPrevious":1},{"type":"email","messageNumber":3,"emailNumber":2,"dayOfWeek":4,"timeWindow":"09:00-11:00","daysAfterPrevious":2}]'),
        hybridEmailTitulo1: s.hybridEmailTitulo1 || "",
        hybridEmailCorpo1: s.hybridEmailCorpo1 || "",
        hybridEmailCorpo2: s.hybridEmailCorpo2 || "",
        hybridEmailTitulo3: s.hybridEmailTitulo3 || "",
        hybridEmailCorpo3: s.hybridEmailCorpo3 || "",
        hybridWhatsappMessage1: s.hybridWhatsappMessage1 || "",
        hybridWhatsappMessage2: s.hybridWhatsappMessage2 || "",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hybridDailyLimit: (s as any).hybridDailyLimit || 70,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hybridBusinessHourStart: (s as any).hybridBusinessHourStart || 9,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hybridBusinessHourEnd: (s as any).hybridBusinessHourEnd || 18,
        sendOnlyBusinessHours: s.sendOnlyBusinessHours ?? true,
        hybridPromptOverview: s.hybridPromptOverview || "",
        hybridPromptTatica: s.hybridPromptTatica || "",
        hybridPromptDiretrizes: s.hybridPromptDiretrizes || "",
      });
    }
  }, [settingsData]);

  const saveMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        hybridCadence: JSON.stringify(data.hybridCadence),
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(config);
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
              <Zap className="w-8 h-8 text-purple-600" />
              Híbrido
            </h1>
            <p className="text-gray-300 mt-2">
              Combine emails e WhatsApp em uma única cadência coordenada
            </p>
          </div>

          {/* Enable/Disable Toggle */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Ativar Cadência Híbrida</CardTitle>
              <CardDescription>
                Quando ativado, leads com email E telefone receberão uma combinação de 3 emails e 2 mensagens WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Switch
                  id="hybrid-mode"
                  checked={config.useHybridCadence}
                  onCheckedChange={(checked) =>
                    setConfig((prev) => ({ ...prev, useHybridCadence: checked }))
                  }
                />
                <Label htmlFor="hybrid-mode">
                  {config.useHybridCadence ? "Ativado" : "Desativado"}
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Info Box */}
          <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg mb-6">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-purple-900">
                <p className="font-semibold mb-2">Como funciona a cadência híbrida?</p>
                <ul className="list-disc ml-4 space-y-1">
                  <li>Envia 3 emails + 2 mensagens WhatsApp de forma intercalada</li>
                  <li>Padrão: Segunda (Email 1) → Terça (WhatsApp 1) → Quarta (Email 2) → Quinta (WhatsApp 2) → Sexta (Email 3)</li>
                  <li>Você pode arrastar os cards para reorganizar os dias de envio</li>
                  <li>Ideal para maximizar taxa de resposta com múltiplos pontos de contato</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-gray-700 overflow-x-auto">
            <button
              onClick={() => setActiveTab("templates")}
              className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === "templates"
                  ? "border-b-2 border-purple-600 text-purple-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Mail className="w-4 h-4" />
              Templates
            </button>
            <button
              onClick={() => setActiveTab("cadence")}
              className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === "cadence"
                  ? "border-b-2 border-purple-600 text-purple-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Calendar className="w-4 h-4" />
              Cadência
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === "settings"
                  ? "border-b-2 border-purple-600 text-purple-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <SettingsIcon className="w-4 h-4" />
              Configurações
            </button>
            <button
              onClick={() => setActiveTab("prompts")}
              className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === "prompts"
                  ? "border-b-2 border-cyan-600 text-cyan-600"
                  : "text-gray-600 hover:text-gray-900"
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
                <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
                  <p className="text-sm text-purple-800">
                    📧 <strong>3 Emails + 💬 2 WhatsApps</strong> - Configure os templates para ambos os canais
                  </p>
                </div>

                {/* Email 1 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Badge className="bg-blue-600">Email 1</Badge>
                      Primeiro Contato
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Assunto</Label>
                      <Input
                        value={config.hybridEmailTitulo1}
                        onChange={(e) =>
                          setConfig((prev) => ({ ...prev, hybridEmailTitulo1: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Corpo</Label>
                      <textarea
                        value={config.hybridEmailCorpo1}
                        onChange={(e) =>
                          setConfig((prev) => ({ ...prev, hybridEmailCorpo1: e.target.value }))
                        }
                        rows={6}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* WhatsApp 1 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Badge className="bg-green-600">WhatsApp 1</Badge>
                      Follow-up
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Label>Mensagem</Label>
                    <textarea
                      value={config.hybridWhatsappMessage1}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, hybridWhatsappMessage1: e.target.value }))
                      }
                      rows={6}
                      className="w-full mt-2 px-3 py-2 border rounded-md"
                    />
                  </CardContent>
                </Card>

                {/* Email 2 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Badge className="bg-blue-700">Email 2</Badge>
                      Bump
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Label>Corpo</Label>
                    <textarea
                      value={config.hybridEmailCorpo2}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, hybridEmailCorpo2: e.target.value }))
                      }
                      rows={5}
                      className="w-full mt-2 px-3 py-2 border rounded-md"
                    />
                  </CardContent>
                </Card>

                {/* WhatsApp 2 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Badge className="bg-green-700">WhatsApp 2</Badge>
                      Segunda Tentativa
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Label>Mensagem</Label>
                    <textarea
                      value={config.hybridWhatsappMessage2}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, hybridWhatsappMessage2: e.target.value }))
                      }
                      rows={6}
                      className="w-full mt-2 px-3 py-2 border rounded-md"
                    />
                  </CardContent>
                </Card>

                {/* Email 3 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Badge className="bg-blue-800">Email 3</Badge>
                      Breakup
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Assunto</Label>
                      <Input
                        value={config.hybridEmailTitulo3}
                        onChange={(e) =>
                          setConfig((prev) => ({ ...prev, hybridEmailTitulo3: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Corpo</Label>
                      <textarea
                        value={config.hybridEmailCorpo3}
                        onChange={(e) =>
                          setConfig((prev) => ({ ...prev, hybridEmailCorpo3: e.target.value }))
                        }
                        rows={6}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tab: Cadence */}
            {activeTab === "cadence" && (
              <Card>
                <CardHeader>
                  <CardTitle>Calendário de Envios</CardTitle>
                  <CardDescription>
                    Arraste os cards para escolher em qual dia da semana cada mensagem será enviada
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <HybridCadence
                    items={config.hybridCadence}
                    onChange={(items) =>
                      setConfig((prev) => ({ ...prev, hybridCadence: items }))
                    }
                  />
                </CardContent>
              </Card>
            )}

            {/* Tab: Settings */}
            {activeTab === "settings" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Timing e Limites</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Limite Diário Total (Emails + WhatsApp)</Label>
                      <Input
                        type="number"
                        value={config.hybridDailyLimit}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            hybridDailyLimit: parseInt(e.target.value) || 0,
                          }))
                        }
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Máximo combinado de emails e mensagens WhatsApp por dia
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Hora Início</Label>
                        <Input
                          type="number"
                          min="0"
                          max="23"
                          value={config.hybridBusinessHourStart}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              hybridBusinessHourStart: parseInt(e.target.value) || 0,
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
                          value={config.hybridBusinessHourEnd}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              hybridBusinessHourEnd: parseInt(e.target.value) || 0,
                            }))
                          }
                        />
                      </div>
                    </div>

                    {/* Mostrar cálculo automático */}
                    <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                      <p className="text-xs text-purple-700 font-medium mb-1">
                        ⏱️ Delay calculado automaticamente
                      </p>
                      <p className="text-xs text-purple-600">
                        {(() => {
                          const hours = config.hybridBusinessHourEnd - config.hybridBusinessHourStart;
                          const avgMinutes = (hours * 60) / config.hybridDailyLimit;
                          const minDelay = Math.floor(avgMinutes * 0.75);
                          const maxDelay = Math.ceil(avgMinutes * 1.10);
                          return `${minDelay}-${maxDelay} minutos entre mensagens (baseado em ${hours}h de janela e ${config.hybridDailyLimit} msgs/dia)`;
                        })()}
                      </p>
                    </div>
                  </CardContent>
                </Card>

              </div>
            )}

            {/* Tab: Prompts IA */}
            {activeTab === "prompts" && (
              <div className="space-y-6">
                <div className="bg-cyan-50 border border-cyan-200 p-4 rounded-lg">
                  <p className="text-sm text-cyan-800">
                    <strong>🤖 Prompts Personalizados:</strong> Configure como a IA deve gerar conteúdo para cadência híbrida (Email + WhatsApp combinados).
                  </p>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Prompt Overview</CardTitle>
                    <CardDescription>
                      Contexto geral sobre estratégia híbrida de email e WhatsApp
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Label>Contexto</Label>
                    <textarea
                      value={config.hybridPromptOverview}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, hybridPromptOverview: e.target.value }))
                      }
                      rows={8}
                      className="w-full mt-2 px-3 py-2 border rounded-md font-mono text-sm"
                      placeholder="Ex: Você é um especialista em campanhas multicanal, combinando email formal com WhatsApp conversacional..."
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Tática de Abordagem</CardTitle>
                    <CardDescription>
                      Estratégia de alternância entre canais e timing
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Label>Tática</Label>
                    <textarea
                      value={config.hybridPromptTatica}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, hybridPromptTatica: e.target.value }))
                      }
                      rows={6}
                      className="w-full mt-2 px-3 py-2 border rounded-md font-mono text-sm"
                      placeholder="Ex: Alternar entre email (formal/informativo) e WhatsApp (follow-up rápido), criando múltiplos pontos de contato..."
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Diretrizes de Escrita</CardTitle>
                    <CardDescription>
                      Regras específicas para conteúdo híbrido
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Label>Diretrizes</Label>
                    <textarea
                      value={config.hybridPromptDiretrizes}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, hybridPromptDiretrizes: e.target.value }))
                      }
                      rows={8}
                      className="w-full mt-2 px-3 py-2 border rounded-md font-mono text-sm"
                      placeholder="Ex: - Email: tom profissional, máximo 150 palavras&#10;- WhatsApp: tom amigável, máximo 200 caracteres&#10;- Manter consistência na mensagem entre canais..."
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
                className="bg-purple-600 hover:bg-purple-700"
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
