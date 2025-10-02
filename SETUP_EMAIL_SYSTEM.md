# 📧 Setup Sistema de Envio de Emails Automáticos

## 🎯 O que foi implementado

Sistema completo de envio automático de emails com:
- ✅ Sequência de 3 emails com delays configuráveis
- ✅ Horário comercial personalizável
- ✅ Rate limiting e delays aleatórios (humanização)
- ✅ Tracking de aberturas, cliques e bounces via Resend
- ✅ Opt-out (unsubscribe) automático
- ✅ Cron job para processamento em background

---

## 📋 Checklist de Setup

### 1️⃣ **Migration do Banco de Dados**

```bash
# Na pasta do projeto
npx prisma migrate dev --name add_email_system

# Isso vai adicionar:
# - Campo 'email' no modelo Lead
# - 8 campos de configuração de timing no UserSettings
```

### 2️⃣ **Criar Conta no Resend**

1. Acesse: https://resend.com/signup
2. Crie uma conta (grátis)
3. Vá em **API Keys** → **Create API Key**
4. Copie a chave (ex: `re_123abc...`)

### 3️⃣ **Configurar Domínio no Resend**

1. No painel do Resend, vá em **Domains** → **Add Domain**
2. Digite seu domínio: `fflow.site`
3. Resend vai te dar 3 registros DNS:

```
Tipo: TXT
Nome: @
Valor: v=spf1 include:amazonses.com ~all

Tipo: CNAME
Nome: resend._domainkey
Valor: resend._domainkey.u123.wl.sendgrid.net

Tipo: CNAME
Nome: em9876
Valor: u123.wl.sendgrid.net
```

4. Adicione esses registros no seu provedor de DNS (Cloudflare, GoDaddy, etc)
5. Aguarde verificação (5-30 minutos)

### 4️⃣ **Configurar Variáveis de Ambiente**

Adicione no arquivo `.env`:

```bash
# Resend API
RESEND_API_KEY=re_SuaChaveAqui

# Segurança do Cron Job
CRON_SECRET=gere_um_token_aleatorio_aqui_123

# URL pública da aplicação (para links de unsubscribe)
NEXT_PUBLIC_APP_URL=https://prospect-saas.fflow.site

# N8N Webhook Secret (já deve existir)
N8N_WEBHOOK_SECRET=seu_secret_n8n
```

**Como gerar CRON_SECRET:**
```bash
# No terminal
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5️⃣ **Instalar Dependência do Resend**

```bash
npm install resend
```

### 6️⃣ **Build e Deploy**

```bash
# Build do projeto
npm run build

# Se estiver usando Docker (recomendado)
docker-compose up --build -d
```

---

## 🐧 Configuração do Cron na VPS

### **Método 1: Crontab do Sistema (Recomendado)**

```bash
# 1. Conectar na VPS
ssh mzl@5.161.231.95

# 2. Editar crontab
crontab -e

# 3. Adicionar esta linha (executa a cada 5 minutos):
*/5 * * * * curl -H "Authorization: Bearer SEU_CRON_SECRET_AQUI" http://localhost:3000/api/cron/send-emails >/dev/null 2>&1

# Substitua SEU_CRON_SECRET_AQUI pelo valor real do .env
```

**Exemplo completo:**
```bash
*/5 * * * * curl -H "Authorization: Bearer a1b2c3d4e5f6..." http://localhost:3000/api/cron/send-emails >/dev/null 2>&1
```

### **Método 2: Systemd Timer (Alternativa)**

Se preferir usar systemd em vez de crontab:

```bash
# /etc/systemd/system/prospect-email-cron.service
[Unit]
Description=Prospect SaaS Email Sender

[Service]
Type=oneshot
ExecStart=/usr/bin/curl -H "Authorization: Bearer SEU_CRON_SECRET" http://localhost:3000/api/cron/send-emails
```

```bash
# /etc/systemd/system/prospect-email-cron.timer
[Unit]
Description=Run Prospect Email Sender every 5 minutes

[Timer]
OnBootSec=5min
OnUnitActiveSec=5min

