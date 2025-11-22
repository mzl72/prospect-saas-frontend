# src/lib - Utilitários e Serviços

Funções auxiliares, stores, validações e configurações centralizadas.

## Database

### `prisma-db.ts`

Prisma Client singleton com hot-reload em desenvolvimento. Logs condicionais (query/error/warn em dev, só error em prod).

### `demo-user.ts`

Gerenciamento do usuário demo (DEMO_USER_ID: "user-demo-001"). Função `ensureDemoUser()` garante existência no banco. TODO: substituir por autenticação real.

## Pricing & Business Logic

### `pricing-service.ts`

SINGLE SOURCE OF TRUTH para cálculos de créditos: `calculateCampaignCost()`, `calculateRefund()`, `hasEnoughCredits()`, `calculateDiscount()` (15% para 200+, 10% para 100+, 5% para 40+).

### `constants.ts`

Constantes centralizadas: PRICING (BASICO: 0.25, COMPLETO: 1.0), ALLOWED_QUANTITIES, CACHE_TIMES, CAMPAIGN_TIMEOUT, labels de status. Função `calculateCampaignTimeout()` com validação de inputs.

## Validação & Sanitização

### `validation-schemas.ts`

Zod schemas para DTOs: `CreateCampaignSchema` (titulo, tipoNegocio, localizacao, quantidade, nivelServico), `LeadDataSchema` (validação de leads do webhook Apify com URLs opcionais).

### `sanitization.ts`

Funções de limpeza de dados: `normalizeToNull()` (converte sentinels "N/A" para null), `sanitizeInput()` (remove XSS, preserva variáveis {template}), `containsXSS()`, `escapeHtml()`.

## Segurança

### `security.ts`

Rate limiting por usuário (`checkUserRateLimit`, store em memória com LRU cleanup), validações anti-DoS (`validateStringLength`, `validateArrayLength`, `validatePayloadSize`), `sanitizeForDatabase()` (previne NoSQL injection, preserva JSON), `isValidCUID()`, `constantTimeCompare()` (anti timing attack).

## React Query

### `react-query.tsx`

Provider TanStack Query v5 com configuração global: staleTime 3min, gcTime 10min, retry inteligente (não retenta 4xx), backoff exponencial, sem refetch on window focus. Exporta `getQueryClient()` para invalidações globais.

## Utilitários

### `utils.ts`

Helper `cn()` do Shadcn para merge de classes Tailwind (clsx + tailwind-merge).

## Padrões de Código

- Constantes em UPPER_SNAKE_CASE com `as const`
- Funções de cálculo com validação de inputs e throw de erros descritivos
- Sanitização em camadas: Zod → sanitizeForDatabase → validações específicas
- Rate limiting diferenciado por tipo de operação (leitura > escrita)
- Stores Zustand com partialize para controlar o que persiste
- Comentários JSDoc em funções públicas
