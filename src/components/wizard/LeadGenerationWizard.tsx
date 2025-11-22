"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { calculateCampaignCost } from "@/lib/pricing-service";
import { useState, createContext, useContext } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Wizard state context
interface WizardContextType {
  currentStep: number;
  tipoNegocio: string;
  localizacao: string;
  quantidade: 4 | 20 | 40 | 100 | 200;
  nivelServico: "basico" | "completo";
  setCurrentStep: (step: number) => void;
  setTipoNegocio: (value: string) => void;
  setLocalizacao: (value: string) => void;
  setQuantidade: (qty: 4 | 20 | 40 | 100 | 200) => void;
  setNivelServico: (nivel: "basico" | "completo") => void;
  resetWizard: () => void;
}

const WizardContext = createContext<WizardContextType | undefined>(undefined);

function useWizard() {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error("useWizard must be used within LeadGenerationWizard");
  }
  return context;
}

export function LeadGenerationWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [tipoNegocio, setTipoNegocio] = useState("");
  const [localizacao, setLocalizacao] = useState("");
  const [quantidade, setQuantidade] = useState<4 | 20 | 40 | 100 | 200>(20);
  const [nivelServico, setNivelServico] = useState<"basico" | "completo">("basico");

  const resetWizard = () => {
    setCurrentStep(1);
    setTipoNegocio("");
    setLocalizacao("");
    setQuantidade(20);
    setNivelServico("basico");
  };

  const progress = (currentStep / 3) * 100;

  const wizardValue: WizardContextType = {
    currentStep,
    tipoNegocio,
    localizacao,
    quantidade,
    nivelServico,
    setCurrentStep,
    setTipoNegocio,
    setLocalizacao,
    setQuantidade,
    setNivelServico,
    resetWizard,
  };

  return (
    <WizardContext.Provider value={wizardValue}>
      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="dark:text-white">Etapa {currentStep} de 3</CardTitle>
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
    </WizardContext.Provider>
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
    return <div className="text-sm text-gray-300">Créditos: ...</div>;
  }

  return <div className="text-sm text-gray-300">Créditos: {creditos}</div>;
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
  } = useWizard();

  const [errors, setErrors] = useState({ tipoNegocio: "", localizacao: "" });

  const validate = () => {
    const newErrors = { tipoNegocio: "", localizacao: "" };

    if (!tipoNegocio.trim()) {
      newErrors.tipoNegocio = "Campo obrigatório";
    } else if (tipoNegocio.trim().length < 3) {
      newErrors.tipoNegocio = "Mínimo 3 caracteres";
    }

    if (!localizacao.trim()) {
      newErrors.localizacao = "Campo obrigatório";
    } else if (localizacao.trim().length < 3) {
      newErrors.localizacao = "Mínimo 3 caracteres";
    }

    setErrors(newErrors);
    return !newErrors.tipoNegocio && !newErrors.localizacao;
  };

  const handleNext = () => {
    if (validate()) {
      setCurrentStep(2);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-100">
          Que tipo de empresa você quer encontrar?
        </label>
        <input
          type="text"
          placeholder="ex: restaurante, academia, dentista"
          className={`w-full p-3 border rounded-md bg-gray-800 text-gray-100 border-gray-600 placeholder:text-gray-500 ${
            errors.tipoNegocio ? "border-red-500" : ""
          }`}
          value={tipoNegocio}
          onChange={(e) => {
            setTipoNegocio(e.target.value);
            if (errors.tipoNegocio) setErrors({ ...errors, tipoNegocio: "" });
          }}
        />
        {errors.tipoNegocio && (
          <p className="text-red-500 text-sm mt-1">{errors.tipoNegocio}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-gray-100">
          Em qual região?
        </label>
        <input
          type="text"
          placeholder="ex: São Paulo, Pinheiros, Jundiaí"
          className={`w-full p-3 border rounded-md bg-gray-800 text-gray-100 border-gray-600 placeholder:text-gray-500 ${
            errors.localizacao ? "border-red-500" : ""
          }`}
          value={localizacao}
          onChange={(e) => {
            setLocalizacao(e.target.value);
            if (errors.localizacao) setErrors({ ...errors, localizacao: "" });
          }}
        />
        {errors.localizacao && (
          <p className="text-red-500 text-sm mt-1">{errors.localizacao}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-gray-100">Quantos leads?</label>
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
        onClick={handleNext}
        className="w-full"
      >
        Continuar
      </Button>
    </div>
  );
}

function EtapaNivelServico() {
  const { quantidade, nivelServico, setNivelServico, setCurrentStep } =
    useWizard();

  const custoBasico = calculateCampaignCost(quantidade, "BASICO");
  const custoCompleto = calculateCampaignCost(quantidade, "COMPLETO");

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-100">
          Encontraremos de 0 à {quantidade} leads. Escolha o nível de serviço:
        </h3>
      </div>

      <div className="grid gap-4">
        <div
          className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
            nivelServico === "basico"
              ? "border-blue-500 bg-blue-50"
              : "border-gray-700 hover:border-gray-300"
          }`}
          onClick={() => setNivelServico("basico")}
        >
          <div className="flex justify-between items-start mb-3">
            <h4 className="font-semibold text-lg text-gray-100">BÁSICO</h4>
            <span className="text-lg font-bold text-green-600">
              {custoBasico} créditos
            </span>
          </div>
          <ul className="space-y-1 text-sm text-gray-300">
            <li>✓ Lista com dados do Google Maps</li>
            <li>✓ Nome, telefone, endereço, avaliações</li>
            <li>✓ Planilha para download</li>
          </ul>
        </div>

        <div
          className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
            nivelServico === "completo"
              ? "border-blue-500 bg-blue-50"
              : "border-gray-700 hover:border-gray-300"
          }`}
          onClick={() => setNivelServico("completo")}
        >
          <div className="flex justify-between items-start mb-3">
            <h4 className="font-semibold text-lg text-gray-100">COMPLETO</h4>
            <span className="text-lg font-bold text-green-600">
              {custoCompleto} créditos
            </span>
          </div>
          <ul className="space-y-1 text-sm text-gray-300">
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
  } = useWizard();

  const queryClient = useQueryClient();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const { data: creditos = 0 } = useQuery({
    queryKey: ["credits"],
    queryFn: async () => {
      const response = await fetch("/api/users/credits");
      const data = await response.json();
      return data.success ? data.credits : 0;
    },
  });

  const custo = calculateCampaignCost(quantidade, nivelServico.toUpperCase() as 'BASICO' | 'COMPLETO');
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
      if (!result.success) {
        // Se houver campos faltando, passar o objeto completo
        if (result.missingFieldsByPage) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const error: any = new Error(result.error || "Erro ao criar campanha");
          error.missingFieldsByPage = result.missingFieldsByPage;
          throw error;
        }
        throw new Error(result.error || "Erro ao criar campanha");
      }

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
    setShowConfirmDialog(true);
  };

  const confirmarGeracao = () => {
    setShowConfirmDialog(false);
    createCampaign.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-gray-100">Confirme sua configuração</h3>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg space-y-3 border border-gray-700">
        <div>
          <span className="font-medium text-gray-100">Tipo de negócio:</span>
          <span className="ml-2 text-gray-300">{tipoNegocio}</span>
        </div>
        <div>
          <span className="font-medium text-gray-100">Localização:</span>
          <span className="ml-2 text-gray-300">{localizacao}</span>
        </div>
        <div>
          <span className="font-medium text-gray-100">Quantidade:</span>
          <span className="ml-2 text-gray-300">{quantidade} leads</span>
        </div>
        <div>
          <span className="font-medium text-gray-100">Nível:</span>
          <span className="ml-2 capitalize text-gray-300">{nivelServico}</span>
        </div>
        <div className="border-t border-gray-600 pt-3">
          <span className="font-medium text-gray-100">Custo total:</span>
          <span className="ml-2 text-lg font-bold text-green-600">
            {custo} créditos
          </span>
        </div>
        <div>
          <span className="font-medium text-gray-100">Saldo atual:</span>
          <span className="ml-2 text-gray-300">{creditos} créditos</span>
        </div>
        <div>
          <span className="font-medium text-gray-100">Saldo após:</span>
          <span className="ml-2 text-gray-300">{creditos - custo} créditos</span>
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

      {createCampaign.isError && (() => {
        // Acessar missingFieldsByPage diretamente do objeto de erro
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const missingFieldsByPage = (createCampaign.error as any)?.missingFieldsByPage;

        if (missingFieldsByPage && Object.keys(missingFieldsByPage).length > 0) {
          const pageNames: Record<string, string> = {
            "/configuracoes": "Configurações (Empresa)",
            "/emails": "E-mails (Templates)",
            "/emails#settings": "E-mails (Configurações)",
            "/whatsapp": "WhatsApp (Templates)",
            "/whatsapp#instances": "WhatsApp (Instâncias)",
            "/configuracoes#prompts": "Configurações (Prompts IA)"
          };

          return (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg space-y-4">
              <p className="text-red-700 font-semibold text-sm">
                Campos obrigatórios não preenchidos:
              </p>

              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {Object.entries(missingFieldsByPage).map(([page, fields]: [string, any]) => (
                <div key={page} className="bg-gray-800 p-3 rounded border border-red-200 space-y-2">
                  <p className="text-red-600 text-sm font-medium">
                    {pageNames[page] || page}:
                  </p>
                  <ul className="list-disc list-inside text-red-600 text-sm space-y-1">
                    {(fields as string[]).map((field, idx) => (
                      <li key={idx}>{field}</li>
                    ))}
                  </ul>
                  <a
                    href={page}
                    className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                  >
                    Ir para {pageNames[page] || "Configurações"} →
                  </a>
                </div>
              ))}
            </div>
          );
        }

        // Fallback para erros não estruturados
        return (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <p className="text-red-700 text-sm">
              {createCampaign.error?.message || "Erro ao criar campanha"}
            </p>
          </div>
        );
      })()}

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

      {/* Dialog de Confirmação */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar criação de campanha</DialogTitle>
            <DialogDescription>
              Você está prestes a criar uma campanha com as seguintes configurações:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Tipo de negócio:</span>
              <span className="font-medium">{tipoNegocio}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Localização:</span>
              <span className="font-medium">{localizacao}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Quantidade:</span>
              <span className="font-medium">{quantidade} leads</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Nível:</span>
              <span className="font-medium capitalize">{nivelServico}</span>
            </div>
            <div className="border-t border-gray-700 pt-3 mt-3">
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-white">Custo total:</span>
                <span className="text-blue-600">{custo} créditos</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-400">Saldo após:</span>
                <span className="text-white">{creditos - custo} créditos</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancelar
            </Button>
            <Button onClick={confirmarGeracao}>
              Confirmar e Gerar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
