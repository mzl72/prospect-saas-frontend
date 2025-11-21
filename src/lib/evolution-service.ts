/**
 * Evolution API Service
 * Gerencia instâncias WhatsApp via Evolution API
 */

import axios from 'axios';
import {
  notifyEvolutionQRCode,
  notifyEvolutionConnected,
  notifyEvolutionDisconnected,
  notifyEvolutionStatus,
} from './notification-service';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

if (!EVOLUTION_API_KEY) {
  console.warn('[Evolution Service] EVOLUTION_API_KEY não configurado');
}

// ========================================
// TYPES
// ========================================

export interface EvolutionInstance {
  instanceName: string;
  instanceId?: string;
  status: 'connecting' | 'open' | 'close';
  serverUrl?: string;
  apikey?: string;
  owner?: string;
  phoneNumber?: string;
  profileName?: string;
  profilePicUrl?: string;
  qrcode?: {
    code: string;
    base64: string;
  };
}

export interface CreateInstanceData {
  instanceName: string;
  qrcode?: boolean;
  number?: string;
  integration?: string;
  webhookUrl?: string;
  webhookByEvents?: boolean;
  events?: string[];
  rejectCall?: boolean;
  msgCall?: string;
  groupsIgnore?: boolean;
  alwaysOnline?: boolean;
  readMessages?: boolean;
  readStatus?: boolean;
  syncFullHistory?: boolean;
}

export interface InstanceConnectionState {
  instance: string;
  state: 'connecting' | 'open' | 'close';
}

// ========================================
// AXIOS INSTANCE
// ========================================

const evolutionApi = axios.create({
  baseURL: EVOLUTION_API_URL,
  headers: {
    'Content-Type': 'application/json',
    apikey: EVOLUTION_API_KEY,
  },
  timeout: 30000,
});

// ========================================
// INSTANCE MANAGEMENT
// ========================================

/**
 * Cria nova instância Evolution API
 */
