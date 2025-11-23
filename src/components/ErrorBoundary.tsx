"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorId?: string;
}

/**
 * ErrorBoundary com logging estruturado e sanitização
 *
 * SECURITY (OWASP A09:2025 - Logging & Alerting):
 * - Logging estruturado com timestamp e errorId
 * - Sanitização de mensagens de erro (previne XSS)
 * - Stack traces apenas em dev (não expor em prod)
 * - Error ID único para correlação de logs
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Gerar ID único para correlação de logs
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    return { hasError: true, error, errorId };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // SECURITY (OWASP A09:2025): Logging estruturado
    const logEntry = {
      timestamp: new Date().toISOString(),
      errorId: this.state.errorId,
      errorName: error.name,
      // SECURITY: Sanitizar mensagem de erro (remover dados sensíveis)
      errorMessage: this.sanitizeErrorMessage(error.message),
      componentStack: errorInfo.componentStack?.split("\n").slice(0, 5).join("\n"), // Limitar stack
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
      url: typeof window !== "undefined" ? window.location.href : "unknown",
    };

    // Log estruturado (em produção, enviar para serviço de logging)
    console.error("[ErrorBoundary]", JSON.stringify(logEntry, null, 2));

    // TODO: Enviar para serviço de logging (Sentry, DataDog, etc)
    // if (process.env.NODE_ENV === "production") {
    //   sendToLoggingService(logEntry);
    // }
  }

  /**
   * SECURITY: Sanitiza mensagem de erro para prevenir XSS
   * Remove URLs, emails, tokens e outros dados sensíveis
   */
  private sanitizeErrorMessage(message: string): string {
    return message
      .replace(/https?:\/\/[^\s]+/g, "[URL]") // Remove URLs
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL]") // Remove emails
      .replace(/[A-Za-z0-9-_]{20,}/g, "[TOKEN]") // Remove possíveis tokens
      .replace(/<[^>]*>/g, "") // Remove HTML tags (XSS)
      .slice(0, 500); // Limitar tamanho
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-gray-900 rounded-lg shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Algo deu errado
            </h1>
            <p className="text-gray-300 mb-6">
              Ocorreu um erro inesperado. Tente recarregar a página.
            </p>

            {/* SECURITY: Apenas mostrar detalhes em dev */}
            {process.env.NODE_ENV === "development" && this.state.error && (
              <div className="mb-6 p-4 bg-red-50 rounded-md text-left">
                <p className="text-xs text-gray-500 mb-2">Error ID: {this.state.errorId}</p>
                <p className="text-sm font-mono text-red-800 break-all">
                  {/* SECURITY: Sanitizar mensagem antes de exibir */}
                  {this.sanitizeErrorMessage(this.state.error.toString())}
                </p>
              </div>
            )}

            {/* SECURITY: Em produção, mostrar apenas error ID */}
            {process.env.NODE_ENV === "production" && this.state.errorId && (
              <div className="mb-6 p-3 bg-gray-800 rounded-md">
                <p className="text-xs text-gray-400">
                  Código do erro: <span className="font-mono text-gray-300">{this.state.errorId}</span>
                </p>
              </div>
            )}

            <Button
              onClick={() => {
                this.setState({ hasError: false });
                window.location.assign("/");
              }}
              className="w-full"
            >
              Voltar para o início
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
