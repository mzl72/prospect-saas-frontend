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
 * Textarea com contador de variáveis {variavel}
 * NOTA: Overlay visual removido para evitar problemas de cursor
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
  const [variables, setVariables] = useState<string[]>([]);

  // Extrair variáveis quando o valor mudar
  useEffect(() => {
    const extracted = extractVariables(value);
    setVariables(extracted);
  }, [value]);

  return (
    <div className={className}>
      {/* Textarea simples (sem overlay para evitar problemas de cursor) */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className="w-full resize-y p-3 font-mono text-sm leading-relaxed border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-foreground bg-white"
        style={{
          minHeight: `${rows * 1.5}rem`,
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
