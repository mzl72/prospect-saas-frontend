/**
 * Estado Global com Zustand
 *
 * Decisões de arquitetura:
 *
 * 1. **useWizardStore (NÃO persistido)**
 *    - Armazena estado temporário do wizard de criação de campanha
 *    - Não usa persist() porque o wizard é um fluxo único de sessão
 *    - Estado é resetado após criar campanha (melhor UX)
 *    - Dados críticos são salvos na API, não no localStorage
 *
 * 2. **useUIStore (PERSISTIDO com partialize)**
 *    - Armazena preferências de UI que devem persistir entre sessões
 *    - Usa persist() para manter filtros e configurações do usuário
 *    - partialize() persiste apenas: autoRefreshEnabled, leadFilters
 *    - NÃO persiste: newDataAvailable (notificações são voláteis)
 *    - Razão: Melhorar UX ao retornar à página
 *
 * Por que não usar Context API?
 * - Zustand tem melhor performance (sem re-renders desnecessários)
 * - API mais simples e menos boilerplate
 * - Suporte nativo a persist middleware
 * - Melhor DevTools e debugging
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WizardState } from "@/types";

/**
 * Store do Wizard (Não Persistido)
 * Estado temporário do fluxo de criação de campanha
 */
export const useWizardStore = create<WizardState>((set) => ({
  // Estado inicial
  currentStep: 1,
  tipoNegocio: "",
  localizacao: "",
  quantidade: 20,
  nivelServico: "basico",

  // Actions
  setCurrentStep: (step) => set({ currentStep: step }),
  setTipoNegocio: (tipos) => set({ tipoNegocio: tipos }),
  setLocalizacao: (locais) => set({ localizacao: locais }),
  setQuantidade: (qty) => set({ quantidade: qty }),
  setNivelServico: (nivel) => set({ nivelServico: nivel }),

  // Reset wizard após criar campanha
  resetWizard: () =>
    set({
      currentStep: 1,
      tipoNegocio: "",
      localizacao: "",
      quantidade: 20,
      nivelServico: "basico",
    }),
}));

/**
 * Store de UI (Persistido com partialize)
 * Preferências e estado de UI que devem persistir entre sessões
 */
interface UIState {
  // Auto-refresh settings
  autoRefreshEnabled: Record<string, boolean>; // campaignId -> enabled
  setAutoRefresh: (campaignId: string, enabled: boolean) => void;

  // Notificações de webhooks recebidos (toast/badge)
  newDataAvailable: Record<string, boolean>; // campaignId -> hasNewData
  markDataAsRead: (campaignId: string) => void;
  markNewDataAvailable: (campaignId: string) => void;

  // Filtros persistentes na tabela de leads
  leadFilters: Record<
    string,
    {
      status?: string;
      searchQuery?: string;
    }
  >;
  setLeadFilter: (
    campaignId: string,
    filters: { status?: string; searchQuery?: string }
  ) => void;
  clearLeadFilters: (campaignId: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      autoRefreshEnabled: {},
      setAutoRefresh: (campaignId, enabled) =>
        set((state) => ({
          autoRefreshEnabled: {
            ...state.autoRefreshEnabled,
            [campaignId]: enabled,
          },
        })),

      newDataAvailable: {},
      markDataAsRead: (campaignId) =>
        set((state) => ({
          newDataAvailable: {
            ...state.newDataAvailable,
            [campaignId]: false,
          },
        })),
      markNewDataAvailable: (campaignId) =>
        set((state) => ({
          newDataAvailable: {
            ...state.newDataAvailable,
            [campaignId]: true,
          },
        })),

      leadFilters: {},
      setLeadFilter: (campaignId, filters) =>
        set((state) => ({
          leadFilters: {
            ...state.leadFilters,
            [campaignId]: {
              ...state.leadFilters[campaignId],
              ...filters,
            },
          },
        })),
      clearLeadFilters: (campaignId) =>
        set((state) => ({
          leadFilters: {
            ...state.leadFilters,
            [campaignId]: {},
          },
        })),
    }),
    {
      name: "prospect-ui-storage", // localStorage key
      partialize: (state) => ({
        // Persistir apenas filtros e auto-refresh, não notificações
        autoRefreshEnabled: state.autoRefreshEnabled,
        leadFilters: state.leadFilters,
      }),
    }
  )
);
