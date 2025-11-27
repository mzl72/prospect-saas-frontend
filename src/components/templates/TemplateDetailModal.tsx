"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Mail,
  MessageCircle,
  Sparkles,
  Shield,
  Copy,
  Edit,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Template } from "@/hooks/useTemplates";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TemplateDetailModalProps {
  template: Template | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (template: Template) => void;
}

// Type icons
const typeIcons = {
  EMAIL: Mail,
  WHATSAPP: MessageCircle,
  PROMPT_IA: Sparkles,
};

// Type colors
const typeColors = {
  EMAIL: "bg-blue-50 text-blue-700 border-blue-200",
  WHATSAPP: "bg-green-50 text-green-700 border-green-200",
  PROMPT_IA: "bg-purple-50 text-purple-700 border-purple-200",
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

export function TemplateDetailModal({
  template,
  isOpen,
  onClose,
  onEdit,
}: TemplateDetailModalProps) {
  const [activeFieldKey, setActiveFieldKey] = useState<string | null>(null);
  const [expandedMessages, setExpandedMessages] = useState<Set<number>>(new Set());

  // Set first field as active by default when modal opens or template changes
  useEffect(() => {
    if (!template) return;

    const fields = template.fields as Record<string, string> | null;
    const fieldKeys = fields ? Object.keys(fields).sort() : [];

    if (isOpen && fieldKeys.length > 0) {
      setActiveFieldKey(fieldKeys[0]);
    }

    setExpandedMessages(new Set());
  }, [isOpen, template]);

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

  if (!template) return null;

  const Icon = typeIcons[template.type];
  const fields = template.fields as Record<string, string> | null;
  const fieldKeys = fields ? Object.keys(fields).sort() : [];

  const handleCopyField = (content: string, fieldName: string) => {
    navigator.clipboard.writeText(content);
    toast.success(`${fieldName} copiado!`);
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(template);
      onClose();
    }
  };

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
              <DialogTitle className="text-sm leading-tight mb-0.5 pr-8">{template.name}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 flex-wrap text-xs">
                <Badge className={`${typeColors[template.type]} border text-xs py-0`}>
                  {typeLabels[template.type]}
                </Badge>
                {template.isDefault && (
                  <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50 text-xs py-0">
                    <Shield className="w-3 h-3 mr-1" />
                    Padrão
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  • {formatDistanceToNow(new Date(template.createdAt), { addSuffix: true, locale: ptBR })}
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {/* Templates estruturados */}
          {fields && fieldKeys.length > 0 ? (
            <>
              {/* Tab Navigation compacta */}
              <div className="px-6 border-b border-border bg-white shrink-0">
                <nav className="flex space-x-1 overflow-x-auto py-1.5 -mb-px">
                  {fieldKeys.map((fieldKey) => {
                    const isActive = activeFieldKey === fieldKey;
                    const displayName = fieldKey.replace(/^\d+_/, '');
                    return (
                      <button
                        key={fieldKey}
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
                  const fieldValue = fields[fieldKey];
                  const isMessages = isMessagesField(fieldKey);

                  // Campo de mensagens estruturadas
                  if (isMessages) {
                    const messages = parseMessages(fieldValue);

                    return (
                      <div key={fieldKey} className="max-w-5xl mx-auto space-y-3">
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
                                  "px-4 py-3 cursor-pointer select-none",
                                  isExpanded && "border-b border-gray-200 bg-blue-50/50"
                                )}
                                onClick={() => toggleMessageExpansion(idx)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2.5 flex-1">
                                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-semibold text-xs">
                                      {idx + 1}
                                    </div>
                                    <div className="flex-1">
                                      <h3 className="font-semibold text-gray-900 text-sm">{message.title}</h3>
                                      {message.subject && !isExpanded && (
                                        <p className="text-xs text-gray-500 mt-0.5 truncate">Assunto: {message.subject}</p>
                                      )}
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="gap-1.5 h-7 text-xs"
                                  >
                                    {isExpanded ? (
                                      <>
                                        <ChevronUp className="w-3.5 h-3.5" />
                                        Recolher
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="w-3.5 h-3.5" />
                                        Expandir
                                      </>
                                    )}
                                  </Button>
                                </div>

                                {/* Preview quando colapsado */}
                                {!isExpanded && (
                                  <div className="mt-2.5 pl-9 space-y-1.5">
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
                                <div className="px-4 py-4 space-y-3">
                                  {/* Assunto */}
                                  {message.subject && (
                                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                      <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Assunto</span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleCopyField(message.subject!, "Assunto");
                                          }}
                                          className="h-6 gap-1.5 text-xs"
                                        >
                                          <Copy className="w-3 h-3" />
                                          Copiar
                                        </Button>
                                      </div>
                                      <div className="text-sm text-gray-900 font-medium">
                                        {message.subject}
                                      </div>
                                    </div>
                                  )}

                                  {/* Corpo */}
                                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                    <div className="flex items-center justify-between mb-1.5">
                                      <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Corpo</span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCopyField(message.body, "Corpo");
                                        }}
                                        className="h-6 gap-1.5 text-xs"
                                      >
                                        <Copy className="w-3 h-3" />
                                        Copiar
                                      </Button>
                                    </div>
                                    <div className="bg-white rounded-md p-3 border border-gray-200">
                                      <pre className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
                                        {message.body}
                                      </pre>
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
                        <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                            <span className="text-sm font-semibold text-gray-800">{displayName}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyField(fieldValue, displayName)}
                            className="h-6 gap-1.5 text-xs"
                          >
                            <Copy className="w-3 h-3" />
                            Copiar
                          </Button>
                        </div>
                        <div className="p-4">
                          <pre className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
                            {fieldValue}
                          </pre>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            // Templates legacy
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {template.type === "EMAIL" && template.subject && (
                <div className="bg-muted/30 rounded-lg p-3 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">Assunto</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyField(template.subject!, "Assunto")}
                      className="h-6 gap-1.5 text-xs"
                    >
                      <Copy className="w-3 h-3" />
                      Copiar
                    </Button>
                  </div>
                  <div className="bg-white rounded-md p-3 border border-border">
                    <p className="text-foreground font-medium text-sm">{template.subject}</p>
                  </div>
                </div>
              )}

              {template.content && (
                <div className="bg-muted/30 rounded-lg p-3 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">Conteúdo</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyField(template.content!, "Conteúdo")}
                      className="h-6 gap-1.5 text-xs"
                    >
                      <Copy className="w-3 h-3" />
                      Copiar
                    </Button>
                  </div>
                  <div className="bg-white rounded-md p-3 border border-border">
                    <pre className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
                      {template.content}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer compacto */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-white shrink-0">
          <div className="text-xs text-muted-foreground">
            Por: {template.createdByUser?.name || "Sistema"}
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button onClick={handleEdit} variant="outline" size="sm" className="gap-1.5 h-8">
                <Edit className="w-3.5 h-3.5" />
                Editar
              </Button>
            )}
            <Button onClick={onClose} variant="outline" size="sm" className="gap-1.5 h-8">
              <X className="w-3.5 h-3.5" />
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
