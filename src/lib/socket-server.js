/**
 * Socket.io Server Singleton (CommonJS para server.js)
 * Gerencia conexões em tempo real para notificações
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const { Server } = require('socket.io');

let io = null;

/**
 * Inicializa servidor Socket.io
 * @param {import('http').Server} httpServer
 * @returns {import('socket.io').Server}
 */
function initSocketServer(httpServer) {
  if (io) {
    console.log('[Socket.io] Server já inicializado');
    return io;
  }

  io = new Server(httpServer, {
    path: '/api/socketio',
    addTrailingSlash: false,
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Middleware de autenticação
  io.use((socket, next) => {
    const userId = socket.handshake.auth.userId;
    if (!userId) {
      console.warn('[Socket.io] Cliente tentou conectar sem userId');
      return next(new Error('userId é obrigatório'));
    }
    socket.data.userId = userId;
    next();
  });

  // Event handlers
  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    console.log(`[Socket.io] Cliente conectado: ${socket.id} (userId: ${userId})`);

    // Join room do usuário
    socket.join(`user:${userId}`);

    // Authenticate event
    socket.on('authenticate', (newUserId) => {
      socket.leave(`user:${socket.data.userId}`);
      socket.data.userId = newUserId;
      socket.join(`user:${newUserId}`);
      console.log(`[Socket.io] Cliente ${socket.id} autenticado como ${newUserId}`);
    });

    // Ping/Pong
    socket.on('ping', () => {
      socket.emit('pong');
    });

    // Disconnect
    socket.on('disconnect', (reason) => {
      console.log(`[Socket.io] Cliente desconectado: ${socket.id} (reason: ${reason})`);
    });

    // Error
    socket.on('error', (error) => {
      console.error(`[Socket.io] Erro no socket ${socket.id}:`, error);
    });
  });

  console.log('[Socket.io] Server inicializado com sucesso');
  return io;
}

/**
 * Retorna instância do Socket.io server
 * @returns {import('socket.io').Server | null}
 */
function getSocketServer() {
  return io;
}

/**
 * Emite evento para usuário específico
 * @param {string} userId
 * @param {string} event
 * @param {any} data
 */
function emitToUser(userId, event, data) {
  if (!io) {
    console.warn('[Socket.io] Server não inicializado, ignorando emissão');
    return;
  }
  io.to(`user:${userId}`).emit(event, data);
}

/**
 * Emite evento para todos os usuários conectados
 * @param {string} event
 * @param {any} data
 */
function emitToAll(event, data) {
  if (!io) {
    console.warn('[Socket.io] Server não inicializado, ignorando emissão');
    return;
  }
  io.emit(event, data);
}

module.exports = {
  initSocketServer,
  getSocketServer,
  emitToUser,
  emitToAll,
};
