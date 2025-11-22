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