[Install]
WantedBy=timers.target
```

```bash
# Ativar
sudo systemctl daemon-reload
sudo systemctl enable prospect-email-cron.timer
sudo systemctl start prospect-email-cron.timer
```

---

## 🔧 Configuração do Nginx

Adicione configuração para prospect-saas:

```bash
# /etc/nginx/sites-available/prospect-saas.fflow.site
server {
    listen 80;
    server_name prospect-saas.fflow.site;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Ativar site
sudo ln -s /etc/nginx/sites-available/prospect-saas.fflow.site /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# SSL com Certbot (opcional mas recomendado)
sudo certbot --nginx -d prospect-saas.fflow.site
```

---

## 🐳 Docker Compose

Adicione o serviço Next.js ao `docker-compose.yml` existente:

```yaml
# Adicionar ao docker-compose.yml em ~/prospect-saas/

services:
  # ... seus serviços existentes (postgres, n8n, directus) ...

  # NOVO - Next.js Frontend
  prospect_nextjs:
    build: ./frontend
    container_name: prospect_nextjs_app
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@prospect_postgres:5432/${POSTGRES_DB}
      - RESEND_API_KEY=${RESEND_API_KEY}
      - N8N_WEBHOOK_SECRET=${N8N_WEBHOOK_SECRET}
      - CRON_SECRET=${CRON_SECRET}
      - NEXT_PUBLIC_APP_URL=https://prospect-saas.fflow.site
    depends_on:
      - prospect_postgres
    volumes:
      - ./frontend/.env:/app/.env
```

**Dockerfile para Next.js:**

Crie `Dockerfile` na pasta do frontend:

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# Dependências
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Gerar Prisma Client
RUN npx prisma generate

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Produção
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
```

**Atualizar next.config.js:**

```javascript
// next.config.js
module.exports = {
  output: 'standalone', // Para Docker
  // ... resto da config
}
```

---

## 🔗 Configurar Webhook do Resend

1. Acesse: https://resend.com/webhooks
2. Clique em **Create Webhook**
3. Configure:
   - **URL**: `https://prospect-saas.fflow.site/api/webhooks/resend`
   - **Events**: Selecione todos:
     - `email.sent`
     - `email.delivered`
     - `email.opened`
     - `email.clicked`
     - `email.bounced`
     - `email.complained`

---

## ⚙️ Configurar Timing de Emails no Frontend

### **Opção A: Via Interface (TODO - Será implementado)**

No futuro terá uma tab "Configurações de Email" em `/configuracoes`.

### **Opção B: Via Banco de Dados (Por enquanto)**

```sql
-- Conectar no PostgreSQL
psql -h localhost -p 5433 -U seu_usuario -d prospect_db

-- Atualizar configurações
UPDATE user_settings SET
  email_2_delay_days = 3,        -- Dias após Email 1
  email_3_delay_days = 7,        -- Dias após Email 2
  send_delay_min_ms = 100,       -- Delay mínimo entre envios
  send_delay_max_ms = 500,       -- Delay máximo
  daily_email_limit = 100,       -- Limite diário
  send_only_business_hours = true,
  business_hour_start = 9,       -- 9h
  business_hour_end = 18         -- 18h
WHERE user_id = 'demo-user';
```

---

## 🧪 Testar o Sistema

### **1. Testar Cron Job Manualmente**

```bash
curl -H "Authorization: Bearer SEU_CRON_SECRET" \
  http://localhost:3000/api/cron/send-emails

# Deve retornar algo como:
# {"success":true,"stats":{"sent":0,"skipped":0,"failed":0,"total":0}}
```

### **2. Testar Unsubscribe**

```bash
# Pegar um optOutToken de algum lead no banco
# Visitar no browser:
https://prospect-saas.fflow.site/api/unsubscribe?token=TOKEN_AQUI
```

### **3. Verificar Logs do Cron**

```bash
# Ver últimos logs do container Next.js
docker logs prospect_nextjs_app --tail 100 -f

# Buscar por:
# [Cron] ⏰ Starting email sending job...
# [Cron] 📧 Found X pending emails
# [Resend] Email sent successfully: msg_xyz
```

---

## 📊 Monitoramento

### **Logs Importantes**

```bash
# Cron job executando
[Cron] ⏰ Starting email sending job...

# Emails encontrados para enviar
[Cron] 📧 Found 5 pending emails

# Email enviado com sucesso
[Resend] Email sent successfully: msg_abc123
[Cron] ✅ Sent email email_id (messageId: msg_abc123)

# Email pulado (timing não pronto)
[Cron] ⏭️ Skipped email_id (seq 2) - timing not ready

# Email aberto
[Resend] ✅ Email msg_abc123 marked as OPENED

# Email bounced
[Resend] ⚠️ Email msg_abc123 BOUNCED - Lead marked as BOUNCED
```

### **Verificar no Painel Resend**

- Acesse: https://resend.com/emails
- Veja estatísticas em tempo real:
  - Enviados hoje
  - Taxa de abertura
  - Taxa de cliques
  - Bounces

---

## 🔄 Atualizar N8N Workflow

No seu workflow N8N de enrichment, adicione o campo `email` ao webhook:

```json
{
  "event": "lead-enriched",
  "data": {
    "leadId": "{{$json.leadId}}",
    "email": "{{$json.email}}",  // NOVO - Adicionar quando tiver
    "companyResearch": "{{$json.research}}",
    "email1Subject": "{{$json.email1Subject}}",
    "email1Body": "{{$json.email1Body}}",
    "email2Body": "{{$json.email2Body}}",
    "email3Subject": "{{$json.email3Subject}}",
    "email3Body": "{{$json.email3Body}}",
    "assignedSender": "vendas@fflow.site",
    "optOutToken": "{{$randomString()}}"
  }
}
```

**Observação**: Por enquanto, o campo `email` é **opcional**. Se não enviar, o lead será enriquecido normalmente mas não receberá emails (o cron vai pular por não ter email).

---

## 🚨 Troubleshooting

### **Problema: Emails não estão sendo enviados**

```bash
# 1. Verificar se cron está rodando
curl -H "Authorization: Bearer SEU_SECRET" http://localhost:3000/api/cron/send-emails

# 2. Verificar logs
docker logs prospect_nextjs_app --tail 50

# 3. Verificar no banco se emails estão como PENDING
psql -c "SELECT id, sequence_number, status FROM emails WHERE status = 'PENDING' LIMIT 10;"
```

### **Problema: RESEND_API_KEY inválida**

```bash
# Testar API key manualmente
curl -X POST https://api.resend.com/emails/send \
  -H "Authorization: Bearer SEU_RESEND_KEY" \
  -H "Content-Type: application/json" \
  -d '{"from":"onboarding@resend.dev","to":"seu@email.com","subject":"Test","html":"Test"}'
```

### **Problema: Cron não executa**

```bash
# Verificar se crontab está configurado
crontab -l

# Ver logs do cron
grep CRON /var/log/syslog

# Testar manualmente
*/5 * * * * /usr/bin/curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/cron/send-emails >> /tmp/cron-emails.log 2>&1
```

---

## 📈 Próximos Passos (Opcional)

- [ ] Criar interface frontend para configurações de timing
- [ ] Adicionar gráficos de performance (aberturas, cliques)
- [ ] Implementar retry logic para emails falhados
- [ ] Adicionar warmup de IP (começar devagar, aumentar gradualmente)
- [ ] Implementar A/B testing de subject lines
- [ ] Adicionar templates de email salvos

---

## 📞 Suporte

Se algo não funcionar:

1. Verificar logs: `docker logs prospect_nextjs_app`
2. Verificar Resend dashboard: https://resend.com/emails
3. Testar cron manualmente com curl
4. Verificar variáveis de ambiente no `.env`

---

**Sistema implementado com sucesso! 🎉**

Agora você tem um sistema completo de cold email automation com:
- Sequência automática de 3 emails
- Tracking completo
- Horário comercial respeitado
- Opt-out automático
- Delays humanizados
