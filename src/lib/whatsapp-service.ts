/**
 * Serviço de envio de WhatsApp via Evolution API
 * Wrapper simplificado para a API do Evolution com tratamento de erros
 */

import axios from 'axios'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE

export interface SendWhatsAppParams {
  phone: string
  message: string
}

export interface SendWhatsAppResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Envia uma mensagem de WhatsApp via Evolution API
 * @param params Parâmetros da mensagem
 * @returns Resultado do envio com messageId ou erro
 */
export async function sendWhatsAppMessage(
  params: SendWhatsAppParams
): Promise<SendWhatsAppResult> {
  try {
    // Validação básica
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE) {
      throw new Error('Evolution API credentials not configured')
    }

    if (!params.phone || !params.message) {
      throw new Error('Missing required WhatsApp parameters')
    }

    // Sanitizar telefone (remover formatação)
    const cleanPhone = sanitizePhone(params.phone)

    console.log('[Evolution API] Sending WhatsApp:', {
      phone: cleanPhone,
      messageLength: params.message.length,
    })

    // Enviar via Evolution API
    const response = await axios.post(
      `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
      {
        number: cleanPhone,
        text: params.message,
      },
      {
        headers: {
          apikey: EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    )

    const messageId = response.data?.key?.id

    if (!messageId) {
      console.error('[Evolution API] No messageId returned:', response.data)
      return {
        success: false,
        error: 'No messageId returned from Evolution API',
      }
    }

    console.log('[Evolution API] Message sent successfully:', messageId)
    return {
      success: true,
      messageId,
    }
  } catch (error) {
    console.error('[Evolution API] Unexpected error:', error)

    if (axios.isAxiosError(error)) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message

      return {
        success: false,
        error: `Evolution API error: ${errorMessage}`,
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Valida se um número de telefone é válido (formato básico brasileiro)
 * @param phone Telefone para validar
 * @returns true se válido
 */
export function isValidPhone(phone: string): boolean {
  // Remove formatação e valida se tem 10-13 dígitos
  const cleanPhone = phone.replace(/\D/g, '')
  return cleanPhone.length >= 10 && cleanPhone.length <= 13
}

/**
 * Sanitiza telefone removendo formatação e adicionando código do país se necessário
 * @param phone Telefone para sanitizar
 * @returns Telefone sanitizado no formato internacional (5511999999999)
 */
export function sanitizePhone(phone: string): string {
  // Remove todos os caracteres não numéricos
  let clean = phone.replace(/\D/g, '')

  // Se não tem código do país (55), adiciona
  if (!clean.startsWith('55') && clean.length <= 11) {
    clean = '55' + clean
  }

  return clean
}

/**
 * Formata telefone para exibição (55 11 99999-9999)
 * @param phone Telefone para formatar
 * @returns Telefone formatado
 */
export function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '')

  // Formato: +55 11 99999-9999
  if (clean.length === 13) {
    return `+${clean.slice(0, 2)} ${clean.slice(2, 4)} ${clean.slice(4, 9)}-${clean.slice(9)}`
  }

  // Formato: +55 11 9999-9999 (número fixo)
  if (clean.length === 12) {
    return `+${clean.slice(0, 2)} ${clean.slice(2, 4)} ${clean.slice(4, 8)}-${clean.slice(8)}`
  }

  return phone
}
