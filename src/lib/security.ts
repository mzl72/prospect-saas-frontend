/**
 * Security Layer - Rate Limiting por usuário + validações
 */

interface UserRateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
    lastAccess: number;
  };
}

const userStore: UserRateLimitStore = {};
const MAX_USER_ENTRIES = 50000;

// Cleanup a cada 10 minutos
setInterval(() => {
  const now = Date.now();
  const keys = Object.keys(userStore);

  keys.forEach(key => {
    if (userStore[key].resetTime < now) {
      delete userStore[key];
    }
  });

  if (Object.keys(userStore).length > MAX_USER_ENTRIES) {
    const sortedByAccess = Object.entries(userStore)
      .sort((a, b) => a[1].lastAccess - b[1].lastAccess);

    const toRemove = Math.floor(MAX_USER_ENTRIES * 0.3);
    for (let i = 0; i < toRemove; i++) {
      delete userStore[sortedByAccess[i][0]];
    }
  }
}, 10 * 60 * 1000);

export interface UserRateLimitConfig {
  userId: string;
  endpoint: string;
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  current: number;
}

/**
 * Rate limiting por usuário + endpoint
 */
export function checkUserRateLimit(config: UserRateLimitConfig): RateLimitResult {
  const { userId, endpoint, maxRequests, windowMs } = config;
  const key = `${endpoint}:${userId}`;
  const now = Date.now();

  let entry = userStore[key];

  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + windowMs,
      lastAccess: now,
    };
    userStore[key] = entry;
  }

  entry.lastAccess = now;
  entry.count++;

  return {
    allowed: entry.count <= maxRequests,
    remaining: Math.max(0, maxRequests - entry.count),
    resetTime: entry.resetTime,
    current: entry.count,
  };
}

/**
 * Headers de rate limit (RFC 6585)
 */
export function getUserRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.current + result.remaining),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.floor(result.resetTime / 1000)),
  };
}

/**
 * Validação de tamanho de string (previne DoS)
 */
export function validateStringLength(
  value: string | undefined | null,
  field: string,
  maxLength: number
): { valid: boolean; error?: string } {
  if (!value) return { valid: true };

  if (value.length > maxLength) {
    return {
      valid: false,
      error: `${field} excede o limite de ${maxLength} caracteres (atual: ${value.length})`,
    };
  }

  return { valid: true };
}

/**
 * Validação de payload size (previne JSON bombing)
 */
export function validatePayloadSize(
  bodyText: string,
  maxBytes: number = 1024 * 1024 // 1MB default
): { valid: boolean; error?: string } {
  const sizeInBytes = new Blob([bodyText]).size;

  if (sizeInBytes > maxBytes) {
    return {
      valid: false,
      error: `Payload muito grande: ${sizeInBytes} bytes (max: ${maxBytes})`,
    };
  }

  return { valid: true };
}

/**
 * Validação de array length (previne array flooding)
 */
export function validateArrayLength<T>(
  arr: T[] | undefined | null,
  field: string,
  maxLength: number
): { valid: boolean; error?: string } {
  if (!arr) return { valid: true };

  if (arr.length > maxLength) {
    return {
      valid: false,
      error: `${field} excede o limite de ${maxLength} itens (atual: ${arr.length})`,
    };
  }

  return { valid: true };
}

/**
 * Sanitização adicional para prevenir NoSQL injection
 * IMPORTANTE: Não sanitiza strings que parecem ser JSON válido
 */
export function sanitizeForDatabase(value: unknown): unknown {
  if (typeof value === 'string') {
    // Se parece ser JSON válido (começa com [ ou {), não sanitizar
    const trimmed = value.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        JSON.parse(trimmed);
        // É JSON válido, não sanitizar
        return value;
      } catch {
        // Não é JSON válido, continuar sanitização
      }
    }

    // Remove apenas $ isolado (previne NoSQL injection)
    // Não remove {} que são parte de templates/JSON
    return value.replace(/\$/g, '');
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeForDatabase);
  }

  if (value && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      // Não permitir keys que começam com $
      if (!key.startsWith('$')) {
        sanitized[key] = sanitizeForDatabase(val);
      }
    }
    return sanitized;
  }

  return value;
}

/**
 * Validação de CUID (IDs do Prisma)
 */
export function isValidCUID(id: string): boolean {
  return /^c[a-z0-9]{24}$/i.test(id);
}

/**
 * Previne timing attacks ao comparar tokens
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
