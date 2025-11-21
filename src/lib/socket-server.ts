/**
 * Socket.io Server Singleton
 * Gerencia conexões em tempo real para notificações
 */

import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Tipos de eventos Socket.io
export interface ServerToClientEvents {
  // Eventos de campanha
  'campaign:created': (data: { campaignId: string; userId: string }) => void;
  'campaign:updated': (data: { campaignId: string; status: string; stats?: { leadsCount?: number; [key: string]: unknown } }) => void;
  'campaign:completed': (data: { campaignId: string; userId: string }) => void;
  'campaign:failed': (data: { campaignId: string; userId: string; error?: string }) => void;

  // Eventos de leads
  'leads:extracted': (data: { campaignId: string; count: number; userId: string }) => void;
  'lead:enriched': (data: { leadId: string; campaignId: string; userId: string }) => void;

  // Eventos de Evolution API (WhatsApp)
  'evolution:qrcode': (data: { instanceName: string; qrcode: string; userId: string }) => void;
  'evolution:connected': (data: { instanceName: string; phoneNumber?: string; userId: string }) => void;
  'evolution:disconnected': (data: { instanceName: string; reason?: string; userId: string }) => void;
  'evolution:status': (data: { instanceName: string; status: 'connecting' | 'open' | 'close'; userId: string }) => void;

  // Eventos de mensagens
  'message:sent': (data: { type: 'email' | 'whatsapp'; leadId: string; campaignId: string; userId: string }) => void;
  'message:delivered': (data: { type: 'email' | 'whatsapp'; leadId: string; userId: string }) => void;
  'message:opened': (data: { type: 'email'; leadId: string; userId: string }) => void;
  'message:replied': (data: { type: 'email' | 'whatsapp'; leadId: string; userId: string }) => void;

  // Eventos de créditos
  'credits:updated': (data: { userId: string; credits: number; change: number }) => void;

  // Notificações genéricas
  'notification': (data: { type: 'success' | 'error' | 'info' | 'warning'; message: string; userId: string }) => void;
}

export interface ClientToServerEvents {
  // Cliente se autentica com userId
  'authenticate': (userId: string) => void;

  // Pings para keep-alive
  'ping': () => void;
}

export type SocketServer = SocketIOServer<ClientToServerEvents, ServerToClientEvents>;

let io: SocketServer | null = null;

/**
 * Inicializa o servidor Socket.io (apenas uma vez)
 */
export function initSocketServer(httpServer: NetServer): SocketServer {
  if (io) {
    console.log('[Socket.io] Servidor já inicializado');
    return io;
  }

  io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    path: '/api/socketio',
    addTrailingSlash: false,
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Performance settings
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 45000,
    maxHttpBufferSize: 1e6, // 1MB
  });

  // Middleware de autenticação
  io.use((socket, next) => {
    const userId = socket.handshake.auth.userId;

    if (!userId) {
      console.warn('[Socket.io] Cliente sem userId:', socket.id);
      return next(new Error('Autenticação necessária'));
    }

    // Armazena userId no socket
    socket.data.userId = userId;
    next();
  });

  // Gerenciamento de conexões
  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    console.log(`[Socket.io] Cliente conectado: ${socket.id} (userId: ${userId})`);

    // Cliente entra em room específica do usuário
    socket.join(`user:${userId}`);

    // Ping/pong para keep-alive
    socket.on('ping', () => {
      socket.emit('notification', {
        type: 'info',
        message: 'pong',
        userId,
      });
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.io] Cliente desconectado: ${socket.id} (reason: ${reason})`);
    });
  });

  console.log('[Socket.io] Servidor inicializado com sucesso');
  return io;
}

/**
 * Obtém instância do servidor Socket.io
 */
export function getSocketServer(): SocketServer | null {
  return io;
}

/**
 * Emite evento para usuário específico
 */
export function emitToUser<K extends keyof ServerToClientEvents>(
  userId: string,
  event: K,
  data: Parameters<ServerToClientEvents[K]>[0]
): void {
  if (!io) {
    console.warn(`[Socket.io] Servidor não inicializado. Evento "${event}" não enviado.`);
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (io.to(`user:${userId}`) as any).emit(event, data);
  console.log(`[Socket.io] Evento "${event}" enviado para userId: ${userId}`);
}

/**
 * Emite evento para todos os clientes conectados
 */
export function emitToAll<K extends keyof ServerToClientEvents>(
  event: K,
  data: Parameters<ServerToClientEvents[K]>[0]
): void {
  if (!io) {
    console.warn(`[Socket.io] Servidor não inicializado. Evento "${event}" não enviado.`);
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (io as any).emit(event, data);
  console.log(`[Socket.io] Evento "${event}" enviado para todos os clientes`);
}
