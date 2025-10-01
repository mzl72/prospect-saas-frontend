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
} from "lucide-react";
import { toast } from "sonner";
import type { UserSettings } from "@/types";

type TabType = "critical" | "prompts" | "emails" | "company";

export default function ConfiguracoesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>("critical");
  const [senderEmailInput, setSenderEmailInput] = useState("");

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

    // Informações Críticas
    nomeEmpresa: "",
    assinatura: "",
    telefoneContato: "",
    websiteEmpresa: "",
    senderEmails: "[]",
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
    value: string
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

    // Validação básica de email
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
              Configurações de IA
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Personalize como a IA pesquisa, analisa e gera emails para seus
              leads
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab("critical")}
              className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 ${
                activeTab === "critical"
                  ? "border-b-2 border-red-600 text-red-600 dark:text-red-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Building2 className="w-4 h-4" />
              Informações Críticas
            </button>
            <button
              onClick={() => setActiveTab("prompts")}
              className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 ${
                activeTab === "prompts"
                  ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Prompts de IA
            </button>
            <button
              onClick={() => setActiveTab("emails")}
              className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 ${
                activeTab === "emails"
                  ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Mail className="w-4 h-4" />
              Templates de Email
            </button>
            <button
              onClick={() => setActiveTab("company")}
              className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 ${
                activeTab === "company"
                  ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Info className="w-4 h-4" />
              Sua Empresa
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tab: Informações Críticas */}
            {activeTab === "critical" && (
              <div className="space-y-6">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg mb-6">
                  <p className="text-sm text-red-800 dark:text-red-300">
                    <strong>⚠️ Importante:</strong> Estes campos são
                    obrigatórios para o sistema funcionar corretamente. Sem
                    emails remetentes, não será possível enviar campanhas.
                  </p>
                </div>

                <Card className="dark:bg-gray-800 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="dark:text-white flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-red-600" />
                      Dados da Empresa
                    </CardTitle>
                    <CardDescription className="dark:text-gray-300">
                      Informações que aparecerão nos emails enviados
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label
                          htmlFor="nomeEmpresa"
                          className="dark:text-gray-200"
                        >
                          Nome da Empresa *
                        </Label>
                        <Input
                          id="nomeEmpresa"
                          value={config.nomeEmpresa}
                          onChange={(e) =>
                            handleChange("nomeEmpresa", e.target.value)
                          }
                          placeholder="Ex: TechCorp Solutions"
                          className="mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>

                      <div>
                        <Label
                          htmlFor="assinatura"
                          className="dark:text-gray-200"
                        >
                          Assinatura (Nome do Remetente) *
                        </Label>
                        <Input
                          id="assinatura"
                          value={config.assinatura}
                          onChange={(e) =>
                            handleChange("assinatura", e.target.value)
                          }
                          placeholder="Ex: João Silva da TechCorp"
                          className="mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>

                      <div>
                        <Label
                          htmlFor="telefoneContato"
                          className="dark:text-gray-200"
                        >
                          Telefone de Contato
                        </Label>
                        <Input
                          id="telefoneContato"
                          value={config.telefoneContato}
                          onChange={(e) =>
                            handleChange("telefoneContato", e.target.value)
                          }
                          placeholder="Ex: (11) 99999-9999"
                          className="mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>

                      <div>
                        <Label
                          htmlFor="websiteEmpresa"
                          className="dark:text-gray-200"
                        >
                          Website da Empresa
                        </Label>
                        <Input
                          id="websiteEmpresa"
                          value={config.websiteEmpresa}
                          onChange={(e) =>
                            handleChange("websiteEmpresa", e.target.value)
                          }
                          placeholder="Ex: https://techcorp.com"
                          className="mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="dark:bg-gray-800 dark:border-gray-700 border-l-4 border-red-500">
                  <CardHeader>
                    <CardTitle className="dark:text-white flex items-center gap-2">
                      <Mail className="w-5 h-5 text-red-600" />
                      Emails Remetentes (Round-Robin)
                    </CardTitle>
                    <CardDescription className="dark:text-gray-300">
                      Lista de emails que serão usados para enviar campanhas. O
                      sistema alterna entre eles automaticamente.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Input para adicionar novo email */}
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
                      <Button
                        type="button"
                        onClick={addSenderEmail}
                        variant="outline"
                      >
                        Adicionar
                      </Button>
                    </div>

                    {/* Lista de emails */}
                    {getSenderEmailsArray().length === 0 ? (
                      <div className="text-center py-8 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                        <Mail className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                        <p className="text-gray-500 dark:text-gray-400">
                          Nenhum email adicionado. Adicione pelo menos 1 email
                          remetente.
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
                              <span className="text-sm dark:text-white">
                                {email}
                              </span>
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
                      💡 Dica: Adicione múltiplos emails para evitar limite de
                      envio por conta. O sistema alternará entre eles
                      automaticamente.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tab: Prompts de IA */}
            {activeTab === "prompts" && (
              <div className="space-y-6">
                <Card className="dark:bg-gray-800 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="dark:text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                      Prompt Overview
                    </CardTitle>
                    <CardDescription className="dark:text-gray-300">
                      Define quem é você e qual o contexto geral da sua empresa
                      (substitui o &quot;Overview&quot; padrão)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <textarea
                      value={config.promptOverview}
                      onChange={(e) =>
                        handleChange("promptOverview", e.target.value)
                      }
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                      placeholder="Exemplo: Você é um Estrategista de Comunicação Sênior na [Sua Empresa], uma consultoria focada em [seu valor]..."
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
                      Instruções de como a IA deve pesquisar empresas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <textarea
                      value={config.templatePesquisa}
                      onChange={(e) =>
                        handleChange("templatePesquisa", e.target.value)
                      }
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                      placeholder="Ex: Pesquise informações sobre {nome_empresa}, incluindo setor, produtos/serviços..."
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
                      Como a IA deve analisar os dados coletados (Task section
                      do prompt)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <textarea
                      value={config.templateAnaliseEmpresa}
                      onChange={(e) =>
                        handleChange("templateAnaliseEmpresa", e.target.value)
                      }
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                      placeholder="Ex: Identifique 2 oportunidades de personalização e 2 pain points com soluções..."
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
                      Estratégia de sequência de emails (substitui
                      &quot;Tática&quot; padrão)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <textarea
                      value={config.promptTatica}
                      onChange={(e) =>
                        handleChange("promptTatica", e.target.value)
                      }
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                      placeholder="Ex: A sequência de 3 e-mails será enviada com 2 dias de intervalo. Email 1 é mudança, Email 2 é bump, Email 3 é última tentativa..."
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
                      Regras de como os emails devem ser escritos (substitui
                      &quot;Diretrizes Gerais&quot;)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <textarea
                      value={config.promptDiretrizes}
                      onChange={(e) =>
                        handleChange("promptDiretrizes", e.target.value)
                      }
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                      placeholder="Ex: - Máximo 100 palavras&#10;- Parágrafos curtos&#10;- Tom conversacional&#10;- Sem bullet points..."
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tab: Templates de Email */}
            {activeTab === "emails" && (
              <div className="space-y-6">
                <Card className="dark:bg-gray-800 dark:border-gray-700 border-l-4 border-blue-500">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="dark:text-white">
                        Email 1 - Primeiro Contato
                      </CardTitle>
                      <Badge variant="default">Mudança</Badge>
                    </div>
                    <CardDescription className="dark:text-gray-300">
                      Email inicial focado em captar atenção
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label
                        htmlFor="emailTitulo1"
                        className="dark:text-gray-200"
                      >
                        Assunto
                      </Label>
                      <Input
                        id="emailTitulo1"
                        value={config.emailTitulo1}
                        onChange={(e) =>
                          handleChange("emailTitulo1", e.target.value)
                        }
                        placeholder="Ex: {{nome_empresa}} - oportunidade identificada"
                        className="mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="emailCorpo1"
                        className="dark:text-gray-200"
                      >
                        Corpo do Email
                      </Label>
                      <textarea
                        id="emailCorpo1"
                        value={config.emailCorpo1}
                        onChange={(e) =>
                          handleChange("emailCorpo1", e.target.value)
                        }
                        rows={8}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Instruções para a IA gerar o corpo do email..."
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="dark:bg-gray-800 dark:border-gray-700 border-l-4 border-cyan-500">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="dark:text-white">
                        Email 2 - Follow-up (Resposta na Thread)
                      </CardTitle>
                      <Badge variant="secondary">Bump</Badge>
                    </div>
                    <CardDescription className="dark:text-gray-300">
                      Resposta curta na mesma thread (sem assunto novo)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        <strong>Nota:</strong> Email 2 é enviado como{" "}
                        <strong>resposta (Re:)</strong> ao Email 1 na mesma
                        thread. Não precisa de assunto novo.
                      </p>
                    </div>
                    <div>
                      <Label
                        htmlFor="emailCorpo2"
                        className="dark:text-gray-200"
                      >
                        Corpo do Email
                      </Label>
                      <textarea
                        id="emailCorpo2"
                        value={config.emailCorpo2}
                        onChange={(e) =>
                          handleChange("emailCorpo2", e.target.value)
                        }
                        rows={6}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Ex: Email curto e amigável trazendo de volta ao topo da caixa de entrada..."
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="dark:bg-gray-800 dark:border-gray-700 border-l-4 border-indigo-500">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="dark:text-white">
                        Email 3 - Última Tentativa
                      </CardTitle>
                      <Badge variant="destructive">Breakup</Badge>
                    </div>
                    <CardDescription className="dark:text-gray-300">
                      Última tentativa antes de desistir
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label
                        htmlFor="emailTitulo3"
                        className="dark:text-gray-200"
                      >
                        Assunto
                      </Label>
                      <Input
                        id="emailTitulo3"
                        value={config.emailTitulo3}
                        onChange={(e) =>
                          handleChange("emailTitulo3", e.target.value)
                        }
                        placeholder="Ex: {{nome_empresa}} - é o momento certo?"
                        className="mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="emailCorpo3"
                        className="dark:text-gray-200"
                      >
                        Corpo do Email
                      </Label>
                      <textarea
                        id="emailCorpo3"
                        value={config.emailCorpo3}
                        onChange={(e) =>
                          handleChange("emailCorpo3", e.target.value)
                        }
                        rows={8}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Instruções para a IA gerar o corpo do email de breakup..."
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tab: Sua Empresa */}
            {activeTab === "company" && (
              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="dark:text-white flex items-center gap-2">
                    <Info className="w-5 h-5 text-green-600" />
                    Informações da Sua Empresa
                  </CardTitle>
                  <CardDescription className="dark:text-gray-300">
                    Contexto sobre seu negócio para a IA personalizar os emails
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Label
                    htmlFor="informacoesPropria"
                    className="dark:text-gray-200"
                  >
                    Descrição Completa
                  </Label>
                  <textarea
                    id="informacoesPropria"
                    value={config.informacoesPropria}
                    onChange={(e) =>
                      handleChange("informacoesPropria", e.target.value)
                    }
                    rows={12}
                    className="w-full mt-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Descreva sua empresa, produtos/serviços, proposta de valor, diferenciais, clientes típicos, resultados alcançados, etc.&#10;&#10;Exemplo:&#10;Somos uma consultoria de tecnologia especializada em transformação digital. Nossa proposta de valor é acelerar o crescimento dos nossos clientes através de:&#10;- Inteligência Artificial e Automação&#10;- Análise de Dados e BI&#10;- Estratégia Digital&#10;- Desenvolvimento de Soluções Customizadas..."
                  />
                </CardContent>
              </Card>
            )}

            {/* Botão Salvar */}
            <div className="flex justify-end pt-6">
              <Button
                type="submit"
                size="lg"
                disabled={saveMutation.isPending}
                className="flex items-center gap-2 cursor-pointer"
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
