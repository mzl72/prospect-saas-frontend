# src/lib - Utilitários e Serviços

Funções auxiliares, stores, validações e configurações centralizadas.

## Database

### `prisma-db.ts`
Prisma Client singleton com hot-reload em desenvolvimento. Logs condicionais (query/error/warn em dev, só error em prod).

## Auth (NextAuth)

### `auth/config.ts`
NextAuth config: Credentials provider, bcrypt hash, JWT com tokenVersion (invalidação), callbacks (session, jwt). Rate limit login: 5 tentativas/15min.

### `auth/index.ts`
Exporta `requireAuth()` helper para proteger API routes. Verifica session + tokenVersion. Throw UNAUTHORIZED se inválido.

### `auth/session.ts`
`getServerSession()` wrapper com authOptions. Usado em middleware e páginas server-side.

### `auth/session-provider.tsx`
SessionProvider wrapper para client components. Usado no root layout.

## Pricing & Business Logic

### `pricing-service.ts`

SINGLE SOURCE OF TRUTH para cálculos de créditos: `calculateCampaignCost()`, `calculateRefund()`, `hasEnoughCredits()`, `calculateDiscount()` (15% para 200+, 10% para 100+, 5% para 40+).

### `constants.ts`

Constantes centralizadas: PRICING (BASICO: 0.25, COMPLETO: 1.0), ALLOWED_QUANTITIES, CACHE_TIMES, CAMPAIGN_TIMEOUT, labels de status. Função `calculateCampaignTimeout()` com validação de inputs.

## Validação & Sanitização

### `validation-schemas.ts`

Zod schemas para DTOs: `CreateCampaignSchema`, `LeadDataSchema`, `LeadEnrichmentSchema`, `CreateTemplateSchema` (type, name, subject?, content com limites de tamanho), `UpdateTemplateSchema` (partial + isActive).

### `sanitization.ts`

Funções de limpeza de dados: `normalizeToNull()` (converte sentinels "N/A" para null), `sanitizeInput()` (remove XSS, preserva variáveis {template}), `containsXSS()`, `escapeHtml()`, `escapeCsvCell()`, `generateSecureCSV()` (anti CSV injection).

## Templates

### `template-helpers.ts`

Helpers para manipulação de templates com variáveis dinâmicas: `extractVariables()` (extrai {variavel} com regex seguro), `validateTemplateVariables()` (verifica dados disponíveis), `renderTemplate()` (substitui variáveis), `sanitizeTemplate()` (remove variáveis ausentes), `previewTemplate()` (gera preview com dados de exemplo).

## Segurança

### `security.ts`

Rate limiting por usuário (`checkUserRateLimit`, store em memória com LRU cleanup), validações anti-DoS (`validateStringLength`, `validateArrayLength`, `validatePayloadSize`), `sanitizeForDatabase()` (previne NoSQL injection, preserva JSON), `isValidCUID()`, `constantTimeCompare()` (anti timing attack).

## React Query

### `react-query.tsx`

Provider TanStack Query v5 com configuração global: staleTime 3min, gcTime 10min, retry inteligente (não retenta 4xx), backoff exponencial, sem refetch on window focus. Exporta `getQueryClient()` para invalidações globais.

## Utilitários

### `utils.ts`
Helper `cn()` do Shadcn para merge de classes Tailwind (clsx + tailwind-merge).

### `retry.ts`
`fetchWithRetry()` com exponential backoff. Usado para chamar N8N webhook. Configurável: maxAttempts, initialDelayMs, maxDelayMs.

### `logger.ts`
Logger estruturado: `logger.info()`, `logger.error()`, `logger.warn()`. JSON format em produção, console.log em dev.

## Padrões de Código

- Constantes em UPPER_SNAKE_CASE com `as const`
- Funções de cálculo com validação de inputs e throw de erros descritivos
- Sanitização em camadas: Zod → sanitizeForDatabase → validações específicas
- Rate limiting diferenciado por tipo de operação (leitura > escrita)
- Stores Zustand com partialize para controlar o que persiste
- Comentários JSDoc em funções públicas
