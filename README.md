# 🚀 Prospect SaaS - Lead Prospecting Platform

Plataforma SaaS para prospecção de leads com integração N8N, sistema de enriquecimento via Apify e envio automatizado de emails através do Resend.

## 📋 Stack Tecnológico

- **Framework**: Next.js 15.5.3 (App Router)
- **Linguagem**: TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **UI**: Tailwind CSS + shadcn/ui + Lucide Icons
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Email**: Resend API
- **Automação**: N8N Workflows
- **Scraping**: Apify (Google Maps)

## ⚡ Features

### ✅ Implementado

- 🎯 **Gestão de Campanhas**: Criação, edição e tracking de campanhas de prospecção
- 👥 **Gestão de Leads**: Pipeline completo (New → Enriched → Contacted → Replied)
- 🔗 **Integração N8N**: Webhook bidirecional para enriquecimento de leads
- 🕵️ **Enriquecimento via Apify**: Dados de empresas do Google Maps
- 📊 **Dashboard**: Estatísticas em tempo real com caching inteligente
- ⚙️ **Configurações**: Personalização de prompts para IA e timing de emails
- 🌓 **Dark Mode**: Interface completa com tema dark/light
- 📧 **Sistema de Emails Automatizado**:
  - Envio de sequências de 3 emails com delays configuráveis
  - Tracking de opens, clicks, bounces
  - Unsubscribe automático (LGPD/CAN-SPAM)
  - Rate limiting e humanização (delays aleatórios)
  - Horário comercial configurável
  - Limite diário de envios

### 🔄 Workflow Completo

```
1. Usuário cria campanha → Frontend envia para N8N
2. N8N dispara Apify → Scraping Google Maps
3. Apify retorna dados → N8N enriquece com IA
4. N8N envia para webhook → Cria lead enriquecido
5. Cron job envia email #1 → Imediato após enrichment
6. Aguarda X dias → Envia email #2 (configurável)
7. Aguarda Y dias → Envia email #3 (configurável)
8. Tracking via webhooks → Opens/Clicks/Bounces
9. Lead responde → Para sequência automaticamente
```

## 🛠️ Instalação

### 1. Clone o repositório

```bash
git clone <seu-repositorio>
cd prospect-saas-frontend
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure o ambiente

```bash
cp .env.example .env
```

Edite o `.env` com suas credenciais:

```bash
# Database (porta 5432 local ou 5433 se usar Docker)
DATABASE_URL="postgresql://postgres:password@localhost:5432/app_prospect_db"

# N8N Webhooks
N8N_WEBHOOK_URL="https://n8n-prospect.easycheck.site/webhook/interface"
N8N_WEBHOOK_SECRET="seu-token-secreto-aqui"

# Resend (Email)
RESEND_API_KEY="re_SuaAPIKeyAqui"
CRON_SECRET="token-aleatorio-seguro-para-cron"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Configure o banco de dados

```bash
# Criar/atualizar schema
npx prisma db push

# Gerar Prisma Client
npx prisma generate

# (Opcional) Abrir Prisma Studio
npx prisma studio
```

### 5. Rode o servidor de desenvolvimento

```bash
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

## 🐳 Docker (Produção)

### Build e Run

```bash
# Build da imagem
docker build -t prospect-app .

# Ou com Docker Compose (inclui PostgreSQL)
docker-compose up -d
```

### Variáveis de Ambiente (Docker)

Certifique-se de ter um arquivo `.env` configurado antes de rodar `docker-compose up`.

## 📧 Configuração do Sistema de Emails

### 1. Criar conta no Resend

1. Acesse [resend.com](https://resend.com)
2. Crie uma conta
3. Adicione seu domínio (ex: `easycheck.site`)
4. Verifique o domínio

### 2. Configurar DNS (GoDaddy/Cloudflare)

Adicione os registros SPF, DKIM e DMARC fornecidos pelo Resend:

```
TXT  @               v=spf1 include:_spf.resend.com ~all
TXT  resend._domainkey   [valor fornecido pelo Resend]
TXT  _dmarc         v=DMARC1; p=none; rua=mailto:seu@email.com
```

### 3. Criar API Key

No dashboard do Resend:
- Settings → API Keys → Create API Key
- Copie a chave e adicione no `.env` como `RESEND_API_KEY`

### 4. Configurar Webhook no Resend

- Webhooks → Add Endpoint
- URL: `https://seu-dominio.com/api/webhooks/resend`
- Eventos: `email.sent`, `email.opened`, `email.clicked`, `email.bounced`, `email.complained`

### 5. Configurar Cron Job

#### Desenvolvimento (opcional)
```bash
# Executar manualmente
curl -H "Authorization: Bearer seu-cron-secret" http://localhost:3000/api/cron/send-emails
```

#### Produção (Linux/VPS)
```bash
crontab -e

# Adicionar linha (executa a cada 5 minutos):
*/5 * * * * curl -H "Authorization: Bearer SEU_CRON_SECRET" http://localhost:3000/api/cron/send-emails
```

