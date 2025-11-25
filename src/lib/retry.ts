/**
 * Retry utility com exponential backoff
 * OWASP A10:2025 - Mishandling of Exceptional Conditions
 */

import { logger } from "./logger";

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: unknown) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  shouldRetry: (error: unknown) => {
    // Retry em erros de rede, timeouts, 5xx
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes("network") ||
        message.includes("timeout") ||
        message.includes("econnrefused") ||
        message.includes("enotfound") ||
        message.includes("fetch failed")
      );
    }

    // Retry em respostas HTTP 5xx
    if (typeof error === "object" && error !== null && "status" in error) {
      const status = (error as { status: number }).status;
      return status >= 500 && status < 600;
    }

    return false;
  },
};

/**
 * Delay com Promise
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calcula delay com exponential backoff + jitter
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  multiplier: number
): number {
  const exponentialDelay = initialDelay * Math.pow(multiplier, attempt - 1);
  const cappedDelay = Math.min(exponentialDelay, maxDelay);

  // Adicionar jitter (±25%) para evitar thundering herd
  const jitter = cappedDelay * 0.25 * (Math.random() - 0.5);
  return Math.floor(cappedDelay + jitter);
}

/**
 * Executa função com retry e exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Verificar se deve fazer retry
      if (!opts.shouldRetry(error)) {
        logger.warn("Error not retryable, throwing immediately", {
          error: error instanceof Error ? error.message : String(error),
          attempt,
        });
        throw error;
      }

      // Se é última tentativa, não fazer retry
      if (attempt === opts.maxAttempts) {
        logger.error(
          `All ${opts.maxAttempts} retry attempts failed`,
          error,
          { operation: fn.name }
        );
        throw error;
      }

      // Calcular delay e aguardar
      const delayMs = calculateDelay(
        attempt,
        opts.initialDelayMs,
        opts.maxDelayMs,
        opts.backoffMultiplier
      );

      logger.warn(
        `Attempt ${attempt}/${opts.maxAttempts} failed, retrying in ${delayMs}ms`,
        {
          error: error instanceof Error ? error.message : String(error),
        }
      );

      await delay(delayMs);
    }
  }

  // Nunca deveria chegar aqui, mas TypeScript reclama
  throw lastError;
}

/**
 * Retry específico para fetch HTTP
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options?: RetryOptions
): Promise<Response> {
  return withRetry(
    async () => {
      const response = await fetch(url, init);

      // Lançar erro se 5xx para trigger retry
      if (response.status >= 500) {
        throw {
          status: response.status,
          statusText: response.statusText,
          message: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return response;
    },
    {
      ...options,
      shouldRetry: (error) => {
        // Retry em 5xx, timeouts, network errors
        if (typeof error === "object" && error !== null && "status" in error) {
          const status = (error as { status: number }).status;
          return status >= 500 && status < 600;
        }

        // Usar shouldRetry padrão para outros erros
        return DEFAULT_OPTIONS.shouldRetry(error);
      },
    }
  );
}

/**
 * Circuit breaker simples para prevenir cascading failures
 */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: "closed" | "open" | "half-open" = "closed";

  constructor(
    private maxFailures = 5,
    private resetTimeoutMs = 60000 // 1 minuto
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Se circuit está aberto, verificar se pode tentar half-open
    if (this.state === "open") {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;

      if (timeSinceLastFailure < this.resetTimeoutMs) {
        throw new Error(
          `Circuit breaker is OPEN. Try again in ${Math.ceil((this.resetTimeoutMs - timeSinceLastFailure) / 1000)}s`
        );
      }

      // Tentar half-open
      this.state = "half-open";
      logger.info("Circuit breaker transitioning to HALF-OPEN");
    }

    try {
      const result = await fn();

      // Sucesso - resetar contador
      if (this.state === "half-open") {
        this.state = "closed";
        logger.info("Circuit breaker CLOSED (recovered)");
      }

      this.failureCount = 0;
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      // Abrir circuit se excedeu limite
      if (this.failureCount >= this.maxFailures) {
        this.state = "open";
        logger.error(
          `Circuit breaker OPENED after ${this.failureCount} failures`,
          error
        );
      }

      throw error;
    }
  }

  getState(): string {
    return this.state;
  }

  reset(): void {
    this.state = "closed";
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }
}
