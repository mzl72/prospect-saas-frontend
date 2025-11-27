import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-db';
import { requireAuth, requireRole } from '@/lib/auth';
import { checkUserRateLimit, getUserRateLimitHeaders, validatePayloadSize, sanitizeForDatabase } from '@/lib/security';
import { CreateTemplateSchema } from '@/lib/validation-schemas';
import { extractVariables } from '@/lib/template-helpers';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/templates - Listar templates
 * Retorna templates próprios do usuário + templates padrão do sistema
 *
 * Query params:
 * - type: EMAIL | WHATSAPP | PROMPT_IA (opcional)
 *
 * Permissões: Todos os roles
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Autenticação
    const { userId } = await requireAuth();

    // 2. Rate limit: 200 req/min
    const rateLimitResult = checkUserRateLimit({
      userId,
      endpoint: 'templates:list',
      maxRequests: 200,
      windowMs: 60 * 1000,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit excedido' },
        { status: 429, headers: getUserRateLimitHeaders(rateLimitResult) }
      );
    }

    // 3. Query params: filtro por tipo
    const url = new URL(request.url);
    const typeFilter = url.searchParams.get('type');

    // Validar tipo se fornecido
    if (typeFilter && !['EMAIL', 'WHATSAPP', 'PROMPT_IA'].includes(typeFilter.toUpperCase())) {
      return NextResponse.json(
        { success: false, error: 'Tipo inválido. Use EMAIL, WHATSAPP ou PROMPT_IA' },
        { status: 400 }
      );
    }

    // 4. Buscar templates (próprios + defaults do sistema)
    const where = {
      OR: [
        { createdBy: userId },
        { isDefault: true },
      ],
      isActive: true,
      ...(typeFilter && { type: typeFilter.toUpperCase() as 'EMAIL' | 'WHATSAPP' | 'PROMPT_IA' }),
    };

    const templates = await prisma.template.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' }, // Defaults primeiro
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        type: true,
        name: true,
        fields: true, // NOVO: Campos estruturados
        subject: true,
        content: true,
        variables: true,
        isDefault: true,
        isActive: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        createdByUser: {
          select: {
            name: true,
            // SECURITY: Não expor email (A01:2025 - Information Disclosure)
          },
        },
      },
    });

    return NextResponse.json(
      { success: true, templates },
      { headers: getUserRateLimitHeaders(rateLimitResult) }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    // SECURITY: Não vazar detalhes do erro para cliente (A10:2025)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('[GET /api/templates] Prisma error:', error.code, error.message);
      return NextResponse.json({ success: false, error: 'Erro ao buscar templates' }, { status: 500 });
    }

    console.error('[GET /api/templates] Erro:', error);
    return NextResponse.json({ success: false, error: 'Erro ao buscar templates' }, { status: 500 });
  }
}

