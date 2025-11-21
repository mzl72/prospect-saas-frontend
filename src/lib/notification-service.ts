/**
 * Notification Service
 * Wrapper para emitir eventos Socket.io de forma tipada e organizada
 */

import { emitToUser, emitToAll } from './socket-server';

// ========================================
// CAMPAIGN NOTIFICATIONS
// ========================================

export function notifyCampaignCreated(userId: string, campaignId: string) {
  emitToUser(userId, 'campaign:created', { campaignId, userId });
}

export function notifyCampaignUpdated(
  userId: string,
  campaignId: string,
  status: string,
  stats?: Record<string, unknown>
) {
  emitToUser(userId, 'campaign:updated', { campaignId, status, stats });
}

export function notifyCampaignCompleted(userId: string, campaignId: string) {
  emitToUser(userId, 'campaign:completed', { campaignId, userId });
}

export function notifyCampaignFailed(userId: string, campaignId: string, error?: string) {
  emitToUser(userId, 'campaign:failed', { campaignId, userId, error });
}

// ========================================
// LEAD NOTIFICATIONS
// ========================================

export function notifyLeadsExtracted(userId: string, campaignId: string, count: number) {
  emitToUser(userId, 'leads:extracted', { campaignId, count, userId });
}

export function notifyLeadEnriched(userId: string, campaignId: string, leadId: string) {
  emitToUser(userId, 'lead:enriched', { leadId, campaignId, userId });
}

// ========================================
// EVOLUTION API (WHATSAPP) NOTIFICATIONS
// ========================================

export function notifyEvolutionQRCode(userId: string, instanceName: string, qrcode: string) {
  emitToUser(userId, 'evolution:qrcode', { instanceName, qrcode, userId });
  console.log(`[Notification] QR Code emitido para instância: ${instanceName}`);
}

export function notifyEvolutionConnected(
  userId: string,
  instanceName: string,
  phoneNumber?: string
) {
  emitToUser(userId, 'evolution:connected', { instanceName, phoneNumber, userId });
  console.log(`[Notification] Instância conectada: ${instanceName}`);
}

export function notifyEvolutionDisconnected(
  userId: string,
  instanceName: string,
  reason?: string
) {
  emitToUser(userId, 'evolution:disconnected', { instanceName, reason, userId });
  console.log(`[Notification] Instância desconectada: ${instanceName}`);
}

export function notifyEvolutionStatus(
  userId: string,
  instanceName: string,
  status: 'connecting' | 'open' | 'close'
) {
  emitToUser(userId, 'evolution:status', { instanceName, status, userId });
  console.log(`[Notification] Status da instância ${instanceName}: ${status}`);
}

// ========================================
// MESSAGE NOTIFICATIONS
// ========================================

export function notifyMessageSent(
  userId: string,
  type: 'email' | 'whatsapp',
  leadId: string,
  campaignId: string
) {
  emitToUser(userId, 'message:sent', { type, leadId, campaignId, userId });
}

export function notifyMessageDelivered(
  userId: string,
  type: 'email' | 'whatsapp',
  leadId: string
) {
  emitToUser(userId, 'message:delivered', { type, leadId, userId });
}

export function notifyMessageOpened(userId: string, leadId: string) {
  emitToUser(userId, 'message:opened', { type: 'email', leadId, userId });
}

export function notifyMessageReplied(
  userId: string,
  type: 'email' | 'whatsapp',
  leadId: string
) {
  emitToUser(userId, 'message:replied', { type, leadId, userId });
}

// ========================================
// CREDITS NOTIFICATIONS
// ========================================

export function notifyCreditsUpdated(userId: string, credits: number, change: number) {
  emitToUser(userId, 'credits:updated', { userId, credits, change });
}

// ========================================
// GENERIC NOTIFICATIONS
// ========================================

export function notifyUser(
  userId: string,
  type: 'success' | 'error' | 'info' | 'warning',
  message: string
) {
  emitToUser(userId, 'notification', { type, message, userId });
}

export function notifyAllUsers(
  type: 'success' | 'error' | 'info' | 'warning',
  message: string
) {
  // Para notificações globais (manutenção, etc)
  // Precisa incluir userId mas será broadcast
  emitToAll('notification', { type, message, userId: 'system' });
}
