/**
 * Evolution API Logout Instance
 * POST: Desconecta instância (logout)
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { DEMO_USER_ID } from '@/lib/demo-user';
import { logoutInstance } from '@/lib/evolution-service';
import { notifyEvolutionDisconnected } from '@/lib/notification-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/evolution/instances/logout
 * Desconecta instância Evolution API
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const clientIp = getClientIp(req);
    const rateLimitResult = checkRateLimit({
      identifier: `evolution-instances-logout:${clientIp}`,
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

    await logoutInstance(instanceName);

    // Notificar via Socket.io
    notifyEvolutionDisconnected(DEMO_USER_ID, instanceName, 'logout manual');

    return NextResponse.json({
      success: true,
      message: 'Instância desconectada',
    });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('[API] Erro ao desconectar instância:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erro ao desconectar instância',
      },
      { status: 500 }
    );
  }
}
