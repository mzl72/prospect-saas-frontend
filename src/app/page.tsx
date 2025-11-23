import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layout } from "@/components/layout/Layout";
import Link from "next/link";
import {
  Target,
  Zap,
  BarChart3,
  CheckCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function HomePage() {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 text-white overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-blue-900/50" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 rounded-full px-4 py-2 mb-8">
              <Sparkles className="w-4 h-4 text-blue-200" />
              <span className="text-sm font-medium text-blue-100">
                IA Avançada • Resultados Reais
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">
              Prospecção B2B com
              <br />
              <span className="bg-gradient-to-r from-blue-200 via-cyan-200 to-blue-300 bg-clip-text text-transparent">
                IA + Envio Automatizado
              </span>
            </h1>
            <p className="text-xl md:text-2xl mb-10 text-blue-50 max-w-3xl mx-auto leading-relaxed">
              Extraia leads do Google Maps, enriqueça com IA e envie campanhas
              personalizadas por Email e WhatsApp automaticamente
            </p>
            <div className="flex justify-center">
              <Button
                asChild
                size="lg"
                className="bg-white text-blue-600 hover:bg-blue-50 shadow-xl hover:shadow-2xl transition-all duration-300 text-lg px-8 py-6 group"
              >
                <Link href="/login" className="flex items-center gap-2">
                  Começar Agora
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white mb-1">
                  5min
                </div>
                <div className="text-sm text-blue-200">Tempo médio</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white mb-1">
                  98%
                </div>
                <div className="text-sm text-blue-200">Taxa de precisão</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white mb-1">
                  24/7
                </div>
                <div className="text-sm text-blue-200">Disponibilidade</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-block bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              SIMPLES E RÁPIDO
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
              Como Funciona
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Da extração ao envio automatizado em 3 etapas simples
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2 hover:border-blue-500 hover:shadow-2xl transition-all duration-300 group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-4xl font-bold text-blue-600">
                    01
                  </span>
                  <CardTitle className="text-xl">
                    Configure sua Busca
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 leading-relaxed">
                  Escolha nicho, localização e quantidade. Extraímos dados completos do
                  Google Maps: nome, telefone, website, endereço e redes sociais.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-blue-500 hover:shadow-2xl transition-all duration-300 group relative overflow-hidden md:mt-8">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-indigo-500" />
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-4xl font-bold text-cyan-600">
                    02
                  </span>
                  <CardTitle className="text-xl">
                    IA Personaliza Mensagens
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 leading-relaxed">
                  Nossa IA pesquisa cada empresa, analisa o negócio e gera emails
                  e mensagens de WhatsApp 100% personalizadas para cada lead.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-blue-500 hover:shadow-2xl transition-all duration-300 group relative overflow-hidden md:mt-16">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-8 h-8 text-white" />
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-4xl font-bold text-indigo-600">
                    03
                  </span>
                  <CardTitle className="text-xl">
                    Envio Automatizado
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 leading-relaxed">
                  Configure cadências inteligentes e envie campanhas por Email,
                  WhatsApp ou híbrido. Acompanhe respostas, aberturas e conversões em tempo real.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-block bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              PREÇOS TRANSPARENTES
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
              Preços Simples
            </h2>
            <p className="text-xl text-gray-300">
              Pague apenas pelos leads que usar. Sem mensalidades, sem taxas
              escondidas.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <Card className="hover:shadow-2xl transition-all duration-300 relative border-2">
              <CardHeader className="pb-8">
                <CardTitle className="text-3xl mb-2">
                  Básico
                </CardTitle>
                <p className="text-gray-300 text-lg">
                  Extração de dados do Google Maps
                </p>
              </CardHeader>
              <CardContent>
                <div className="mb-8">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-extrabold text-white">
                      0,25
                    </span>
                    <span className="text-gray-400">
                      créditos por lead
                    </span>
                  </div>
                </div>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-gray-300">
                      Extração completa do Google Maps
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-gray-300">
                      Dados: nome, telefone, website, endereço
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-gray-300">
                      Redes sociais e avaliações
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-gray-300">
                      Exportação em planilha
                    </span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-blue-500 border-3 shadow-xl hover:shadow-2xl transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-gradient-to-br from-blue-500 to-indigo-600 text-white px-4 py-1 text-sm font-bold">
                RECOMENDADO
              </div>
              <CardHeader className="pb-8 pt-10">
                <CardTitle className="text-3xl mb-2 text-blue-600">
                  Completo
                </CardTitle>
                <p className="text-gray-300 text-lg">
                  Tudo do básico + IA personalizada
                </p>
              </CardHeader>
              <CardContent>
                <div className="mb-8">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      1
                    </span>
                    <span className="text-gray-400">
                      crédito por lead
                    </span>
                  </div>
                </div>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-gray-300 font-medium">
                      Tudo do plano Básico
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-gray-300 font-medium">
                      Pesquisa e análise com IA
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-gray-300 font-medium">
                      Emails e WhatsApp personalizados
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-gray-300 font-medium">
                      Envio automatizado com cadências
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-gray-300 font-medium">
                      Dashboard CRM e métricas em tempo real
                    </span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 text-white py-24 overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6">
            <Sparkles className="w-4 h-4 text-blue-200" />
            <span className="text-sm font-medium">Comece Gratuitamente</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold mb-6">
            Pronto para Começar?
          </h2>
          <p className="text-xl mb-10 text-blue-50 max-w-2xl mx-auto">
            Gere sua primeira lista de leads em menos de 5 minutos. Sem cartão
            de crédito necessário.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-white text-blue-600 hover:bg-blue-50 shadow-2xl hover:shadow-3xl transition-all duration-300 text-lg px-10 py-7 group"
          >
            <Link href="/dashboard/campanhas" className="flex items-center gap-2">
              Começar Agora
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
      </section>
    </Layout>
  );
}
