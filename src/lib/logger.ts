/**
 * Logger centralizado (OWASP A09:2025 - Logging & Alerting Failures)
 * Previne exposição de dados sensíveis em logs
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

/**
 * Campos sensíveis que nunca devem aparecer em logs
 */
const SENSITIVE_FIELDS = [
  "password",
  "token",
  "secret",
  "apiKey",
  "api_key",
  "authorization",
  "cookie",
  "session",
  "credit_card",
  "creditCard",
  "ssn",
  "cpf",
  "cnpj",
];

/**
 * Remove campos sensíveis de objetos antes de logar
 */
function sanitizeLogData(data: unknown): unknown {
  if (typeof data !== "object" || data === null) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeLogData);
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_FIELDS.some((field) =>
      lowerKey.includes(field)
    );

    if (isSensitive) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeLogData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Formata log com timestamp e contexto
 */
function formatLog(
  level: LogLevel,
  message: string,
  context?: LogContext
): string {
  const timestamp = new Date().toISOString();
  const levelUpper = level.toUpperCase().padEnd(5, " ");

  if (!context || Object.keys(context).length === 0) {
    return `[${timestamp}] ${levelUpper} ${message}`;
  }

  const sanitizedContext = sanitizeLogData(context);
  const contextStr = JSON.stringify(sanitizedContext, null, 2);

  return `[${timestamp}] ${levelUpper} ${message}\n${contextStr}`;
}

/**
 * Determina se deve logar baseado no nível configurado
 */
function shouldLog(level: LogLevel): boolean {
  const configuredLevel = process.env.LOG_LEVEL || "info";

  const levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  return levels[level] >= levels[configuredLevel as LogLevel];
}

/**
 * Logger centralizado
 */
export const logger = {
  debug(message: string, context?: LogContext): void {
    if (shouldLog("debug")) {
      console.debug(formatLog("debug", message, context));
    }
  },

  info(message: string, context?: LogContext): void {
    if (shouldLog("info")) {
      console.info(formatLog("info", message, context));
    }
  },

  warn(message: string, context?: LogContext): void {
    if (shouldLog("warn")) {
      console.warn(formatLog("warn", message, context));
    }
  },

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (shouldLog("error")) {
      const errorContext: LogContext = {
        ...context,
        error: error instanceof Error ? {
          message: error.message,
          stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
        } : error,
      };

      console.error(formatLog("error", message, errorContext));
    }
  },

  /**
   * Log de segurança (sempre loga, independente do nível)
   */
  security(event: string, context?: LogContext): void {
    const securityLog = formatLog("warn", `[SECURITY] ${event}`, context);
    console.warn(securityLog);

    // TODO: Enviar para sistema de alertas externo (Sentry, Datadog, etc.)
    // if (process.env.SENTRY_DSN) {
    //   Sentry.captureMessage(`[SECURITY] ${event}`, { level: 'warning', extra: context });
    // }
  },
};

/**
 * Middleware para logar requisições HTTP
 */
export function logRequest(
  method: string,
  path: string,
  userId?: string,
  durationMs?: number
): void {
  logger.info(`${method} ${path}`, {
    userId,
    durationMs,
  });
}

/**
 * Log de erro com contexto completo
 */
export function logError(
  operation: string,
  error: Error | unknown,
  context?: LogContext
): void {
  logger.error(`Error in ${operation}`, error, context);
}

/**
 * Log de eventos de segurança críticos
 */
export const securityLog = {
  loginSuccess(userId: string, email: string): void {
    logger.security("Login successful", { userId, email });
  },

  loginFailed(email: string, reason: string): void {
    logger.security("Login failed", { email, reason });
  },

  bruteForceBlocked(identifier: string): void {
    logger.security("Brute force attack blocked", { identifier });
  },

  csrfAttempt(origin: string, host: string): void {
    logger.security("CSRF attempt detected", { origin, host });
  },

  rateLimitExceeded(userId: string, endpoint: string): void {
    logger.security("Rate limit exceeded", { userId, endpoint });
  },

  unauthorizedAccess(userId: string, resource: string): void {
    logger.security("Unauthorized access attempt", { userId, resource });
  },

  invalidToken(userId: string): void {
    logger.security("Invalid/expired token used", { userId });
  },

  webhookFailure(source: string, reason: string): void {
    logger.security("Webhook validation failed", { source, reason });
  },
};
