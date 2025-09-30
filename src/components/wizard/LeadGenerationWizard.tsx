"use client";

import { useWizardStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function LeadGenerationWizard() {
  const { currentStep } = useWizardStore();

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
  const { data: creditos = 0, isLoading } = useQuery({
    queryKey: ["credits"],
    queryFn: async () => {
      const response = await fetch("/api/users/credits");
      const data = await response.json();
      return data.success ? data.credits : 0;
    },
  });

  if (isLoading) {
    return <div className="text-sm text-gray-600">Créditos: ...</div>;
  }

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
  } = useWizardStore();

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
          value={tipoNegocio}
          onChange={(e) => setTipoNegocio(e.target.value)}
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
          value={localizacao}
          onChange={(e) => setLocalizacao(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Quantos leads?</label>
        <div className="flex gap-2">
          {[4, 20, 40, 100, 200].map((qty) => (
            <Button
              key={qty}
              variant={quantidade === qty ? "default" : "outline"}
              onClick={() => setQuantidade(qty as 4 | 20 | 40 | 100 | 200)}
            >
              {qty}
            </Button>
          ))}
        </div>
      </div>

      <Button
        onClick={() => setCurrentStep(2)}
        className="w-full"
        disabled={!tipoNegocio.trim() || !localizacao.trim()}
      >
        Continuar
      </Button>
    </div>
  );
}

function EtapaNivelServico() {
  const { quantidade, nivelServico, setNivelServico, setCurrentStep } =
    useWizardStore();

  const custoBasico = quantidade * 0.25;
  const custoCompleto = quantidade * 1;

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
  const {
    tipoNegocio,
    localizacao,
    quantidade,
    nivelServico,
    setCurrentStep,
    resetWizard,
  } = useWizardStore();

  const queryClient = useQueryClient();

  const { data: creditos = 0 } = useQuery({
    queryKey: ["credits"],
    queryFn: async () => {
      const response = await fetch("/api/users/credits");
      const data = await response.json();
      return data.success ? data.credits : 0;
    },
  });

  const custo = nivelServico === "basico" ? quantidade * 0.25 : quantidade * 1;
  const creditosSuficientes = creditos >= custo;

  const createCampaign = useMutation({
    mutationFn: async () => {
      const tiposArray = tipoNegocio.split(",").map((s) => s.trim()).filter(Boolean);
      const locaisArray = localizacao.split(",").map((s) => s.trim()).filter(Boolean);

      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: `${tipoNegocio} em ${localizacao}`,
          tipoNegocio: tiposArray,
          localizacao: locaisArray,
          quantidade,
          nivelServico,
        }),
      });

      const result = await response.json();
      if (!result.success)
        throw new Error(result.error || "Erro ao criar campanha");

      return result;
    },
    onSuccess: async () => {
      // Invalida cache para atualizar dados (força refetch imediato)
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["credits"],
          refetchType: "all" // Força refetch de todas as queries ativas
        }),
        queryClient.invalidateQueries({
          queryKey: ["campaigns"],
          refetchType: "all"
        }),
      ]);

      // Reset wizard
      resetWizard();

      // Aguarda um pouco para garantir atualização do cache
      setTimeout(() => {
        window.location.href = "/campanhas";
      }, 100);
    },
    onError: (error) => {
      console.error("Erro ao criar campanha:", error);
    },
  });

  const handleGerarCampanha = () => {
    if (!creditosSuficientes) return;
    createCampaign.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold">Confirme sua configuração</h3>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg space-y-3">
        <div>
          <span className="font-medium">Tipo de negócio:</span>
          <span className="ml-2">{tipoNegocio}</span>
        </div>
        <div>
          <span className="font-medium">Localização:</span>
          <span className="ml-2">{localizacao}</span>
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

      {createCampaign.isError && (
        <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
          <p className="text-red-700 text-sm">
            {createCampaign.error?.message || "Erro ao criar campanha"}
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
          disabled={!creditosSuficientes || createCampaign.isPending}
          className="flex-1"
        >
          {createCampaign.isPending ? "Criando..." : "Gerar Campanha"}
        </Button>
      </div>
    </div>
  );
}
