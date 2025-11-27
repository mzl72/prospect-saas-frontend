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
  Mail,
  MessageCircle,
  Sparkles,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
} from "lucide-react";
import { VariableHighlighter } from "./VariableHighlighter";
import { useUpdateTemplate, type Template } from "@/hooks/useTemplates";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EditTemplateDialogProps {
  template: Template | null;
  isOpen: boolean;
  onClose: () => void;
}

// Type icons
const typeIcons = {
  EMAIL: Mail,
  WHATSAPP: MessageCircle,
  PROMPT_IA: Sparkles,
};

// Type labels
const typeLabels = {
  EMAIL: "Email",
  WHATSAPP: "WhatsApp",
  PROMPT_IA: "Prompt IA",
};

// Icon colors
const iconColors = {
  EMAIL: "from-blue-500 to-blue-600",
  WHATSAPP: "from-green-500 to-green-600",
  PROMPT_IA: "from-purple-500 to-purple-600",
};

// Detectar se um campo é "Mensagens" ou "Emails"
const isMessagesField = (fieldKey: string) => {
  const key = fieldKey.toLowerCase();
  return key.includes('mensagens') || key.includes('emails');
};

// Parseador de mensagens estruturadas (## Email 1, ## Mensagem 1, etc)
interface ParsedMessage {
  title: string;
  subject?: string;
  body: string;
}

