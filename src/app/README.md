# src/app - Páginas e API Routes

Diretório do Next.js App Router com páginas, layouts e rotas de API.

## Páginas Principais

### `page.tsx`
Landing page com hero section, features, pricing e CTA. Design gradient com stats e cards animados.

### `layout.tsx`
Root layout com providers (ReactQuery, Toaster), metadata e global styles.

### `login/page.tsx`
Login com NextAuth (credentials provider), validação, redirect para /dashboard.

### `dashboard/page.tsx`
Dashboard com métricas gerais (campanhas, leads, conversões, créditos). Cards placeholder.

### `dashboard/layout.tsx`
Layout com Sidebar + TopBar + Breadcrumbs. Proteção de rotas autenticadas.

### `dashboard/campanhas/page.tsx`
Lista de campanhas com tabs (Todas/Ativas/Pausadas/Concluídas), filtros (busca, status, tipo), tabela sortable, ações em massa. Auto-refresh 30s. (DIA 3 - Meta Ads style)

### `dashboard/campanhas/[id]/page.tsx`
Detalhes da campanha com stats cards, tabela de leads, export CSV, modal de detalhes do lead, auto-refresh condicional.

### `dashboard/templates/page.tsx`
Placeholder para CRUD de templates (DIA 4-5). Access control: Manager+.

### `dashboard/configuracoes/page.tsx`
Placeholder para configurações (Evolution, Email, Usuários) (DIA 6-7). Access control: Admin only.

## API Routes

### `api/campaigns/route.ts`
**GET**: Lista campanhas (rate limit: 100 req/min). **POST**: Cria campanha, debita créditos, chama N8N (rate limit: 10 req/hora).

### `api/campaigns/bulk/route.ts`
**PATCH**: Ações em massa (pause/resume/archive). Rate limit: 10 req/hora. Valida ownership. (DIA 3)

### `api/campaigns/[id]/route.ts`
**GET**: Busca campanha com leads, calcula stats (rate limit: 200 req/min). **PATCH**: Atualiza status (rate limit: 30 req/min).

### `api/users/credits/route.ts`
**GET**: Saldo de créditos do usuário (rate limit: 120 req/min).

### `api/webhooks/n8n/route.ts`
Handler central N8N. Eventos: leads-extracted, lead-enriched, campaign-completed. Validação secret com constant-time compare (rate limit: 100 req/min por IP).

## Assets

### `globals.css`
Estilos globais com variáveis Tailwind v4 e animações customizadas.

### `favicon.ico`
Ícone da aplicação.

## Padrões de Código

- Todas as rotas API usam `export const dynamic = "force-dynamic"` (sem cache)
- Rate limiting em todas as rotas (diferentes limites por endpoint)
- Validação de ownership em rotas de recursos (campanhas/leads)
- Sanitização de payloads (Zod + XSS + NoSQL injection)
- Error logging estruturado com timestamp
- Transações Prisma para operações críticas (créditos + campanha)
- Validação de CUID (previne injection)
- Payload size limits (10KB-5MB dependendo do endpoint)
