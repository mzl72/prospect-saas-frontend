import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma-db";
import { DEMO_USER_ID, ensureDemoUser } from "@/lib/demo-user";

// Templates padrão
const DEFAULT_SETTINGS = {
  // Prompts de IA
  templatePesquisa: `Pesquise informações detalhadas sobre a empresa {nome_empresa}, incluindo:
- Setor de atuação
- Principais produtos/serviços
- Público-alvo
- Tamanho da empresa
- Localização
- Site e redes sociais
- Notícias recentes`,
  templateAnaliseEmpresa: `Analise a empresa {nome_empresa} e identifique:
1. Principais dores e desafios do setor
2. Oportunidades de melhoria
3. Possíveis decisores (cargos)
4. Como nosso produto pode ajudá-los
5. Pontos de conexão para abordagem`,
  informacoesPropria: `Somos uma plataforma SaaS de prospecção automatizada que utiliza IA para:
- Gerar listas de leads qualificados do Google Maps
- Pesquisar informações detalhadas sobre cada empresa
- Criar emails personalizados automaticamente
- Economizar 80% do tempo em prospecção manual

Nossos clientes conseguem gerar 10x mais leads qualificados em 1/5 do tempo.`,
  promptOverview: "",
  promptTatica: "",
  promptDiretrizes: "",

  // Templates de Email
  emailTitulo1: "{nome_empresa} - Oportunidade de otimizar {area_interesse}",
  emailCorpo1: `Olá, equipe {nome_empresa}!

Percebi que vocês atuam no setor de {setor} e identifiquei uma oportunidade interessante.

{dor_identificada}

{informacoes_propria}

Podemos agendar uma conversa rápida de 15 minutos?

Atenciosamente,
[Seu Nome]`,
  emailCorpo2: `Olá novamente!

Gostaria de retomar o assunto sobre como podemos ajudar a {nome_empresa} com {solucao}.

Preparei alguns cases de empresas similares no setor de {setor} que conseguiram resultados expressivos.

Teria disponibilidade para uma call esta semana?

Abraços,
[Seu Nome]`,
  emailTitulo3: "Última chance: Oportunidade para {nome_empresa}",
  emailCorpo3: `Oi!

Este é meu último contato sobre a oportunidade que identifiquei para {nome_empresa}.

Se não houver interesse agora, tudo bem! Fico à disposição caso precisem no futuro.

{informacoes_propria}

Abraços,
[Seu Nome]`,

  // Informações da Empresa
  nomeEmpresa: "",
  assinatura: "",
  telefoneContato: "",
  websiteEmpresa: "",
  senderEmails: "[]",

  // Templates WhatsApp
  whatsappMessage1: "",
  whatsappMessage2: "",
  whatsappMessage3: "",
  evolutionInstances: "[]",

  // Intervalos de Cadência (JSON)
  emailIntervals: '[{"messageNumber":1,"daysAfterPrevious":1},{"messageNumber":2,"daysAfterPrevious":2},{"messageNumber":3,"daysAfterPrevious":2}]',
  whatsappIntervals: '[{"messageNumber":1,"daysAfterPrevious":1},{"messageNumber":2,"daysAfterPrevious":2},{"messageNumber":3,"daysAfterPrevious":2}]',
  hybridIntervals: '[{"type":"email","messageNumber":1,"emailNumber":1,"daysAfterPrevious":1},{"type":"whatsapp","messageNumber":2,"whatsappNumber":1,"daysAfterPrevious":1},{"type":"email","messageNumber":3,"emailNumber":2,"daysAfterPrevious":1},{"type":"whatsapp","messageNumber":4,"whatsappNumber":2,"daysAfterPrevious":1},{"type":"email","messageNumber":5,"emailNumber":3,"daysAfterPrevious":1}]',
  useHybridCadence: false,

  // Configurações de Email
  email2DelayDays: 3,
  email3DelayDays: 7,
  dailyEmailLimit: 100,
  emailBusinessHourStart: 9,
  emailBusinessHourEnd: 18,

  // Configurações de WhatsApp
  whatsappDailyLimit: 50,
  whatsappBusinessHourStart: 9,
  whatsappBusinessHourEnd: 18,

  // Configurações Híbridas
  hybridDailyLimit: 70,
  hybridBusinessHourStart: 9,
  hybridBusinessHourEnd: 18,

  // Configurações Gerais
  sendOnlyBusinessHours: true,
};

