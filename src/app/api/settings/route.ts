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

  emailTitulo2: "Re: {nome_empresa} - Seguindo nossa conversa",

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

// Função para sanitizar HTML/scripts de inputs
function sanitizeInput(text: string): string {
  // Remove tags HTML e scripts básicos
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .trim();
}

// Esquema de validação com Zod
const settingsSchema = z.object({
  templatePesquisa: z
    .string()
    .min(1, "Template de pesquisa é obrigatório.")
    .max(5000, "Template muito longo")
    .transform(sanitizeInput),
  templateAnaliseEmpresa: z
    .string()
    .min(1, "Template de análise é obrigatório.")
    .max(5000, "Template muito longo")
    .transform(sanitizeInput),
  emailTitulo1: z
    .string()
    .min(1, "Título do Email 1 é obrigatório.")
    .max(200, "Título muito longo")
    .transform(sanitizeInput),
  emailCorpo1: z
    .string()
    .min(1, "Corpo do Email 1 é obrigatório.")
    .max(5000, "Corpo muito longo")
    .transform(sanitizeInput),
  emailTitulo2: z
    .string()
    .min(1, "Título do Email 2 é obrigatório.")
    .max(200, "Título muito longo")
    .transform(sanitizeInput),
  emailCorpo2: z
    .string()
    .min(1, "Corpo do Email 2 é obrigatório.")
    .max(5000, "Corpo muito longo")
    .transform(sanitizeInput),
  emailTitulo3: z
    .string()
    .min(1, "Título do Email 3 é obrigatório.")
    .max(200, "Título muito longo")
    .transform(sanitizeInput),
  emailCorpo3: z
    .string()
    .min(1, "Corpo do Email 3 é obrigatório.")
    .max(5000, "Corpo muito longo")
    .transform(sanitizeInput),
  informacoesPropria: z
    .string()
    .min(1, "Informações da sua empresa são obrigatórias.")
    .max(5000, "Texto muito longo")
    .transform(sanitizeInput),
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
    console.error("Erro ao buscar configurações:", error);
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
    console.error("Erro ao salvar configurações:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao salvar configurações" },
      { status: 500 }
    );
  }
}
