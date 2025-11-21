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
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Save,
  Loader2,
  Sparkles,
  FileText,
  Info,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import type { UserSettings } from "@/types";

type TabType = "company" | "prompts";

export default function ConfiguracoesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>("company");
  const [senderEmailInput, setSenderEmailInput] = useState("");
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);

  // Suporte para navegação via hash (ex: /configuracoes#prompts)
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && ['company', 'prompts'].includes(hash)) {
      setActiveTab(hash as TabType);
    }
  }, []);

  const [config, setConfig] = useState<
    Omit<UserSettings, "id" | "userId" | "createdAt" | "updatedAt">
  >({
    // Templates de IA (Genéricos)
    templatePesquisa: "",
    templateAnaliseEmpresa: "",
    informacoesPropria: "",

    // Prompts específicos por canal - Email
    emailPromptOverview: "",
    emailPromptTatica: "",
    emailPromptDiretrizes: "",

    // Prompts específicos por canal - WhatsApp
    whatsappPromptOverview: "",
    whatsappPromptTatica: "",
    whatsappPromptDiretrizes: "",

    // Prompts específicos por canal - Híbrido
    hybridPromptOverview: "",
    hybridPromptTatica: "",
    hybridPromptDiretrizes: "",

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

    // Hybrid Templates
    hybridEmailTitulo1: "",
    hybridEmailCorpo1: "",
    hybridEmailCorpo2: "",
    hybridEmailTitulo3: "",
    hybridEmailCorpo3: "",
    hybridWhatsappMessage1: "",
    hybridWhatsappMessage2: "",

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
    // Só atualizar estado se ainda não foi carregado do banco
    // Isso evita sobrescrever mudanças locais do usuário
    if (settingsData?.success && settingsData?.settings && !hasLoadedSettings) {
      setConfig(settingsData.settings);
      setHasLoadedSettings(true);
    }
  }, [settingsData, hasLoadedSettings]);

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
    onSuccess: (savedData) => {
      // Atualizar o cache do React Query diretamente com os dados salvos
      // ao invés de invalidar e refetch (que poderia sobrescrever o estado local)
      if (savedData?.success && savedData?.settings) {
        queryClient.setQueryData(["settings"], savedData);
      }

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

  // Funções para gerenciar sender emails (não utilizadas no momento)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        <div className="py-8 bg-gray-900 min-h-screen">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
              <p className="mt-2 text-gray-300">
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
            <h1 className="text-3xl font-bold text-white">
              Configurações
            </h1>
            <p className="text-gray-300 mt-2">
              Configure as informações da sua empresa e personalize os prompts da IA
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-gray-700 overflow-x-auto">
            <button
              onClick={() => setActiveTab("company")}
              className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === "company"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Building2 className="w-4 h-4" />
              Empresa
            </button>
            <button
              onClick={() => setActiveTab("prompts")}
              className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === "prompts"
                  ? "border-b-2 border-cyan-600 text-cyan-600"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Prompts IA
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tab: Empresa */}
            {activeTab === "company" && (
              <div className="space-y-6">
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
                  <p className="text-sm text-red-800">
                    <strong>⚠️ Importante:</strong> Configure as informações da sua empresa para personalizar os emails e mensagens.
                  </p>
                </div>

                <Card className="dark:bg-gray-800">
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
                          className="mt-1"
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
                          className="mt-1"
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
                          className="mt-1"
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
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="dark:bg-gray-800">
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
                      className="w-full mt-2 px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Descreva sua empresa, produtos/serviços, proposta de valor, diferenciais, clientes típicos, resultados alcançados, etc.&#10;&#10;Exemplo:&#10;Somos uma consultoria de tecnologia especializada em transformação digital..."
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tab: Prompts IA */}
            {activeTab === "prompts" && (
              <div className="space-y-6">
                <div className="bg-cyan-50 border border-cyan-200 p-4 rounded-lg mb-6">
                  <p className="text-sm text-cyan-800">
                    <strong>🤖 Prompts Genéricos:</strong> Estes prompts são usados por todos os canais (Email, WhatsApp e Híbrido). Para personalizar prompts específicos de cada canal, configure nas páginas respectivas.
                  </p>
                </div>

                <Card className="dark:bg-gray-800">
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
                      className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                      placeholder="Ex: Pesquise informações sobre {nome_empresa}..."
                    />
                  </CardContent>
                </Card>

                <Card className="dark:bg-gray-800">
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
                      className="w-full px-3 py-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                      placeholder="Ex: Identifique 2 oportunidades..."
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
