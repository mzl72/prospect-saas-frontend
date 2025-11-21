/**
 * Evolution API Instances Management
 * GET: Lista instâncias
 * POST: Cria nova instância
 * DELETE: Deleta instância
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { DEMO_USER_ID } from '@/lib/demo-user';
import {
  createEvolutionInstance,
  deleteEvolutionInstance,
  fetchEvolutionInstances,
} from '@/lib/evolution-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/evolution/instances
 * Lista todas as instâncias Evolution API
 */
export async function GET(req: NextRequest) {
  try {
    // Rate limiting
    const clientIp = getClientIp(req);
    const rateLimitResult = checkRateLimit({
      identifier: `evolution-instances-list:${clientIp}`,
      maxRequests: 60,
      windowMs: 60000,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit excedido' },
        { status: 429 }
      );
    }

    const instances = await fetchEvolutionInstances();

    return NextResponse.json({
      success: true,
      instances,
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('[API] Erro ao listar instâncias:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erro ao listar instâncias',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/evolution/instances
 * Cria nova instância Evolution API
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const clientIp = getClientIp(req);
    const rateLimitResult = checkRateLimit({
      identifier: `evolution-instances-create:${clientIp}`,
      maxRequests: 10,
      windowMs: 3600000, // 1 hora
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit excedido. Tente novamente em alguns minutos.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { instanceName } = body;

    // Validações
    if (!instanceName || typeof instanceName !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Nome da instância é obrigatório' },
        { status: 400 }
      );
    }

    // Validar formato do nome
    const nameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!nameRegex.test(instanceName)) {
      return NextResponse.json(
        { success: false, error: 'Nome inválido. Use apenas letras, números, hífen e underscore' },
        { status: 400 }
      );
    }

    if (instanceName.length < 3 || instanceName.length > 50) {
      return NextResponse.json(
        { success: false, error: 'Nome deve ter entre 3 e 50 caracteres' },
        { status: 400 }
      );
    }

    // Criar instância
    const instance = await createEvolutionInstance(instanceName, DEMO_USER_ID, {
      // Opções adicionais aqui
    });

    return NextResponse.json({
      success: true,
      message: 'Instância criada com sucesso',
      instance,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[API] Erro ao criar instância:', error);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/evolution/instances?instanceName=xxx
 * Deleta instância Evolution API
 */
export async function DELETE(req: NextRequest) {
  try {
    // Rate limiting
    const clientIp = getClientIp(req);
    const rateLimitResult = checkRateLimit({
      identifier: `evolution-instances-delete:${clientIp}`,
      maxRequests: 20,
      windowMs: 60000,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit excedido' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(req.url);
    const instanceName = searchParams.get('instanceName');

    if (!instanceName) {
      return NextResponse.json(
        { success: false, error: 'instanceName é obrigatório' },
        { status: 400 }
      );
    }

    await deleteEvolutionInstance(instanceName);

    return NextResponse.json({
      success: true,
      message: 'Instância deletada com sucesso',
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[API] Erro ao deletar instância:', error);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
