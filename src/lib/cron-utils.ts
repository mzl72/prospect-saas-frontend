/**
 * Utilitários compartilhados para cron jobs de envio
 * Centraliza lógica comum entre send-emails e send-whatsapp
 */

import { NextRequest } from 'next/server';
import { EmailStatus, WhatsAppStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma-db';
import { DEMO_USER_ID } from '@/lib/demo-user';
import { constantTimeCompare } from '@/lib/security';

// ========================================
// AUTENTICAÇÃO
// ========================================

/**
 * Valida secret do cron job (usando constant-time compare para prevenir timing attacks)
 */
export function validateCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('[Cron] CRON_SECRET not configured in environment variables');
    return false;
  }

  if (!authHeader) {
    return false;
  }

  // Formato esperado: "Bearer <secret>"
  const token = authHeader.replace('Bearer ', '');

  // Usa constant-time compare para prevenir timing attacks
  return constantTimeCompare(token, cronSecret);
}

// ========================================
// STATS E CONTADORES
// ========================================

export interface SequenceStats {
  seq1: number;
  seq2: number;
  seq3: number;
  total: number;
}

/**
 * Busca quantas mensagens foram enviadas hoje por sequência
 */
export async function getSentTodayStats(
  channel: 'email' | 'whatsapp'
): Promise<SequenceStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (channel === 'email') {
    const sentTodayBySeq = await prisma.email.groupBy({
      by: ['sequenceNumber'],
      where: {
        status: EmailStatus.SENT,
        sentAt: { gte: today },
      },
      _count: { id: true },
    });

    const seq1 = sentTodayBySeq.find(s => s.sequenceNumber === 1)?._count.id || 0;
    const seq2 = sentTodayBySeq.find(s => s.sequenceNumber === 2)?._count.id || 0;
    const seq3 = sentTodayBySeq.find(s => s.sequenceNumber === 3)?._count.id || 0;

    return { seq1, seq2, seq3, total: seq1 + seq2 + seq3 };
  } else {
    const sentTodayBySeq = await prisma.whatsAppMessage.groupBy({
      by: ['sequenceNumber'],
      where: {
        status: WhatsAppStatus.SENT,
        sentAt: { gte: today },
      },
      _count: { id: true },
    });

    const seq1 = sentTodayBySeq.find(s => s.sequenceNumber === 1)?._count.id || 0;
    const seq2 = sentTodayBySeq.find(s => s.sequenceNumber === 2)?._count.id || 0;
    const seq3 = sentTodayBySeq.find(s => s.sequenceNumber === 3)?._count.id || 0;

    return { seq1, seq2, seq3, total: seq1 + seq2 + seq3 };
  }
}

// ========================================
// SEND LOG (Delay Management)
// ========================================

/**
 * Busca o último log de envio do canal
 */
export async function getSendLog(channel: 'email' | 'whatsapp') {
  return await prisma.channelSendLog.findUnique({
    where: {
      userId_channel: {
        userId: DEMO_USER_ID,
        channel,
      },
    },
  });
}

/**
 * Atualiza o log de envio com novo nextAllowedAt
 */
export async function updateSendLog(
  channel: 'email' | 'whatsapp',
  nextAllowedAt: Date
) {
  await prisma.channelSendLog.upsert({
    where: {
      userId_channel: {
        userId: DEMO_USER_ID,
        channel,
      },
    },
    create: {
      userId: DEMO_USER_ID,
      channel,
      lastSentAt: new Date(),
      nextAllowedAt,
    },
    update: {
      lastSentAt: new Date(),
      nextAllowedAt,
    },
  });
}

// ========================================
// RESPONSE BUILDERS
// ========================================

export interface CronStatsResponse {
  sent: number;
  skipped: number;
  failed: number;
  total?: number;
  duration?: string;
  sentToday: number;
  dailyLimit: number;
}

export function buildSuccessResponse(stats: CronStatsResponse) {
  return {
    success: true,
    stats,
  };
}

export function buildLimitReachedResponse(sentToday: number, limit: number) {
  return {
    success: true,
    message: 'Daily limit reached',
    stats: { sentToday, limit },
  };
}

export function buildWaitingResponse(
  sentToday: number,
  limit: number,
  nextAllowedAt: Date
) {
  const waitTimeMs = nextAllowedAt.getTime() - Date.now();
  const waitMinutes = Math.ceil(waitTimeMs / 60000);

  return {
    success: true,
    message: 'Waiting for next send window',
    stats: {
      sentToday,
      limit,
      nextAllowedAt,
      waitMinutes,
    },
  };
}

export function buildNoPendingResponse(sentToday: number, limit: number) {
  return {
    success: true,
    message: 'No pending messages',
    stats: { sentToday, limit },
  };
}

export function buildNotReadyResponse(sentToday: number, limit: number, skipped: number = 1) {
  return {
    success: true,
    message: 'Message not ready to send yet',
    stats: { sentToday, limit, skipped },
  };
}
