import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WizardState } from "@/types";

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

// Store para estados de UI globais (performance e UX)
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
