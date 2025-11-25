/**
 * Rate Limiting com Redis (OWASP A06:2025 - Insecure Design)
 * Substitui implementação em memória para suportar multi-instance
 */

import { redisGet, redisIncr, redisExpire } from "@/lib/redis-client";

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
 * Rate limiting por usuário + endpoint usando Redis
 */
export async function checkUserRateLimit(
  config: UserRateLimitConfig
): Promise<RateLimitResult> {
  const { userId, endpoint, maxRequests, windowMs } = config;
  const key = `ratelimit:${endpoint}:${userId}`;
  const now = Date.now();
  const resetTime = now + windowMs;

  try {
    // Verificar contador atual
    const currentStr = await redisGet(key);

    if (!currentStr) {
      // Primeira requisição na janela
      await redisIncr(key);
      await redisExpire(key, Math.ceil(windowMs / 1000));

      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime,
        current: 1,
      };
    }

    const current = parseInt(currentStr, 10);

    if (current >= maxRequests) {
      // Limite excedido
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        current,
      };
    }

    // Incrementar contador
    const newCount = await redisIncr(key);

    return {
      allowed: newCount <= maxRequests,
      remaining: Math.max(0, maxRequests - newCount),
      resetTime,
      current: newCount,
    };
  } catch (error) {
    console.error("[Rate Limit Redis] Error:", error);

    // Em caso de erro, permitir requisição mas logar
    return {
      allowed: true,
      remaining: maxRequests,
      resetTime,
      current: 0,
    };
  }
}

/**
 * Headers de rate limit (RFC 6585)
 */
export function getUserRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.current + result.remaining),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.floor(result.resetTime / 1000)),
  };
}
