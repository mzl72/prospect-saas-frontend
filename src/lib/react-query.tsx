"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

// Exportar para uso em webhooks/invalidações globais
let globalQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (!globalQueryClient && typeof window !== 'undefined') {
    console.warn('[QueryClient] Accessed before initialization. This may cause cache invalidation to fail.');
  }
  return globalQueryClient;
}

export function ReactQueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () => {
      const client = new QueryClient({
        defaultOptions: {
          queries: {
            // Reduzido para 3min - dados atualizados a cada 5min pelo cron
            // Evita mostrar dados muito desatualizados ao usuário
            staleTime: 3 * 60 * 1000, // 3 minutos
            gcTime: 10 * 60 * 1000, // 10 minutos (cache)
            retry: (failureCount, error) => {
              // Não retenta erros 4xx (erro do cliente)
              if (error instanceof Error) {
                const statusMatch = error.message.match(/status.*?(\d{3})/);
                if (statusMatch) {
                  const status = parseInt(statusMatch[1]);
                  if (status >= 400 && status < 500) return false;
                }
              }
              // Retenta até 3 vezes para erros de rede ou 5xx
              return failureCount < 3;
            },
            retryDelay: (attemptIndex) => {
              // Backoff exponencial: 1s, 2s, 4s
              return Math.min(1000 * 2 ** attemptIndex, 30000);
            },
            refetchOnWindowFocus: false, // Não buscar ao focar janela
            refetchOnMount: true, // Atualiza ao montar componente
            refetchOnReconnect: true, // Atualiza ao reconectar internet
          },
          mutations: {
            retry: false, // Mutations não devem ser retentadas automaticamente
          },
        },
      });

      globalQueryClient = client; // Armazena referência global
      return client;
    }
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
