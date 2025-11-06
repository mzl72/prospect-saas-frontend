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

  // Dados em tempo real (leads, emails)
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
  COMPLETO_SENDING_BUFFER: 1.3, // +30% para campanhas COMPLETO (tempo de envio de emails/WhatsApp)
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
  let timeoutSeconds = estimatedSeconds * CAMPAIGN_TIMEOUT.TIMEOUT_MULTIPLIER;

  // Para campanhas COMPLETO, adicionar buffer de 30% para tempo de envio de emails/WhatsApp
  if (tipo === "COMPLETO") {
    timeoutSeconds = Math.ceil(timeoutSeconds * CAMPAIGN_TIMEOUT.COMPLETO_SENDING_BUFFER);
  }

  const timeoutDate = new Date(Date.now() + timeoutSeconds * 1000);

  return {
    estimatedSeconds,
    timeoutSeconds,
    timeoutDate,
  };
}

// Configurações de envio de emails
export const EMAIL_TIMING = {
  // Delays entre emails (em milissegundos)
  EMAIL_1_DELAY: 0, // Imediato após enrichment
  EMAIL_2_DELAY: 3 * 24 * 60 * 60 * 1000, // 3 dias após Email 1
  EMAIL_3_DELAY: 7 * 24 * 60 * 60 * 1000, // 7 dias após Email 2

  // Configurações de processamento
  BATCH_SIZE: 50, // Max emails por execução do cron
  RATE_LIMIT_DELAY: 100, // Delay entre emails individuais (ms)

  // Retry logic
  RETRY_ATTEMPTS: 3, // Tentativas em caso de falha
  RETRY_DELAY: 5 * 60 * 1000, // 5 minutos entre retries
} as const;

// Mapeamento de status de campanhas
export const CAMPAIGN_STATUS_LABELS = {
  PROCESSING: 'processando',
  EXTRACTION_COMPLETED: 'extração concluída',
  COMPLETED: 'concluído',
  FAILED: 'falhou',
} as const;

// Mapeamento de status de leads
export const LEAD_STATUS_LABELS = {
  EXTRACTED: 'Extraído',
  ENRICHED: 'Enriquecido',
  EMAIL_1_SENT: 'Email 1 Enviado',
  EMAIL_2_SENT: 'Email 2 Enviado',
  EMAIL_3_SENT: 'Email 3 Enviado',
  WHATSAPP_1_SENT: 'WhatsApp 1 Enviado',
  WHATSAPP_2_SENT: 'WhatsApp 2 Enviado',
  WHATSAPP_3_SENT: 'WhatsApp 3 Enviado',
  REPLIED: 'Respondeu',
  OPTED_OUT: 'Opt-out',
  BOUNCED: 'Bounced',
} as const;

// Cores de status de leads (Tailwind classes)
export const LEAD_STATUS_COLORS = {
  EXTRACTED: 'bg-blue-100 text-blue-800',
  ENRICHED: 'bg-purple-100 text-purple-800',
  EMAIL_1_SENT: 'bg-cyan-100 text-cyan-800',
  EMAIL_2_SENT: 'bg-indigo-100 text-indigo-800',
  EMAIL_3_SENT: 'bg-violet-100 text-violet-800',
  WHATSAPP_1_SENT: 'bg-green-100 text-green-800',
  WHATSAPP_2_SENT: 'bg-teal-100 text-teal-800',
  WHATSAPP_3_SENT: 'bg-emerald-100 text-emerald-800',
  REPLIED: 'bg-lime-100 text-lime-800',
  OPTED_OUT: 'bg-gray-100 text-gray-800',
  BOUNCED: 'bg-red-100 text-red-800',
} as const;

// Status de emails
export const EMAIL_STATUS_LABELS = {
  PENDING: 'Pendente',
  SENT: 'Enviado',
  OPENED: 'Aberto',
  REPLIED: 'Respondido',
  BOUNCED: 'Bounce',
  FAILED: 'Falhou',
} as const;

// Cores de status de emails
export const EMAIL_STATUS_COLORS = {
  PENDING: 'bg-gray-100 text-gray-800',
  SENT: 'bg-blue-100 text-blue-800',
  OPENED: 'bg-cyan-100 text-cyan-800',
  REPLIED: 'bg-green-100 text-green-800',
  BOUNCED: 'bg-red-100 text-red-800',
  FAILED: 'bg-red-100 text-red-800',
} as const;
