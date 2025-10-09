/**
 * Rate limiting simples em memória com LRU (Least Recently Used)
 * Previne abuso de APIs públicas e memory leaks
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
    lastAccess: number; // Para LRU
  };
}

const store: RateLimitStore = {};
const MAX_ENTRIES = 10000; // Limite máximo de IPs na memória

// Limpar entradas antigas a cada 5 minutos
setInterval(() => {
  const now = Date.now();
  const keys = Object.keys(store);

  // Remover entradas expiradas
  keys.forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });

  // Se ainda exceder o limite, aplicar LRU (remover menos usadas)
  if (Object.keys(store).length > MAX_ENTRIES) {
    console.warn(`[Rate Limit] Store exceeded ${MAX_ENTRIES} entries, applying LRU cleanup`);

    const sortedByAccess = Object.entries(store)
      .sort((a, b) => a[1].lastAccess - b[1].lastAccess);

    // Remover 20% das entradas mais antigas
    const entriesToRemove = Math.floor(MAX_ENTRIES * 0.2);
    for (let i = 0; i < entriesToRemove; i++) {
      delete store[sortedByAccess[i][0]];
    }

    console.log(`[Rate Limit] Removed ${entriesToRemove} old entries`);
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  /**
   * Número máximo de requisições permitidas
   */
  maxRequests: number;

  /**
   * Janela de tempo em milissegundos
   * @default 60000 (1 minuto)
   */
  windowMs?: number;

  /**
   * Identificador único (geralmente IP ou token)
   */
  identifier: string;
}

export interface RateLimitResult {
  /**
   * Se a requisição está dentro do limite
   */
  allowed: boolean;

  /**
   * Requisições restantes na janela atual
   */
  remaining: number;

  /**
   * Timestamp quando o limite será resetado
   */
  resetTime: number;

  /**
   * Total de requisições na janela atual
   */
  current: number;
}

/**
 * Verifica se uma requisição está dentro do rate limit
 */
export function checkRateLimit(config: RateLimitConfig): RateLimitResult {
  const { maxRequests, identifier, windowMs = 60000 } = config;
  const now = Date.now();

  // Buscar ou criar entrada
  let entry = store[identifier];

  if (!entry || entry.resetTime < now) {
    // Nova janela de tempo
    entry = {
      count: 0,
      resetTime: now + windowMs,
      lastAccess: now,
    };
    store[identifier] = entry;
  }

  // Atualizar último acesso (para LRU)
  entry.lastAccess = now;

  // Incrementar contador
  entry.count++;

  return {
    allowed: entry.count <= maxRequests,
    remaining: Math.max(0, maxRequests - entry.count),
    resetTime: entry.resetTime,
    current: entry.count,
  };
}

/**
 * Extrai IP da requisição para usar como identificador
 */
export function getClientIp(request: Request): string {
  // Tentar headers de proxy primeiro
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback para IP genérico (não ideal em produção)
  return 'unknown';
}

/**
 * Cria headers de resposta para rate limiting (RFC 6585)
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.current + result.remaining),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.floor(result.resetTime / 1000)),
  };
}
