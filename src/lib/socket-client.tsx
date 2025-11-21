"use client";

/**
 * Socket.io Client Provider & Hook
 * Gerencia conexão Socket.io no frontend
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from './socket-server';
import { DEMO_USER_ID } from './demo-user';

type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface SocketContextValue {
  socket: ClientSocket | null;
  isConnected: boolean;
  userId: string;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
  userId: DEMO_USER_ID,
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<ClientSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const userId = DEMO_USER_ID; // TODO: trocar por auth real

  useEffect(() => {
    // Inicializa Socket.io client
    const socketInstance: ClientSocket = io({
      path: '/api/socketio',
      auth: { userId },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketInstance.on('connect', () => {
      console.log('[Socket.io Client] Conectado:', socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('[Socket.io Client] Desconectado:', reason);
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('[Socket.io Client] Erro de conexão:', error.message);
    });

    setSocket(socketInstance);

    // Cleanup
    return () => {
      console.log('[Socket.io Client] Limpando conexão');
      socketInstance.disconnect();
    };
  }, [userId]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, userId }}>
      {children}
    </SocketContext.Provider>
  );
}

/**
 * Hook para acessar Socket.io client
 */
export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
}

/**
 * Hook para escutar eventos específicos
 */
export function useSocketEvent<K extends keyof ServerToClientEvents>(
  event: K,
  handler: ServerToClientEvents[K]
) {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    // Type assertion necessária por limitação do TypeScript com Socket.io
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket.on(event, handler as any);

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      socket.off(event, handler as any);
    };
  }, [socket, event, handler]);
}

/**
 * Hook para Evolution API events (QR Code, status)
 */
export function useEvolutionEvents(instanceName: string) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<'connecting' | 'open' | 'close'>('close');
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);

  useSocketEvent('evolution:qrcode', (data) => {
    if (data.instanceName === instanceName) {
      setQrCode(data.qrcode);
      setStatus('connecting');
    }
  });

  useSocketEvent('evolution:connected', (data) => {
    if (data.instanceName === instanceName) {
      setQrCode(null);
      setStatus('open');
      setPhoneNumber(data.phoneNumber || null);
    }
  });

  useSocketEvent('evolution:disconnected', (data) => {
    if (data.instanceName === instanceName) {
      setQrCode(null);
      setStatus('close');
      setPhoneNumber(null);
    }
  });

  useSocketEvent('evolution:status', (data) => {
    if (data.instanceName === instanceName) {
      setStatus(data.status);
    }
  });

  return { qrCode, status, phoneNumber };
}
