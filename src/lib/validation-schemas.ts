/**
 * Schemas de validação Zod para DTOs
 * Centraliza validação de entrada em todas as rotas de API
 */

import { z } from 'zod';

/**
 * Schema para criação de campanha
 */
export const CreateCampaignSchema = z.object({
  titulo: z
    .string()
    .min(3, 'Título deve ter no mínimo 3 caracteres')
    .max(100, 'Título deve ter no máximo 100 caracteres')
    .optional(),

  tipoNegocio: z
    .array(z.string())
    .min(1, 'Selecione pelo menos um tipo de negócio')
    .max(10, 'Máximo de 10 tipos de negócio'),

  localizacao: z
    .array(z.string())
    .min(1, 'Selecione pelo menos uma localização')
    .max(10, 'Máximo de 10 localizações'),

  quantidade: z
    .number()
    .int('Quantidade deve ser um número inteiro')
    .refine(
      (val) => [4, 20, 40, 100, 200].includes(val),
      'Quantidade deve ser 4, 20, 40, 100 ou 200'
    ),

  nivelServico: z.enum(['basico', 'completo'], {
    message: 'Nível de serviço deve ser "basico" ou "completo"',
  }),
});

export type CreateCampaignDto = z.infer<typeof CreateCampaignSchema>;

/**
 * Schema para validação de lead extraído do webhook
 * URLs opcionais aceitam null, undefined ou strings válidas (não vazias)
 */
export const LeadDataSchema = z.object({
  apifyId: z.string().min(1),
  title: z.string().min(1),
  address: z.string().nullable().optional(),
  website: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
  phone: z.string().nullable().optional(),
  email: z.union([z.string().email(), z.literal(''), z.null()]).optional(),
  category: z.string().nullable().optional(),
  totalScore: z.union([z.string(), z.number()]).nullable().optional(),
  reviewsCount: z.union([z.string(), z.number()]).nullable().optional(),
  url: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
  linkedinUrl: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
  twitterUrl: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
  instagramUrl: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
  facebookUrl: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
  youtubeUrl: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
  tiktokUrl: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
  pinterestUrl: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
});

export type LeadData = z.infer<typeof LeadDataSchema>;

/**
 * Schema para validação de lead enrichment (dados IA)
 * SECURITY (OWASP A06:2025): Limites de tamanho para prevenir DoS
 */
export const LeadEnrichmentSchema = z.object({
  leadId: z.string().regex(/^c[a-z0-9]{24}$/i, 'CUID inválido').optional(),
  apifyId: z.string().min(1).optional(),
  companyName: z.string().min(1).optional(),

  // Dados enriquecidos com limites de tamanho (50KB por campo)
  companyResearch: z.string().max(50000, 'companyResearch muito grande (max 50KB)').optional(),
  strategicAnalysis: z.string().max(50000, 'strategicAnalysis muito grande (max 50KB)').optional(),
  personalization: z.string().max(50000, 'personalization muito grande (max 50KB)').optional(),
  analysisLink: z.string().url().max(2048, 'URL muito longa').optional(),

  // Campos opcionais atualizáveis
  email: z.union([z.string().email(), z.literal(''), z.null()]).optional(),
  telefone: z.string().max(50).nullable().optional(),
  linkedinUrl: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
  twitterUrl: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
  instagramUrl: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
  facebookUrl: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
  youtubeUrl: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
  tiktokUrl: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
  pinterestUrl: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
}).refine(
  (data) => data.leadId || data.apifyId || data.companyName,
  { message: 'leadId, apifyId ou companyName são obrigatórios' }
);

export type LeadEnrichmentData = z.infer<typeof LeadEnrichmentSchema>;

/**
 * Schema para criação de template
 * SECURITY: Validação de tamanho para prevenir DoS
 */
export const CreateTemplateSchema = z.object({
  type: z.enum(['EMAIL', 'WHATSAPP', 'PROMPT_IA'], {
    message: 'Tipo deve ser EMAIL, WHATSAPP ou PROMPT_IA',
  }),
  name: z
    .string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .trim(),
  // Campos estruturados (novo) - JSON com campos customizáveis
  fields: z.record(z.string(), z.string()).optional().nullable(),
  // Campos legacy (antigos) - para retrocompatibilidade
  subject: z
    .string()
    .max(200, 'Assunto muito longo (max 200 caracteres)')
    .trim()
    .optional()
    .nullable(),
  content: z
    .string()
    .min(10, 'Conteúdo muito curto (min 10 caracteres)')
    .max(10000, 'Conteúdo muito longo (max 10KB)')
    .trim()
    .optional()
    .nullable(),
});

export type CreateTemplateDto = z.infer<typeof CreateTemplateSchema>;

/**
 * Schema para atualização de template
 * Todos os campos são opcionais
 *
 * SECURITY:
 * - Validação de tipos para prevenir injection
 * - Limite de tamanho para fields (max 50 campos)
 */
export const UpdateTemplateSchema = CreateTemplateSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type UpdateTemplateDto = z.infer<typeof UpdateTemplateSchema>;