// Função para sanitizar HTML/scripts e prevenir XSS
// NOTA: Permite variáveis de template no formato {variavel}
function sanitizeInput(text: string): string {
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

// Validação adicional contra padrões XSS comuns
function containsXSS(text: string): boolean {
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

// Esquema de validação com Zod + proteção XSS
const settingsSchema = z.object({
  templatePesquisa: z
    .string()
    .max(5000, "Template muito longo")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),
  templateAnaliseEmpresa: z
    .string()
    .max(5000, "Template muito longo")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),
  informacoesPropria: z
    .string()
    .max(5000, "Texto muito longo")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),

  // Prompt Customization
  promptOverview: z
    .string()
    .max(5000, "Prompt muito longo")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),
  promptTatica: z
    .string()
    .max(5000, "Prompt muito longo")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),
  promptDiretrizes: z
    .string()
    .max(5000, "Prompt muito longo")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),

  // Email Templates
  emailTitulo1: z
    .string()
    .max(200, "Título muito longo")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),
  emailCorpo1: z
    .string()
    .max(5000, "Corpo muito longo")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),
  emailCorpo2: z
    .string()
    .max(5000, "Corpo muito longo")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),
  emailTitulo3: z
    .string()
    .max(200, "Título muito longo")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),
  emailCorpo3: z
    .string()
    .max(5000, "Corpo muito longo")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),

  // Informações Críticas da Empresa
  nomeEmpresa: z
    .string()
    .max(200, "Nome muito longo")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),
  assinatura: z
    .string()
    .max(200, "Assinatura muito longa")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),
  telefoneContato: z
    .string()
    .max(50, "Telefone muito longo")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),
  websiteEmpresa: z
    .string()
    .max(500, "Website muito longo")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),
  senderEmails: z
    .string()
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default("[]"),

  // WhatsApp Templates
  whatsappMessage1: z
    .string()
    .max(5000, "Mensagem muito longa")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),
  whatsappMessage2: z
    .string()
    .max(5000, "Mensagem muito longa")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),
  whatsappMessage3: z
    .string()
    .max(5000, "Mensagem muito longa")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),

  // Evolution API Instances
  evolutionInstances: z
    .string()
    .refine((val) => {
      try {
        JSON.parse(val);
        return true;
      } catch {
        return false;
      }
    }, { message: "JSON inválido" })
    .optional()
    .default("[]"),

  // Message Intervals (JSON fields)
  emailIntervals: z
    .string()
    .refine((val) => {
      try {
        JSON.parse(val);
        return true;
      } catch {
        return false;
      }
    }, { message: "JSON inválido" })
    .optional()
    .default('[{"messageNumber":1,"daysAfterPrevious":1},{"messageNumber":2,"daysAfterPrevious":2},{"messageNumber":3,"daysAfterPrevious":2}]'),
  whatsappIntervals: z
    .string()
    .refine((val) => {
      try {
        JSON.parse(val);
        return true;
      } catch {
        return false;
      }
    }, { message: "JSON inválido" })
    .optional()
    .default('[{"messageNumber":1,"daysAfterPrevious":1},{"messageNumber":2,"daysAfterPrevious":2},{"messageNumber":3,"daysAfterPrevious":2}]'),
  hybridIntervals: z
    .string()
    .refine((val) => {
      try {
        JSON.parse(val);
        return true;
      } catch {
        return false;
      }
    }, { message: "JSON inválido" })
    .optional()
    .default('[{"type":"email","messageNumber":1,"emailNumber":1,"daysAfterPrevious":1},{"type":"whatsapp","messageNumber":2,"whatsappNumber":1,"daysAfterPrevious":1},{"type":"email","messageNumber":3,"emailNumber":2,"daysAfterPrevious":1},{"type":"whatsapp","messageNumber":4,"whatsappNumber":2,"daysAfterPrevious":1},{"type":"email","messageNumber":5,"emailNumber":3,"daysAfterPrevious":1}]'),
  useHybridCadence: z.boolean().optional().default(false),

  // Configurações de Timing de Emails (deprecated but kept for backward compatibility)
  email2DelayDays: z
    .number()
    .int()
    .min(1, "Mínimo 1 dia")
    .max(30, "Máximo 30 dias")
    .optional()
    .default(3),
  email3DelayDays: z
    .number()
    .int()
    .min(1, "Mínimo 1 dia")
    .max(30, "Máximo 30 dias")
    .optional()
    .default(7),
  dailyEmailLimit: z
    .number()
    .int()
    .min(1, "Mínimo 1 email")
    .max(1000, "Máximo 1000 emails")
    .optional()
    .default(100),

  // WhatsApp-specific timing settings
  whatsappDailyLimit: z
    .number()
    .int()
    .min(1, "Mínimo 1 mensagem")
    .max(1000, "Máximo 1000 mensagens")
    .optional()
    .default(50),
  sendOnlyBusinessHours: z.boolean().optional().default(true),

  // Per-channel business hours (new fields)
  emailBusinessHourStart: z
    .number()
    .int()
    .min(0, "Mínimo 0h")
    .max(23, "Máximo 23h")
    .optional()
    .default(9),
  emailBusinessHourEnd: z
    .number()
    .int()
    .min(0, "Mínimo 0h")
    .max(23, "Máximo 23h")
    .optional()
    .default(18),
  whatsappBusinessHourStart: z
    .number()
    .int()
    .min(0, "Mínimo 0h")
    .max(23, "Máximo 23h")
    .optional()
    .default(9),
  whatsappBusinessHourEnd: z
    .number()
    .int()
    .min(0, "Mínimo 0h")
    .max(23, "Máximo 23h")
    .optional()
    .default(18),
  hybridBusinessHourStart: z
    .number()
    .int()
    .min(0, "Mínimo 0h")
    .max(23, "Máximo 23h")
    .optional()
    .default(9),
  hybridBusinessHourEnd: z
    .number()
    .int()
    .min(0, "Mínimo 0h")
    .max(23, "Máximo 23h")
    .optional()
    .default(18),
  hybridDailyLimit: z
    .number()
    .int()
    .min(1, "Mínimo 1 mensagem")
    .max(1000, "Máximo 1000 mensagens")
    .optional()
    .default(70),
});

