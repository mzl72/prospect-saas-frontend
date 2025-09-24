"use client";

import { useLeadStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export function LeadGenerationWizard() {
  const { currentStep, creditos } = useLeadStore();

  const progress = (currentStep / 3) * 100;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Etapa {currentStep} de 3</CardTitle>
          <div className="text-sm text-gray-600">Créditos: {creditos}</div>
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
          {[2, 10, 25, 50, 100, 250, 500].map((qty) => (
            <Button
              key={qty}
              variant={quantidade === qty ? "default" : "outline"}
              onClick={() =>
                setQuantidade(qty as 10 | 25 | 50 | 100 | 250 | 500)
              }
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
          Encontraremos ~{quantidade} leads. Escolha o nível de serviço:
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
  const {
    tipoNegocio,
    localizacao,
    quantidade,
    nivelServico,
    creditos,
    setCurrentStep,
    debitarCreditos,
  } = useLeadStore();

  const custo = nivelServico === "basico" ? quantidade * 1 : quantidade * 5;
  const creditosSuficientes = creditos >= custo;

  const handleGerarCampanha = async () => {
    if (!creditosSuficientes) return;

    try {
      const response = await fetch("/api/gerar-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipoNegocio,
          localizacao,
          quantidade,
          nivelServico,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Usar dados da resposta do N8N
        const campanhaData = {
          id: result.campaignId || Date.now(),
          titulo: `${tipoNegocio.join(", ")} em ${localizacao.join(", ")}`,
          status: "processando", // Sempre processando inicialmente
          quantidade: quantidade,
          tipo: nivelServico,
          criadoEm: new Date().toLocaleString("pt-BR"),
          planilhaUrl: null, // Será preenchido depois via update
        };

        localStorage.setItem("ultimaCampanha", JSON.stringify(campanhaData));
        debitarCreditos(custo);
        window.location.href = "/campanhas";
      }
    } catch (error) {
      alert("Erro de conexão. Verifique sua internet.");
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
          disabled={!creditosSuficientes}
          className="flex-1"
        >
          Gerar Campanha
        </Button>
      </div>
    </div>
  );
}
