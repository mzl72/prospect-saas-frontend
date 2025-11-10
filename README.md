# 🚀 Prospect SaaS

Plataforma de prospecção inteligente que automatiza a geração, enriquecimento e contato com leads através de múltiplos canais (Email + WhatsApp).

## 💡 O que faz?

Você informa o tipo de negócio e a localização. O sistema:
1. **Busca** empresas no Google Maps (via Apify)
2. **Enriquece** com dados de IA (pesquisa + análise estratégica)
3. **Envia** sequências personalizadas por email e/ou WhatsApp
4. **Rastreia** opens, clicks, respostas automaticamente
5. **Para** quando o lead responder

Tudo configurável: horários, intervalos, templates e prompts de IA.

## 🛠️ Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **PostgreSQL** + Prisma ORM
- **Zustand** (estado) + **React Query** (cache)
- **Resend** (emails) + **Evolution API** (WhatsApp)
- **N8N** (workflows) + **Apify** (scraping)

## ⚡ Features

### ✅ Pronto para usar
- 🎯 Criação de campanhas com wizard de 3 etapas
- 📊 Dashboard com métricas em tempo real
- 📧 Sequências de 3 emails (First touch → Bump → Breakup)
- 💬 Sequências de 3 WhatsApp com Evolution API
- 🔄 Modo híbrido (intercala email + WhatsApp)
- 🤖 Enriquecimento com IA (GPT-4 + Perplexity)
- 📈 Tracking completo (opens, clicks, bounces, replies)
- 🚫 Opt-out automático (LGPD/CAN-SPAM)
- ⏰ Horário comercial + rate limiting
- 🌓 Dark mode
- 🔒 Validação Zod + sanitização XSS

### 🔄 Como funciona

```
Wizard → N8N → Apify (scraping) → IA (enriquecimento) → Webhook
         ↓
  Cron jobs (a cada 5min) → Envia emails/WhatsApp → Tracking
         ↓
  Lead responde? → Para sequência automaticamente
```

## 🚀 Quick Start

```bash
# Clone e instale
git clone <seu-repositorio>
cd prospect-saas-frontend
npm install

# Configure .env
cp .env.example .env
# Edite com suas credenciais (DATABASE_URL, RESEND_API_KEY, N8N_WEBHOOK_URL, etc)

# Setup banco
npx prisma db push
npx prisma generate

# Rode
npm run dev
# Acesse http://localhost:3000
```

### Variáveis essenciais (.env)

```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/app_prospect_db"
RESEND_API_KEY="re_..."              # resend.com
N8N_WEBHOOK_URL="https://..."        # Sua instância N8N
N8N_WEBHOOK_SECRET="..."
EVOLUTION_API_KEY="..."              # Evolution API (WhatsApp)
CRON_SECRET="..."                     # Token para cron jobs
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Docker (Produção)

```bash
docker-compose up -d  # App + PostgreSQL
```

## ⚙️ Configuração

### 1. Resend (Emails)
1. Crie conta em [resend.com](https://resend.com)
2. Adicione e verifique seu domínio (DNS: SPF, DKIM, DMARC)
3. Crie API Key → adicione no `.env`
4. Configure webhook: `https://seu-dominio.com/api/webhooks/resend`
   - Eventos: `email.sent`, `email.opened`, `email.clicked`, `email.bounced`

### 2. Evolution API (WhatsApp)
1. Tenha uma instância Evolution API rodando
2. Adicione `EVOLUTION_API_KEY` no `.env`
3. Configure instâncias na página `/whatsapp` do app

### 3. N8N (Workflows)
1. Importe workflows da pasta `fluxos-n8n/`
2. Configure credenciais (Apify, OpenAI, Perplexity)
3. Atualize URLs hardcoded para seu domínio
4. Adicione `N8N_WEBHOOK_URL` e `N8N_WEBHOOK_SECRET` no `.env`

### 4. Cron Jobs (Produção)
```bash
# Adicione ao crontab (executa a cada 5min)
*/5 * * * * curl -H "Authorization: Bearer SEU_CRON_SECRET" https://seu-dominio.com/api/cron/send-emails
*/5 * * * * curl -H "Authorization: Bearer SEU_CRON_SECRET" https://seu-dominio.com/api/cron/send-whatsapp
```

## 📁 Estrutura

```
prospect-saas-frontend/
├── prisma/
│   ├── schema.prisma              # 8 modelos (User, Campaign, Lead, Email, WhatsApp, etc)
│   └── README.md
├── src/
│   ├── app/
│   │   ├── api/                   # API Routes (ver api/README.md)
│   │   │   ├── campaigns/         # CRUD campanhas + leads
│   │   │   ├── cron/              # send-emails, send-whatsapp, check-timeout
│   │   │   ├── webhooks/          # n8n, resend, evolution
│   │   │   └── settings/
│   │   ├── campanhas/             # Páginas frontend (ver app/README.md)
│   │   ├── emails/                # Config emails
│   │   ├── whatsapp/              # Config WhatsApp
│   │   ├── cadencia-hibrida/      # Config híbrida
│   │   └── gerar/                 # Wizard de criação
│   ├── components/
│   │   ├── wizard/                # LeadGenerationWizard
│   │   ├── cadence/               # HybridCadence, WeekCalendar, MessageIntervals
│   │   └── ui/                    # shadcn/ui
│   └── lib/
│       ├── base-scheduler.ts      # Lógica unificada de scheduling
│       ├── email-service.ts       # Resend wrapper
│       ├── whatsapp-service.ts    # Evolution API wrapper
│       ├── pricing-service.ts     # Single source of truth (cálculos)
│       ├── sanitization.ts        # XSS prevention
│       └── validation-schemas.ts  # Zod schemas
├── fluxos-n8n/                    # Workflows N8N (extração + enriquecimento)
└── docker-compose.yml             # App + PostgreSQL
```

**📖 Mais detalhes**: Cada pasta tem seu próprio README explicando em detalhes.

## 🔒 Segurança

- Validação Zod em todos inputs
- Sanitização XSS (sanitization.ts)
- Rate limiting (10/hora campanhas, 100/min webhooks)
- Bearer tokens (webhooks, cron)
- Prisma ORM (SQL injection protection)
- CORS configurado

## 🧪 Testar

```bash
# Envio manual de emails
curl -H "Authorization: Bearer SEU_CRON_SECRET" \
  http://localhost:3000/api/cron/send-emails

# Webhook N8N
curl -H "x-webhook-secret: SEU_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"event":"leads-extracted","data":{...}}' \
  http://localhost:3000/api/webhooks/n8n

# Opt-out
curl http://localhost:3000/api/unsubscribe?token=TOKEN_DO_LEAD
```

## 🚀 Deploy

**VPS (recomendado)**: `docker-compose up -d` + configure cron jobs

**Vercel**: Não recomendado (cron jobs limitados)

## 📚 Documentação

- [src/app/README.md](src/app/README.md) - Páginas frontend
- [src/app/api/README.md](src/app/api/README.md) - API Routes
- [src/lib/README.md](src/lib/README.md) - Core services
- [fluxos-n8n/README.md](fluxos-n8n/README.md) - Workflows N8N
- [prisma/README.md](prisma/README.md) - Schema do banco

---

**Versão**: 3.0.0 (Multi-canal: Email + WhatsApp + Híbrido)
**Última atualização**: Janeiro 2025
