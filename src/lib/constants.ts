/**
 * Constantes centralizadas do projeto
 * Mantém valores importantes em um único lugar para fácil manutenção
 */

// Preços por lead
export const PRICING = {
  BASICO: 0.25,
  COMPLETO: 1.0,
} as const;

// Quantidades permitidas de leads por campanha
export const ALLOWED_QUANTITIES = [4, 20, 40, 100, 200] as const;
export type AllowedQuantity = typeof ALLOWED_QUANTITIES[number];

// Tempos de cache do React Query (em milissegundos)
export const CACHE_TIMES = {
  // Dados estáticos (configurações, settings)
  STATIC_DATA: 10 * 60 * 1000, // 10 minutos

  // Dados dinâmicos (campanhas, listas)
  DYNAMIC_DATA: 30 * 1000, // 30 segundos

  // Dados em tempo real (leads)
  REALTIME_DATA: 5 * 1000, // 5 segundos

  // Créditos do usuário
  USER_CREDITS: 5 * 60 * 1000, // 5 minutos
} as const;

// Tempos de garbage collection (gcTime)
export const GC_TIMES = {
  STATIC_DATA: 15 * 60 * 1000, // 15 minutos
  DYNAMIC_DATA: 10 * 60 * 1000, // 10 minutos
  REALTIME_DATA: 5 * 60 * 1000, // 5 minutos
} as const;

// Configurações de polling
export const POLLING = {
  INTERVAL: 10 * 1000, // 10 segundos
  MAX_TIME: 30 * 60 * 1000, // 30 minutos timeout
} as const;

// Configurações de timeout de campanha
export const CAMPAIGN_TIMEOUT = {
  BASICO_SECONDS_PER_LEAD: 20,  // apenas extração
  COMPLETO_SECONDS_PER_LEAD: 80, // extração (20s) + enriquecimento IA (60s)
  TIMEOUT_MULTIPLIER: 2, // dobro do tempo estimado
} as const;

/**
 * Calcula o tempo estimado e o timeout para uma campanha
 * @param quantidade Número de leads
 * @param tipo "BASICO" ou "COMPLETO"
 * @returns { estimatedSeconds, timeoutSeconds, timeoutDate }
 */
export function calculateCampaignTimeout(
  quantidade: number,
  tipo: "BASICO" | "COMPLETO"
): {
  estimatedSeconds: number;
  timeoutSeconds: number;
  timeoutDate: Date;
} {
  // Validações
  if (typeof quantidade !== 'number' || quantidade <= 0 || !Number.isFinite(quantidade)) {
    throw new Error(`quantidade deve ser um número positivo, recebido: ${quantidade}`)
  }

  if (tipo !== "BASICO" && tipo !== "COMPLETO") {
    throw new Error(`tipo deve ser "BASICO" ou "COMPLETO", recebido: ${tipo}`)
  }

  const secondsPerLead =
    tipo === "BASICO"
      ? CAMPAIGN_TIMEOUT.BASICO_SECONDS_PER_LEAD
      : CAMPAIGN_TIMEOUT.COMPLETO_SECONDS_PER_LEAD;

  const estimatedSeconds = quantidade * secondsPerLead;
  const timeoutSeconds = estimatedSeconds * CAMPAIGN_TIMEOUT.TIMEOUT_MULTIPLIER;

  const timeoutDate = new Date(Date.now() + timeoutSeconds * 1000);

  return {
    estimatedSeconds,
    timeoutSeconds,
    timeoutDate,
  };
}

// Mapeamento de status de campanhas
export const CAMPAIGN_STATUS_LABELS = {
  PROCESSING: 'Processando',
  EXTRACTION_COMPLETED: 'Extração Concluída',
  COMPLETED: 'Concluído',
  FAILED: 'Falhou',
} as const;

// Mapeamento de status de leads
export const LEAD_STATUS_LABELS = {
  EXTRACTED: 'Extraído',
  ENRICHED: 'Enriquecido',
} as const;

// Cores de status de leads (Tailwind classes)
export const LEAD_STATUS_COLORS = {
  EXTRACTED: 'bg-blue-100 text-blue-800',
  ENRICHED: 'bg-purple-100 text-purple-800',
} as const;
