// ========================================
// DATABASE MODELS (Re-exported from Prisma Client)
// SINGLE SOURCE OF TRUTH: Prisma schema
// ========================================

import type {
  User as PrismaUser,
  Campaign as PrismaCampaign,
  Lead as PrismaLead,
  CampaignStatus,
  CampaignType,
  LeadStatus,
} from '@prisma/client';

// Re-export Prisma types as-is (no duplicação)
export type User = PrismaUser;
export type Campaign = PrismaCampaign;
export type Lead = PrismaLead;

// Re-export enums
export type {
  CampaignStatus,
  CampaignType,
  LeadStatus,
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

// ========================================
// CAMPAIGN UTILITIES TYPES
// ========================================

export interface CampaignStats {
  total: number;
  extracted: number;
  enriched: number;
}

// ========================================
// VALIDATION TYPES (Zod schemas)
// ========================================

export type {
  CreateCampaignDto,
  LeadData
} from '@/lib/validation-schemas';
