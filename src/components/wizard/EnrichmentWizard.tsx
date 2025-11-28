"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { calculateCampaignCost } from "@/lib/pricing-service";
import { useState, createContext, useContext } from "react";
import { sanitizeInput, containsXSS } from "@/lib/sanitization";
import { Coins, MapPin, Target, Calendar, Mail, MessageCircle, Sparkles, Check, Shield } from "lucide-react";
import { useTemplates } from "@/hooks/useTemplates";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Wizard state context
interface WizardContextType {
  currentStep: number;
  nomeCampanha: string;
  tipoNegocio: string;
  localizacao: string;
  quantidade: 4 | 20 | 40 | 100 | 200;
  nivelServico: "completo";
  templateEmailId: string | null;
  templateWhatsappId: string | null;
  templatePromptId: string | null;
  setCurrentStep: (step: number) => void;
  setNomeCampanha: (value: string) => void;
  setTipoNegocio: (value: string) => void;
  setLocalizacao: (value: string) => void;
  setQuantidade: (qty: 4 | 20 | 40 | 100 | 200) => void;
  setTemplateEmailId: (id: string | null) => void;
  setTemplateWhatsappId: (id: string | null) => void;
  setTemplatePromptId: (id: string | null) => void;
  resetWizard: () => void;
}

const WizardContext = createContext<WizardContextType | undefined>(undefined);

function useWizard() {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error("useWizard must be used within EnrichmentWizard");
  }
  return context;
}

export function EnrichmentWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [nomeCampanha, setNomeCampanha] = useState("");
  const [tipoNegocio, setTipoNegocio] = useState("");
  const [localizacao, setLocalizacao] = useState("");
  const [quantidade, setQuantidade] = useState<4 | 20 | 40 | 100 | 200>(20);
  const [templateEmailId, setTemplateEmailId] = useState<string | null>(null);
  const [templateWhatsappId, setTemplateWhatsappId] = useState<string | null>(null);
  const [templatePromptId, setTemplatePromptId] = useState<string | null>(null);
  const nivelServico = "completo" as const;

  const resetWizard = () => {
    setCurrentStep(1);
    setNomeCampanha("");
    setTipoNegocio("");
    setLocalizacao("");
    setQuantidade(20);
    setTemplateEmailId(null);
    setTemplateWhatsappId(null);
    setTemplatePromptId(null);
  };

  const progress = (currentStep / 3) * 100; // 3 etapas: Configuração + Templates + Confirmação

  const wizardValue: WizardContextType = {
    currentStep,
    nomeCampanha,
    tipoNegocio,
    localizacao,
    quantidade,
    nivelServico,
    templateEmailId,
    templateWhatsappId,
    templatePromptId,
    setCurrentStep,
    setNomeCampanha,
    setTipoNegocio,
    setLocalizacao,
    setQuantidade,
    setTemplateEmailId,
    setTemplateWhatsappId,
    setTemplatePromptId,
    resetWizard,
  };

  return (
    <WizardContext.Provider value={wizardValue}>
      <Card className="w-full border-none shadow-none">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center mb-2">
            <CardTitle className="text-lg">
              Etapa {currentStep} de 3
            </CardTitle>
            <CreditosDisplay />
          </div>
          <Progress value={progress} className="w-full h-1.5" />
        </CardHeader>

        <CardContent>
          {currentStep === 1 && <EtapaConfiguracao />}
          {currentStep === 2 && <EtapaTemplates />}
          {currentStep === 3 && <EtapaConfirmacao />}
        </CardContent>
      </Card>
    </WizardContext.Provider>
  );
}

// Componente: Display de créditos
function CreditosDisplay() {
  const { data: creditsData } = useQuery({
    queryKey: ["user-credits"],
    queryFn: async () => {
      const response = await fetch("/api/users/credits");
      if (!response.ok) throw new Error("Failed to fetch credits");
      return response.json() as Promise<{ success: boolean; credits: number }>;
    },
  });

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full">
      <Coins className="w-4 h-4 text-blue-600" />
      <span className="text-sm font-medium text-blue-900">
        {creditsData?.credits ?? 0} créditos
      </span>
    </div>
  );
}