const parseMessages = (content: string): ParsedMessage[] => {
  const messages: ParsedMessage[] = [];

  // Regex para capturar seções com ## Email N ou ## Mensagem N
  const sections = content.split(/(?=##\s*(?:Email|Mensagem)\s*\d+)/g).filter(s => s.trim());

  sections.forEach((section) => {
    const titleMatch = section.match(/##\s*(Email|Mensagem)\s*(\d+)/);
    if (!titleMatch) return;

    const title = `${titleMatch[1]} ${titleMatch[2]}`;

    // Extrair subject (se existir)
    const subjectMatch = section.match(/\*\*Assunto:\*\*\s*\n([^\n]+)/);
    const subject = subjectMatch ? subjectMatch[1].trim() : undefined;

    // Extrair corpo (tudo depois de **Corpo:** ou **Estrutura:** até próxima seção ou final)
    let bodyMatch = section.match(/\*\*Corpo:\*\*\s*\n([\s\S]*?)(?=\n---|\n##|$)/);
    if (!bodyMatch) {
      bodyMatch = section.match(/\*\*Estrutura:\*\*\s*\n([\s\S]*?)(?=\n---|\n##|$)/);
    }

    const body = bodyMatch ? bodyMatch[1].trim() : section.replace(/##[^\n]+\n/, '').trim();

    messages.push({ title, subject, body });
  });

  return messages;
};

const serializeMessages = (messages: ParsedMessage[]): string => {
  return messages.map((msg, idx) => {
    let section = `## ${msg.title}\n\n`;

    if (msg.subject) {
      section += `**Assunto:**\n${msg.subject}\n\n`;
    }

    section += `**Corpo:**\n${msg.body}`;

    // Adicionar separador entre mensagens (exceto última)
    if (idx < messages.length - 1) {
      section += '\n\n---\n\n';
    }

    return section;
  }).join('');
};

export function EditTemplateDialog({
  template,
  isOpen,
  onClose,
}: EditTemplateDialogProps) {
  const [name, setName] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [subject, setSubject] = useState(""); // NOVO: para templates legacy
  const [content, setContent] = useState(""); // NOVO: para templates legacy
  const [activeFieldKey, setActiveFieldKey] = useState<string | null>(null);
  const [expandedMessages, setExpandedMessages] = useState<Set<number>>(new Set());
  const [originalData, setOriginalData] = useState<{
    name: string;
    fields: Record<string, string>;
    subject: string;
    content: string;
  }>({ name: "", fields: {}, subject: "", content: "" });

  const updateMutation = useUpdateTemplate();

  // Carregar dados do template quando abrir
  useEffect(() => {
    if (template && isOpen) {
      const templateFields = template.fields as Record<string, string> | null;
      const initialFields = templateFields || {};
      const fieldKeys = Object.keys(initialFields).sort();

      setName(template.name);
      setFields(initialFields);
      setSubject(template.subject || ""); // NOVO
      setContent(template.content || ""); // NOVO
      setOriginalData({
        name: template.name,
        fields: initialFields,
        subject: template.subject || "",
        content: template.content || "",
      });

      // Set first field as active
      if (fieldKeys.length > 0) {
        setActiveFieldKey(fieldKeys[0]);
      }

      setExpandedMessages(new Set()); // Reset expanded state
    }
  }, [template, isOpen]);

  const toggleMessageExpansion = (index: number) => {
    setExpandedMessages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!template) return;

    // Validação client-side
    if (!name.trim()) {
      toast.error("Nome do template é obrigatório");
      return;
    }

    // Templates legacy precisam de content
    const isLegacy = !template.fields || Object.keys(template.fields as Record<string, string> | null || {}).length === 0;
    if (isLegacy && !content.trim()) {
      toast.error("Conteúdo é obrigatório");
      return;
    }

    // Templates EMAIL legacy precisam de subject
    if (isLegacy && template.type === "EMAIL" && !subject.trim()) {
      toast.error("Assunto é obrigatório para templates de Email");
      return;
    }

    // Detectar apenas campos modificados
    const changedData: Partial<{
      name: string;
      fields: Record<string, string> | null;
      subject: string | null;
      content: string | null;
    }> = {};

    if (name.trim() !== originalData.name) {
      changedData.name = name.trim();
    }

    // Templates estruturados (fields)
    if (!isLegacy) {
      let hasFieldChanges = false;
      Object.keys(fields).forEach((key) => {
        if (fields[key] !== originalData.fields[key]) {
          hasFieldChanges = true;
        }
      });

      if (hasFieldChanges) {
        changedData.fields = fields;
      }
    }
    // Templates legacy (subject/content)
    else {
      if (subject.trim() !== originalData.subject) {
        changedData.subject = subject.trim();
      }
      if (content.trim() !== originalData.content) {
        changedData.content = content.trim();
      }
    }

    // Se não houve mudanças
    if (Object.keys(changedData).length === 0) {
      toast.info("Nenhuma alteração detectada");
      onClose();
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: template.id,
        data: changedData,
      });

      toast.success("Template atualizado com sucesso!");
      onClose();
    } catch (error) {
      // Erro já tratado no hook
      console.error("Erro ao atualizar template:", error);
    }
  };

  const handleCancel = () => {
    // Restaurar valores originais ao cancelar
    setName(originalData.name);
    setFields(originalData.fields);
    setSubject(originalData.subject); // NOVO
    setContent(originalData.content); // NOVO
    setExpandedMessages(new Set());
    onClose();
  };

  if (!template) return null;

  const Icon = typeIcons[template.type];
  const fieldKeys = Object.keys(fields).sort();
  const hasFields = fieldKeys.length > 0;

  // Renderizar preview (primeiras 2 linhas)
  const renderPreview = (content: string, maxLines: number = 2) => {
    const lines = content.split('\n').filter(l => l.trim());
    const previewLines = lines.slice(0, maxLines);
    const hasMore = lines.length > maxLines;

    return (
      <div className="text-sm text-gray-600 space-y-0.5">
        {previewLines.map((line, idx) => (
          <div key={idx} className="truncate">{line}</div>
        ))}
        {hasMore && (
          <div className="text-xs text-blue-600 font-medium mt-1">
            +{lines.length - maxLines} linhas
          </div>
        )}
      </div>
    );
  };

  // Atualizar mensagem específica
  const updateMessage = (fieldKey: string, index: number, field: 'subject' | 'body', value: string) => {
    const currentContent = fields[fieldKey] || "";
    const messages = parseMessages(currentContent);

    if (messages[index]) {
      if (field === 'subject') {
        messages[index].subject = value;
      } else {
        messages[index].body = value;
      }

      const newContent = serializeMessages(messages);
      setFields(prev => ({ ...prev, [fieldKey]: newContent }));
    }
  };

  // Adicionar nova mensagem
  const addMessage = (fieldKey: string) => {
    const currentContent = fields[fieldKey] || "";
    const messages = parseMessages(currentContent);

    if (messages.length >= 5) {
      toast.error("Máximo de 5 mensagens permitidas");
      return;
    }

    const newMessage: ParsedMessage = {
      title: template.type === 'EMAIL' ? `Email ${messages.length + 1}` : `Mensagem ${messages.length + 1}`,
      subject: template.type === 'EMAIL' ? '' : undefined,
      body: ''
    };

    messages.push(newMessage);
    const newContent = serializeMessages(messages);
    setFields(prev => ({ ...prev, [fieldKey]: newContent }));
    toast.success("Nova mensagem adicionada");
  };

  // Remover mensagem
  const removeMessage = (fieldKey: string, index: number) => {
    const currentContent = fields[fieldKey] || "";
    const messages = parseMessages(currentContent);

    if (messages.length <= 1) {
      toast.error("É necessário ter pelo menos 1 mensagem");
      return;
    }

    messages.splice(index, 1);
    const newContent = serializeMessages(messages);
    setFields(prev => ({ ...prev, [fieldKey]: newContent }));
    toast.success("Mensagem removida");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
        {/* Header ultra compacto */}
        <DialogHeader className="px-4 pt-2 pb-2 border-b border-border shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-1.5 rounded-lg shadow-sm shrink-0 bg-gradient-to-br",
              iconColors[template.type]
            )}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-sm leading-tight">Editar Template</DialogTitle>
              <DialogDescription className="text-xs">
                {typeLabels[template.type]}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          {/* Nome do Template - ultra compacto */}
          <div className="px-4 py-2 border-b border-border bg-gray-50/50 shrink-0">
            <div className="flex items-center gap-2">
              <Label htmlFor="edit-name" className="text-xs font-medium whitespace-nowrap">
                Nome <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Email Boas-vindas"
                maxLength={100}
                required
                className="bg-white h-7 text-sm flex-1"
              />
              <p className="text-xs text-muted-foreground whitespace-nowrap">
                {name.length}/100
              </p>
            </div>
          </div>

          {/* Templates estruturados (fields) */}
          {hasFields ? (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Custom Tab Navigation - ultra compacto */}
              <div className="px-4 border-b border-border bg-white shrink-0">
                <nav className="flex space-x-1 overflow-x-auto py-1 -mb-px">
                  {fieldKeys.map((fieldKey) => {
                    const isActive = activeFieldKey === fieldKey;
                    const displayName = fieldKey.replace(/^\d+_/, '');
                    return (
                      <button
                        key={fieldKey}
                        type="button"
                        onClick={() => setActiveFieldKey(fieldKey)}
                        className={cn(
                          "px-3 py-1.5 text-sm font-medium rounded-t-lg transition-all whitespace-nowrap border-b-2",
                          isActive
                            ? "bg-blue-50 text-blue-700 border-blue-600"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border-transparent"
                        )}
                      >
                        {displayName}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Tab Content - scrollável */}
              <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50/30">
                {fieldKeys.map((fieldKey) => {
                  if (activeFieldKey !== fieldKey) return null;

                  const displayName = fieldKey.replace(/^\d+_/, '').replace(/_/g, ' ');
                  const fieldContent = fields[fieldKey] || "";
                  const isMessages = isMessagesField(fieldKey);

                  // Se for campo de mensagens, parsear e mostrar estruturado
                  if (isMessages) {
                    const messages = parseMessages(fieldContent);

                    return (
                      <div key={fieldKey} className="max-w-5xl mx-auto space-y-4">
                        {/* Botão adicionar mensagem */}
                        {messages.length < 5 && (
                          <Button
                            type="button"
                            onClick={() => addMessage(fieldKey)}
                            variant="outline"
                            className="w-full gap-2 border-dashed border-2 hover:border-blue-500 hover:text-blue-600"
                          >
                            <Plus className="w-4 h-4" />
                            Adicionar {template.type === 'EMAIL' ? 'Email' : 'Mensagem'} ({messages.length}/5)
                          </Button>
                        )}

                        {/* Lista de mensagens */}
                        {messages.map((message, idx) => {
                          const isExpanded = expandedMessages.has(idx);

                          return (
                            <div
                              key={idx}
                              className={cn(
                                "bg-white rounded-lg border transition-all",
                                isExpanded ? "border-blue-300 shadow-md" : "border-gray-200 shadow-sm"
                              )}
                            >
                              {/* Header da mensagem */}
                              <div
                                className={cn(
                                  "px-5 py-4 cursor-pointer select-none",
                                  isExpanded && "border-b border-gray-200 bg-blue-50/50"
                                )}
                                onClick={() => toggleMessageExpansion(idx)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 flex-1">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
                                      {idx + 1}
                                    </div>
                                    <div className="flex-1">
                                      <h3 className="font-semibold text-gray-900">{message.title}</h3>
                                      {message.subject && (
                                        <p className="text-xs text-gray-500 mt-0.5">Assunto: {message.subject}</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {messages.length > 1 && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          removeMessage(fieldKey, idx);
                                        }}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    )}
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="gap-2"
                                    >
                                      {isExpanded ? (
                                        <>
                                          <ChevronUp className="w-4 h-4" />
                                          Recolher
                                        </>
                                      ) : (
                                        <>
                                          <ChevronDown className="w-4 h-4" />
                                          Expandir
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>

                                {/* Preview quando colapsado */}
                                {!isExpanded && (
                                  <div className="mt-3 pl-11 space-y-2">
                                    {message.subject && (
                                      <div>
                                        <span className="text-xs font-medium text-gray-500">Assunto:</span>
                                        <div className="text-sm text-gray-700 truncate">{message.subject}</div>
                                      </div>
                                    )}
                                    <div>
                                      <span className="text-xs font-medium text-gray-500">Corpo:</span>
                                      {renderPreview(message.body, 2)}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Conteúdo expandido */}
                              {isExpanded && (
                                <div className="px-5 py-5 space-y-4">
                                  {/* Campo Assunto (apenas para EMAIL) */}
                                  {template.type === 'EMAIL' && (
                                    <div>
                                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                        Assunto <span className="text-red-500">*</span>
                                      </Label>
                                      <Input
                                        value={message.subject || ''}
                                        onChange={(e) => updateMessage(fieldKey, idx, 'subject', e.target.value)}
                                        placeholder="Ex: Oportunidade para sua empresa"
                                        maxLength={200}
                                        className="bg-white"
                                      />
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {(message.subject || '').length}/200 caracteres
                                      </p>
                                    </div>
                                  )}

                                  {/* Campo Corpo */}
                                  <div>
                                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                      Corpo da Mensagem <span className="text-red-500">*</span>
                                    </Label>
                                    <VariableHighlighter
                                      value={message.body}
                                      onChange={(value) => updateMessage(fieldKey, idx, 'body', value)}
                                      placeholder="Digite o conteúdo da mensagem..."
                                      rows={12}
                                    />
                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                                      <p className="text-xs text-muted-foreground">
                                        {message.body.length.toLocaleString()} / 10.000 caracteres
                                      </p>
                                      <div className="flex items-center gap-2">
                                        <div className={cn(
                                          "w-2 h-2 rounded-full",
                                          message.body.length > 9000 ? "bg-red-500" :
                                          message.body.length > 7000 ? "bg-yellow-500" :
                                          "bg-green-500"
                                        )}></div>
                                        <span className="text-xs font-medium text-gray-600">
                                          {message.body.length > 9000 ? "Próximo do limite" :
                                           message.body.length > 7000 ? "Uso moderado" :
                                           "Espaço disponível"}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  }

                  // Campos normais (Visão Geral, Regras, etc)
                  return (
                    <div key={fieldKey} className="max-w-5xl mx-auto">
                      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
                          <Label className="text-base font-semibold text-gray-800 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                            {displayName}
                          </Label>
                        </div>
                        <div className="p-6">
                          <VariableHighlighter
                            value={fieldContent}
                            onChange={(value) => {
                              setFields((prev) => ({
                                ...prev,
                                [fieldKey]: value,
                              }));
                            }}
                            placeholder={`Digite o conteúdo para ${displayName}...`}
                            rows={15}
                          />
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                            <p className="text-xs text-muted-foreground">
                              {fieldContent.length.toLocaleString()} / 10.000 caracteres
                            </p>
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                fieldContent.length > 9000 ? "bg-red-500" :
                                fieldContent.length > 7000 ? "bg-yellow-500" :
                                "bg-green-500"
                              )}></div>
                              <span className="text-xs font-medium text-gray-600">
                                {fieldContent.length > 9000 ? "Próximo do limite" :
                                 fieldContent.length > 7000 ? "Uso moderado" :
                                 "Espaço disponível"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            // Templates legacy (subject/content)
            <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50/30">
              <div className="max-w-5xl mx-auto space-y-4">
                {/* Subject (apenas para EMAIL) */}
                {template.type === "EMAIL" && (
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
                      <Label className="text-base font-semibold text-gray-800 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                        Assunto <span className="text-red-500 text-sm">*</span>
                      </Label>
                    </div>
                    <div className="p-6">
                      <Input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Ex: Oportunidade para {nomeEmpresa}"
                        maxLength={200}
                        required={template.type === "EMAIL"}
                        className="bg-white"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        {subject.length}/200 caracteres
                      </p>
                    </div>
                  </div>
                )}

                {/* Content */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
                    <Label className="text-base font-semibold text-gray-800 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                      Conteúdo <span className="text-red-500 text-sm">*</span>
                    </Label>
                  </div>
                  <div className="p-6">
                    <VariableHighlighter
                      value={content}
                      onChange={setContent}
                      placeholder={
                        template.type === "EMAIL"
                          ? "Olá {nomeContato},\n\nMeu nome é {nomeVendedor}..."
                          : template.type === "WHATSAPP"
                          ? "Olá! 👋\n\nSou {nomeVendedor} da {nossaEmpresa}..."
                          : "Analise a empresa {nomeEmpresa} que atua em {categoria}..."
                      }
                      rows={template.type === "PROMPT_IA" ? 15 : 12}
                    />
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-muted-foreground">
                        {content.length.toLocaleString()} / 10.000 caracteres
                      </p>
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          content.length > 9000 ? "bg-red-500" :
                          content.length > 7000 ? "bg-yellow-500" :
                          "bg-green-500"
                        )}></div>
                        <span className="text-xs font-medium text-gray-600">
                          {content.length > 9000 ? "Próximo do limite" :
                           content.length > 7000 ? "Uso moderado" :
                           "Espaço disponível"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions - fixo */}
          <div className="px-6 py-4 border-t border-border bg-white shrink-0">
            <div className="flex items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={handleCancel} className="gap-2">
                <X className="w-4 h-4" />
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending || !name.trim()}
                className="bg-blue-600 hover:bg-blue-700 gap-2"
              >
                {updateMutation.isPending ? (
                  <>Salvando...</>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
