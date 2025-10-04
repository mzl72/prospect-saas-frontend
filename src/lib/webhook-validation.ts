/**
 * Utilitários para validação de webhooks
 * Implementa validação de assinatura HMAC para maior segurança
 */

import crypto from 'crypto'

/**
 * Valida assinatura HMAC de webhook do Resend
 * @param payload Payload do webhook (string JSON)
 * @param signature Assinatura recebida no header
 * @param secret Secret configurado no Resend
 * @returns true se assinatura é válida
 */
export function validateResendWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false

  // Resend usa SHA-256 HMAC
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  // Comparação segura contra timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

/**
 * Valida webhook simples por API key/secret
 * Usado para Evolution API e N8N
 */
export function validateSimpleWebhook(
  providedKey: string | null,
  expectedKey: string | undefined
): boolean {
  if (!expectedKey) {
    throw new Error('Webhook secret not configured')
  }

  if (!providedKey) {
    return false
  }

  // Comparação segura contra timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(providedKey),
    Buffer.from(expectedKey)
  )
}
