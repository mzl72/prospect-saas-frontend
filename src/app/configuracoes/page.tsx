"use client";

import { Layout } from "@/components/layout/Layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Save,
  Loader2,
  Sparkles,
  Mail,
  FileText,
  Info,
  Building2,
  X,
  MessageCircle,
  Send,
  Clock,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import type { UserSettings } from "@/types";

type TabType = "critical" | "email" | "whatsapp" | "cadence" | "prompts" | "company";

export default function ConfiguracoesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>("critical");
  const [senderEmailInput, setSenderEmailInput] = useState("");

  // Suporte para navegação via hash (ex: /configuracoes#email)
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && ['critical', 'email', 'whatsapp', 'cadence', 'prompts', 'company'].includes(hash)) {
      setActiveTab(hash as TabType);
    }
  }, []);

  const [config, setConfig] = useState<
    Omit<UserSettings, "id" | "userId" | "createdAt" | "updatedAt">
  >({
    // Templates de IA
    templatePesquisa: "",
    templateAnaliseEmpresa: "",
    informacoesPropria: "",

    // Prompt Customization
    promptOverview: "",
    promptTatica: "",
    promptDiretrizes: "",

    // Email Templates
    emailTitulo1: "",
    emailCorpo1: "",
    emailCorpo2: "",
    emailTitulo3: "",
    emailCorpo3: "",

    // WhatsApp Templates
    whatsappMessage1: "",
    whatsappMessage2: "",
    whatsappMessage3: "",

    // Informações Críticas
    nomeEmpresa: "",
    assinatura: "",
    telefoneContato: "",
    websiteEmpresa: "",
    senderEmails: "[]",
    evolutionInstances: "[]",

    // Cadências
    emailOnlyCadence: "[]",
    whatsappOnlyCadence: "[]",
    hybridCadence: "[]",

    // Timing Configuration
    email2DelayDays: 3,
    email3DelayDays: 7,
    dailyEmailLimit: 100,
    emailBusinessHourStart: 9,
    emailBusinessHourEnd: 18,
    whatsappDailyLimit: 50,
    whatsappBusinessHourStart: 9,
    whatsappBusinessHourEnd: 18,
    hybridDailyLimit: 70,
    hybridBusinessHourStart: 9,
    hybridBusinessHourEnd: 18,
    sendOnlyBusinessHours: true,
    useHybridCadence: false,
  });

  // Buscar configurações existentes
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await fetch("/api/settings");
      const data = await response.json();
      return data;
    },
    staleTime: 0,
  });

  useEffect(() => {
    if (settingsData?.success && settingsData?.settings) {
      setConfig(settingsData.settings);
    }
  }, [settingsData]);

  const saveMutation = useMutation({
    mutationFn: async (
      data: Omit<UserSettings, "id" | "userId" | "createdAt" | "updatedAt">
    ) => {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Configurações salvas com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao salvar configurações");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(config);
  };

  const handleChange = (
    field: keyof Omit<
      UserSettings,
      "id" | "userId" | "createdAt" | "updatedAt"
    >,
    value: string | number | boolean
  ) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  // Gerenciar emails remetentes
  const getSenderEmailsArray = (): string[] => {
    try {
      return JSON.parse(config.senderEmails || "[]");
    } catch {
      return [];
    }
  };

  const addSenderEmail = () => {
    const email = senderEmailInput.trim();
    if (!email) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Email inválido");
      return;
    }

    const currentEmails = getSenderEmailsArray();
    if (currentEmails.includes(email)) {
      toast.error("Email já adicionado");
      return;
    }

    const updatedEmails = [...currentEmails, email];
    setConfig((prev) => ({
      ...prev,
      senderEmails: JSON.stringify(updatedEmails),
    }));
    setSenderEmailInput("");
    toast.success("Email adicionado");
  };

  const removeSenderEmail = (emailToRemove: string) => {
    const currentEmails = getSenderEmailsArray();
    const updatedEmails = currentEmails.filter((e) => e !== emailToRemove);
    setConfig((prev) => ({
      ...prev,
      senderEmails: JSON.stringify(updatedEmails),
    }));
    toast.success("Email removido");
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="py-8 bg-white dark:bg-gray-900 min-h-screen">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 dark:text-blue-400" />
              <p className="mt-2 text-gray-600 dark:text-gray-300">
                Carregando configurações...
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="py-8">
        <div className="max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Configurações
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Configure sua empresa, canais de comunicação e estratégia de outreach
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            <button
              onClick={() => setActiveTab("critical")}
              className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === "critical"
                  ? "border-b-2 border-red-600 text-red-600 dark:text-red-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Building2 className="w-4 h-4" />
              Empresa
            </button>
            <button
              onClick={() => setActiveTab("email")}
              className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === "email"
                  ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Mail className="w-4 h-4" />
              Email
            </button>
            <button
              onClick={() => setActiveTab("whatsapp")}
              className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === "whatsapp"
                  ? "border-b-2 border-green-600 text-green-600 dark:text-green-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </button>
            <button
              onClick={() => setActiveTab("cadence")}
              className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === "cadence"
                  ? "border-b-2 border-purple-600 text-purple-600 dark:text-purple-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Zap className="w-4 h-4" />
              Cadência
            </button>
            <button
              onClick={() => setActiveTab("prompts")}
              className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === "prompts"
                  ? "border-b-2 border-cyan-600 text-cyan-600 dark:text-cyan-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Prompts IA
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tab: Empresa */}
            {activeTab === "critical" && (
              <div className="space-y-6">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg mb-6">
                  <p className="text-sm text-red-800 dark:text-red-300">
                    <strong>⚠️ Importante:</strong> Configure as informações da sua empresa para personalizar os emails e mensagens.
                  </p>
                </div>

                <Card className="dark:bg-gray-800 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="dark:text-white flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-red-600" />
                      Dados da Empresa
                    </CardTitle>
                    <CardDescription className="dark:text-gray-300">
                      Informações que aparecerão nos emails e mensagens
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="nomeEmpresa" className="dark:text-gray-200">
                          Nome da Empresa *
                        </Label>
                        <Input
                          id="nomeEmpresa"
                          value={config.nomeEmpresa}
                          onChange={(e) => handleChange("nomeEmpresa", e.target.value)}
                          placeholder="Ex: TechCorp Solutions"
                          className="mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>

                      <div>
                        <Label htmlFor="assinatura" className="dark:text-gray-200">
                          Assinatura (Nome do Remetente) *
                        </Label>
                        <Input
                          id="assinatura"
                          value={config.assinatura}
                          onChange={(e) => handleChange("assinatura", e.target.value)}
                          placeholder="Ex: João Silva"
                          className="mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>

                      <div>
                        <Label htmlFor="telefoneContato" className="dark:text-gray-200">
                          Telefone de Contato
                        </Label>
                        <Input
                          id="telefoneContato"
                          value={config.telefoneContato}
                          onChange={(e) => handleChange("telefoneContato", e.target.value)}
                          placeholder="Ex: (11) 99999-9999"
                          className="mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>

                      <div>
                        <Label htmlFor="websiteEmpresa" className="dark:text-gray-200">
                          Website da Empresa
                        </Label>
                        <Input
                          id="websiteEmpresa"
                          value={config.websiteEmpresa}
                          onChange={(e) => handleChange("websiteEmpresa", e.target.value)}
                          placeholder="Ex: https://techcorp.com"
                          className="mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="dark:bg-gray-800 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="dark:text-white flex items-center gap-2">
                      <Info className="w-5 h-5 text-green-600" />
                      Sobre Sua Empresa
                    </CardTitle>
                    <CardDescription className="dark:text-gray-300">
                      Contexto sobre seu negócio para a IA personalizar as mensagens
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Label htmlFor="informacoesPropria" className="dark:text-gray-200">
                      Descrição Completa
                    </Label>
                    <textarea
                      id="informacoesPropria"
                      value={config.informacoesPropria}
                      onChange={(e) => handleChange("informacoesPropria", e.target.value)}
                      rows={10}
                      className="w-full mt-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Descreva sua empresa, produtos/serviços, proposta de valor, diferenciais, clientes típicos, resultados alcançados, etc.&#10;&#10;Exemplo:&#10;Somos uma consultoria de tecnologia especializada em transformação digital..."
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tab: Email */}
            {activeTab === "email" && (
              <div className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg mb-6">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>📧 Email:</strong> Configure seus emails remetentes e os templates para a cadência de 3 emails (dia 1, 3 e 7).
                  </p>
                </div>

                {/* Emails Remetentes */}
                <Card className="dark:bg-gray-800 dark:border-gray-700 border-l-4 border-blue-500">
                  <CardHeader>
                    <CardTitle className="dark:text-white flex items-center gap-2">
                      <Mail className="w-5 h-5 text-blue-600" />
                      Emails Remetentes (Round-Robin)
                    </CardTitle>
                    <CardDescription className="dark:text-gray-300">
                      Lista de emails que serão usados para enviar campanhas. O sistema alterna entre eles automaticamente.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        value={senderEmailInput}
                        onChange={(e) => setSenderEmailInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addSenderEmail();
                          }
                        }}
                        placeholder="Digite um email e pressione Enter"
                        className="flex-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                      <Button type="button" onClick={addSenderEmail} variant="outline">
                        Adicionar
                      </Button>
                    </div>

                    {getSenderEmailsArray().length === 0 ? (
                      <div className="text-center py-8 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                        <Mail className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                        <p className="text-gray-500 dark:text-gray-400">
                          Nenhum email adicionado. Adicione pelo menos 1 email remetente.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {getSenderEmailsArray().map((email, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <Badge variant="outline">#{index + 1}</Badge>
                              <span className="text-sm dark:text-white">{email}</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSenderEmail(email)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      💡 Dica: Adicione múltiplos emails para evitar limite de envio por conta.
                    </p>
                  </CardContent>
                </Card>

                {/* Email 1 */}
                <Card className="dark:bg-gray-800 dark:border-gray-700 border-l-4 border-blue-500">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="dark:text-white">Email 1 - Primeiro Contato</CardTitle>
                      <Badge variant="default">Mudança</Badge>
                    </div>
                    <CardDescription className="dark:text-gray-300">
                      Email inicial focado em captar atenção
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="emailTitulo1" className="dark:text-gray-200">Assunto</Label>
                      <Input
                        id="emailTitulo1"
                        value={config.emailTitulo1}
                        onChange={(e) => handleChange("emailTitulo1", e.target.value)}
                        placeholder="Ex: {{nome_empresa}} - oportunidade identificada"
                        className="mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="emailCorpo1" className="dark:text-gray-200">Corpo do Email</Label>
                      <textarea
                        id="emailCorpo1"
                        value={config.emailCorpo1}
                        onChange={(e) => handleChange("emailCorpo1", e.target.value)}
                        rows={8}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Instruções para a IA gerar o corpo do email..."
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Email 2 */}
                <Card className="dark:bg-gray-800 dark:border-gray-700 border-l-4 border-cyan-500">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="dark:text-white">Email 2 - Follow-up (Thread)</CardTitle>
                      <Badge variant="secondary">Bump</Badge>
                    </div>
                    <CardDescription className="dark:text-gray-300">
                      Resposta curta na mesma thread
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        <strong>Nota:</strong> Email 2 é enviado como resposta (Re:) ao Email 1.
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="emailCorpo2" className="dark:text-gray-200">Corpo do Email</Label>
                      <textarea
                        id="emailCorpo2"
                        value={config.emailCorpo2}
                        onChange={(e) => handleChange("emailCorpo2", e.target.value)}
                        rows={6}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Email curto e amigável..."
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Email 3 */}
                <Card className="dark:bg-gray-800 dark:border-gray-700 border-l-4 border-indigo-500">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="dark:text-white">Email 3 - Última Tentativa</CardTitle>
                      <Badge variant="destructive">Breakup</Badge>
                    </div>
                    <CardDescription className="dark:text-gray-300">
                      Última tentativa antes de desistir
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="emailTitulo3" className="dark:text-gray-200">Assunto</Label>
                      <Input
                        id="emailTitulo3"
                        value={config.emailTitulo3}
                        onChange={(e) => handleChange("emailTitulo3", e.target.value)}
                        placeholder="Ex: {{nome_empresa}} - é o momento certo?"
                        className="mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="emailCorpo3" className="dark:text-gray-200">Corpo do Email</Label>
                      <textarea
                        id="emailCorpo3"
                        value={config.emailCorpo3}
                        onChange={(e) => handleChange("emailCorpo3", e.target.value)}
                        rows={8}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Instruções para breakup email..."
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tab: WhatsApp */}
            {activeTab === "whatsapp" && (
              <div className="space-y-6">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg mb-6">
                  <p className="text-sm text-green-800 dark:text-green-300">
                    <strong>💬 WhatsApp:</strong> Configure os templates para mensagens via WhatsApp. Use tom mais informal e direto.
                  </p>
                </div>

                {/* WhatsApp 1 */}
                <Card className="dark:bg-gray-800 dark:border-gray-700 border-l-4 border-green-500">
                  <CardHeader>
                    <CardTitle className="dark:text-white flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-green-600" />
                      WhatsApp 1 - Primeiro Contato
                    </CardTitle>
                    <CardDescription className="dark:text-gray-300">
                      Mensagem inicial via WhatsApp (tom informal e objetivo)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <textarea
                      value={config.whatsappMessage1}
                      onChange={(e) => handleChange("whatsappMessage1", e.target.value)}
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Instruções para a IA gerar a mensagem de WhatsApp...&#10;&#10;Dicas:&#10;- Tom informal mas profissional&#10;- Máximo 200 caracteres&#10;- Usar emojis se apropriado&#10;- Call-to-action claro"
                    />
                  </CardContent>
                </Card>

                {/* WhatsApp 2 */}
                <Card className="dark:bg-gray-800 dark:border-gray-700 border-l-4 border-green-600">
                  <CardHeader>
                    <CardTitle className="dark:text-white flex items-center gap-2">
                      <Send className="w-5 h-5 text-green-700" />
                      WhatsApp 2 - Follow-up
                    </CardTitle>
                    <CardDescription className="dark:text-gray-300">
                      Segunda mensagem (mais urgente e direto)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <textarea
                      value={config.whatsappMessage2}
                      onChange={(e) => handleChange("whatsappMessage2", e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Instruções para follow-up...&#10;&#10;Dicas:&#10;- Reforçar valor&#10;- Criar urgência suave&#10;- Máximo 150 caracteres"
                    />
                  </CardContent>
                </Card>

                {/* WhatsApp 3 - Para modo híbrido não é necessário, mas podemos adicionar depois */}
              </div>
            )}

            {/* Tab: Cadência */}
            {activeTab === "cadence" && (
              <div className="space-y-6">
                {/* Info Card */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 p-6 rounded-lg">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
                      <Zap className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                        🎯 Estratégia Inteligente de Cadência
                      </h3>
                      <p className="text-sm text-purple-800 dark:text-purple-200 mb-3">
                        O sistema decide automaticamente qual canal usar baseado nos dados do lead:
                      </p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-blue-600" />
                          <span className="text-purple-900 dark:text-purple-100">
                            <strong>Só Email:</strong> 3 emails (dia 1, 3, 7)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MessageCircle className="w-4 h-4 text-green-600" />
                          <span className="text-purple-900 dark:text-purple-100">
                            <strong>Só WhatsApp:</strong> 3 WhatsApps (dia 1, 3, 7)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-purple-600" />
                          <span className="text-purple-900 dark:text-purple-100">
                            <strong>Híbrido:</strong> 3 emails + 2 WhatsApps em 5 dias úteis
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cadência Híbrida */}
                <Card className="dark:bg-gray-800 dark:border-gray-700 border-l-4 border-purple-500">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="dark:text-white flex items-center gap-2">
                          <Zap className="w-5 h-5 text-purple-600" />
                          Modo Híbrido (Email + WhatsApp)
                        </CardTitle>
                        <CardDescription className="dark:text-gray-300">
                          Ativa quando o lead tem email E WhatsApp
                        </CardDescription>
                      </div>
                      <Switch
                        checked={config.useHybridCadence}
                        onCheckedChange={(checked) => handleChange("useHybridCadence", checked)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {config.useHybridCadence ? (
                      <div className="space-y-4">
                        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                          <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-3">
                            📅 Cronograma Semanal (5 dias úteis)
                          </h4>
                          <div className="space-y-2">
                            <div className="flex items-center gap-3 p-2 bg-white dark:bg-gray-800 rounded">
                              <Badge variant="default">Seg</Badge>
                              <Mail className="w-4 h-4 text-blue-600" />
                              <span className="text-sm">Email 1 - Primeiro Contato</span>
                            </div>
                            <div className="flex items-center gap-3 p-2 bg-white dark:bg-gray-800 rounded">
                              <Badge variant="default">Ter</Badge>
                              <MessageCircle className="w-4 h-4 text-green-600" />
                              <span className="text-sm">WhatsApp 1 - Follow-up Rápido</span>
                            </div>
                            <div className="flex items-center gap-3 p-2 bg-white dark:bg-gray-800 rounded">
                              <Badge variant="default">Qua</Badge>
                              <Mail className="w-4 h-4 text-blue-600" />
                              <span className="text-sm">Email 2 - Bump na Thread</span>
                            </div>
                            <div className="flex items-center gap-3 p-2 bg-white dark:bg-gray-800 rounded">
                              <Badge variant="default">Qui</Badge>
                              <MessageCircle className="w-4 h-4 text-green-600" />
                              <span className="text-sm">WhatsApp 2 - Reforço</span>
                            </div>
                            <div className="flex items-center gap-3 p-2 bg-white dark:bg-gray-800 rounded">
                              <Badge variant="default">Sex</Badge>
                              <Mail className="w-4 h-4 text-blue-600" />
                              <span className="text-sm">Email 3 - Breakup Email</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          💡 Alterna canais para maximizar taxa de resposta mantendo presença constante.
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <Zap className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Modo híbrido desativado</p>
                        <p className="text-xs mt-1">Ative para combinar email + WhatsApp</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Timing Configuration */}
                <Card className="dark:bg-gray-800 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="dark:text-white flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      Configurações de Timing
                    </CardTitle>
                    <CardDescription className="dark:text-gray-300">
                      Controle quando e como as mensagens são enviadas
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Horário Comercial */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="dark:text-gray-200">Enviar apenas em horário comercial</Label>
                        <Switch
                          checked={config.sendOnlyBusinessHours}
                          onCheckedChange={(checked) => handleChange("sendOnlyBusinessHours", checked)}
                        />
                      </div>

                      {config.sendOnlyBusinessHours && (
                        <div className="grid grid-cols-2 gap-4 ml-6">
                          <div>
                            <Label className="text-xs">Início</Label>
                            <Input
                              type="number"
                              min="0"
                              max="23"
                              value={config.businessHourStart}
                              onChange={(e) => handleChange("businessHourStart", parseInt(e.target.value))}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Fim</Label>
                            <Input
                              type="number"
                              min="0"
                              max="23"
                              value={config.businessHourEnd}
                              onChange={(e) => handleChange("businessHourEnd", parseInt(e.target.value))}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Limite Diário */}
                    <div className="space-y-3">
                      <Label className="dark:text-gray-200">
                        Limite diário de envios: <strong>{config.dailyEmailLimit}</strong>
                      </Label>
                      <Slider
                        value={[config.dailyEmailLimit]}
                        onValueChange={([value]) => handleChange("dailyEmailLimit", value)}
                        min={10}
                        max={500}
                        step={10}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-500">Recomendado: 50-150 por dia</p>
                    </div>

                    {/* Delays */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Delay mínimo (ms)</Label>
                        <Input
                          type="number"
                          value={config.sendDelayMinMs}
                          onChange={(e) => handleChange("sendDelayMinMs", parseInt(e.target.value))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Delay máximo (ms)</Label>
                        <Input
                          type="number"
                          value={config.sendDelayMaxMs}
                          onChange={(e) => handleChange("sendDelayMaxMs", parseInt(e.target.value))}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    {/* Intervalos */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Email 2 - Intervalo (dias)</Label>
                        <Input
                          type="number"
                          min="1"
                          max="14"
                          value={config.email2DelayDays}
                          onChange={(e) => handleChange("email2DelayDays", parseInt(e.target.value))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Email 3 - Intervalo (dias)</Label>
                        <Input
                          type="number"
                          min="1"
                          max="14"
                          value={config.email3DelayDays}
                          onChange={(e) => handleChange("email3DelayDays", parseInt(e.target.value))}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tab: Prompts IA */}
            {activeTab === "prompts" && (
              <div className="space-y-6">
                <Card className="dark:bg-gray-800 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="dark:text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                      Prompt Overview
                    </CardTitle>
                    <CardDescription className="dark:text-gray-300">
                      Contexto geral sobre você e sua empresa
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <textarea
                      value={config.promptOverview}
                      onChange={(e) => handleChange("promptOverview", e.target.value)}
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                      placeholder="Exemplo: Você é um Estrategista de Comunicação..."
                    />
                  </CardContent>
                </Card>

                <Card className="dark:bg-gray-800 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="dark:text-white flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      Template de Pesquisa
                    </CardTitle>
                    <CardDescription className="dark:text-gray-300">
                      Como a IA deve pesquisar empresas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <textarea
                      value={config.templatePesquisa}
                      onChange={(e) => handleChange("templatePesquisa", e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                      placeholder="Ex: Pesquise informações sobre {nome_empresa}..."
                    />
                  </CardContent>
                </Card>

                <Card className="dark:bg-gray-800 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="dark:text-white flex items-center gap-2">
                      <FileText className="w-5 h-5 text-green-600" />
                      Template de Análise Estratégica
                    </CardTitle>
                    <CardDescription className="dark:text-gray-300">
                      Como a IA deve analisar os dados coletados
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <textarea
                      value={config.templateAnaliseEmpresa}
                      onChange={(e) => handleChange("templateAnaliseEmpresa", e.target.value)}
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                      placeholder="Ex: Identifique 2 oportunidades..."
                    />
                  </CardContent>
                </Card>

                <Card className="dark:bg-gray-800 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="dark:text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-cyan-600" />
                      Tática de Abordagem
                    </CardTitle>
                    <CardDescription className="dark:text-gray-300">
                      Estratégia de sequência de mensagens
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <textarea
                      value={config.promptTatica}
                      onChange={(e) => handleChange("promptTatica", e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                      placeholder="Ex: A sequência será enviada com intervalos..."
                    />
                  </CardContent>
                </Card>

                <Card className="dark:bg-gray-800 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="dark:text-white flex items-center gap-2">
                      <FileText className="w-5 h-5 text-orange-600" />
                      Diretrizes de Escrita
                    </CardTitle>
                    <CardDescription className="dark:text-gray-300">
                      Regras de como as mensagens devem ser escritas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <textarea
                      value={config.promptDiretrizes}
                      onChange={(e) => handleChange("promptDiretrizes", e.target.value)}
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                      placeholder="Ex: - Máximo 100 palavras..."
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Botão Salvar */}
            <div className="flex justify-end pt-6 sticky bottom-4">
              <Button
                type="submit"
                size="lg"
                disabled={saveMutation.isPending}
                className="flex items-center gap-2 cursor-pointer shadow-lg"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Salvar Configurações
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
