"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { extractVariables, renderTemplate } from "@/lib/template-helpers";

interface TemplatePreviewProps {
  content: string;
  subject?: string | null;
  type: "EMAIL" | "WHATSAPP" | "PROMPT_IA";
  className?: string;
}

/**
 * Preview de template com dados de exemplo
 * Permite alternar entre dados exemplo e personalizados
 */
export function TemplatePreview({
  content,
  subject,
  type,
  className = "",
}: TemplatePreviewProps) {
  const [showPreview, setShowPreview] = useState(true);
  const [customData, setCustomData] = useState<Record<string, string>>({});

  // Extrair variáveis do content e subject
  const variables = useMemo(() => {
    const contentVars = extractVariables(content);
    const subjectVars = subject ? extractVariables(subject) : [];
    return Array.from(new Set([...contentVars, ...subjectVars]));
  }, [content, subject]);

  // Dados de exemplo para preview
  const sampleData: Record<string, string> = {
    nomeEmpresa: "Acme Corp",
    nomeContato: "João Silva",
    email: "joao@acme.com",
    telefone: "(11) 98765-4321",
    website: "https://acme.com",
    cargo: "CEO",
    categoria: "Tecnologia",
    endereco: "São Paulo, SP",
    nomeVendedor: "Maria Santos",
    nossaEmpresa: "Prospect SaaS",
    cargoVendedor: "Executiva de Vendas",
    telefoneVendedor: "(11) 91234-5678",
    beneficio: "aumentar suas vendas em 300%",
    nossaSolucao: "plataforma de automação de vendas",
    redesSociais: "LinkedIn, Instagram, Facebook",
  };

  // Dados finais (custom ou sample)
  const finalData = useMemo(() => {
    const data: Record<string, string> = {};
    for (const variable of variables) {
      data[variable] = customData[variable] || sampleData[variable] || `[${variable}]`;
    }
    return data;
  }, [variables, customData, sampleData]);

  // Renderizar preview
  const renderedSubject = subject ? renderTemplate(subject, finalData) : null;
  const renderedContent = renderTemplate(content, finalData);

  return (
    <div className={className}>
      {/* Toggle Preview */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Preview</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
        >
          {showPreview ? (
            <>
              <EyeOff className="w-4 h-4 mr-2" />
              Ocultar
            </>
          ) : (
            <>
              <Eye className="w-4 h-4 mr-2" />
              Mostrar
            </>
          )}
        </Button>
      </div>

      {showPreview && (
        <div className="space-y-4">
          {/* Custom Data Inputs */}
          {variables.length > 0 && (
            <Card className="bg-muted/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Dados para Preview
                  <span className="text-xs text-muted-foreground ml-2">
                    (deixe vazio para usar dados de exemplo)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {variables.slice(0, 6).map((variable) => (
                    <div key={variable} className="space-y-1">
                      <Label htmlFor={`preview-${variable}`} className="text-xs">
                        {variable}
                      </Label>
                      <Input
                        id={`preview-${variable}`}
                        value={customData[variable] || ""}
                        onChange={(e) =>
                          setCustomData((prev) => ({
                            ...prev,
                            [variable]: e.target.value,
                          }))
                        }
                        placeholder={sampleData[variable] || `Ex: ${variable}`}
                        className="h-8 text-sm"
                      />
                    </div>
                  ))}
                </div>
                {variables.length > 6 && (
                  <p className="text-xs text-muted-foreground">
                    +{variables.length - 6} variáveis adicionais usando dados de exemplo
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Rendered Preview */}
          <Card className="border-2 border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Preview Renderizado</CardTitle>
                <Badge variant="outline" className="text-xs">
                  {type === "EMAIL"
                    ? "Email"
                    : type === "WHATSAPP"
                    ? "WhatsApp"
                    : "Prompt IA"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* Subject (apenas EMAIL) */}
              {type === "EMAIL" && renderedSubject && (
                <div className="mb-3 pb-3 border-b border-border">
                  <p className="text-xs text-muted-foreground mb-1">Assunto:</p>
                  <p className="font-semibold text-foreground">{renderedSubject}</p>
                </div>
              )}

              {/* Content */}
              <div
                className={`whitespace-pre-wrap text-sm ${
                  type === "WHATSAPP"
                    ? "bg-green-50 p-4 rounded-lg border border-green-200"
                    : type === "PROMPT_IA"
                    ? "bg-purple-50 p-4 rounded-lg border border-purple-200 font-mono text-xs"
                    : "bg-white p-4 rounded-lg border border-border"
                }`}
              >
                {renderedContent || (
                  <span className="text-muted-foreground italic">
                    Digite um template para ver o preview...
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Variables Legend */}
          {variables.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center text-xs text-muted-foreground">
              <span className="font-medium">Variáveis detectadas:</span>
              {variables.map((variable) => (
                <code
                  key={variable}
                  className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200"
                >
                  {`{${variable}}`}
                </code>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
