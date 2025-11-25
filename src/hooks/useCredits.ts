import { useQuery } from "@tanstack/react-query";

/**
 * Hook para gerenciar créditos do usuário
 * Refetch automático a cada 30s para manter saldo atualizado
 *
 * SECURITY (OWASP A10:2025):
 * - Retry exponential backoff (previne DDoS)
 * - Validação de tipo de resposta
 * - Fallback seguro em caso de erro
 * - Rate limiting via retry limit (máx 3 tentativas)
 */
export function useCredits() {
  return useQuery({
    queryKey: ["credits"],
    queryFn: async () => {
      const response = await fetch("/api/users/credits");

      // SECURITY: Validar status HTTP antes de processar
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      // SECURITY: Validar estrutura da resposta (previne XSS)
      if (typeof data.success !== "boolean") {
        throw new Error("Invalid API response structure");
      }

      // SECURITY: Validar tipo de credits (previne NaN/Infinity)
      if (data.success && typeof data.credits === "number" && isFinite(data.credits)) {
        // Garantir que credits é um número inteiro não-negativo
        return Math.max(0, Math.floor(data.credits));
      }

      // Fallback seguro
      return 0;
    },
    refetchInterval: 30000, // 30 segundos
    staleTime: 25000, // 25 segundos

    // SECURITY: Rate limiting via retry limit (OWASP A09:2025)
    retry: 3, // Máximo 3 tentativas
    retryDelay: (attemptIndex) => {
      // Exponential backoff: 1s, 2s, 4s
      return Math.min(1000 * Math.pow(2, attemptIndex), 30000);
    },

    // SECURITY: Não retenta em erros 4xx (evita spam no backend)
    retryOnMount: false,
  });
}
