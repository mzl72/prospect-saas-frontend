"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { containsXSS } from "@/lib/sanitization";
import { Coins, MapPin, Target, Calendar } from "lucide-react";

// Wizard state context
interface WizardContextType {
  currentStep: number;
  nomeCampanha: string;
  tipoNegocio: string;
  localizacao: string;
  quantidade: 4 | 20 | 40 | 100 | 200;
  nivelServico: "basico"; // Fixo em "basico" (apenas extração)
  setCurrentStep: (step: number) => void;
  setNomeCampanha: (value: string) => void;
  setTipoNegocio: (value: string) => void;
  setLocalizacao: (value: string) => void;
  setQuantidade: (qty: 4 | 20 | 40 | 100 | 200) => void;
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
  const [nomeCampanha, setNomeCampanha] = useState("");
  const [tipoNegocio, setTipoNegocio] = useState("");
  const [localizacao, setLocalizacao] = useState("");
  const [quantidade, setQuantidade] = useState<4 | 20 | 40 | 100 | 200>(20);
  const nivelServico = "basico" as const; // Fixo em "basico" (apenas extração)

  const resetWizard = () => {
    setCurrentStep(1);
    setNomeCampanha("");
    setTipoNegocio("");
    setLocalizacao("");
    setQuantidade(20);
  };

  const progress = (currentStep / 2) * 100; // 2 etapas: Configuração + Confirmação

  const wizardValue: WizardContextType = {
    currentStep,
    nomeCampanha,
    tipoNegocio,
    localizacao,
    quantidade,
    nivelServico,
    setCurrentStep,
    setNomeCampanha,
    setTipoNegocio,
    setLocalizacao,
    setQuantidade,
    resetWizard,
  };

  return (
    <WizardContext.Provider value={wizardValue}>
      <Card className="w-full border-none shadow-none">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center mb-2">
            <CardTitle className="text-lg">
              Etapa {currentStep} de 2
            </CardTitle>
            <CreditosDisplay />
          </div>
          <Progress value={progress} className="w-full h-1.5" />
        </CardHeader>

        <CardContent>
          {currentStep === 1 && <EtapaConfiguracao />}
          {currentStep === 2 && <EtapaConfirmacao />}
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

      if (!response.ok) {
        throw new Error("Failed to fetch credits");
      }

      const data = await response.json();

      if (data.success && typeof data.credits === "number" && isFinite(data.credits)) {
        return Math.max(0, Math.floor(data.credits));
      }

      return 0;
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 10000),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Coins className="w-4 h-4" />
        <span>...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
      <Coins className="w-4 h-4 text-green-600" />
      <span>{creditos.toLocaleString()} créditos</span>
    </div>
  );
}

