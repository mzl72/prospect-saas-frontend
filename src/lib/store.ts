import { create } from "zustand";

interface WizardState {
  // UI state apenas
  currentStep: number;
  tipoNegocio: string;
  localizacao: string;
  quantidade: 4 | 20 | 40 | 100 | 200;
  nivelServico: "basico" | "completo";

  // Actions para UI
  setCurrentStep: (step: number) => void;
  setTipoNegocio: (tipos: string) => void;
  setLocalizacao: (locais: string) => void;
  setQuantidade: (qty: 4 | 20 | 40 | 100 | 200) => void;
  setNivelServico: (nivel: "basico" | "completo") => void;
  resetWizard: () => void;
}

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
