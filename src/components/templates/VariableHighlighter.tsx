"use client";

import { useEffect, useRef, useState } from "react";
import { extractVariables } from "@/lib/template-helpers";
import { Badge } from "@/components/ui/badge";

interface VariableHighlighterProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  disabled?: boolean;
}

/**
 * Textarea com syntax highlight de variáveis {variavel}
 * Mostra preview colorido e contador de variáveis detectadas
 */
export function VariableHighlighter({
  value,
  onChange,
  placeholder = "Digite seu template...",
  className = "",
  rows = 10,
  disabled = false,
}: VariableHighlighterProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [variables, setVariables] = useState<string[]>([]);

  // Extrair variáveis quando o valor mudar
  useEffect(() => {
    const extracted = extractVariables(value);
    setVariables(extracted);
  }, [value]);

  // Sincronizar scroll entre textarea e highlight
  const handleScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  // Renderizar texto com highlight de variáveis
  const renderHighlightedText = () => {
    if (!value) return <span className="text-muted-foreground">{placeholder}</span>;

    // Escapar HTML para prevenir XSS
    const escapeHtml = (text: string) =>
      text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const escapedValue = escapeHtml(value);

    // Highlight de variáveis {variavel}
    const highlighted = escapedValue.replace(
      /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g,
      '<span class="bg-blue-100 text-blue-700 px-1 rounded font-semibold border border-blue-300">{$1}</span>'
    );

    return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
  };

  return (
    <div className={`relative ${className}`}>
      {/* Highlight overlay (background) */}
      <div
        ref={highlightRef}
        className="absolute inset-0 whitespace-pre-wrap break-words overflow-auto pointer-events-none p-3 font-mono text-sm leading-relaxed text-transparent border border-transparent rounded-md"
        style={{
          wordBreak: "break-word",
          overflowWrap: "break-word",
        }}
      >
        {renderHighlightedText()}
      </div>

      {/* Textarea (foreground) */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className="relative w-full bg-transparent resize-none p-3 font-mono text-sm leading-relaxed border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          caretColor: "black", // Cursor visível
          color: "transparent", // Texto invisível (overlay mostra colorido)
        }}
      />

      {/* Variables counter */}
      {variables.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted-foreground font-medium">
            {variables.length} variável{variables.length !== 1 ? "s" : ""} detectada
            {variables.length !== 1 ? "s" : ""}:
          </span>
          {variables.map((variable) => (
            <Badge
              key={variable}
              variant="outline"
              className="text-xs bg-blue-50 text-blue-700 border-blue-200"
            >
              {`{${variable}}`}
            </Badge>
          ))}
        </div>
      )}

      {/* Help text */}
      <p className="mt-2 text-xs text-muted-foreground">
        Use chaves para inserir variáveis dinâmicas, ex: {"{nomeEmpresa}"}, {"{email}"}
      </p>
    </div>
  );
}