function EtapaConfiguracao() {
  const {
    nomeCampanha,
    tipoNegocio,
    localizacao,
    quantidade,
    setNomeCampanha,
    setTipoNegocio,
    setLocalizacao,
    setQuantidade,
    setCurrentStep,
  } = useWizard();

  const [errors, setErrors] = useState({
    nomeCampanha: "",
    tipoNegocio: "",
    localizacao: "",
  });

  const validate = () => {
    const newErrors = { nomeCampanha: "", tipoNegocio: "", localizacao: "" };

    // Nome da campanha (opcional mas recomendado)
    if (nomeCampanha.trim() && nomeCampanha.length > 100) {
      newErrors.nomeCampanha = "Máximo 100 caracteres";
    } else if (nomeCampanha.trim() && containsXSS(nomeCampanha)) {
      newErrors.nomeCampanha = "Caracteres inválidos detectados";
    }

    // Tipo de negócio (obrigatório)
    if (!tipoNegocio.trim()) {
      newErrors.tipoNegocio = "Campo obrigatório";
    } else if (tipoNegocio.trim().length < 3) {
      newErrors.tipoNegocio = "Mínimo 3 caracteres";
    } else if (tipoNegocio.length > 500) {
      newErrors.tipoNegocio = "Máximo 500 caracteres";
    } else if (containsXSS(tipoNegocio)) {
      newErrors.tipoNegocio = "Caracteres inválidos detectados";
    }

    // Localização (obrigatório)
    if (!localizacao.trim()) {
      newErrors.localizacao = "Campo obrigatório";
    } else if (localizacao.trim().length < 3) {
      newErrors.localizacao = "Mínimo 3 caracteres";
    } else if (localizacao.length > 500) {
      newErrors.localizacao = "Máximo 500 caracteres";
    } else if (containsXSS(localizacao)) {
      newErrors.localizacao = "Caracteres inválidos detectados";
    }

    setErrors(newErrors);
    return !newErrors.nomeCampanha && !newErrors.tipoNegocio && !newErrors.localizacao;
  };

  const handleNext = () => {
    if (validate()) {
      setCurrentStep(2);
    }
  };

  return (
    <div className="space-y-6">
      {/* Nome da Campanha */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <Target className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Detalhes da Campanha</h3>
            <p className="text-xs text-muted-foreground">Informações básicas</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="nomeCampanha" className="text-sm font-medium">
              Nome da Campanha <span className="text-muted-foreground">(Opcional)</span>
            </Label>
            <Input
              id="nomeCampanha"
              type="text"
              placeholder="Ex: Restaurantes São Paulo - Pinheiros"
              className={`mt-1.5 ${errors.nomeCampanha ? "border-red-500" : ""}`}
              value={nomeCampanha}
              onChange={(e) => {
                setNomeCampanha(e.target.value);
                if (errors.nomeCampanha) setErrors({ ...errors, nomeCampanha: "" });
              }}
            />
            {errors.nomeCampanha ? (
              <p className="text-red-500 text-xs mt-1">{errors.nomeCampanha}</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                Se não informado, será gerado automaticamente
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Segmentação */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Segmentação</h3>
            <p className="text-xs text-muted-foreground">Defina seu público-alvo</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="tipoNegocio" className="text-sm font-medium">
              Tipo de Negócio <span className="text-red-500">*</span>
            </Label>
            <Input
              id="tipoNegocio"
              type="text"
              placeholder="Ex: restaurante, academia, dentista"
              className={`mt-1.5 ${errors.tipoNegocio ? "border-red-500" : ""}`}
              value={tipoNegocio}
              onChange={(e) => {
                setTipoNegocio(e.target.value);
                if (errors.tipoNegocio) setErrors({ ...errors, tipoNegocio: "" });
              }}
            />
            {errors.tipoNegocio && (
              <p className="text-red-500 text-xs mt-1">{errors.tipoNegocio}</p>
            )}
          </div>

          <div>
            <Label htmlFor="localizacao" className="text-sm font-medium">
              Localização <span className="text-red-500">*</span>
            </Label>
            <Input
              id="localizacao"
              type="text"
              placeholder="Ex: São Paulo, Pinheiros, Jundiaí"
              className={`mt-1.5 ${errors.localizacao ? "border-red-500" : ""}`}
              value={localizacao}
              onChange={(e) => {
                setLocalizacao(e.target.value);
                if (errors.localizacao) setErrors({ ...errors, localizacao: "" });
              }}
            />
            {errors.localizacao && (
              <p className="text-red-500 text-xs mt-1">{errors.localizacao}</p>
            )}
          </div>
        </div>
      </div>

      {/* Orçamento & Alcance */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Quantidade de Leads</h3>
            <p className="text-xs text-muted-foreground">
              Encontraremos de 0 até {quantidade} leads
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {[4, 20, 40, 100, 200].map((qty) => (
            <Button
              key={qty}
              type="button"
              variant={quantidade === qty ? "default" : "outline"}
              onClick={() => setQuantidade(qty as 4 | 20 | 40 | 100 | 200)}
              className={`min-w-[80px] ${
                quantidade === qty
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "hover:bg-blue-50 hover:border-blue-300"
              }`}
            >
              {qty} leads
            </Button>
          ))}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">Custo estimado</p>
              <p className="text-xs text-blue-700">
                Apenas extração de dados (Google Maps)
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">
                {calculateCampaignCost(quantidade, "BASICO")} créditos
              </p>
              <p className="text-xs text-blue-700">0.25 créditos por lead</p>
            </div>
          </div>
        </div>
      </div>

      <Button onClick={handleNext} className="w-full bg-blue-600 hover:bg-blue-700 h-11">
        Revisar e Confirmar →
      </Button>
    </div>
  );
}

function EtapaConfirmacao() {
  const {
    nomeCampanha,
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

      if (!response.ok) {
        throw new Error("Failed to fetch credits");
      }

      const data = await response.json();

      if (data.success && typeof data.credits === "number" && isFinite(data.credits)) {
        return Math.max(0, Math.floor(data.credits));
      }

      return 0;
    },
    retry: 2,
  });

  const custo = calculateCampaignCost(quantidade, "BASICO");
  const creditosSuficientes = creditos >= custo;

  const createCampaign = useMutation({
    mutationFn: async () => {
      const tiposArray = tipoNegocio.split(",").map((s) => s.trim()).filter(Boolean);
      const locaisArray = localizacao.split(",").map((s) => s.trim()).filter(Boolean);

      if (tiposArray.length > 10) {
        throw new Error("Máximo 10 tipos de negócio permitidos");
      }
      if (locaisArray.length > 10) {
        throw new Error("Máximo 10 localizações permitidas");
      }

      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: nomeCampanha.trim() || `${tipoNegocio} em ${localizacao}`,
          tipoNegocio: tiposArray,
          localizacao: locaisArray,
          quantidade,
          nivelServico,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Erro ao criar campanha");
      }

      return result;
    },
    retry: 1,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["credits"],
          refetchType: "all",
        }),
        queryClient.invalidateQueries({
          queryKey: ["campaigns"],
          refetchType: "all",
        }),
      ]);

      resetWizard();
      window.location.href = "/dashboard/campanhas";
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
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-6">
        <h3 className="text-xl font-semibold text-foreground mb-4">
          Resumo da Campanha
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-muted-foreground mb-1">Nome da Campanha</p>
            <p className="font-medium text-foreground">
              {nomeCampanha.trim() || `${tipoNegocio} em ${localizacao}`}
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-muted-foreground mb-1">Tipo de Negócio</p>
            <p className="font-medium text-foreground">{tipoNegocio}</p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-muted-foreground mb-1">Localização</p>
            <p className="font-medium text-foreground">{localizacao}</p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-muted-foreground mb-1">Quantidade</p>
            <p className="font-medium text-foreground">{quantidade} leads</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-blue-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-foreground">Custo Total:</span>
            <span className="text-2xl font-bold text-blue-600">{custo} créditos</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Saldo Atual:</span>
            <span className="font-medium text-foreground">{creditos} créditos</span>
          </div>
          <div className="flex justify-between items-center text-sm mt-1">
            <span className="text-muted-foreground">Saldo Após:</span>
            <span className={`font-medium ${creditosSuficientes ? "text-green-600" : "text-red-600"}`}>
              {creditos - custo} créditos
            </span>
          </div>
        </div>
      </div>

      {!creditosSuficientes && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <p className="text-red-700 text-sm font-medium">
            ⚠️ Créditos insuficientes. Você tem {creditos} créditos, mas precisa de {custo}.
          </p>
        </div>
      )}

      {createCampaign.isError && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <p className="text-red-700 text-sm">
            {createCampaign.error?.message || "Erro ao criar campanha"}
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setCurrentStep(1)} className="flex-1 h-11">
          ← Voltar
        </Button>
        <Button
          onClick={handleGerarCampanha}
          disabled={!creditosSuficientes || createCampaign.isPending}
          className="flex-1 bg-blue-600 hover:bg-blue-700 h-11"
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
              Você está prestes a criar uma campanha de extração de leads.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tipo de negócio:</span>
              <span className="font-medium text-foreground">{tipoNegocio}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Localização:</span>
              <span className="font-medium text-foreground">{localizacao}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Quantidade:</span>
              <span className="font-medium text-foreground">{quantidade} leads</span>
            </div>
            <div className="border-t border-border pt-3 mt-3">
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-foreground">Custo total:</span>
                <span className="text-blue-600">{custo} créditos</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Saldo após:</span>
                <span className="text-foreground">{creditos - custo} créditos</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmarGeracao} className="bg-blue-600 hover:bg-blue-700">
              Confirmar e Gerar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
