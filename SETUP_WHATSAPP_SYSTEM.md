# 📱 Setup do Sistema de WhatsApp (Evolution API)

Sistema completo de cadência automatizada de WhatsApp usando Evolution API, idêntico ao sistema de emails.

---

## 🏗️ Arquitetura

```
Lead → WhatsApp 1 (imediato) → Aguarda X dias → WhatsApp 2 → Aguarda Y dias → WhatsApp 3
```

**Componentes:**
1. **Evolution API** - Envia mensagens WhatsApp
2. **Backend** - Gerencia cadência e tracking
3. **N8N** - Enriquece leads e gera mensagens personalizadas
4. **Cron Job** - Processa fila a cada 5 minutos
5. **Webhook** - Recebe eventos de status (entregue, lido, respondido)

---

## 📋 Pré-requisitos

- ✅ Backend Next.js rodando
- ✅ PostgreSQL configurado
- ✅ N8N configurado
- ⬜ Evolution API instalada e configurada
- ⬜ Número WhatsApp Business validado

---

## 🐳 Passo 1: Instalar Evolution API

### Opção 1: Docker Compose (recomendado)

```yaml
# docker-compose.yml (adicionar ao seu existente)
services:
  evolution-api:
    image: atendai/evolution-api:latest
    container_name: evolution-api
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - SERVER_URL=http://localhost:8080
      - AUTHENTICATION_API_KEY=SEU_API_KEY_AQUI_MUDE_ME
      - DATABASE_ENABLED=true
      - DATABASE_CONNECTION_URI=postgresql://postgres:password@db:5432/evolution_db
    volumes:
      - evolution_data:/evolution/instances
    networks:
      - prospect-network

volumes:
  evolution_data:
```

### Opção 2: VPS Manual

```bash
# Clonar repositório
git clone https://github.com/EvolutionAPI/evolution-api.git
cd evolution-api

# Configurar .env
cp .env.example .env
nano .env

# Instalar dependências
npm install

# Rodar
npm run start:prod
```

---

## ⚙️ Passo 2: Configurar Evolution API

### 1. Criar instância

```bash
curl -X POST http://localhost:8080/instance/create \
  -H "apikey: SEU_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "prospect-bot",
    "qrcode": true,
    "integration": "WHATSAPP-BAILEYS"
  }'
```

### 2. Conectar WhatsApp (QR Code)

```bash
# Buscar QR Code
curl http://localhost:8080/instance/connect/prospect-bot \
  -H "apikey: SEU_API_KEY"

# Escanear QR Code com WhatsApp no celular
```

### 3. Verificar conexão

```bash
curl http://localhost:8080/instance/connectionState/prospect-bot \
  -H "apikey: SEU_API_KEY"

# Resposta esperada:
# { "state": "open" }
```

---

## 🔧 Passo 3: Configurar Backend

### 1. Atualizar .env

```bash
# WhatsApp System (Evolution API)
EVOLUTION_API_URL="http://localhost:8080"
EVOLUTION_API_KEY="SEU_API_KEY_AQUI"
EVOLUTION_INSTANCE="prospect-bot"

# Cron secret (mesmo do sistema de emails)
CRON_SECRET="seu-token-seguro-aqui"
```

### 2. Migrar banco de dados

```bash
npx prisma db push
npx prisma generate
```

---

## 🤖 Passo 4: Configurar Webhook Evolution → Backend

```bash
curl -X POST http://localhost:8080/webhook/set/prospect-bot \
  -H "apikey: SEU_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://prospect.easycheck.site/api/webhooks/evolution",
    "webhook_by_events": true,
    "events": [
      "MESSAGES_UPSERT",
      "MESSAGES_UPDATE",
      "MESSAGES_RECEIVE"
    ]
  }'
```

---

## 🔄 Passo 5: Configurar N8N (Nova Automação)

### 1. Duplicar automação "Enriquecimento de Leads para Email"

- Nome: **"Enriquecimento de Leads para WhatsApp"**

### 2. Ajustar prompts para WhatsApp

**Diferenças principais:**
- ✅ Tom mais informal e direto
- ✅ Mensagens mais curtas (WhatsApp é mobile)
- ✅ Usar emojis (se apropriado para o público)
- ✅ Call-to-action mais direto

**Exemplo de prompt:**

```
Você é um especialista em cold messaging para WhatsApp.

Contexto do Lead:
- Empresa: {{ $json.nomeEmpresa }}
- Categoria: {{ $json.categoria }}
- Análise: {{ $json.companyResearch }}

Crie 3 mensagens de WhatsApp para prospecção:

MENSAGEM 1 (abertura):
- Máximo 200 caracteres
- Tom informal mas profissional
- Gancho personalizado baseado na pesquisa
- Call-to-action claro

MENSAGEM 2 (follow-up):
- Máximo 150 caracteres
- Reforçar valor
- Criar urgência suave

MENSAGEM 3 (última tentativa):
- Máximo 180 caracteres
- Oferta especial ou incentivo
- Última chance

Formato:
{
  "whatsapp1Message": "...",
  "whatsapp2Message": "...",
  "whatsapp3Message": "..."
}
```

### 3. Mapear saída para webhook

**Endpoint:** `https://prospect.easycheck.site/api/webhooks/n8n`

**Body:**
```json
{
  "event": "lead-enriched-whatsapp",
  "data": {
    "leadId": "{{ $json.leadId }}",
    "whatsapp1Message": "{{ $json.whatsapp1Message }}",
    "whatsapp2Message": "{{ $json.whatsapp2Message }}",
    "whatsapp3Message": "{{ $json.whatsapp3Message }}",
    "optOutToken": "{{ $randomString() }}"
  }
}
```

---

