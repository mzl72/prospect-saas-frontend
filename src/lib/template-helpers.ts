/**
 * Helpers para manipulação de templates
 * Extração de variáveis, validação e renderização
 *
 * SECURITY:
 * - Escape HTML para prevenir XSS (A05:2025)
 * - Validação ReDoS-safe (A06:2025)
 * - Sanitização de variáveis (A05:2025)
 */

/**
 * Escapa caracteres HTML perigosos para prevenção de XSS
 * Usado em templates que serão renderizados no frontend
 *
 * @param unsafe - String não sanitizada
 * @returns String com HTML escapado
 *
 * @example
 * ```ts
 * escapeHtml("<script>alert('xss')</script>")
 * // "&lt;script&gt;alert('xss')&lt;/script&gt;"
 * ```
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Extrai variáveis de um template no formato {variavel}
 *
 * Aceita apenas variáveis alfanuméricas com underscore (segurança)
 * Formato válido: {nomeEmpresa}, {nome_vendedor}, {email123}
 * Formato inválido: {nome-empresa}, {$variavel}, {nome empresa}
 *
 * @param template - String do template com variáveis
 * @returns Array de variáveis únicas encontradas (ordenadas alfabeticamente)
 *
 * @example
 * ```ts
 * extractVariables("Olá {nome}, bem-vindo à {empresa}!")
 * // ["empresa", "nome"]
 * ```
 */
export function extractVariables(template: string): string[] {
  if (!template || typeof template !== 'string') {
    return [];
  }

  // SECURITY: Apenas variáveis alfanuméricas + underscore (previne injection)
  const regex = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
  const matches = template.matchAll(regex);
  const variables = new Set<string>();

  for (const match of matches) {
    variables.add(match[1]);
  }

  return Array.from(variables).sort();
}

/**
 * Valida se todas as variáveis necessárias estão presentes nos dados
 *
 * @param template - Template com variáveis {variavel}
 * @param data - Dados disponíveis para renderização
 * @returns { valid: boolean, missing: string[] }
 *
 * @example
 * ```ts
 * const result = validateTemplateVariables(
 *   "Olá {nome}, sua empresa {empresa}",
 *   { nome: "João" }
 * );
 * // { valid: false, missing: ["empresa"] }
 * ```
 */
export function validateTemplateVariables(
  template: string,
  data: Record<string, unknown>
): { valid: boolean; missing: string[] } {
  const required = extractVariables(template);
  const available = Object.keys(data);
  const missing = required.filter((v) => !available.includes(v));

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Renderiza template substituindo variáveis por valores
 *
 * SECURITY:
 * - Escapa valores null/undefined como string vazia
 * - Sanitiza key para prevenir ReDoS (A05:2025 + A06:2025)
 * - Não escapa HTML por padrão (use renderTemplateSafe para HTML)
 *
 * @param template - Template com {variavel}
 * @param data - Dados para substituição
 * @returns String renderizada
 *
 * @example
 * ```ts
 * renderTemplate(
 *   "Olá {nome}, sua empresa {empresa}",
 *   { nome: "João", empresa: "Prospect SaaS" }
 * );
 * // "Olá João, sua empresa Prospect SaaS"
 * ```
 */
export function renderTemplate(
  template: string,
  data: Record<string, string | number | null | undefined>
): string {
  if (!template || typeof template !== 'string') {
    return '';
  }

  let rendered = template;

  for (const [key, value] of Object.entries(data)) {
    // SECURITY: Validar key para prevenir ReDoS (apenas alfanuméricos + underscore)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
      console.warn(`[SECURITY] Invalid variable key: ${key}`);
      continue;
    }

    // SECURITY: Escapar valores null/undefined como vazio
    const safeValue = value === null || value === undefined ? '' : String(value);

    // SECURITY: Usar replace com string literal (mais seguro que regex dinâmica)
    // Split and join é mais seguro que RegExp para prevenir ReDoS
    const placeholder = `{${key}}`;
    rendered = rendered.split(placeholder).join(safeValue);
  }

  return rendered;
}

/**
 * Renderiza template com escape HTML (seguro para frontend)
 *
 * SECURITY: Escapa HTML para prevenir XSS (A05:2025)
 * Use esta função quando renderizar templates no navegador
 *
 * @param template - Template com {variavel}
 * @param data - Dados para substituição
 * @param escapeValues - Se true, escapa os valores também (default: true)
 * @returns String renderizada com HTML escapado
 *
 * @example
 * ```ts
 * renderTemplateSafe(
 *   "Olá {nome}, <b>{empresa}</b>",
 *   { nome: "<script>xss</script>", empresa: "Prospect" }
 * );
 * // "Olá &lt;script&gt;xss&lt;/script&gt;, <b>Prospect</b>"
 * ```
 */
export function renderTemplateSafe(
  template: string,
  data: Record<string, string | number | null | undefined>,
  escapeValues = true
): string {
  if (!template || typeof template !== 'string') {
    return '';
  }

  // Escapar valores antes de renderizar (se solicitado)
  const escapedData: Record<string, string | number | null | undefined> = {};
  for (const [key, value] of Object.entries(data)) {
    if (escapeValues && value !== null && value !== undefined) {
      escapedData[key] = escapeHtml(String(value));
    } else {
      escapedData[key] = value;
    }
  }

  return renderTemplate(template, escapedData);
}

/**
 * Sanitiza template removendo variáveis não utilizadas
 * Útil quando nem todas as variáveis estão disponíveis
 *
 * @param template - Template com variáveis
 * @param data - Dados disponíveis
 * @returns Template com variáveis faltantes removidas
 *
 * @example
 * ```ts
 * sanitizeTemplate(
 *   "Nome: {nome}, Email: {email}",
 *   { nome: "João" }
 * );
 * // "Nome: João, Email: "
 * ```
 */
export function sanitizeTemplate(
  template: string,
  data: Record<string, string | number | null | undefined>
): string {
  if (!template || typeof template !== 'string') {
    return '';
  }

  let sanitized = template;
  const variables = extractVariables(template);

  // Substituir variáveis ausentes por string vazia
  for (const variable of variables) {
    if (!(variable in data)) {
      const regex = new RegExp(`\\{${variable}\\}`, 'g');
      sanitized = sanitized.replace(regex, '');
    }
  }

  return renderTemplate(sanitized, data);
}

/**
 * Pré-visualiza template com dados de exemplo
 * Útil para UI de preview antes de enviar
 *
 * @param template - Template
 * @param sampleData - Dados de exemplo (opcional)
 * @returns Preview renderizado
 */
export function previewTemplate(
  template: string,
  sampleData?: Record<string, string>
): string {
  const variables = extractVariables(template);

  // Criar dados de exemplo se não fornecidos
  const defaultSampleData: Record<string, string> = {};
  for (const variable of variables) {
    defaultSampleData[variable] = sampleData?.[variable] || `[${variable}]`;
  }

  return renderTemplate(template, defaultSampleData);
}
