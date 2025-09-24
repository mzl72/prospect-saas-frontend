"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, Download } from "lucide-react";
import { useEffect, useState } from "react";

// ← BLOCO 1: DEFINIÇÃO DE TIPOS
// Interface = contrato que define a estrutura dos dados
// TypeScript usa isso para verificar erros em tempo de desenvolvimento
interface Campanha {
  id: number; // Número único da campanha
  titulo: string; // "Restaurantes em São Paulo"
  status: "processando" | "concluido"; // Union types - só aceita esses valores
  quantidade: number; // 25, 50, 100, etc.
  tipo: string; // "basico" ou "completo"
  criadoEm: string; // Data formatada como string
  tempoEstimado?: string; // ? = opcional, pode não existir
  planilhaUrl?: string; // ? = opcional, vem do N8N
  planilhaTitulo?: string; // ? = opcional, título da planilha
}

// Adicionar antes do componente CampanhasPage
function calcularTempoEstimado(quantidade: number, tipo: string): string {
  let segundosPorLead: number;

  if (tipo === "basico") {
    segundosPorLead = 15; // Tempo real medido
  } else {
    // Você pode me informar quanto tempo adicional para "completo"?
    segundosPorLead = 45; // Estimativa: 15s + 30s de IA
  }

  const totalSegundos = quantidade * segundosPorLead;
  const minutos = Math.ceil(totalSegundos / 60);

  if (minutos < 1) return "menos de 1 min";
  if (minutos === 1) return "1 min";
  if (minutos <= 3) return `${minutos - 1}-${minutos} min`;
  return `${Math.floor(minutos * 0.9)}-${minutos} min`;
}

export default function CampanhasPage() {
  // ← BLOCO 2: ESTADO TIPADO
  // useState<Campanha[]> informa ao TypeScript que campanhas é um array de Campanha
  // Isso habilita autocomplete e detecta erros de propriedades inexistentes
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);

  // ← BLOCO 3: EFEITO DE CARREGAMENTO
  useEffect(() => {
    // localStorage.getItem retorna string | null
    const ultimaCampanha = localStorage.getItem("ultimaCampanha");

    if (ultimaCampanha) {
      // Verificação de null safety
      try {
        // JSON.parse pode falhar se a string estiver malformada
        const campanha: Campanha = JSON.parse(ultimaCampanha);

        // setCampanhas espera Campanha[], então colocamos em array
        setCampanhas([campanha]);
      } catch (error) {
        // Tratamento de erro: não quebra a aplicação se o JSON estiver inválido
        console.error("Erro ao ler campanha do localStorage:", error);
      }
    }
  }, []); // Dependency array vazio = executa apenas no mount do componente

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* ← BLOCO 4: CABEÇALHO ESTÁTICO */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Minhas Campanhas</h1>
          <p className="text-gray-600 mt-2">
            Acompanhe o status das suas campanhas
          </p>
        </div>

        {/* ← BLOCO 5: RENDERIZAÇÃO DE LISTA */}
        <div className="space-y-4">
          {/* Array.map() transforma cada elemento do array em JSX */}
          {/* TypeScript sabe que 'campanha' é do tipo Campanha */}
          {campanhas.map((campanha) => (
            <Card key={campanha.id}>
              {" "}
              {/* key otimiza re-renderização do React */}
              {/* ← SUB-BLOCO 5A: CABEÇALHO DO CARD */}
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    {/* TypeScript garante que campanha.titulo existe */}
                    <CardTitle className="text-lg">{campanha.titulo}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {campanha.quantidade} leads • {campanha.tipo} •{" "}
                      {campanha.criadoEm}
                    </p>
                  </div>

                  {/* ← SUB-BLOCO 5B: BADGES CONDICIONAIS */}
                  {/* Renderização condicional: && = "se true, renderiza" */}
                  {campanha.status === "processando" && (
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      <Clock className="w-3 h-3" />
                      Processando
                    </Badge>
                  )}

                  {campanha.status === "concluido" && (
                    <Badge
                      variant="default"
                      className="flex items-center gap-1"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Concluído
                    </Badge>
                  )}
                </div>
              </CardHeader>
              {/* ← SUB-BLOCO 5C: CONTEÚDO DINÂMICO */}
              <CardContent>
                {/* Estado "processando": mostra loading visual */}
                {campanha.status === "processando" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span>Iniciando extração de dados...</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                      <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                      <span>Aguardando processamento</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Tempo estimado:{" "}
                      {calcularTempoEstimado(
                        campanha.quantidade,
                        campanha.tipo
                      )}
                    </p>
                  </div>
                )}

                {/* Estado "concluído": mostra botão de download */}
                {campanha.status === "concluido" && (
                  <Button
                    className="flex items-center gap-2"
                    onClick={() => {
                      // Verificação de null safety antes de abrir URL
                      if (campanha.planilhaUrl) {
                        // window.open abre em nova aba
                        window.open(campanha.planilhaUrl, "_blank");
                      } else {
                        alert("Link da planilha não disponível");
                      }
                    }}
                  >
                    <Download className="w-4 h-4" />
                    Abrir Planilha
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}

          {/* ← BLOCO 6: ESTADO VAZIO */}
          {/* Se campanhas.length === 0, mostra mensagem */}
          {campanhas.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">Nenhuma campanha encontrada</p>
                <p className="text-sm text-gray-400 mt-1">
                  Gere sua primeira campanha para ver o histórico aqui
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ← BLOCO 7: AÇÃO SECUNDÁRIA */}
        <div className="mt-8">
          <Button
            onClick={() => (window.location.href = "/gerar")}
            variant="outline"
          >
            Nova Campanha
          </Button>
        </div>
      </div>
    </div>
  );
}
