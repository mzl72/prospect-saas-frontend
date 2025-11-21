/**
 * Evolution API Connect Instance
 * POST: Conecta/reconecta instância
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { connectInstance } from '@/lib/evolution-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/evolution/instances/connect
 * Conecta instância Evolution API (gera novo QR Code)
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const clientIp = getClientIp(req);
    const rateLimitResult = checkRateLimit({
      identifier: `evolution-instances-connect:${clientIp}`,
      maxRequests: 20,
      windowMs: 60000,
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit excedido' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { instanceName } = body;

    if (!instanceName) {
      return NextResponse.json(
        { success: false, error: 'instanceName é obrigatório' },
        { status: 400 }
      );
    }

    const result = await connectInstance(instanceName);

    return NextResponse.json({
      success: true,
      message: 'Instância conectada',
      data: result,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[API] Erro ao conectar instância:', error);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
