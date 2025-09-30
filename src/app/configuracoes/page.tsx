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
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Loader2 } from "lucide-react";

interface ConfigData {
  templatePesquisa: string;
  templateAnaliseEmpresa: string;
  emailTitulo1: string;
  emailCorpo1: string;
  emailTitulo2: string;
  emailCorpo2: string;
  emailTitulo3: string;
  emailCorpo3: string;
  informacoesPropria: string;
}

export default function ConfiguracoesPage() {
  const queryClient = useQueryClient();

  const [config, setConfig] = useState<ConfigData>({
    templatePesquisa: "",
    templateAnaliseEmpresa: "",
    emailTitulo1: "",
    emailCorpo1: "",
    emailTitulo2: "",
    emailCorpo2: "",
    emailTitulo3: "",
    emailCorpo3: "",
    informacoesPropria: "",
  });

  // Buscar configurações existentes
  const { isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await fetch("/api/settings");
      const data = await response.json();
      if (data.success && data.settings) {
        setConfig(data.settings);
      }
      return data;
    },
  });

  // Mutation para salvar
  const saveMutation = useMutation({
    mutationFn: async (data: ConfigData) => {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      alert("Configurações salvas com sucesso!");
    },
    onError: () => {
      alert("Erro ao salvar configurações");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(config);
  };

  const handleChange = (field: keyof ConfigData, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="py-8">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
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
        <div className="max-w-5xl mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Configurações
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Configure os templates de IA para pesquisa, análise e geração de
              emails
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Template de Pesquisa */}
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="dark:text-white">
                  Template de Pesquisa
                </CardTitle>
                <CardDescription className="dark:text-gray-300">
                  Instruções para a IA pesquisar informações sobre empresas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Label
                  htmlFor="templatePesquisa"
                  className="dark:text-gray-200"
                >
                  Prompt de Pesquisa
                </Label>
                <textarea
                  id="templatePesquisa"
                  value={config.templatePesquisa}
                  onChange={(e) =>
                    handleChange("templatePesquisa", e.target.value)
                  }
                  rows={6}
                  className="w-full mt-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Ex: Pesquise informações detalhadas sobre a empresa {nome_empresa}, incluindo setor, produtos/serviços, público-alvo..."
                />
              </CardContent>
            </Card>

            {/* Template de Análise */}
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="dark:text-white">
                  Template de Análise de Empresa
                </CardTitle>
                <CardDescription className="dark:text-gray-300">
                  Como a IA deve analisar as informações coletadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Label
                  htmlFor="templateAnaliseEmpresa"
                  className="dark:text-gray-200"
                >
                  Prompt de Análise
                </Label>
                <textarea
                  id="templateAnaliseEmpresa"
                  value={config.templateAnaliseEmpresa}
                  onChange={(e) =>
                    handleChange("templateAnaliseEmpresa", e.target.value)
                  }
                  rows={6}
                  className="w-full mt-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Ex: Analise a empresa {nome_empresa} e identifique: dores principais, oportunidades de melhoria, decisores..."
                />
              </CardContent>
            </Card>

            {/* Templates de Email */}
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="dark:text-white">
                  Templates de Email
                </CardTitle>
                <CardDescription className="dark:text-gray-300">
                  Configure 3 variações de email para cada lead
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Email 1 */}
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold text-lg mb-3 dark:text-white">
                    Email 1 - Primeiro Contato
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <Label
                        htmlFor="emailTitulo1"
                        className="dark:text-gray-200"
                      >
                        Título
                      </Label>
                      <Input
                        id="emailTitulo1"
                        value={config.emailTitulo1}
                        onChange={(e) =>
                          handleChange("emailTitulo1", e.target.value)
                        }
                        placeholder="Ex: Oportunidade de {benefício} para {nome_empresa}"
                        className="mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="emailCorpo1"
                        className="dark:text-gray-200"
                      >
                        Corpo
                      </Label>
                      <textarea
                        id="emailCorpo1"
                        value={config.emailCorpo1}
                        onChange={(e) =>
                          handleChange("emailCorpo1", e.target.value)
                        }
                        rows={5}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Variáveis disponíveis: {nome_empresa}, {setor}, {dor_identificada}, {solucao}, {informacoes_propria}"
                      />
                    </div>
                  </div>
                </div>

                {/* Email 2 */}
                <div className="border-l-4 border-cyan-500 pl-4">
                  <h3 className="font-semibold text-lg mb-3 dark:text-white">
                    Email 2 - Follow-up
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <Label
                        htmlFor="emailTitulo2"
                        className="dark:text-gray-200"
                      >
                        Título
                      </Label>
                      <Input
                        id="emailTitulo2"
                        value={config.emailTitulo2}
                        onChange={(e) =>
                          handleChange("emailTitulo2", e.target.value)
                        }
                        placeholder="Ex: Re: {assunto_anterior}"
                        className="mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="emailCorpo2"
                        className="dark:text-gray-200"
                      >
                        Corpo
                      </Label>
                      <textarea
                        id="emailCorpo2"
                        value={config.emailCorpo2}
                        onChange={(e) =>
                          handleChange("emailCorpo2", e.target.value)
                        }
                        rows={5}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Variáveis disponíveis: {nome_empresa}, {setor}, {dor_identificada}, {solucao}, {informacoes_propria}"
                      />
                    </div>
                  </div>
                </div>

                {/* Email 3 */}
                <div className="border-l-4 border-indigo-500 pl-4">
                  <h3 className="font-semibold text-lg mb-3 dark:text-white">
                    Email 3 - Última Tentativa
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <Label
                        htmlFor="emailTitulo3"
                        className="dark:text-gray-200"
                      >
                        Título
                      </Label>
                      <Input
                        id="emailTitulo3"
                        value={config.emailTitulo3}
                        onChange={(e) =>
                          handleChange("emailTitulo3", e.target.value)
                        }
                        placeholder="Ex: Última chance: {benefício} para {nome_empresa}"
                        className="mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="emailCorpo3"
                        className="dark:text-gray-200"
                      >
                        Corpo
                      </Label>
                      <textarea
                        id="emailCorpo3"
                        value={config.emailCorpo3}
                        onChange={(e) =>
                          handleChange("emailCorpo3", e.target.value)
                        }
                        rows={5}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Variáveis disponíveis: {nome_empresa}, {setor}, {dor_identificada}, {solucao}, {informacoes_propria}"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Informações da Própria Empresa */}
            <Card className="dark:bg-gray-800 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="dark:text-white">
                  Informações da Sua Empresa/Produto
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
                  rows={8}
                  className="w-full mt-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Ex: Somos uma empresa de software SaaS especializada em automação de marketing. Nosso produto ajuda empresas a gerar leads qualificados automaticamente através de IA, economizando 80% do tempo gasto em prospecção manual..."
                />
              </CardContent>
            </Card>

            {/* Botão Salvar */}
            <div className="flex justify-end">
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
