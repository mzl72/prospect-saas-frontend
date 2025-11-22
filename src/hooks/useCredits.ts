import { useQuery } from "@tanstack/react-query";

/**
 * Hook para gerenciar créditos do usuário
 * Refetch automático a cada 30s para manter saldo atualizado
 */
export function useCredits() {
  return useQuery({
    queryKey: ["credits"],
    queryFn: async () => {
      const response = await fetch("/api/users/credits");
      const data = await response.json();
      return data.success ? data.credits : 0;
    },
    refetchInterval: 30000, // 30 segundos
    staleTime: 25000, // 25 segundos
  });
}