## 🗂️ Estrutura do Projeto

```
prospect-saas-frontend/
├── prisma/
│   └── schema.prisma          # Schema do banco (modelos, relações)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── campaigns/     # CRUD de campanhas
│   │   │   ├── leads/         # CRUD de leads
│   │   │   ├── settings/      # Configurações do usuário
│   │   │   ├── cron/
│   │   │   │   └── send-emails/  # Job de envio de emails
│   │   │   └── webhooks/
│   │   │       ├── n8n/       # Webhook para receber dados do N8N
│   │   │       └── resend/    # Webhook para tracking de emails
│   │   ├── campanhas/         # Página de listagem de campanhas
│   │   │   └── [id]/          # Detalhes da campanha
│   │   │       └── leads/     # Listagem de leads da campanha
│   │   │           └── [leadId]/  # Detalhes do lead
│   │   ├── configuracoes/     # Página de settings
│   │   └── layout.tsx         # Layout global (dark mode)
│   ├── components/
│   │   ├── ui/                # Componentes shadcn/ui
│   │   └── [feature]/         # Componentes específicos por feature
│   ├── lib/
│   │   ├── prisma.ts          # Cliente Prisma (singleton)
│   │   ├── cache.ts           # Sistema de caching com Zustand
│   │   ├── react-query.tsx    # Configuração TanStack Query
│   │   ├── email-service.ts   # Wrapper Resend API
│   │   ├── email-scheduler.ts # Lógica de scheduling de emails
│   │   └── constants.ts       # Constantes (timing, status, etc)
│   └── types/                 # TypeScript types
├── Dockerfile                 # Multi-stage build para produção
├── docker-compose.yml         # Orquestração (App + PostgreSQL)
├── SETUP_EMAIL_SYSTEM.md      # Documentação completa do sistema de emails
└── README.md                  # Este arquivo
```

## 📊 Modelos de Dados (Prisma)

### Campaign (Campanha)
- Informações da campanha (nome, cidade, estado, nicho)
- Prompt personalizado para IA
- Relacionamento 1:N com Leads

### Lead (Lead)
- Dados básicos (nome empresa, telefone, website, email)
- Dados enriquecidos (research, pitch, persona)
- Status: NEW → ENRICHED → CONTACTED → REPLIED → BOUNCED → OPTED_OUT
- Relacionamento N:1 com Campaign
- Relacionamento 1:N com Emails

### Email (Email)
- Sequência (1, 2 ou 3)
- Status: PENDING → SENT → OPENED → CLICKED → BOUNCED
- Tracking (sentAt, openedAt, clickedAt, bouncedAt)
- messageId do Resend para rastreamento

### UserSettings (Configurações)
- Prompts customizados para IA (research, pitch, persona)
- Configurações de timing:
  - Delay entre emails (dias)
  - Random delays para humanização (ms)
  - Limite diário de envios
  - Horário comercial (start/end)

## 🔐 Segurança

- ✅ Validação de input com Zod
- ✅ Sanitização de dados de webhooks
- ✅ Rate limiting nos endpoints críticos
- ✅ Headers de segurança (CSP, HSTS)
- ✅ Autenticação via Bearer tokens (webhooks, cron)
- ✅ CORS configurado
- ✅ SQL Injection protection (Prisma ORM)

## 🧪 Testing

```bash
# Testar envio de email manual
curl -X POST http://localhost:3000/api/cron/send-emails \
  -H "Authorization: Bearer SEU_CRON_SECRET"

# Testar webhook N8N
curl -X POST http://localhost:3000/api/webhooks/n8n \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: SEU_N8N_SECRET" \
  -d '{"event": "lead.enriched", "data": {...}}'

# Testar unsubscribe
curl http://localhost:3000/api/unsubscribe?token=TOKEN_DO_LEAD
```

## 📚 Documentação Adicional

- [SETUP_EMAIL_SYSTEM.md](./SETUP_EMAIL_SYSTEM.md) - Guia completo de configuração do sistema de emails
- [Prisma Docs](https://www.prisma.io/docs)
- [Next.js 15 Docs](https://nextjs.org/docs)
- [Resend Docs](https://resend.com/docs)

## 🚀 Deploy em Produção

### Opção 1: VPS com Docker

1. Faça upload dos arquivos para VPS
2. Configure `.env` com valores de produção
3. Execute:
```bash
docker-compose up -d
```

### Opção 2: Vercel (não recomendado para cron jobs)

```bash
vercel deploy --prod
```

**Nota**: Sistema de emails requer cron jobs persistentes. Recomendamos VPS para uso em produção.

## 📝 Licença

Proprietary - Todos os direitos reservados

## 👤 Autor

Desenvolvido para EasyCheck por [Seu Nome]

---

**Versão**: 2.0.0 (Sistema de Emails Automatizado)
**Última atualização**: Janeiro 2025
