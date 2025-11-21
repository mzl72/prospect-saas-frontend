# API Routes - Endpoints Next.js

Todas as rotas API do sistema (campanhas, leads, crons, webhooks, configurações).

## 📂 Estrutura

```
api/
├── campaigns/          # CRUD campanhas + leads
│   ├── route.ts        # GET (list) | POST (create)
│   └── [id]/
│       ├── route.ts    # GET (details com paginação de leads + stats)
│       └── leads/[leadId]/
│           └── route.ts    # GET (lead individual com emails/whatsapp)
├── cron/               # Jobs agendados (executam a cada 5min)
│   ├── send-messages/route.ts      # Envio automático unificado (email + WhatsApp)
│   └── check-campaign-timeout/route.ts  # Timeout + reembolso
├── webhooks/           # Integrações externas
│   ├── n8n/
│   │   ├── route.ts              # leads-extracted, lead-enriched (3 tipos)
│   │   └── handleLeadsExtracted.ts  # Handler auxiliar
│   ├── resend/route.ts           # Tracking emails (opened, clicked, bounced)
│   └── evolution/route.ts        # Status WhatsApp (sent, delivered, read)
├── settings/route.ts   # GET/POST UserSettings
├── unsubscribe/route.ts  # Opt-out (LGPD)
└── users/credits/route.ts  # Consulta créditos
```

---

## 🎯 Campaigns API

### `POST /api/campaigns`
**Cria nova campanha**
- Rate limiting: 10/hora por IP
- Validação: CreateCampaignSchema (Zod)
- Calcula custo via pricing-service
- **Valida campos obrigatórios** no modo COMPLETO:
  - nomeEmpresa, assinatura (empresa)
  - templates email/whatsapp (dependendo de cadenceType)
  - senderEmails (email) ou evolutionInstances (whatsapp)
  - Retorna `missingFieldsByPage` se faltar algo
- **Transação atômica**: cria campanha + debita créditos + registra timeout
- Dispara N8N webhook para iniciar extração

**Campos:**
```ts
{
  titulo: string;
  tipoNegocio: string;
  localizacao: string; // "cidade, estado"
  quantidade: number; // max 100
  nivelServico: "basico" | "completo";
  cadenceType: "email_only" | "whatsapp_only" | "hybrid";
}
```

### `GET /api/campaigns`
**Lista campanhas do usuário**
- Ordenadas por createdAt desc
- Inclui count de leads

### `GET /api/campaigns/[id]`
**Detalhes de campanha específica**
- Paginação de leads (default 50/página via query params: `?page=1&pageSize=50`)
- Inclui emails + whatsappMessages de cada lead
- Calcula stats precisas: totalLeads, totalExtracted, totalEnriched, totalEmailSent, totalWhatsAppSent, totalReplied, totalOptedOut, totalBounced
- Determina status correto via `determineCampaignStatus` (mas não sobrescreve COMPLETED/FAILED)
- Previne N+1 queries

### `GET /api/campaigns/[id]/leads/[leadId]`
**Lead individual**
- Validação de formato CUID (regex: `/^c[a-z0-9]{24}$/i`)
- Inclui histórico completo: emails + whatsappMessages ordenados por sequenceNumber
- Dados da campaign (id + title)

---

## ⏰ Cron Jobs

### `GET /api/cron/send-messages`
**Envio automático unificado de emails + WhatsApp** (executa a cada 5min)
- Auth: validateCronAuth (header Authorization)
- maxDuration: 300s
- **Fluxo:**
  1. Busca UserSettings
  2. Verifica limite diário por canal (`dailyEmailLimit`, `whatsappDailyLimit`, `hybridDailyLimit`)
  3. Distribui sequências equilibradas (seq1/seq2/seq3)
  4. Processa ambos canais em paralelo:
     - **Email**: Busca 1 email PENDING (cadenceType: EMAIL_ONLY ou HYBRID)
       - Valida timing com cadências JSON (dia da semana + janela de tempo)
       - Envia via `sendEmailViaResend`
       - Adiciona unsubscribe footer
     - **WhatsApp**: Busca 1 WhatsAppMessage PENDING (cadenceType: WHATSAPP_ONLY ou HYBRID)
       - Valida timing com cadências JSON
       - Round-robin de `evolutionInstances`
       - Envia via `sendWhatsAppMessage`
       - Adiciona opt-out footer
  5. Atualiza status + registra ChannelSendLog
  6. Calcula `nextAllowedSendTime` dinamicamente