## ⏰ Passo 6: Configurar Cron Job

### VPS (Linux)

```bash
crontab -e

# Adicionar linha (executa a cada 5 minutos):
*/5 * * * * curl -H "Authorization: Bearer SEU_CRON_SECRET" http://localhost:3000/api/cron/send-whatsapp
```

### Desenvolvimento (manual)

```bash
curl -H "Authorization: Bearer SEU_CRON_SECRET" \
  http://localhost:3000/api/cron/send-whatsapp
```

---

## 🧪 Passo 7: Testar Fluxo Completo

### 1. Criar campanha de teste

```bash
# Via frontend ou API
POST /api/campaigns
{
  "title": "Teste WhatsApp",
  "tipo": "COMPLETO",
  "termos": "pizzaria",
  "locais": "São Paulo",
  "quantidade": 1
}
```

### 2. Verificar lead foi enriquecido

```sql
SELECT
  nome_empresa,
  telefone,
  status
FROM leads
WHERE campaign_id = 'SEU_CAMPAIGN_ID';
```

### 3. Verificar mensagens WhatsApp criadas

```sql
SELECT
  sequence_number,
  phone_number,
  message,
  status
FROM whatsapp_messages
WHERE lead_id = 'SEU_LEAD_ID';
```

### 4. Executar cron manualmente

```bash
curl -H "Authorization: Bearer SEU_CRON_SECRET" \
  http://localhost:3000/api/cron/send-whatsapp
```

### 5. Verificar mensagem foi enviada

```sql
SELECT
  sequence_number,
  status,
  sent_at,
  message_id
FROM whatsapp_messages
WHERE lead_id = 'SEU_LEAD_ID';
```

---

## 📊 Tracking de Eventos

Evolution API envia webhooks para `/api/webhooks/evolution`:

| Evento | Descrição | Status Atualizado |
|--------|-----------|-------------------|
| `MESSAGES_UPSERT` | Mensagem enviada | `SENT` |
| `MESSAGES_UPDATE` (status=3) | Mensagem entregue | `DELIVERED` |
| `MESSAGES_UPDATE` (status=4) | Mensagem lida | `READ` |
| `MESSAGES_RECEIVE` | Resposta recebida | `REPLIED` |

---

## 🎨 Comparação: Email vs WhatsApp

### **Email**
- ✅ Mais profissional
- ✅ Permite HTML/formatação rica
- ✅ Melhor para B2B corporativo
- ❌ Taxa de leitura: ~20-30%
- ❌ Taxa de resposta: ~1-5%

### **WhatsApp**
- ✅ Taxa de leitura: ~98%
- ✅ Taxa de resposta: ~40-60%
- ✅ Mais pessoal e direto
- ✅ 100% dos leads têm telefone
- ❌ Risco de banimento (spam)
- ❌ Menos profissional para alguns nichos

---

## ⚙️ Configurações de Timing

As configurações são **compartilhadas** com o sistema de emails:

```sql
-- UserSettings
email2DelayDays = 3          -- Delay entre WhatsApp 1 e 2
email3DelayDays = 7          -- Delay entre WhatsApp 2 e 3
sendDelayMinMs = 100         -- Delay mínimo entre envios
sendDelayMaxMs = 500         -- Delay máximo entre envios
dailyEmailLimit = 100        -- Limite diário (emails + WhatsApp)
sendOnlyBusinessHours = true -- Só enviar em horário comercial
businessHourStart = 9        -- Início (9h)
businessHourEnd = 18         -- Fim (18h)
```

---

## 🚨 Troubleshooting

### Erro: "Evolution API credentials not configured"
**Solução:** Verificar `.env` tem `EVOLUTION_API_URL`, `EVOLUTION_API_KEY` e `EVOLUTION_INSTANCE`.

### Mensagens não estão sendo enviadas
**Verificar:**
1. Evolution API está rodando: `curl http://localhost:8080/instance/connectionState/prospect-bot`
2. WhatsApp está conectado (QR Code escaneado)
3. Cron job está executando: verificar logs do cron
4. Leads têm telefone preenchido: `SELECT telefone FROM leads WHERE telefone IS NOT NULL`

### Webhook Evolution não está funcionando
**Verificar:**
1. Webhook está configurado: `curl http://localhost:8080/webhook/find/prospect-bot -H "apikey: API_KEY"`
2. Backend está acessível externamente (se Evolution API está em outro servidor)
3. Logs do webhook: `/var/log/nginx/error.log`

### WhatsApp foi banido
**Causas:**
- Envio de spam em massa
- Muitas mensagens em curto período
- Mensagens idênticas para muitos contatos

**Prevenção:**
- Reduzir `dailyEmailLimit` para 50-100
- Aumentar delays entre mensagens (500-2000ms)
- Personalizar mensagens (evitar templates iguais)
- Usar número WhatsApp Business oficial (não pessoal)

---

## 💰 Custos

- **Evolution API:** Grátis (open source)
- **VPS adicional (se necessário):** ~R$ 20-40/mês
- **Número WhatsApp Business:** Grátis (mas precisa validar)
- **Infraestrutura:** Mesma do sistema de emails

---

## 📚 Documentação Adicional

- **Evolution API Docs:** https://doc.evolution-api.com/
- **WhatsApp Business:** https://business.whatsapp.com/
- **API Reference:** https://doc.evolution-api.com/pt/endpoints

---

## 🔒 Segurança

- ✅ Webhook autenticado com `apikey`
- ✅ Cron job autenticado com `CRON_SECRET`
- ✅ Opt-out automático via link
- ✅ Para envios ao receber resposta
- ✅ Rate limiting e humanização

---

**Versão:** 1.0
**Data:** Janeiro 2025
**Autor:** Sistema Prospect SaaS
