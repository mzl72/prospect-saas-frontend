import { create } from "zustand";

interface LeadGenerationState {
  // Etapa atual do wizard
  currentStep: number;

  // Dados do formulário
  tipoNegocio: string[];
  localizacao: string[];
  quantidade: 2 | 10 | 25 | 50 | 100 | 250 | 500;
  nivelServico: "basico" | "completo";

  // Sistema de créditos
  creditos: number;

  // Actions
  setCurrentStep: (step: number) => void;
  setTipoNegocio: (tipos: string[]) => void;
  setLocalizacao: (locais: string[]) => void;
  setQuantidade: (qty: 2 | 10 | 25 | 50 | 100 | 250 | 500) => void;
  setNivelServico: (nivel: "basico" | "completo") => void;
  debitarCreditos: (valor: number) => void;
}

export const useLeadStore = create<LeadGenerationState>((set) => ({
  currentStep: 1,
  tipoNegocio: [],
  localizacao: [],
  quantidade: 25,
  nivelServico: "basico",
  creditos: 150,

  setCurrentStep: (step) => set({ currentStep: step }),
  setTipoNegocio: (tipos) => set({ tipoNegocio: tipos }),
  setLocalizacao: (locais) => set({ localizacao: locais }),
  setQuantidade: (qty) => set({ quantidade: qty }),
  setNivelServico: (nivel) => set({ nivelServico: nivel }),
  debitarCreditos: (valor) =>
    set((state) => ({ creditos: state.creditos - valor })),
}));
