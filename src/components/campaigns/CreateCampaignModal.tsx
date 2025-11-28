"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Target, Sparkles, Send, ArrowLeft } from "lucide-react";
import { LeadGenerationWizard } from "@/components/wizard/LeadGenerationWizard";
import { EnrichmentWizard } from "@/components/wizard/EnrichmentWizard";

interface CampaignTypeCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge: string;
  enabled: boolean;
  onClick: () => void;
}

function CampaignTypeCard({
  icon,
  title,
  description,
  badge,
  enabled,
  onClick,
}: CampaignTypeCardProps) {
  return (
    <button
      onClick={enabled ? onClick : undefined}
      disabled={!enabled}
      className={`relative p-6 border-2 rounded-lg text-left transition-all ${
        enabled
          ? "border-gray-200 hover:border-primary hover:shadow-md cursor-pointer"
          : "border-gray-200 opacity-50 cursor-not-allowed"
      }`}
    >
      {/* Badge no canto superior direito */}
      <div className="absolute top-3 right-3">
        <Badge
          variant={enabled ? "default" : "secondary"}
          className={enabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}
        >
          {badge}
        </Badge>
      </div>

      {/* Ícone */}
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
          enabled ? "bg-blue-100 text-primary" : "bg-gray-100 text-gray-400"
        }`}
      >
        {icon}
      </div>

      {/* Título */}
      <h3
        className={`text-lg font-semibold mb-2 ${
          enabled ? "text-foreground" : "text-gray-400"
        }`}
      >
        {title}
      </h3>

      {/* Descrição */}
      <p className={`text-sm ${enabled ? "text-muted-foreground" : "text-gray-400"}`}>
        {description}
      </p>
    </button>
  );
}

type WizardType = "extraction" | "enrichment" | null;

export function CreateCampaignModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedWizard, setSelectedWizard] = useState<WizardType>(null);

  const handleExtractionClick = () => {
    setSelectedWizard("extraction");
  };

  const handleEnrichmentClick = () => {
    setSelectedWizard("enrichment");
  };

  const handleBack = () => {
    setSelectedWizard(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="bg-blue-600 hover:bg-blue-700 gap-2">
          <Plus className="w-5 h-5" />
          Nova Campanha
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {!selectedWizard ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">Escolha o objetivo da campanha</DialogTitle>
              <DialogDescription>
                Selecione o tipo de campanha que deseja criar
              </DialogDescription>
            </DialogHeader>

            {/* Grid de 3 Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6">
              {/* Card 1: Extração (Ativo) */}
              <CampaignTypeCard
                icon={<Target className="w-6 h-6" />}
                title="Extração"
                description="Extrair leads do Google Maps com dados básicos"
                badge="Ativo"
                enabled={true}
                onClick={handleExtractionClick}
              />

              {/* Card 2: Extração + IA (Ativo) */}
              <CampaignTypeCard
                icon={<Sparkles className="w-6 h-6" />}
                title="Extração + IA"
                description="Extrair e enriquecer leads com análise de IA"
                badge="Ativo"
                enabled={true}
                onClick={handleEnrichmentClick}
              />

              {/* Card 3: Envio (Desabilitado) */}
              <CampaignTypeCard
                icon={<Send className="w-6 h-6" />}
                title="Envio"
                description="Enviar mensagens para lista existente de leads"
                badge="Em Breve"
                enabled={false}
                onClick={() => {}}
              />
            </div>

            {/* Info adicional */}
            <div className="bg-muted/30 p-4 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground">
                💡 <strong>Dica:</strong> Use <strong>Extração</strong> para obter dados básicos rapidamente (0.25 créditos/lead).
                Use <strong>Extração + IA</strong> para análise completa com mensagens personalizadas (1.0 crédito/lead).
              </p>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleBack}
                  className="hover:bg-muted"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <DialogTitle className="text-2xl">
                    {selectedWizard === "extraction" ? "Criar Campanha de Extração" : "Criar Campanha com Enriquecimento"}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedWizard === "extraction"
                      ? "Configure os parâmetros para extrair leads do Google Maps"
                      : "Configure e selecione templates para enriquecer leads com IA"
                    }
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Wizard */}
            {selectedWizard === "extraction" && <LeadGenerationWizard />}
            {selectedWizard === "enrichment" && <EnrichmentWizard />}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
