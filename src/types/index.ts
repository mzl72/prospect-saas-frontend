// ========================================
// DATABASE MODELS (Re-exported from Prisma Client)
// SINGLE SOURCE OF TRUTH: Prisma schema
// ========================================

import type {
  User as PrismaUser,
  UserSettings as PrismaUserSettings,
  Campaign as PrismaCampaign,
  Lead as PrismaLead,
  Email as PrismaEmail,
  WhatsAppMessage as PrismaWhatsAppMessage,
  CampaignStatus,
  CampaignType,
  LeadStatus,
  EmailStatus,
  WhatsAppStatus,
  CadenceType,
} from '@prisma/client';

// Re-export Prisma types as-is (no duplicação)
export type User = PrismaUser;
export type UserSettings = PrismaUserSettings;
export type Campaign = PrismaCampaign;
export type Lead = PrismaLead;
export type Email = PrismaEmail;
export type WhatsAppMessage = PrismaWhatsAppMessage;

// Re-export enums
export type {
  CampaignStatus,
  CampaignType,
  LeadStatus,
  EmailStatus,
  WhatsAppStatus,
  CadenceType,
};

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
  leadsRequested?: number;
  leadsCreated?: number;
  leadsDuplicated?: number;
  creditsRefunded?: number;
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
