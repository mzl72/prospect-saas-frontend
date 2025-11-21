/**
 * Helper de validação para páginas de configuração
 * Indica quais campos são obrigatórios para modo COMPLETO
 */

export interface ValidationResult {
  isValid: boolean;
  missingFields: string[];
}

/**
 * Helper para parse seguro de JSON arrays
 * Exportado para uso em outros módulos (campaigns, etc)
 */
export function parseJsonArray(value: string | undefined | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Valida se configurações de Email estão completas para modo COMPLETO
 */
export function validateEmailSettings(config: {
  emailTitulo1?: string;
  emailCorpo1?: string;
  emailCorpo2?: string;
  emailTitulo3?: string;
  emailCorpo3?: string;
  senderEmails?: string; // JSON string do banco
}): ValidationResult {
  const missingFields: string[] = [];

  if (!config.emailTitulo1?.trim()) {
    missingFields.push("Email 1 - Assunto");
  }
  if (!config.emailCorpo1?.trim()) {
    missingFields.push("Email 1 - Corpo");
  }
  if (!config.emailCorpo2?.trim()) {
    missingFields.push("Email 2 - Corpo");
  }
  if (!config.emailTitulo3?.trim()) {
    missingFields.push("Email 3 - Assunto");
  }
  if (!config.emailCorpo3?.trim()) {
    missingFields.push("Email 3 - Corpo");
  }

  // Parse senderEmails antes de validar
  const emails = parseJsonArray(config.senderEmails);
  if (emails.length === 0) {
    missingFields.push("Pelo menos 1 Email Remetente");
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Valida se configurações de WhatsApp estão completas para modo COMPLETO
 */
export function validateWhatsAppSettings(config: {
  whatsappMessage1?: string;
  whatsappMessage2?: string;
  whatsappMessage3?: string;
  evolutionInstances?: string; // JSON string do banco
}): ValidationResult {
  const missingFields: string[] = [];

  if (!config.whatsappMessage1?.trim()) {
    missingFields.push("WhatsApp Mensagem 1");
  }
  if (!config.whatsappMessage2?.trim()) {
    missingFields.push("WhatsApp Mensagem 2");
  }
  if (!config.whatsappMessage3?.trim()) {
    missingFields.push("WhatsApp Mensagem 3");
  }

  // Parse evolutionInstances antes de validar
  const instances = parseJsonArray(config.evolutionInstances);
  if (instances.length === 0) {
    missingFields.push("Pelo menos 1 Instância Evolution API");
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Valida se configurações da Empresa estão completas
 */
export function validateCompanySettings(config: {
  nomeEmpresa?: string;
  assinatura?: string;
  informacoesPropria?: string;
}): ValidationResult {
  const missingFields: string[] = [];

  if (!config.nomeEmpresa?.trim()) {
    missingFields.push("Nome da Empresa");
  }
  if (!config.assinatura?.trim()) {
    missingFields.push("Assinatura");
  }
  if (!config.informacoesPropria?.trim()) {
    missingFields.push("Informações da Sua Empresa");
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}
