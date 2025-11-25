"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Mail, MessageCircle, Sparkles } from "lucide-react";
import { VariableHighlighter } from "./VariableHighlighter";
import { TemplatePreview } from "./TemplatePreview";
import { useUpdateTemplate, type Template, type TemplateType } from "@/hooks/useTemplates";
import { toast } from "sonner";

interface EditTemplateDialogProps {
  template: Template | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EditTemplateDialog({
  template,
  isOpen,
  onClose,
}: EditTemplateDialogProps) {
  const [type, setType] = useState<TemplateType>("EMAIL");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");

  const updateMutation = useUpdateTemplate();

  // Preencher form quando template mudar
  useEffect(() => {
    if (template) {
      setType(template.type);
      setName(template.name);
      setSubject(template.subject || "");
      setContent(template.content);
    }
  }, [template]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!template) return;

    // Validações client-side
    if (!name.trim()) {
      toast.error("Nome do template é obrigatório");
      return;
    }

    if (!content.trim()) {
      toast.error("Conteúdo do template é obrigatório");
      return;
    }

    if (type === "EMAIL" && !subject.trim()) {
      toast.error("Assunto é obrigatório para templates de Email");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: template.id,
        data: {
          type,
          name: name.trim(),
          subject: type === "EMAIL" ? subject.trim() : null,
          content: content.trim(),
        },
      });

      onClose();
    } catch (error) {
      // Erro já tratado no hook
      console.error("Erro ao atualizar template:", error);
    }
  };

  const handleCancel = () => {
    onClose();
    // Reset form para valores originais
    if (template) {
      setType(template.type);
      setName(template.name);
      setSubject(template.subject || "");
      setContent(template.content);
    }
  };

  if (!template) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Editar Template</DialogTitle>
          <DialogDescription>
            Edite seu template personalizado de {template.type === "EMAIL" ? "Email" : template.type === "WHATSAPP" ? "WhatsApp" : "Prompt IA"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Grid 2 colunas: Form + Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Coluna esquerda: Formulário */}
            <div className="space-y-4">
              {/* Tipo */}
              <div className="space-y-2">
                <Label htmlFor="edit-type">
                  Tipo de Template <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={type}
                  onValueChange={(value) => setType(value as TemplateType)}
                >
                  <SelectTrigger id="edit-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMAIL">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email
                      </div>
                    </SelectItem>
                    <SelectItem value="WHATSAPP">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4" />
                        WhatsApp
                      </div>
                    </SelectItem>
                    <SelectItem value="PROMPT_IA">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Prompt IA
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="edit-name">
                  Nome do Template <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Email Boas-vindas"
                  maxLength={100}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {name.length}/100 caracteres
                </p>
              </div>

              {/* Subject (apenas para EMAIL) */}
              {type === "EMAIL" && (
                <div className="space-y-2">
                  <Label htmlFor="edit-subject">
                    Assunto <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Ex: Oportunidade para {nomeEmpresa}"
                    maxLength={200}
                    required={type === "EMAIL"}
                  />
                  <p className="text-xs text-muted-foreground">
                    {subject.length}/200 caracteres
                  </p>
                </div>
              )}

              {/* Conteúdo com Variable Highlighter */}
              <div className="space-y-2">
                <Label htmlFor="edit-content">
                  Conteúdo <span className="text-red-500">*</span>
                </Label>
                <VariableHighlighter
                  value={content}
                  onChange={setContent}
                  placeholder={
                    type === "EMAIL"
                      ? "Olá {nomeContato},\n\nMeu nome é {nomeVendedor}..."
                      : type === "WHATSAPP"
                      ? "Olá! 👋\n\nSou {nomeVendedor} da {nossaEmpresa}..."
                      : "Analise a empresa {nomeEmpresa} que atua em {categoria}..."
                  }
                  rows={type === "PROMPT_IA" ? 12 : 8}
                />
                <p className="text-xs text-muted-foreground">
                  {content.length}/10000 caracteres
                </p>
              </div>
            </div>

            {/* Coluna direita: Preview */}
            <div className="lg:border-l lg:pl-6">
              <TemplatePreview content={content} subject={subject} type={type} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending || !name.trim() || !content.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
