import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

// TODO: Implementar autenticação (ex: NextAuth.js, Clerk) para obter o userId da sessão.
const prisma = new PrismaClient();

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

// Esquema de validação com Zod
const settingsSchema = z.object({
  templatePesquisa: z.string().min(1, "Template de pesquisa é obrigatório."),
  templateAnaliseEmpresa: z
    .string()
    .min(1, "Template de análise é obrigatório."),
  emailTitulo1: z.string().min(1, "Título do Email 1 é obrigatório."),
  emailCorpo1: z.string().min(1, "Corpo do Email 1 é obrigatório."),
  emailTitulo2: z.string().min(1, "Título do Email 2 é obrigatório."),
  emailCorpo2: z.string().min(1, "Corpo do Email 2 é obrigatório."),
  emailTitulo3: z.string().min(1, "Título do Email 3 é obrigatório."),
  emailCorpo3: z.string().min(1, "Corpo do Email 3 é obrigatório."),
  informacoesPropria: z
    .string()
    .min(1, "Informações da sua empresa são obrigatórias."),
});

// GET - Buscar configurações do usuário
export async function GET(request: NextRequest) {
  try {
    // FALHA DE SEGURANÇA: Substituir por uma função que obtém o usuário da sessão.
    // Ex: const { userId } = await getAuth();
    const userId = "user-1";

    // Buscar ou criar settings do usuário
    let settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    // Se não existir, cria para o usuário com valores padrão.
    if (!settings) {
      // Garantir que o usuário existe
      await prisma.user.upsert({
        where: { id: userId },
        create: {
          id: userId,
          email: "user@example.com",
          name: "Usuário Padrão",
        },
        update: {},
      });

      settings = await prisma.userSettings.create({
        data: {
          userId,
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
    // FALHA DE SEGURANÇA: Substituir por uma função que obtém o usuário da sessão.
    // Ex: const { userId } = await getAuth();
    const userId = "user-1";

    const body = await request.json();

    // Validação robusta com Zod
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
      where: { userId },
      create: { userId, ...dataToSave },
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
