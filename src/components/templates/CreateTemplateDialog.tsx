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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Mail, MessageCircle, Sparkles, Trash2 } from "lucide-react";
import { VariableHighlighter } from "./VariableHighlighter";
import { useCreateTemplate, type TemplateType } from "@/hooks/useTemplates";
import { toast } from "sonner";

interface CreateTemplateDialogProps {
  variant?: "default" | "icon";
  className?: string;
}

interface EmailMessage {
  subject: string;
  body: string;
}

interface WhatsappMessage {
  body: string;
}

export function CreateTemplateDialog({
  variant = "default",
  className = "",
}: CreateTemplateDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Campos comuns
  const [type, setType] = useState<TemplateType>("EMAIL");
  const [name, setName] = useState("");
  const [overview, setOverview] = useState("");
  const [rules, setRules] = useState("");

  // Campos específicos por tipo
  const [emailMessages, setEmailMessages] = useState<EmailMessage[]>([
    { subject: "", body: "" }
  ]);
  const [whatsappMessages, setWhatsappMessages] = useState<WhatsappMessage[]>([
    { body: "" }
  ]);

  // Campos PROMPT_IA
  const [research, setResearch] = useState("");
  const [analysis, setAnalysis] = useState("");

  const createMutation = useCreateTemplate();

  const resetForm = () => {
    setCurrentStep(1);
    setType("EMAIL");
    setName("");
    setOverview("");
    setRules("");
    setEmailMessages([{ subject: "", body: "" }]);
    setWhatsappMessages([{ body: "" }]);
    setResearch("");
    setAnalysis("");
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Nome do template é obrigatório");
      return;
    }

    if (!overview.trim()) {
      toast.error("Visão Geral é obrigatória");
      return;
    }

    let fields: Record<string, string> = {};

    if (type === "PROMPT_IA") {
      if (!research.trim() || !analysis.trim()) {
        toast.error("Preencha todos os campos do prompt");
        return;
      }
      fields = {
        "01_Pesquisa": research,
        "02_Visão Geral": overview,
        "03_Análise": analysis,
      };
    } else if (type === "EMAIL") {
      if (!rules.trim()) {
        toast.error("Regras são obrigatórias");
        return;
      }

      const validMessages = emailMessages.filter(m => m.subject.trim() || m.body.trim());
      if (validMessages.length === 0) {
        toast.error("Adicione pelo menos 1 email");
        return;
      }

      // Formatar emails no formato esperado
      const emailsContent = validMessages
        .map((msg, idx) =>
          `## Email ${idx + 1}\n\n**Assunto:**\n${msg.subject}\n\n**Corpo:**\n${msg.body}`
        )
        .join("\n\n---\n\n");

      fields = {
        "01_Visão Geral": overview,
        "02_Emails": emailsContent,
        "03_Regras": rules,
      };
    } else if (type === "WHATSAPP") {
      if (!rules.trim()) {
        toast.error("Regras são obrigatórias");
        return;
      }

      const validMessages = whatsappMessages.filter(m => m.body.trim());
      if (validMessages.length === 0) {
        toast.error("Adicione pelo menos 1 mensagem");
        return;
      }

      const messagesContent = validMessages
        .map((msg, idx) =>
          `## Mensagem ${idx + 1}\n\n**Corpo:**\n${msg.body}`
        )
        .join("\n\n---\n\n");

      fields = {
        "01_Visão Geral": overview,
        "02_Mensagens": messagesContent,
        "03_Regras": rules,
      };
    }

    try {
      await createMutation.mutateAsync({
        type,
        name: name.trim(),
        fields,
      });

      resetForm();
      setIsOpen(false);
    } catch (error) {
      console.error("Erro ao criar template:", error);
    }
  };

  const addEmailMessage = () => {
    if (emailMessages.length >= 5) {
      toast.error("Máximo de 5 emails permitidos");
      return;
    }
    setEmailMessages([...emailMessages, { subject: "", body: "" }]);
  };

  const removeEmailMessage = (index: number) => {
    if (emailMessages.length === 1) {
      toast.error("Pelo menos 1 email é necessário");
      return;
    }
    setEmailMessages(emailMessages.filter((_, i) => i !== index));
  };

  const updateEmailMessage = (index: number, field: "subject" | "body", value: string) => {
    const newMessages = [...emailMessages];
    newMessages[index][field] = value;
    setEmailMessages(newMessages);
  };

  const addWhatsappMessage = () => {
    if (whatsappMessages.length >= 5) {
      toast.error("Máximo de 5 mensagens permitidas");
      return;
    }
    whatsappMessages.push({ body: "" });
    setWhatsappMessages([...whatsappMessages]);
  };

  const removeWhatsappMessage = (index: number) => {
    if (whatsappMessages.length === 1) {
      toast.error("Pelo menos 1 mensagem é necessária");
      return;
    }
    setWhatsappMessages(whatsappMessages.filter((_, i) => i !== index));
  };

  const updateWhatsappMessage = (index: number, value: string) => {
    const newMessages = [...whatsappMessages];
    newMessages[index].body = value;
    setWhatsappMessages(newMessages);
  };

  const getTotalSteps = () => {
    return type === "PROMPT_IA" ? 2 : 3;
  };

  const progress = (currentStep / getTotalSteps()) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {variant === "icon" ? (
          <Button size="icon" className={className}>
            <Plus className="w-5 h-5" />
          </Button>
        ) : (
          <Button size="lg" className={`bg-blue-600 hover:bg-blue-700 gap-2 ${className}`}>
            <Plus className="w-5 h-5" />
            Novo Template
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Criar Novo Template</DialogTitle>
          <DialogDescription>
            Etapa {currentStep} de {getTotalSteps()} - {
              currentStep === 1 ? "Informações Básicas" :
              currentStep === 2 && type === "PROMPT_IA" ? "Campos do Prompt" :
              currentStep === 2 ? "Mensagens" :
              "Regras"
            }
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="space-y-6 py-4">
          {/* ETAPA 1: Tipo, Nome e Visão Geral */}
          {currentStep === 1 && (
            <div className="space-y-4">
              {/* Tipo */}
              <div className="space-y-2">
                <Label htmlFor="type">
                  Tipo de Template <span className="text-red-500">*</span>
                </Label>
                <Select value={type} onValueChange={(value) => setType(value as TemplateType)}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMAIL">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email (Sequência com até 5 emails)
                      </div>
                    </SelectItem>
                    <SelectItem value="WHATSAPP">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4" />
                        WhatsApp (Sequência com até 5 mensagens)
                      </div>
                    </SelectItem>
                    <SelectItem value="PROMPT_IA">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Prompt IA (Análise e Enriquecimento)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Nome do Template <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Sequência Cold Email - Tech Startups"
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground">{name.length}/100 caracteres</p>
              </div>

              {/* Visão Geral */}
              <div className="space-y-2">
                <Label htmlFor="overview">
                  Visão Geral <span className="text-red-500">*</span>
                </Label>
                <VariableHighlighter
                  value={overview}
                  onChange={setOverview}
                  placeholder={
                    type === "PROMPT_IA"
                      ? "Descreva o contexto e objetivo do prompt de IA..."
                      : "Descreva o contexto e objetivo da sequência..."
                  }
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">{overview.length}/10000 caracteres</p>
              </div>

              {/* Campos específicos do PROMPT_IA na etapa 1 */}
              {type === "PROMPT_IA" && (
                <>
                  {/* Pesquisa */}
                  <div className="space-y-2">
                    <Label htmlFor="research">
                      Instruções de Pesquisa <span className="text-red-500">*</span>
                    </Label>
                    <VariableHighlighter
                      value={research}
                      onChange={setResearch}
                      placeholder="Descreva como a IA deve pesquisar informações sobre a empresa..."
                      rows={6}
                    />
                    <p className="text-xs text-muted-foreground">{research.length}/10000 caracteres</p>
                  </div>

                  {/* Análise */}
                  <div className="space-y-2">
                    <Label htmlFor="analysis">
                      Instruções de Análise <span className="text-red-500">*</span>
                    </Label>
                    <VariableHighlighter
                      value={analysis}
                      onChange={setAnalysis}
                      placeholder="Defina como a IA deve analisar e personalizar as mensagens..."
                      rows={6}
                    />
                    <p className="text-xs text-muted-foreground">{analysis.length}/10000 caracteres</p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ETAPA 2: Mensagens (apenas EMAIL e WHATSAPP) */}
          {currentStep === 2 && type === "EMAIL" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Emails da Sequência</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addEmailMessage}
                  disabled={emailMessages.length >= 5}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar Email
                </Button>
              </div>

              {emailMessages.map((message, index) => (
                <div key={index} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <span className="font-semibold text-gray-800">Email {index + 1}</span>
                    </div>
                    {emailMessages.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEmailMessage(index)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                  <div className="p-4 space-y-4">
                    <div>
                      <Label htmlFor={`email-subject-${index}`}>
                        Assunto <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id={`email-subject-${index}`}
                        value={message.subject}
                        onChange={(e) => updateEmailMessage(index, "subject", e.target.value)}
                        placeholder="Ex: Vamos revolucionar {nomeEmpresa}?"
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`email-body-${index}`}>
                        Corpo <span className="text-red-500">*</span>
                      </Label>
                      <VariableHighlighter
                        value={message.body}
                        onChange={(value) => updateEmailMessage(index, "body", value)}
                        placeholder="Olá {nomeContato},&#10;&#10;Vi que {nomeEmpresa} atua em {categoria}..."
                        rows={8}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <p className="text-sm text-muted-foreground">
                💡 Adicione entre 1 e 5 emails para criar uma sequência completa
              </p>
            </div>
          )}

          {currentStep === 2 && type === "WHATSAPP" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Mensagens da Sequência</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addWhatsappMessage}
                  disabled={whatsappMessages.length >= 5}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar Mensagem
                </Button>
              </div>

              {whatsappMessages.map((message, index) => (
                <div key={index} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-blue-50 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <span className="font-semibold text-gray-800">Mensagem {index + 1}</span>
                    </div>
                    {whatsappMessages.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeWhatsappMessage(index)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                  <div className="p-4">
                    <Label htmlFor={`whatsapp-body-${index}`}>
                      Mensagem <span className="text-red-500">*</span>
                    </Label>
                    <VariableHighlighter
                      value={message.body}
                      onChange={(value) => updateWhatsappMessage(index, value)}
                      placeholder="Olá! Vi que {nomeEmpresa} está em {cidade}..."
                      rows={8}
                    />
                  </div>
                </div>
              ))}

              <p className="text-sm text-muted-foreground">
                💡 Adicione entre 1 e 5 mensagens para criar uma sequência completa
              </p>
            </div>
          )}

          {/* ETAPA 3: Regras (apenas EMAIL e WHATSAPP) */}
          {currentStep === 3 && (type === "EMAIL" || type === "WHATSAPP") && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="rules">
                  Regras e Diretrizes <span className="text-red-500">*</span>
                </Label>
                <VariableHighlighter
                  value={rules}
                  onChange={setRules}
                  placeholder="Defina o tom de voz, restrições, diretrizes de personalização..."
                  rows={10}
                />
                <p className="text-xs text-muted-foreground">{rules.length}/10000 caracteres</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>

            <div className="flex items-center gap-2">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(currentStep - 1)}
                >
                  Voltar
                </Button>
              )}

              {currentStep < getTotalSteps() ? (
                <Button
                  type="button"
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Continuar
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={createMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {createMutation.isPending ? "Criando..." : "Criar Template"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