// GET - Buscar configurações do usuário
export async function GET(request: NextRequest) {
  try {
    // Garante que usuário existe
    await ensureDemoUser();

    // Buscar ou criar settings do usuário
    let settings = await prisma.userSettings.findUnique({
      where: { userId: DEMO_USER_ID },
    });

    // Se não existir, cria com valores padrão
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId: DEMO_USER_ID,
          ...DEFAULT_SETTINGS,
        },
      });
    }

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("[API /settings GET] Erro ao buscar configurações:", {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      { success: false, error: "Erro ao buscar configurações" },
      { status: 500 }
    );
  }
}

// POST - Salvar configurações do usuário
export async function POST(request: NextRequest) {
  try {
    // Garante que usuário existe
    await ensureDemoUser();

    const body = await request.json();
    console.log("📥 [API] Received body:", JSON.stringify(body, null, 2));

    // Validação robusta com Zod (inclui sanitização)
    const validatedBody = settingsSchema.safeParse(body);
    if (!validatedBody.success) {
      console.error("❌ [API] Validation failed:", validatedBody.error.flatten());
      return NextResponse.json(
        {
          success: false,
          error: "Dados inválidos",
          details: validatedBody.error.flatten(),
        },
        { status: 400 }
      );
    }

    const dataToSave = validatedBody.data;
    console.log("✅ [API] Validation passed, saving:", JSON.stringify(dataToSave, null, 2));

    // Upsert (criar ou atualizar) settings
    const settings = await prisma.userSettings.upsert({
      where: { userId: DEMO_USER_ID },
      create: { userId: DEMO_USER_ID, ...dataToSave },
      update: dataToSave,
    });

    console.log("✅ [API] Settings saved successfully");

    return NextResponse.json({
      success: true,
      message: "Configurações salvas com sucesso",
      settings,
    });
  } catch (error) {
    console.error("[API /settings POST] ❌ Erro ao salvar configurações:", {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao salvar configurações",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
