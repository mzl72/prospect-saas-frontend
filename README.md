# Prospect SaaS - Plataforma de Prospecção B2B com IA

Sistema completo de geração e enriquecimento de leads B2B usando Google Maps + IA, com envio automatizado por Email e WhatsApp.

## O que é isso?

Uma plataforma SaaS que extrai leads do Google Maps, enriquece cada lead com análise de IA (pesquisa da empresa, geração de mensagens personalizadas) e permite envio automatizado de campanhas multi-canal.

## Stack Tecnológica

- **Frontend**: Next.js 15.5.3, React 19, TypeScript, Tailwind CSS v4, Shadcn/UI
- **Backend**: Next.js API Routes, Prisma ORM, PostgreSQL
- **Automação**: N8N (workflows de extração/enriquecimento), Evolution API (WhatsApp), Resend (Email)
- **Estado**: Zustand com persist middleware
- **Cache**: TanStack Query v5 (React Query)
- **Validação**: Zod + sanitização XSS + rate limiting
- **Deploy**: Docker Compose (PostgreSQL, Redis, Evolution API, N8N, App)

## Como Funciona

### 1. Wizard de Geração (3 etapas)
Usuário configura: tipo de negócio, localização, quantidade (4/20/40/100/200 leads), nível de serviço (básico ou completo).

### 2. Processamento Automático
- **Básico** (0.25 créditos/lead): Extração de dados do Google Maps via Apify
- **Completo** (1 crédito/lead): Básico + enriquecimento com IA (Perplexity + GPT-4o-mini)

### 3. Fluxo de Dados
```
Frontend → POST /api/campaigns → N8N Webhook
N8N → Apify (extração) → POST /api/webhooks/n8n (leads-extracted)
N8N → IA (enriquecimento) → POST /api/webhooks/n8n (lead-enriched)
N8N → POST /api/webhooks/n8n (campaign-completed)
```

## Estrutura do Projeto

```
├── src/
│   ├── app/              # Páginas Next.js e API Routes
│   ├── components/       # Componentes React (UI + Layout + Wizard)
│   ├── lib/              # Utilitários, stores, validações, segurança
│   └── types/            # TypeScript types (re-export do Prisma)
├── prisma/               # Schema do banco de dados
├── fluxos-n8n/           # Workflows N8N exportados (JSON)
└── docker-compose.yml    # Infraestrutura completa
```

## Database Schema

- **User**: id, email, credits (sistema de créditos pré-pago)
- **Campaign**: id, userId, status (PROCESSING/EXTRACTION_COMPLETED/COMPLETED/FAILED), tipo (BASICO/COMPLETO), tracking de leads
- **Lead**: id, campaignId, dados extraídos (nome, email, telefone, redes sociais), dados enriquecidos (companyResearch, strategicAnalysis, personalization)

## Features Implementadas

✅ Sistema de créditos com reembolso automático (duplicatas + leads não encontrados)
✅ Wizard de 3 etapas para geração de leads
✅ Integração com N8N (extração Apify + enriquecimento IA)
✅ Webhook handlers para processar callbacks do N8N
✅ Rate limiting por usuário + IP
✅ Sanitização XSS + NoSQL injection
✅ Timeout automático de campanhas
✅ Validação de ownership (campanhas/leads)
✅ Paginação de leads
✅ Polling inteligente (30min timeout)

## O que NÃO está implementado (ainda)

❌ Autenticação real (usa DEMO_USER_ID hardcoded)
❌ Envio real de emails/WhatsApp (apenas preparação de dados)
❌ UserSettings (templates customizados, prompts IA, instâncias Evolution)
❌ Socket.io/tempo real (código removido, usa polling)
❌ Dashboard analítico com gráficos
❌ Sistema de notificações
❌ Multi-tenant

## Instalação e Uso

### 1. Clone e instale dependências
```bash
git clone <repo>
cd prospect-saas-frontend
npm install
```

### 2. Configure variáveis de ambiente
```bash
cp .env.example .env
# Edite .env com suas credenciais (DATABASE_URL, N8N_WEBHOOK_URL, etc)
```

### 3. Suba a infraestrutura com Docker
```bash
docker-compose up -d
```

Isso vai subir: PostgreSQL, Redis, Evolution API, N8N, Adminer

### 4. Rode migrações do Prisma
```bash
npx prisma generate
npx prisma migrate dev
```

### 5. Inicie o app
```bash
npm run dev  # Desenvolvimento
npm run build && npm start  # Produção
```

### 6. Configure workflows N8N
- Acesse http://localhost:5678 (user/pass no .env)
- Importe workflows de `fluxos-n8n/`
- Atualize URLs hardcoded (ngrok → seu domínio)
- Configure credenciais (Apify, OpenAI, Perplexity)

## Arquitetura de Segurança

- **Rate Limiting**: 100-300 req/min por endpoint (memória LRU)
- **Sanitização**: Zod schemas + XSS filtering + NoSQL injection prevention
- **Validação**: Payload size limits (100KB-5MB), CUID validation
- **Webhook Auth**: Constant-time secret comparison (timing attack prevention)
- **Ownership**: Validação de userId em todas as rotas sensíveis

## Pricing

- **Básico**: 0.25 créditos/lead (extração Google Maps)
- **Completo**: 1 crédito/lead (básico + enriquecimento IA)
- Reembolso automático para duplicatas e leads não encontrados
- Cálculo centralizado em `src/lib/pricing-service.ts`

## Contribuindo

Este é um projeto MVP. Para adicionar features:

1. Leia os READMEs em cada pasta (`src/app/`, `src/lib/`, etc.)
2. Siga os padrões de validação (Zod schemas em `validation-schemas.ts`)
3. Use serviços centralizados (`pricing-service.ts`, `constants.ts`)
4. Adicione rate limiting adequado
5. Valide ownership quando necessário

## Roadmap

1. Implementar autenticação real (NextAuth.js)
2. UserSettings para templates/prompts customizados
3. Integração real com Evolution API (envio WhatsApp)
4. Integração Resend (envio emails)
5. Socket.io para updates em tempo real
6. Dashboard analítico com métricas
7. Multi-tenant

## Licença

Proprietário - Uso interno
