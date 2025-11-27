import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-db';
import { requireAuth } from '@/lib/auth';
import { UpdateTemplateSchema } from '@/lib/validation-schemas';
import { extractVariables } from '@/lib/template-helpers';
import { isValidCUID, checkUserRateLimit, getUserRateLimitHeaders, validatePayloadSize, sanitizeForDatabase } from '@/lib/security';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/templates/[id] - Atualizar template
 *
 * Body: { name?, subject?, content?, type?, isActive? }
 *
 * Permissões:
 * - Próprio criador: pode editar seus templates
 * - ADMIN: pode editar todos (exceto defaults)
 * - Templates padrão (isDefault=true): NÃO podem ser editados
 *
 * SECURITY:
 * - Validação de CUID
 * - Ownership check
 * - Re-extração de variáveis se content mudou
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Autenticação
    const { userId, role } = await requireAuth();
    const { id: templateId } = await params;

    // 2. Rate limit: 100 updates/hora (A06:2025 - previne spam)
    const rateLimitResult = checkUserRateLimit({
      userId,
      endpoint: 'templates:update',
      maxRequests: 100,
      windowMs: 60 * 60 * 1000,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: 'Limite de atualização excedido (100/hora)' },
        { status: 429, headers: getUserRateLimitHeaders(rateLimitResult) }
      );
    }

    // 3. Validar CUID (SECURITY: previne injection)
    if (!isValidCUID(templateId)) {
      return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 });
    }

    // 4. Buscar template
    const template = await prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return NextResponse.json({ success: false, error: 'Template não encontrado' }, { status: 404 });
    }

    // 5. Validar ownership (AUTHORIZATION)
    // Apenas o criador ou ADMIN pode editar
    if (template.createdBy !== userId && role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Você não tem permissão para editar este template' },
        { status: 403 }
      );
    }

    // 6. Validação de payload size (previne DoS - A06:2025)
    const bodyText = await request.text();
    const payloadValidation = validatePayloadSize(bodyText, 50 * 1024); // 50KB max

    if (!payloadValidation.valid) {
      return NextResponse.json(
        { success: false, error: payloadValidation.error },
        { status: 413 }
      );
    }

    // 7. Parse e sanitização do body (A05:2025 - NoSQL Injection)
    const body = JSON.parse(bodyText);
    const sanitizedBody = sanitizeForDatabase(body);

    let validData;
    try {
      validData = UpdateTemplateSchema.parse(sanitizedBody);
    } catch (error) {
      if (error instanceof ZodError) {
        // SECURITY: Não expor estrutura completa do Zod (A10:2025)
        const errorMessages = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        logger.warn('Validação Zod falhou ao atualizar template', { userId, templateId, errors: errorMessages });
        return NextResponse.json(
          { success: false, error: errorMessages },
          { status: 400 }
        );
      }
      throw error;
    }

    // 8. Preparar dados de atualização
    const updateData: Record<string, unknown> = { ...validData };

    // Re-extrair variáveis se content foi atualizado
    if (validData.content) {
      const variables = extractVariables(validData.content);

      // SECURITY: Limitar número de variáveis (A06:2025)
      const MAX_VARIABLES = 50;
      if (variables.length > MAX_VARIABLES) {
        return NextResponse.json(
          { success: false, error: `Máximo de ${MAX_VARIABLES} variáveis permitidas` },
          { status: 400 }
        );
      }

      updateData.variables = variables;
    }

    // 9. Atualizar template
    const updated = await prisma.template.update({
      where: { id: templateId },
      data: updateData,
    });

    // AUDIT LOG (A09:2025)
    logger.info('Template atualizado com sucesso', {
      userId,
      role,
      templateId,
      changedFields: Object.keys(validData),
    });

    return NextResponse.json(
      { success: true, template: updated },
      { headers: getUserRateLimitHeaders(rateLimitResult) }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      logger.warn('Tentativa de atualização de template não autenticada', { error: error.message });
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    // SECURITY: Não vazar detalhes do erro para cliente (A10:2025)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      logger.error('Erro Prisma ao atualizar template', {
        code: error.code,
        message: error.message,
      });
      return NextResponse.json({ success: false, error: 'Erro ao atualizar template' }, { status: 500 });
    }

    logger.error('Erro inesperado ao atualizar template', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ success: false, error: 'Erro ao atualizar template' }, { status: 500 });
  }
}

/**
 * DELETE /api/templates/[id] - Soft delete de template
 *
 * Marca template como inativo (isActive=false)
 *
 * Permissões:
 * - Próprio criador: pode deletar seus templates
 * - ADMIN: pode deletar todos (exceto defaults)
 * - Templates padrão (isDefault=true): NÃO podem ser deletados
 *
 * SECURITY:
 * - Soft delete (não remove do banco)
 * - Validação de CUID
 * - Ownership check
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Autenticação
    const { userId, role } = await requireAuth();
    const { id: templateId } = await params;

    // 2. Rate limit: 50 deletions/hora (A06:2025 - previne spam)
    const rateLimitResult = checkUserRateLimit({
      userId,
      endpoint: 'templates:delete',
      maxRequests: 50,
      windowMs: 60 * 60 * 1000,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: 'Limite de exclusão excedido (50/hora)' },
        { status: 429, headers: getUserRateLimitHeaders(rateLimitResult) }
      );
    }

    // 3. Validar CUID
    if (!isValidCUID(templateId)) {
      return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 });
    }

    // 4. Buscar template
    const template = await prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return NextResponse.json({ success: false, error: 'Template não encontrado' }, { status: 404 });
    }

    // 5. Validar ownership (AUTHORIZATION)
    // Não pode deletar templates padrão
    if (template.isDefault) {
      return NextResponse.json(
        { success: false, error: 'Não é possível deletar templates padrão do sistema' },
        { status: 403 }
      );
    }

    // Apenas o criador ou ADMIN pode deletar
    if (template.createdBy !== userId && role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Você não tem permissão para deletar este template' },
        { status: 403 }
      );
    }

    // 6. Soft delete (marca como inativo)
    await prisma.template.update({
      where: { id: templateId },
      data: { isActive: false },
    });

    // AUDIT LOG (A09:2025 - ação crítica)
    logger.warn('Template deletado (soft delete)', {
      userId,
      role,
      templateId,
      templateName: template.name,
      templateType: template.type,
    });

    return NextResponse.json(
      { success: true, message: 'Template deletado com sucesso' },
      { headers: getUserRateLimitHeaders(rateLimitResult) }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      logger.warn('Tentativa de deleção de template não autenticada', { error: error.message });
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    // SECURITY: Não vazar detalhes do erro para cliente (A10:2025)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      logger.error('Erro Prisma ao deletar template', {
        code: error.code,
        message: error.message,
      });
      return NextResponse.json({ success: false, error: 'Erro ao deletar template' }, { status: 500 });
    }

    logger.error('Erro inesperado ao deletar template', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ success: false, error: 'Erro ao deletar template' }, { status: 500 });
  }
}