export async function createEvolutionInstance(
  instanceName: string,
  userId: string,
  options?: Partial<CreateInstanceData>
): Promise<EvolutionInstance> {
  try {
    console.log(`[Evolution] Criando instância: ${instanceName}`);

    const payload: CreateInstanceData = {
      instanceName,
      qrcode: true, // Sempre gerar QR Code
      integration: 'WHATSAPP-BAILEYS',
      webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/evolution`,
      webhookByEvents: false,
      events: [
        'QRCODE_UPDATED',
        'CONNECTION_UPDATE',
        'MESSAGES_UPSERT',
        'MESSAGES_UPDATE',
        'SEND_MESSAGE',
      ],
      rejectCall: false,
      groupsIgnore: true,
      alwaysOnline: true,
      readMessages: false,
      readStatus: false,
      syncFullHistory: false,
      ...options,
    };

    const response = await evolutionApi.post('/instance/create', payload);

    const instance: EvolutionInstance = {
      instanceName,
      status: 'connecting',
      ...response.data.instance,
    };

    // Se houver QR Code na resposta, notificar via Socket.io
    if (response.data.qrcode?.code) {
      notifyEvolutionQRCode(userId, instanceName, response.data.qrcode.code);
    }

    console.log(`[Evolution] Instância criada: ${instanceName}`);
    return instance;
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
    console.error(`[Evolution] Erro ao criar instância ${instanceName}:`, axiosError.response?.data || axiosError.message);
    throw new Error(
      axiosError.response?.data?.message || `Erro ao criar instância ${instanceName}`
    );
  }
}

/**
 * Deleta instância Evolution API
 */
export async function deleteEvolutionInstance(instanceName: string): Promise<void> {
  try {
    console.log(`[Evolution] Deletando instância: ${instanceName}`);

    await evolutionApi.delete(`/instance/delete/${instanceName}`);

    console.log(`[Evolution] Instância deletada: ${instanceName}`);
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
    console.error(`[Evolution] Erro ao deletar instância ${instanceName}:`, axiosError.response?.data || axiosError.message);
    throw new Error(
      axiosError.response?.data?.message || `Erro ao deletar instância ${instanceName}`
    );
  }
}

/**
 * Lista todas as instâncias
 */
export async function fetchEvolutionInstances(): Promise<EvolutionInstance[]> {
  try {
    const response = await evolutionApi.get('/instance/fetchInstances');

    interface RawInstance {
      instance?: {
        instanceName?: string;
        instanceId?: string;
        state?: string;
        serverUrl?: string;
        apikey?: string;
        owner?: string;
        phoneNumber?: string;
        profileName?: string;
        profilePicUrl?: string;
      };
      instanceName?: string;
      state?: string;
    }

    const instances: EvolutionInstance[] = (response.data || []).map((inst: RawInstance) => ({
      instanceName: inst.instance?.instanceName || inst.instanceName,
      instanceId: inst.instance?.instanceId,
      status: inst.instance?.state || inst.state || 'close',
      serverUrl: inst.instance?.serverUrl,
      apikey: inst.instance?.apikey,
      owner: inst.instance?.owner,
      phoneNumber: inst.instance?.phoneNumber,
      profileName: inst.instance?.profileName,
      profilePicUrl: inst.instance?.profilePicUrl,
    }));

    return instances;
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: unknown }; message?: string };
    console.error('[Evolution] Erro ao listar instâncias:', axiosError.response?.data || axiosError.message);
    return [];
  }
}

/**
 * Obtém status de conexão de uma instância
 */
export async function getInstanceConnectionState(
  instanceName: string
): Promise<InstanceConnectionState> {
  try {
    const response = await evolutionApi.get(`/instance/connectionState/${instanceName}`);

    return {
      instance: response.data.instance,
      state: response.data.state || 'close',
    };
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: unknown }; message?: string };
    console.error(`[Evolution] Erro ao obter status de ${instanceName}:`, axiosError.response?.data || axiosError.message);
    return {
      instance: instanceName,
      state: 'close',
    };
  }
}

/**
 * Conecta instância (útil para reconectar)
 */
export async function connectInstance(instanceName: string): Promise<{
  success: boolean;
  qrcode?: { code: string; base64?: string };
  instance?: { state?: string };
}> {
  try {
    console.log(`[Evolution] Conectando instância: ${instanceName}`);

    const response = await evolutionApi.get(`/instance/connect/${instanceName}`);

    console.log(`[Evolution] Instância conectada: ${instanceName}`);
    return response.data;
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
    console.error(`[Evolution] Erro ao conectar instância ${instanceName}:`, axiosError.response?.data || axiosError.message);
    throw new Error(
      axiosError.response?.data?.message || `Erro ao conectar instância ${instanceName}`
    );
  }
}

/**
 * Desconecta instância (logout)
 */
export async function logoutInstance(instanceName: string): Promise<void> {
  try {
    console.log(`[Evolution] Desconectando instância: ${instanceName}`);

    await evolutionApi.delete(`/instance/logout/${instanceName}`);

    console.log(`[Evolution] Instância desconectada: ${instanceName}`);
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
    console.error(`[Evolution] Erro ao desconectar instância ${instanceName}:`, axiosError.response?.data || axiosError.message);
    throw new Error(
      axiosError.response?.data?.message || `Erro ao desconectar instância ${instanceName}`
    );
  }
}

/**
 * Reinicia instância
 */
export async function restartInstance(instanceName: string): Promise<void> {
  try {
    console.log(`[Evolution] Reiniciando instância: ${instanceName}`);

    await evolutionApi.put(`/instance/restart/${instanceName}`);

    console.log(`[Evolution] Instância reiniciada: ${instanceName}`);
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
    console.error(`[Evolution] Erro ao reiniciar instância ${instanceName}:`, axiosError.response?.data || axiosError.message);
    throw new Error(
      axiosError.response?.data?.message || `Erro ao reiniciar instância ${instanceName}`
    );
  }
}

// ========================================
// WEBHOOK HANDLERS (chamados pelo webhook Evolution)
// ========================================

/**
 * Processa evento QRCODE_UPDATED do webhook
 */
export function handleQRCodeUpdated(
  userId: string,
  instanceName: string,
  qrcode: string
): void {
  console.log(`[Evolution] QR Code atualizado para ${instanceName}`);
  notifyEvolutionQRCode(userId, instanceName, qrcode);
}

/**
 * Processa evento CONNECTION_UPDATE do webhook
 */
export function handleConnectionUpdate(
  userId: string,
  instanceName: string,
  state: 'connecting' | 'open' | 'close',
  phoneNumber?: string
): void {
  console.log(`[Evolution] Conexão de ${instanceName} atualizada: ${state}`);

  notifyEvolutionStatus(userId, instanceName, state);

  if (state === 'open') {
    notifyEvolutionConnected(userId, instanceName, phoneNumber);
  } else if (state === 'close') {
    notifyEvolutionDisconnected(userId, instanceName);
  }
}