/**
 * POST /api/templates - Criar template
 *
 * Body: { type, name, subject?, content }
 *
 * Permissões: MANAGER ou ADMIN apenas
 * SECURITY:
 * - Rate limit: 20 templates/hora
 * - Validação Zod
 * - Extração automática de variáveis
 * - Subject obrigatório para EMAIL
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Autenticação + Autorização (A01:2025 - Broken Access Control)
    // requireRole valida hierarquia: ADMIN > MANAGER > OPERATOR
    const { userId, role } = await requireRole('MANAGER');

    // 2. Rate limit: 20 templates/hora
    const rateLimitResult = checkUserRateLimit({
      userId,
      endpoint: 'templates:create',
      maxRequests: 20,
      windowMs: 60 * 60 * 1000,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: 'Limite de criação excedido (20/hora)' },
        { status: 429, headers: getUserRateLimitHeaders(rateLimitResult) }
      );
    }

    // 3. Validação de payload size (previne DoS - A06:2025)
    const bodyText = await request.text();
    const payloadValidation = validatePayloadSize(bodyText, 50 * 1024); // 50KB max

    if (!payloadValidation.valid) {
      return NextResponse.json(
        { success: false, error: payloadValidation.error },
        { status: 413 }
      );
    }

    // 4. Verificar limite total de templates (previne spam - A06:2025)
    const templateCount = await prisma.template.count({
      where: { createdBy: userId, isActive: true },
    });

    const MAX_TEMPLATES_PER_USER = 100;
    if (templateCount >= MAX_TEMPLATES_PER_USER) {
      return NextResponse.json(
        { success: false, error: `Limite de ${MAX_TEMPLATES_PER_USER} templates atingido` },
        { status: 400 }
      );
    }

    // 5. Parse e sanitização do body (A05:2025 - NoSQL Injection)
    const body = JSON.parse(bodyText);
    const sanitizedBody = sanitizeForDatabase(body);

    let validData;
    try {
      validData = CreateTemplateSchema.parse(sanitizedBody);
    } catch (error) {
      if (error instanceof ZodError) {
        // SECURITY: Não expor estrutura completa do Zod (A10:2025)
        const errorMessages = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        logger.warn('Validação Zod falhou ao criar template', { userId, errors: errorMessages });
        return NextResponse.json(
          { success: false, error: errorMessages },
          { status: 400 }
        );
      }
      throw error;
    }

    // 6. Validação de negócio: subject obrigatório para EMAIL legacy (sem fields)
    const isLegacyTemplate = !validData.fields || Object.keys(validData.fields as Record<string, unknown>).length === 0;
    if (validData.type === 'EMAIL' && isLegacyTemplate && !validData.subject) {
      return NextResponse.json(
        { success: false, error: 'Assunto é obrigatório para templates de EMAIL (sem campos estruturados)' },
        { status: 400 }
      );
    }

    // 7. Extrair variáveis do conteúdo (SECURITY: regex sanitizado)
    // Para templates estruturados (fields), não extrair variáveis do content
    const variables = validData.content ? extractVariables(validData.content) : [];

    // SECURITY: Limitar número de variáveis (A06:2025 - previne DoS)
    const MAX_VARIABLES = 50;
    if (variables.length > MAX_VARIABLES) {
      return NextResponse.json(
        { success: false, error: `Máximo de ${MAX_VARIABLES} variáveis permitidas` },
        { status: 400 }
      );
    }

    // 8. Criar template (suportando fields estruturados + legacy)
    const template = await prisma.template.create({
      data: {
        type: validData.type,
        name: validData.name,
        fields: validData.fields || undefined, // NOVO: Campos estruturados (JsonB: undefined, não null)
        subject: validData.subject || null, // Legacy
        content: validData.content || null, // Legacy
        variables,
        createdBy: userId,
      },
    });

    // AUDIT LOG (A09:2025)
    logger.info('Template criado com sucesso', {
      userId,
      role,
      templateId: template.id,
      type: template.type,
      variablesCount: variables.length,
    });

    return NextResponse.json(
      { success: true, template },
      { status: 201, headers: getUserRateLimitHeaders(rateLimitResult) }
    );
  } catch (error) {
    // A01:2025 - Tratamento de erros de autenticação/autorização
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      logger.warn('Tentativa de criação de template não autenticada', { error: error.message });
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    if (error instanceof Error && error.message === 'FORBIDDEN') {
      logger.security('Tentativa de criação de template sem permissão (OPERATOR)', { error: error.message });
      return NextResponse.json({ success: false, error: 'Você não tem permissão para criar templates' }, { status: 403 });
    }

    // SECURITY: Não vazar detalhes do erro para cliente (A10:2025)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      logger.error('Erro Prisma ao criar template', {
        code: error.code,
        message: error.message,
        meta: error.meta,
      });
      return NextResponse.json({ success: false, error: 'Erro ao criar template' }, { status: 500 });
    }

    logger.error('Erro inesperado ao criar template', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ success: false, error: 'Erro ao criar template' }, { status: 500 });
  }
}