// ETAPA 1: Configuração
function EtapaConfiguracao() {
  const {
    nomeCampanha,
    tipoNegocio,
    localizacao,
    quantidade,
    setCurrentStep,
    setNomeCampanha,
    setTipoNegocio,
    setLocalizacao,
    setQuantidade,
  } = useWizard();

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleContinuar = () => {
    const newErrors: Record<string, string> = {};

    // Validação de campos obrigatórios
    if (!tipoNegocio.trim()) {
      newErrors.tipoNegocio = "Tipo de negócio é obrigatório";
    } else if (containsXSS(tipoNegocio)) {
      newErrors.tipoNegocio = "Tipo de negócio contém caracteres inválidos";
    }

    if (!localizacao.trim()) {
      newErrors.localizacao = "Localização é obrigatória";
    } else if (containsXSS(localizacao)) {
      newErrors.localizacao = "Localização contém caracteres inválidos";
    }

    // Validação do nome da campanha (opcional, mas se fornecido deve ser válido)
    if (nomeCampanha.trim() && containsXSS(nomeCampanha)) {
      newErrors.nomeCampanha = "Nome da campanha contém caracteres inválidos";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setCurrentStep(2);
  };

  const custo = calculateCampaignCost(quantidade, "COMPLETO");

  return (
    <div className="space-y-6">
      {/* Card 1: Detalhes da Campanha */}
      <Card className="bg-gradient-to-br from-blue-50 to-blue-50 border-blue-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Target className="w-4 h-4 text-blue-600" />
            </div>
            <CardTitle className="text-base">Detalhes da Campanha</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="nomeCampanha" className="text-sm font-medium">
              Nome da Campanha (opcional)
            </Label>
            <Input
              id="nomeCampanha"
              value={nomeCampanha}
              onChange={(e) => {
                const sanitized = sanitizeInput(e.target.value);
                setNomeCampanha(sanitized);
                if (errors.nomeCampanha) {
                  setErrors({ ...errors, nomeCampanha: "" });
                }
              }}
              placeholder="Ex: Restaurantes de SP - Análise Completa"
              className={`mt-1.5 ${errors.nomeCampanha ? "border-red-500" : ""}`}
            />
            {errors.nomeCampanha && (
              <p className="text-xs text-red-600 mt-1">{errors.nomeCampanha}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Se não informado, será gerado automaticamente
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Segmentação */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-blue-600" />
            </div>
            <CardTitle className="text-base">Segmentação</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tipoNegocio" className="text-sm font-medium">
                Tipo de Negócio <span className="text-red-500">*</span>
              </Label>
              <Input
                id="tipoNegocio"
                value={tipoNegocio}
                onChange={(e) => {
                  setTipoNegocio(e.target.value);
                  if (errors.tipoNegocio) {
                    setErrors({ ...errors, tipoNegocio: "" });
                  }
                }}
                placeholder="Ex: restaurante, academia, clínica"
                className={`mt-1.5 ${errors.tipoNegocio ? "border-red-500" : ""}`}
              />
              {errors.tipoNegocio && (
                <p className="text-xs text-red-600 mt-1">{errors.tipoNegocio}</p>
              )}
            </div>

            <div>
              <Label htmlFor="localizacao" className="text-sm font-medium">
                Localização <span className="text-red-500">*</span>
              </Label>
              <Input
                id="localizacao"
                value={localizacao}
                onChange={(e) => {
                  const sanitized = sanitizeInput(e.target.value);
                  setLocalizacao(sanitized);
                  if (errors.localizacao) {
                    setErrors({ ...errors, localizacao: "" });
                  }
                }}
                placeholder="Ex: São Paulo, Pinheiros"
                className={`mt-1.5 ${errors.localizacao ? "border-red-500" : ""}`}
              />
              {errors.localizacao && (
                <p className="text-xs text-red-600 mt-1">{errors.localizacao}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Quantidade */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-green-600" />
            </div>
            <CardTitle className="text-base">Quantidade de Leads</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {([4, 20, 40, 100, 200] as const).map((qty) => (
              <button
                key={qty}
                type="button"
                onClick={() => setQuantidade(qty)}
                className={cn(
                  "p-3 rounded-lg border-2 transition-all text-center",
                  quantidade === qty
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                )}
              >
                <p className="font-semibold text-lg">{qty}</p>
                <p className="text-xs text-muted-foreground">leads</p>
              </button>
            ))}
          </div>

          {/* Custo estimado */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">Custo Estimado</p>
                <p className="text-xs text-blue-700 mt-0.5">
                  {quantidade} leads × 1.0 crédito/lead
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">{custo}</p>
                <p className="text-xs text-blue-700">créditos</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botão Continuar */}
      <Button
        onClick={handleContinuar}
        size="lg"
        className="w-full bg-blue-600 hover:bg-blue-700 h-11"
      >
        Selecionar Templates →
      </Button>
    </div>
  );
}

// ETAPA 2: Seleção de Templates
function EtapaTemplates() {
  const {
    templateEmailId,
    templateWhatsappId,
    templatePromptId,
    setTemplateEmailId,
    setTemplateWhatsappId,
    setTemplatePromptId,
    setCurrentStep,
  } = useWizard();

  const allTemplatesSelected =
    templateEmailId && templateWhatsappId && templatePromptId;

  return (
    <div className="space-y-6">
      <TemplateSelector
        type="PROMPT_IA"
        title="Prompt de IA"
        description="Selecione o prompt para análise e enriquecimento dos leads"
        icon={<Sparkles className="w-4 h-4" />}
        colorClass="bg-yellow-100 text-yellow-600"
        selected={templatePromptId}
        onSelect={setTemplatePromptId}
      />

      <TemplateSelector
        type="EMAIL"
        title="Template de Email"
        description="Selecione o template para mensagens de email"
        icon={<Mail className="w-4 h-4" />}
        colorClass="bg-blue-100 text-blue-600"
        selected={templateEmailId}
        onSelect={setTemplateEmailId}
      />

      <TemplateSelector
        type="WHATSAPP"
        title="Template de WhatsApp"
        description="Selecione o template para mensagens de WhatsApp"
        icon={<MessageCircle className="w-4 h-4" />}
        colorClass="bg-green-100 text-green-600"
        selected={templateWhatsappId}
        onSelect={setTemplateWhatsappId}
      />

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setCurrentStep(1)}
          className="flex-1"
        >
          ← Voltar
        </Button>
        <Button
          type="button"
          onClick={() => setCurrentStep(3)}
          disabled={!allTemplatesSelected}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
        >
          Revisar e Confirmar →
        </Button>
      </div>
    </div>
  );
}

// Componente: Template Selector
interface TemplateSelectorProps {
  type: "EMAIL" | "WHATSAPP" | "PROMPT_IA";
  title: string;
  description: string;
  icon: React.ReactNode;
  colorClass: string;
  selected: string | null;
  onSelect: (id: string | null) => void;
}

function TemplateSelector({
  type,
  title,
  description,
  icon,
  colorClass,
  selected,
  onSelect,
}: TemplateSelectorProps) {
  const { data: templates, isLoading } = useTemplates(type);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          Carregando templates...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", colorClass)}>
            {icon}
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {templates && templates.length > 0 ? (
          <div className="space-y-2">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => onSelect(template.id)}
                className={cn(
                  "w-full p-3 rounded-lg border-2 text-left transition-all",
                  selected === template.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{template.name}</p>
                    {template.isDefault && (
                      <Badge variant="outline" className="text-xs mt-1">
                        <Shield className="w-3 h-3 mr-1" />
                        Padrão do Sistema
                      </Badge>
                    )}
                  </div>
                  {selected === template.id && (
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 ml-2" />
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 bg-gray-50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-3">
              Nenhum template {type === "EMAIL" ? "de email" : type === "WHATSAPP" ? "de WhatsApp" : "de IA"} encontrado
            </p>
            <Button variant="outline" size="sm" asChild>
              <a href="/dashboard/templates" target="_blank">
                Criar Template →
              </a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ETAPA 3: Confirmação
function EtapaConfirmacao() {
  const {
    nomeCampanha,
    tipoNegocio,
    localizacao,
    quantidade,
    templateEmailId,
    templateWhatsappId,
    templatePromptId,
    setCurrentStep,
    resetWizard,
  } = useWizard();

  const queryClient = useQueryClient();

  const { data: creditsData } = useQuery({
    queryKey: ["user-credits"],
    queryFn: async () => {
      const response = await fetch("/api/users/credits");
      if (!response.ok) throw new Error("Failed to fetch credits");
      return response.json() as Promise<{ success: boolean; credits: number }>;
    },
  });

  const custo = calculateCampaignCost(quantidade, "COMPLETO");
  const creditosSuficientes = (creditsData?.credits ?? 0) >= custo;

  const createCampaign = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: nomeCampanha || undefined,
          tipoNegocio: [tipoNegocio],
          localizacao: [localizacao],
          quantidade,
          nivelServico: "completo",
          templateEmailId,
          templateWhatsappId,
          templatePromptId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar campanha");
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["user-credits"] });
      toast.success("Campanha criada com sucesso!");
      resetWizard();
      window.location.href = "/dashboard/campanhas";
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao criar campanha");
    },
  });

  const handleCreate = () => {
    if (!creditosSuficientes) {
      toast.error("Créditos insuficientes");
      return;
    }
    createCampaign.mutate();
  };

  // Buscar nomes dos templates
  const { data: emailTemplates } = useTemplates("EMAIL");
  const { data: whatsappTemplates } = useTemplates("WHATSAPP");
  const { data: promptTemplates } = useTemplates("PROMPT_IA");

  const emailTemplateName = emailTemplates?.find((t) => t.id === templateEmailId)?.name;
  const whatsappTemplateName = whatsappTemplates?.find((t) => t.id === templateWhatsappId)?.name;
  const promptTemplateName = promptTemplates?.find((t) => t.id === templatePromptId)?.name;

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-blue-50 to-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-xl">Resumo da Campanha</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Grid 2x2 - Dados */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoCard label="Nome" value={nomeCampanha || `${tipoNegocio} em ${localizacao}`} />
            <InfoCard label="Tipo de Negócio" value={tipoNegocio} />
            <InfoCard label="Localização" value={localizacao} />
            <InfoCard label="Quantidade" value={`${quantidade} leads`} />
          </div>

          {/* Templates Selecionados */}
          <div className="pt-4 border-t border-blue-200">
            <h4 className="font-semibold text-sm mb-3">Templates Selecionados</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <TemplateChip
                icon={<Sparkles className="w-4 h-4" />}
                label="Prompt IA"
                templateName={promptTemplateName || "Carregando..."}
              />
              <TemplateChip
                icon={<Mail className="w-4 h-4" />}
                label="Email"
                templateName={emailTemplateName || "Carregando..."}
              />
              <TemplateChip
                icon={<MessageCircle className="w-4 h-4" />}
                label="WhatsApp"
                templateName={whatsappTemplateName || "Carregando..."}
              />
            </div>
          </div>

          {/* Custo */}
          <div className="mt-4 pt-4 border-t border-blue-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Custo Total:</span>
              <span className="text-2xl font-bold text-blue-600">{custo} créditos</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {quantidade} leads × 1.0 crédito/lead (enriquecimento com IA)
            </p>

            {/* Saldo */}
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Saldo atual:</span>
              <span className="font-medium">{creditsData?.credits ?? 0} créditos</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Saldo após:</span>
              <span className={cn("font-medium", creditosSuficientes ? "text-green-600" : "text-red-600")}>
                {(creditsData?.credits ?? 0) - custo} créditos
              </span>
            </div>
          </div>

          {!creditosSuficientes && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">
                ⚠️ Créditos insuficientes. Você precisa de mais {custo - (creditsData?.credits ?? 0)} créditos.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={() => setCurrentStep(2)} className="flex-1">
          ← Voltar
        </Button>
        <Button
          type="button"
          onClick={handleCreate}
          disabled={!creditosSuficientes || createCampaign.isPending}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
        >
          {createCampaign.isPending ? "Criando..." : "Gerar Campanha"}
        </Button>
      </div>
    </div>
  );
}

// Componente auxiliar: Info Card
function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg p-3 border border-blue-100">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="font-medium text-sm">{value}</p>
    </div>
  );
}

// Componente auxiliar: Template Chip
function TemplateChip({
  icon,
  label,
  templateName,
}: {
  icon: React.ReactNode;
  label: string;
  templateName: string;
}) {
  return (
    <div className="bg-white rounded-lg p-3 border border-blue-100">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
          {icon}
        </div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </div>
      <p className="text-sm font-medium truncate">{templateName}</p>
    </div>
  );
}
