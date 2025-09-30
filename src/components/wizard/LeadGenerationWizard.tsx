"use client";

import { useLeadStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";

export function LeadGenerationWizard() {
  const { currentStep } = useLeadStore();

  const progress = (currentStep / 3) * 100;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Etapa {currentStep} de 3</CardTitle>
          <CreditosDisplay />
        </div>
        <Progress value={progress} className="w-full" />
      </CardHeader>

      <CardContent>
        {currentStep === 1 && <EtapaConfiguracao />}
        {currentStep === 2 && <EtapaNivelServico />}
        {currentStep === 3 && <EtapaConfirmacao />}
      </CardContent>
    </Card>
  );
}

function CreditosDisplay() {
  const [creditos, setCreditos] = useState(0);

  useEffect(() => {
    const fetchCreditos = async () => {
      try {
        const response = await fetch("/api/users/credits");
        const data = await response.json();
        if (data.success) {
          setCreditos(data.credits);
        }
      } catch (error) {
        console.error("Erro ao buscar créditos:", error);
      }
    };
    fetchCreditos();
  }, []);

  return <div className="text-sm text-gray-600">Créditos: {creditos}</div>;
}

function EtapaConfiguracao() {
  const {
    tipoNegocio,
    localizacao,
    quantidade,
    setTipoNegocio,
    setLocalizacao,
    setQuantidade,
    setCurrentStep,
  } = useLeadStore();

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">
          Que tipo de empresa você quer encontrar?
        </label>
        <input
          type="text"
          placeholder="ex: restaurante, academia, dentista"
          className="w-full p-3 border rounded-md"
          onChange={(e) =>
            setTipoNegocio(e.target.value.split(",").map((s) => s.trim()))
          }
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Em qual região?
        </label>
        <input
          type="text"
          placeholder="ex: São Paulo, Pinheiros, Jundiaí"
          className="w-full p-3 border rounded-md"
          onChange={(e) =>
            setLocalizacao(e.target.value.split(",").map((s) => s.trim()))
          }
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Quantos leads?</label>
        <div className="flex gap-2">
          {[2, 10, 25, 50, 100, 250].map((qty) => (
            <Button
              key={qty}
              variant={quantidade === qty ? "default" : "outline"}
              onClick={() => setQuantidade(qty as 2 | 10 | 25 | 50 | 100 | 250)}
            >
              {qty}
            </Button>
          ))}
        </div>
      </div>

      <Button
        onClick={() => setCurrentStep(2)}
        className="w-full"
        disabled={tipoNegocio.length === 0 || localizacao.length === 0}
      >
        Continuar
      </Button>
    </div>
  );
}

function EtapaNivelServico() {
  const { quantidade, nivelServico, setNivelServico, setCurrentStep } =
    useLeadStore();

  const custoBasico = quantidade * 1;
  const custoCompleto = quantidade * 5;

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold">
          Encontraremos de 0 à {quantidade} leads. Escolha o nível de serviço:
        </h3>
      </div>

      <div className="grid gap-4">
        <div
          className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
            nivelServico === "basico"
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
          onClick={() => setNivelServico("basico")}
        >
          <div className="flex justify-between items-start mb-3">
            <h4 className="font-semibold text-lg">BÁSICO</h4>
            <span className="text-lg font-bold text-green-600">
              {custoBasico} créditos
            </span>
          </div>
          <ul className="space-y-1 text-sm text-gray-600">
            <li>✓ Lista com dados do Google Maps</li>
            <li>✓ Nome, telefone, endereço, avaliações</li>
            <li>✓ Planilha para download</li>
          </ul>
        </div>

        <div
          className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
            nivelServico === "completo"
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
          onClick={() => setNivelServico("completo")}
        >
          <div className="flex justify-between items-start mb-3">
            <h4 className="font-semibold text-lg">COMPLETO</h4>
            <span className="text-lg font-bold text-green-600">
              {custoCompleto} créditos
            </span>
          </div>
          <ul className="space-y-1 text-sm text-gray-600">
            <li>✓ Tudo do Básico</li>
            <li>✓ Pesquisa detalhada da empresa</li>
            <li>✓ E-mails personalizados prontos</li>
            <li>✓ Análise estratégica</li>
          </ul>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(1)}
          className="flex-1"
        >
          Voltar
        </Button>
        <Button onClick={() => setCurrentStep(3)} className="flex-1">
          Continuar
        </Button>
      </div>
    </div>
  );
}

function EtapaConfirmacao() {
  const { tipoNegocio, localizacao, quantidade, nivelServico, setCurrentStep } =
    useLeadStore();

  const [creditos, setCreditos] = useState(0);
  const [loading, setLoading] = useState(false);

  const custo = nivelServico === "basico" ? quantidade * 1 : quantidade * 5;
  const creditosSuficientes = creditos >= custo;

  useEffect(() => {
    const fetchCreditos = async () => {
      try {
        const response = await fetch("/api/users/credits");
        const data = await response.json();
        if (data.success) {
          setCreditos(data.credits);
        }
      } catch (error) {
        console.error("Erro ao buscar créditos:", error);
      }
    };
    fetchCreditos();
  }, []);

  const handleGerarCampanha = async () => {
    if (!creditosSuficientes) return;

    setLoading(true);
    try {
      // 1. Criar campanha no banco + chamar N8N
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: `${tipoNegocio.join(", ")} em ${localizacao.join(", ")}`,
          tipoNegocio,
          localizacao,
          quantidade,
          nivelServico,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // 2. Debitar créditos do banco
        const debitResponse = await fetch("/api/users/credits", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: custo }),
        });

        if (debitResponse.ok) {
          // 3. Redirecionar para campanhas
          window.location.href = "/campanhas";
        } else {
          alert("Erro ao debitar créditos");
        }
      } else {
        alert("Erro ao criar campanha");
      }
    } catch (error) {
      alert("Erro de conexão. Verifique sua internet.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold">Confirme sua configuração</h3>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg space-y-3">
        <div>
          <span className="font-medium">Tipo de negócio:</span>
          <span className="ml-2">{tipoNegocio.join(", ")}</span>
        </div>
        <div>
          <span className="font-medium">Localização:</span>
          <span className="ml-2">{localizacao.join(", ")}</span>
        </div>
        <div>
          <span className="font-medium">Quantidade:</span>
          <span className="ml-2">{quantidade} leads</span>
        </div>
        <div>
          <span className="font-medium">Nível:</span>
          <span className="ml-2 capitalize">{nivelServico}</span>
        </div>
        <div className="border-t pt-3">
          <span className="font-medium">Custo total:</span>
          <span className="ml-2 text-lg font-bold text-green-600">
            {custo} créditos
          </span>
        </div>
        <div>
          <span className="font-medium">Saldo atual:</span>
          <span className="ml-2">{creditos} créditos</span>
        </div>
        <div>
          <span className="font-medium">Saldo após:</span>
          <span className="ml-2">{creditos - custo} créditos</span>
        </div>
      </div>

      {!creditosSuficientes && (
        <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
          <p className="text-red-700 text-sm">
            Créditos insuficientes. Você tem {creditos} créditos, mas precisa de{" "}
            {custo}.
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(2)}
          className="flex-1"
        >
          Voltar
        </Button>
        <Button
          onClick={handleGerarCampanha}
          disabled={!creditosSuficientes || loading}
          className="flex-1"
        >
          {loading ? "Criando..." : "Gerar Campanha"}
        </Button>
      </div>
    </div>
  );
}
