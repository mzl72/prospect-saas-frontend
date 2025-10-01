// ========================================
// DATABASE MODELS (from Prisma schema)
// ========================================

export interface User {
  id: string;
  email: string;
  name: string | null;
  credits: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSettings {
  id: string;
  userId: string;

  // Templates de Pesquisa e Análise
  templatePesquisa: string;
  templateAnaliseEmpresa: string;
  informacoesPropria: string;

  // Prompt Customization
  promptOverview: string;
  promptTatica: string;
  promptDiretrizes: string;

  // Email Templates
  emailTitulo1: string;
  emailCorpo1: string;
  emailCorpo2: string;
  emailTitulo3: string;
  emailCorpo3: string;

  // Informações Críticas da Empresa
  nomeEmpresa: string;
  assinatura: string;
  telefoneContato: string;
  websiteEmpresa: string;
  senderEmails: string; // JSON array stored as string

  createdAt: Date;
  updatedAt: Date;
}

export interface Campaign {
  id: string;
  userId: string;
  title: string;
  status: CampaignStatus;
  quantidade: number;
  tipo: CampaignType;
  termos: string;
  locais: string;
  planilhaUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Lead {
  id: string;
  campaignId: string;
  nomeEmpresa: string;
  endereco: string | null;
  website: string | null;
  telefone: string | null;
  categoria: string | null;
  totalReviews: string | null;
  notaMedia: string | null;
  linkGoogleMaps: string | null;
  createdAt: Date;
}

// ========================================
// ENUMS
// ========================================

export type CampaignStatus = "PROCESSING" | "COMPLETED" | "FAILED";
export type CampaignType = "BASICO" | "COMPLETO";

// ========================================
// API REQUEST/RESPONSE TYPES
// ========================================

export interface CreateCampaignRequest {
  titulo: string;
  tipoNegocio: string[];
  localizacao: string[];
  quantidade: number;
  nivelServico: "basico" | "completo";
}

export interface CampaignResponse {
  id: string;
  title: string;
  status: string;
  quantidade: number;
  tipo: string;
  createdAt: string;
  planilhaUrl: string | null;
  _count?: {
    leads: number;
  };
}

export interface CreditsResponse {
  success: boolean;
  credits: number;
}

export interface SettingsResponse {
  success: boolean;
  settings: UserSettings | null;
}

// ========================================
// FRONTEND-ONLY TYPES
// ========================================

export interface WizardState {
  currentStep: number;
  tipoNegocio: string;
  localizacao: string;
  quantidade: 4 | 20 | 40 | 100 | 200;
  nivelServico: "basico" | "completo";
  setCurrentStep: (step: number) => void;
  setTipoNegocio: (tipo: string) => void;
  setLocalizacao: (local: string) => void;
  setQuantidade: (qtd: 4 | 20 | 40 | 100 | 200) => void;
  setNivelServico: (nivel: "basico" | "completo") => void;
  resetWizard: () => void;
}
