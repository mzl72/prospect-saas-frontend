import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma-db";
import { DEMO_USER_ID, ensureDemoUser } from "@/lib/demo-user";

// Templates padrão
const DEFAULT_SETTINGS = {
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

  informacoesPropria: `Somos uma plataforma SaaS de prospecção automatizada que utiliza IA para:
- Gerar listas de leads qualificados do Google Maps
- Pesquisar informações detalhadas sobre cada empresa
- Criar emails personalizados automaticamente
- Economizar 80% do tempo em prospecção manual

Nossos clientes conseguem gerar 10x mais leads qualificados em 1/5 do tempo.`,
};

// Função avançada para sanitizar HTML/scripts e prevenir XSS
function sanitizeInput(text: string): string {
  return text
    // Remove tags script completas
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    // Remove todas as tags HTML
    .replace(/<[^>]*>/g, "")
    // Remove event handlers inline (onclick, onerror, etc.)
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    // Remove javascript: protocol
    .replace(/javascript:/gi, "")
    // Remove data: protocol (pode ser usado para XSS)
    .replace(/data:text\/html/gi, "")
    // Remove null bytes
    .replace(/\0/g, "")
    .trim();
}

// Validação adicional contra padrões XSS comuns
function containsXSS(text: string): boolean {
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
    /eval\(/i,
    /expression\(/i,
    /vbscript:/i,
    /data:text\/html/i,
  ];

  return xssPatterns.some(pattern => pattern.test(text));
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

  // Configurações de Timing de Emails
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
  sendDelayMinMs: z
    .number()
    .int()
    .min(0, "Mínimo 0ms")
    .max(5000, "Máximo 5000ms")
    .optional()
    .default(100),
  sendDelayMaxMs: z
    .number()
    .int()
    .min(0, "Mínimo 0ms")
    .max(10000, "Máximo 10000ms")
    .optional()
    .default(500),
  dailyEmailLimit: z
    .number()
    .int()
    .min(1, "Mínimo 1 email")
    .max(1000, "Máximo 1000 emails")
    .optional()
    .default(100),
  sendOnlyBusinessHours: z.boolean().optional().default(true),
  businessHourStart: z
    .number()
    .int()
    .min(0, "Mínimo 0h")
    .max(23, "Máximo 23h")
    .optional()
    .default(9),
  businessHourEnd: z
    .number()
    .int()
    .min(0, "Mínimo 0h")
    .max(23, "Máximo 23h")
    .optional()
    .default(18),
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

    // Validação robusta com Zod (inclui sanitização)
    const validatedBody = settingsSchema.safeParse(body);
    if (!validatedBody.success) {
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

    // Upsert (criar ou atualizar) settings
    const settings = await prisma.userSettings.upsert({
      where: { userId: DEMO_USER_ID },
      create: { userId: DEMO_USER_ID, ...dataToSave },
      update: dataToSave,
    });

    return NextResponse.json({
      success: true,
      message: "Configurações salvas com sucesso",
      settings,
    });
  } catch (error) {
    console.error("[API /settings POST] Erro ao salvar configurações:", {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      { success: false, error: "Erro ao salvar configurações" },
      { status: 500 }
    );
  }
}