- Usa wrappers: `canSendEmail`, `canSendWhatsApp` (de email/whatsapp-scheduler.ts)
- Responses padronizados: buildLimitReachedResponse, buildWaitingResponse, buildSuccessResponse

### `GET /api/cron/check-campaign-timeout`
**Detecta campanhas com timeout** (executa periodicamente)
- Busca campanhas PROCESSING onde `timeoutAt <= now`
- **Transação atômica**: marca FAILED + reembolsa `creditsCost`
- Promise.allSettled para não bloquear em erros
- Previne double-refund com status check
- Retorna summary: processedCount, successful, failed

---

## 🔗 Webhooks

### `POST /api/webhooks/n8n`
**Orquestração de leads N8N**
- Rate limiting: 100 req/min por IP
- Auth: header `x-webhook-secret`
- **Eventos:**
  - `leads-extracted`: Normaliza, detecta duplicatas, reembolsa créditos
  - `lead-enriched`: Email-only (cria 3 Email PENDING)
  - `lead-enriched-whatsapp`: WhatsApp-only (cria 3 WhatsAppMessage PENDING)
  - `lead-enriched-hybrid`: Híbrido (cria emails + whatsapp intercalados)
- Usa `normalizeToNull` para campos vazios
- Transactions para atomicidade

**handleLeadsExtracted.ts:**
- Normaliza formato de leads (array, JSON, nested objects)
- Valida lead (precisa ter: apifyId/placeId/title/nomeEmpresa)
- Detecta duplicatas por apifyId OU placeId
- Calcula reembolso via `calculateRefund` (pricing-service)
- Valida email com `isValidEmail`
- Batch create (createMany)
- Atualiza campanha: leadsRequested/leadsCreated/leadsDuplicated/creditsRefunded
- Reembolsa créditos em transaction

### `POST /api/webhooks/resend`
**Tracking de emails Resend**
- Auth: HMAC signature (headers: svix-signature ou webhook-signature)
- Validação: `validateResendWebhookSignature`
- **Eventos:**
  - `email.sent`: Aceito pelo Resend (log)
  - `email.delivered`: Entregue ao servidor (log)
  - `email.opened`: Lead abriu (atualiza openedAt, incrementa openCount)
  - `email.clicked`: Lead clicou em link (registra clickedAt)
  - `email.bounced`: Email bounced (status BOUNCED + Lead.status BOUNCED)
  - `email.complained`: Spam (log)

### `POST /api/webhooks/evolution`
**Status WhatsApp Evolution API**
- Auth: header `apikey` contra EVOLUTION_API_KEY
- **Eventos:**
  - `message.sent`: Enviado
  - `message.delivered`: status=3 (DELIVERED + deliveredAt)
  - `message.read`: status=4 (READ + readAt)
  - `message.received`: Reply do lead (fromMe=false → Lead.status REPLIED + repliedAt)
- Busca WhatsAppMessage por messageId

---

## ⚙️ Settings & Utilities

### `GET /api/settings`
**Busca configurações do usuário**
- Cria se não existe com DEFAULT_SETTINGS
- Campos: templates, cadências, prompts IA, evolutionInstances, senderEmails, limites, horários, info empresa

### `POST /api/settings`
**Salva configurações**
- Validação: Zod schema
- Sanitização: containsXSS check
- Normaliza evolutionInstances (suporta string[] ou object[] → JSON)
- Upsert

### `GET /api/unsubscribe?token=xxx`
**Opt-out de leads**
- Busca lead por optOutToken
- Atualiza status OPTED_OUT + optedOutAt
- Páginas HTML estilizadas para cada cenário:
  - Token inválido (400)
  - Lead não encontrado (404)
  - Já descadastrado (200)
  - Sucesso (200)
- Usa escapeHtml (XSS prevention)

### `GET /api/users/credits`
**Consulta saldo de créditos**
- Usa ensureDemoUser()
- Dynamic rendering
- Nota: PUT foi removido (débito acontece em POST /api/campaigns)

---

## 🔒 Segurança

- Rate limiting (rate-limit.ts): 10/hora campanhas, 100/min webhooks
- Validação Zod: todos inputs validados
- Sanitização XSS: sanitization.ts
- Auth tokens: CRON_SECRET, N8N_WEBHOOK_SECRET, EVOLUTION_API_KEY, RESEND_WEBHOOK_SECRET
- CUID validation: leads/[leadId]
- SQL Injection: Prisma ORM

## 📊 Performance

- Paginação inteligente: GET /campaigns/[id] (previne N+1)
- Transactions atômicas: debitar créditos, reembolsos
- Batch operations: createMany leads
- Dynamic rendering: forçado em rotas necessárias
