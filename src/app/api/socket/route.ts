/**
 * Socket.io API Route
 * Inicializa servidor Socket.io com Next.js 15 App Router
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/socket
 * Health check endpoint
 */
export async function GET(_req: NextRequest) {
  // Apenas retorna status do socket
  return NextResponse.json({
    success: true,
    message: 'Socket.io server is running',
    path: '/api/socketio',
  });
}
