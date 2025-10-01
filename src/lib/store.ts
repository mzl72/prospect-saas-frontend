import { create } from "zustand";
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
