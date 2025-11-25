/**
 * Rate limiting específico para autenticação
 * Proteção contra brute force attacks
 */

interface LoginAttempt {
  count: number;
  resetTime: number;
  lastAttempt: number;
  blockedUntil?: number;
}

const loginAttempts = new Map<string, LoginAttempt>();
const MAX_LOGIN_ATTEMPTS = 5; // 5 tentativas
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const BLOCK_DURATION_MS = 30 * 60 * 1000; // Bloquear por 30 minutos após exceder

// Cleanup a cada 30 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, attempt] of loginAttempts.entries()) {
    if (attempt.resetTime < now && (!attempt.blockedUntil || attempt.blockedUntil < now)) {
      loginAttempts.delete(key);
    }
  }
}, 30 * 60 * 1000);

export interface LoginRateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  blockedUntil?: number;
}

/**
 * Verifica rate limit para tentativas de login
 * @param identifier Email ou IP do usuário
 */
export function checkLoginRateLimit(identifier: string): LoginRateLimitResult {
  const now = Date.now();
  const normalizedId = identifier.toLowerCase().trim();

  let attempt = loginAttempts.get(normalizedId);

  // Se está bloqueado, retornar bloqueio
  if (attempt?.blockedUntil && attempt.blockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: attempt.blockedUntil,
      blockedUntil: attempt.blockedUntil,
    };
  }

  // Se passou da janela de tempo, resetar
  if (!attempt || attempt.resetTime < now) {
    attempt = {
      count: 0,
      resetTime: now + WINDOW_MS,
      lastAttempt: now,
    };
    loginAttempts.set(normalizedId, attempt);
  }

  attempt.count++;
  attempt.lastAttempt = now;

  // Se excedeu, bloquear
  if (attempt.count > MAX_LOGIN_ATTEMPTS) {
    attempt.blockedUntil = now + BLOCK_DURATION_MS;
    loginAttempts.set(normalizedId, attempt);

    return {
      allowed: false,
      remaining: 0,
      resetTime: attempt.blockedUntil,
      blockedUntil: attempt.blockedUntil,
    };
  }

  return {
    allowed: attempt.count <= MAX_LOGIN_ATTEMPTS,
    remaining: Math.max(0, MAX_LOGIN_ATTEMPTS - attempt.count),
    resetTime: attempt.resetTime,
  };
}

/**
 * Reseta contador de tentativas (após login bem-sucedido)
 */
export function resetLoginAttempts(identifier: string): void {
  const normalizedId = identifier.toLowerCase().trim();
  loginAttempts.delete(normalizedId);
}

/**
 * Obtém headers de rate limit para resposta
 */
export function getLoginRateLimitHeaders(result: LoginRateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(MAX_LOGIN_ATTEMPTS),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.floor(result.resetTime / 1000)),
  };

  if (result.blockedUntil) {
    headers['Retry-After'] = String(Math.ceil((result.blockedUntil - Date.now()) / 1000));
  }

  return headers;
}
