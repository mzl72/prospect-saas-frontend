/**
 * Utilitários de sanitização e normalização
 * Centraliza funções de limpeza de dados, prevenção XSS e normalização de valores
 */

// ========================================
// NORMALIZAÇÃO DE VALORES
// ========================================

/**
 * Normaliza valores sentinel para null
 * N8N e outros serviços podem enviar "Não Informado", "N/A", etc.
 */
export function normalizeToNull(value: string | null | undefined): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  const sentinelValues = [
    'não informado',
    'não informada',
    'not provided',
    'not available',
    'n/a',
    'na',
    'null',
    'undefined',
  ];

  // Comparação case-insensitive
  if (sentinelValues.some(sentinel => trimmed.toLowerCase() === sentinel)) {
    return null;
  }

  return value;
}

// ========================================
// SANITIZAÇÃO HTML (Anti-XSS)
// ========================================

/**
 * Escapa caracteres HTML perigosos para prevenção de XSS
 * Usado em páginas HTML geradas dinamicamente
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Sanitiza input de usuário removendo scripts e tags perigosas
 * NOTA: Preserva variáveis de template no formato {variavel}
 */
export function sanitizeInput(text: string): string {
  // Temporariamente substitui variáveis de template para preservá-las
  const templateVars: string[] = [];
  let sanitized = text.replace(/\{[^}]+\}/g, (match) => {
    templateVars.push(match);
    return `__TEMPLATE_VAR_${templateVars.length - 1}__`;
  });

  // Aplica sanitização
  sanitized = sanitized
    // Remove tags script completas
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    // Remove apenas tags HTML perigosas (preserva formatação básica se necessário)
    .replace(/<script[^>]*>.*?<\/script>/gi, "")
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, "")
    .replace(/<embed[^>]*>/gi, "")
    .replace(/<object[^>]*>.*?<\/object>/gi, "")
    // Remove event handlers inline (onclick, onerror, etc.)
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    // Remove javascript: protocol
    .replace(/javascript:/gi, "")
    // Remove data: protocol (pode ser usado para XSS)
    .replace(/data:text\/html/gi, "")
    // Remove null bytes
    .replace(/\0/g, "")
    .trim();

  // Restaura variáveis de template
  templateVars.forEach((varName, index) => {
    sanitized = sanitized.replace(`__TEMPLATE_VAR_${index}__`, varName);
  });

  return sanitized;
}

/**
 * Verifica se texto contém padrões comuns de XSS
 * Usado antes de aceitar input de usuário
 */
export function containsXSS(text: string): boolean {
  // Remove variáveis de template temporariamente para validação
  const withoutTemplateVars = text.replace(/\{[^}]+\}/g, '');

  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /onerror\s*=/i,
    /onclick\s*=/i,
    /onload\s*=/i,
    /onmouseover\s*=/i,
    /<iframe/i,
    /<embed/i,
    /<object/i,
    /eval\s*\(/i,
    /expression\s*\(/i,
    /vbscript:/i,
    /data:text\/html/i,
  ];

  return xssPatterns.some(pattern => pattern.test(withoutTemplateVars));
}
