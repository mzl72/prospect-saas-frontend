# src/app - Páginas e API Routes

Diretório do Next.js App Router com páginas, layouts e rotas de API.

## Páginas Principais

### `page.tsx`
Landing page com hero section, features, pricing e CTA. Design gradient com stats e cards animados.

### `layout.tsx`
Root layout com providers (ReactQuery, Toaster), metadata e global styles.

### `gerar/page.tsx`
Página de geração de leads. Renderiza o LeadGenerationWizard em 3 etapas.

### `gerar/loading.tsx`
Loading state para página de geração.

### `campanhas/page.tsx`
Lista de campanhas do usuário com status, polling automático (10s) e timeout de 30min. Mostra reembolsos e duplicatas.

### `campanhas/loading.tsx`
Loading state para página de campanhas.

### `campanhas/[id]/page.tsx`
Detalhes de campanha específica com lista de leads paginada (50 por página), cálculo de stats e atualização de status.

### `campanhas/[id]/leads/[leadId]/page.tsx`
Página de detalhes de um lead específico (dados extraídos + enriquecidos).

### `campanhas/[id]/leads/[leadId]/whatsapp/page.tsx`
Página de visualização de mensagens WhatsApp preparadas para o lead.

## API Routes

### `api/campaigns/route.ts`
- **GET**: Lista campanhas do usuário (rate limit: 100 req/min)
- **POST**: Cria campanha, debita créditos, chama N8N webhook (rate limit: 10 req/hora)

### `api/campaigns/[id]/route.ts`
- **GET**: Busca campanha com leads paginados, calcula stats, atualiza status (rate limit: 200 req/min)
- **PATCH**: Atualiza status manual (cancelar/pausar) (rate limit: 30 req/min)

### `api/campaigns/[id]/leads/[leadId]/route.ts`
- **GET**: Busca lead específico com validação de ownership (rate limit: 300 req/min)

### `api/users/credits/route.ts`
- **GET**: Consulta saldo de créditos do usuário (rate limit: 120 req/min)

### `api/webhooks/n8n/route.ts`
Handler central de webhooks N8N. Recebe eventos: `leads-extracted`, `lead-enriched`, `lead-enriched-whatsapp`, `lead-enriched-hybrid`, `campaign-completed`. Validação de secret com constant-time compare (rate limit: 100 req/min por IP).

### `api/webhooks/n8n/handleLeadsExtracted.ts`
Processa leads extraídos do Apify. Normaliza dados, valida email, detecta duplicatas, calcula reembolso e cria leads em batch. CASO ESPECIAL: se zero leads novos, marca campanha FAILED e reembolsa 100%.

### `api/webhooks/n8n/handleLeadEnrichment.ts`
Processa dados enriquecidos pela IA (companyResearch, strategicAnalysis, personalization). Atualiza lead para status ENRICHED. Aceita 3 tipos de cadência: email, whatsapp, hybrid.

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
