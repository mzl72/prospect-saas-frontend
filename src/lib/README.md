# Lib - Core Services & Utilities

**prisma-db.ts**: Cliente Prisma singleton com logging em dev
**demo-user.ts**: Gerencia usuário demo (DEMO_USER_ID hardcoded para MVP)
**constants.ts**: Constantes do app (preços, quantidades, cache times, labels de status)
**pricing-service.ts**: Cálculos de créditos, custos e reembolsos (single source of truth)
**validation-schemas.ts**: Schemas Zod para validação de DTOs (campanhas, settings, leads)
**sanitization.ts**: Funções de normalização, escape HTML e prevenção XSS
**rate-limit.ts**: Rate limiting em memória com LRU e cleanup automático
**store.ts**: Estado global Zustand (wizard não-persistido + UI persistido)
**react-query.tsx**: Provider React Query com retry logic e cache config
**base-scheduler.ts**: Lógica unificada de scheduling (email + WhatsApp + híbrido)
**scheduling-utils.ts**: Utilitários de timing (horário comercial, delays, janelas de tempo)
**message-service.ts**: Serviço unificado de envio (Resend + Evolution API)
**email-service.ts**: Wrapper de compatibilidade para message-service
**whatsapp-service.ts**: Wrapper de compatibilidade para message-service
**email-scheduler.ts**: Scheduler específico de emails (usa base-scheduler)
**whatsapp-scheduler.ts**: Scheduler específico de WhatsApp (usa base-scheduler)
**campaign-status-service.ts**: Gerencia transições de status de campanhas
**cron-utils.ts**: Utilitários para cron jobs (tracking diário, distribuição equilibrada)
**csv-export.ts**: Exporta leads para CSV
**webhook-validation.ts**: Valida webhooks N8N (secret verification)
**utils.ts**: Utilitários gerais (clsx/tailwind merge)
