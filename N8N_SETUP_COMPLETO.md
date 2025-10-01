# Configuração Completa do N8N - Fluxo 1 e Fluxo 2

## 🔷 FLUXO 1 - Extração de Leads (Apify)

### Nó: Execute Workflow (último nó do Fluxo 1)

**Parâmetros:**
- **Source:** Database
- **From list:** `[ENRIQUECIMENTO] - Etapa 2`
- **Mode:** Run once with all items

**Workflow Inputs (28 campos):**

```
nome_empresa
{{ $json.nome_empresa }}

descricao
{{ $json.descricao }}

endereco
{{ $json.endereco }}

website
{{ $json.website }}

telefone
{{ $json.telefone }}

telefone_desformatado
{{ $json.telefone_desformatado }}

categoria
{{ $json.categoria }}

link_google_maps
{{ $json.link_google_maps }}

total_reviews
{{ $json.total_reviews }}

nota_media
{{ $json.nota_media }}

search_term
{{ $('Webhook').item.json.body.query.termos }}

search_local
{{ $('Webhook').item.json.body.query.locais }}

nomeEmpresa
{{ $('Webhook').item.json.body.query.settings.nomeEmpresa }}

assinatura
{{ $('Webhook').item.json.body.query.settings.assinatura }}

telefoneContato
{{ $('Webhook').item.json.body.query.settings.telefoneContato }}

websiteEmpresa
{{ $('Webhook').item.json.body.query.settings.websiteEmpresa }}

senderEmails
{{ JSON.stringify($('Webhook').item.json.body.query.settings.senderEmails) }}

promptOverview
{{ $('Webhook').item.json.body.query.settings.promptOverview }}

promptTatica
{{ $('Webhook').item.json.body.query.settings.promptTatica }}

promptDiretrizes
{{ $('Webhook').item.json.body.query.settings.promptDiretrizes }}

templatePesquisa
{{ $('Webhook').item.json.body.query.settings.templatePesquisa }}

templateAnaliseEmpresa
{{ $('Webhook').item.json.body.query.settings.templateAnaliseEmpresa }}

informacoesPropria
{{ $('Webhook').item.json.body.query.settings.informacoesPropria }}

emailTitulo1
{{ $('Webhook').item.json.body.query.settings.emailTemplates[0].titulo }}

emailCorpo1
{{ $('Webhook').item.json.body.query.settings.emailTemplates[0].corpo }}

emailCorpo2
{{ $('Webhook').item.json.body.query.settings.emailTemplates[1].corpo }}

emailTitulo3
{{ $('Webhook').item.json.body.query.settings.emailTemplates[2].titulo }}

emailCorpo3
{{ $('Webhook').item.json.body.query.settings.emailTemplates[2].corpo }}
```

---

## 🔷 FLUXO 2 - Enriquecimento com IA

### Nó: When Executed by Another Workflow (primeiro nó do Fluxo 2)

**Recebe os 28 campos acima**

Você pode acessar nos próximos nós assim:

```javascript
// Dados do lead
{{ $json.nome_empresa }}
{{ $json.descricao }}
{{ $json.endereco }}
{{ $json.website }}
{{ $json.telefone }}
{{ $json.telefone_desformatado }}
{{ $json.categoria }}
{{ $json.link_google_maps }}
{{ $json.total_reviews }}
{{ $json.nota_media }}
{{ $json.search_term }}
{{ $json.search_local }}

// Informações da Empresa (CRÍTICO)
{{ $json.nomeEmpresa }}
{{ $json.assinatura }}
{{ $json.telefoneContato }}
{{ $json.websiteEmpresa }}
{{ $json.senderEmails }} // Array JSON string

// Prompts customizáveis
{{ $json.promptOverview }}
{{ $json.promptTatica }}
{{ $json.promptDiretrizes }}

// Templates de IA
{{ $json.templatePesquisa }}
{{ $json.templateAnaliseEmpresa }}
{{ $json.informacoesPropria }}

// Email templates
{{ $json.emailTitulo1 }}
{{ $json.emailCorpo1 }}
{{ $json.emailCorpo2 }}
{{ $json.emailTitulo3 }}
{{ $json.emailCorpo3 }}
```

---

## 📝 PROMPT DINÂMICO PARA IA (Fluxo 2)

Use este prompt no nó de IA (Claude/OpenAI) do Fluxo 2:

```
# Overview
{{ $json.promptOverview || $json.informacoesPropria }}

Sua tarefa é criar uma sequência de 3 e-mails de alto impacto, usando o briefing estratégico fornecido. A comunicação deve ser consultiva, estratégica e focada em iniciar uma conversa de valor, não em vender um serviço.

# Briefing
Você receberá um briefing com "Oportunidades de Personalização" e "Pontos de Dor & Soluções". Você usará esses insumos para dar credibilidade e contexto à sua abordagem.

# Tática
{{ $json.promptTatica }}

1. Email #1: [MUDANÇA]
   Assunto: {{ $json.emailTitulo1 }}
   Corpo: {{ $json.emailCorpo1 }}

2. Email #2: [BUMP]
   (Resposta na mesma thread, sem assunto novo)
   Corpo: {{ $json.emailCorpo2 }}

3. Email #3: [BREAKUP]
   Assunto: {{ $json.emailTitulo3 }}
   Corpo: {{ $json.emailCorpo3 }}

# Task
{{ $json.templateAnaliseEmpresa }}

# Output Format
Seu output deve seguir este formato estrito:

*Personalization*
1. Opportunity: HERE
Supporting Evidence: HERE

2. Opportunity: HERE
Supporting Evidence: HERE
⸻
*Pain Points & Solutions*
1. Pain Point: HERE
Supporting Evidence: HERE
Offer: HERE

2. Pain Point: HERE
Supporting Evidence: HERE
Offer: HERE

(Instruções adicionais: Sempre explique o contexto. Substitua HERE. Se não houver oportunidades, escreva null. Seja profundo e estratégico em suas análises.)

# Diretrizes Gerais
{{ $json.promptDiretrizes }}

# Dados da Empresa para Análise:

**Nome:** {{ $json.nome_empresa }}
**Descrição:** {{ $json.descricao }}
**Categoria:** {{ $json.categoria }}
**Endereço:** {{ $json.endereco }}
**Website:** {{ $json.website }}
**Telefone:** {{ $json.telefone }}
**Avaliação Google:** {{ $json.nota_media }} ({{ $json.total_reviews }} reviews)
**Link Google Maps:** {{ $json.link_google_maps }}
**Termo de Busca:** {{ $json.search_term }}
**Local da Busca:** {{ $json.search_local }}

**Instruções de Pesquisa:**
{{ $json.templatePesquisa }}

---
**Assinatura do Email:**
{{ $json.assinatura }}
{{ $json.nomeEmpresa }}
{{ $json.telefoneContato }}
{{ $json.websiteEmpresa }}
```

---

## 🔷 FLUXO 3/4/5 - Envio de Emails

### Como usar `senderEmails` (Round-Robin)

No nó de envio de email (Gmail/Outlook), use este código JavaScript para selecionar um remetente:

```javascript
// Parse do array de emails
const senderEmails = JSON.parse($json.senderEmails || "[]");

// Round-robin: usa módulo do ID do lead para distribuir
const leadIndex = $json.leadId ? $json.leadId.charCodeAt(0) : 0;
const selectedEmail = senderEmails[leadIndex % senderEmails.length];

return {
  senderEmail: selectedEmail || "default@example.com"
};
```

Ou use diretamente no campo "From":

```
{{ JSON.parse($json.senderEmails)[0] }}
```

---

## ✅ Checklist de Configuração

### Backend (Next.js):
- [x] Prisma schema atualizado com campos críticos
- [x] `nomeEmpresa`, `assinatura`, `telefoneContato`, `websiteEmpresa` adicionados
- [x] `senderEmails` armazenado como JSON array
- [x] Migração aplicada
- [x] Página `/configuracoes` com tab "Informações Críticas"
- [x] API `/api/campaigns` enviando novos campos ao N8N

### N8N:
- [ ] **Fluxo 1:** Adicionar 16 novos campos no nó "Execute Workflow"
- [ ] **Fluxo 2:** Atualizar prompt da IA com template dinâmico
- [ ] **Fluxo 3/4/5:** Implementar round-robin de emails remetentes
- [ ] **Fluxo 2:** Usar assinatura dinâmica nos emails gerados

---

## 🔄 Campos Enviados do Frontend → N8N → Fluxo 2

**Total: 28 campos**

| Campo | Origem | Tipo | Crítico? |
|-------|--------|------|----------|
| `nome_empresa` | Lead | String | ❌ |
| `descricao` | Lead | String | ❌ |
| `endereco` | Lead | String | ❌ |
| `website` | Lead | String | ❌ |
| `telefone` | Lead | String | ❌ |
| `telefone_desformatado` | Lead | String | ❌ |
| `categoria` | Lead | String | ❌ |
| `link_google_maps` | Lead | String | ❌ |
| `total_reviews` | Lead | String | ❌ |
| `nota_media` | Lead | String | ❌ |
| `search_term` | Campanha | String | ❌ |
| `search_local` | Campanha | String | ❌ |
| **`nomeEmpresa`** | **Settings** | **String** | **✅ CRÍTICO** |
| **`assinatura`** | **Settings** | **String** | **✅ CRÍTICO** |
| `telefoneContato` | Settings | String | ⚠️ Importante |
| `websiteEmpresa` | Settings | String | ⚠️ Importante |
| **`senderEmails`** | **Settings** | **JSON Array** | **✅ CRÍTICO** |
| `promptOverview` | Settings | Text | ❌ |
| `promptTatica` | Settings | Text | ❌ |
| `promptDiretrizes` | Settings | Text | ❌ |
| `templatePesquisa` | Settings | Text | ❌ |
| `templateAnaliseEmpresa` | Settings | Text | ❌ |
| `informacoesPropria` | Settings | Text | ❌ |
| `emailTitulo1` | Settings | String | ❌ |
| `emailCorpo1` | Settings | Text | ❌ |
| `emailCorpo2` | Settings | Text (sem título) | ❌ |
| `emailTitulo3` | Settings | String | ❌ |
| `emailCorpo3` | Settings | Text | ❌ |

---

## 📌 Notas Importantes

1. **Email 2 não tem assunto** - É enviado como resposta (Re:) na mesma thread do Email 1
2. **senderEmails é obrigatório** - Sem isso, não é possível enviar emails
3. **Formato de senderEmails**: Array JSON string `["email1@example.com", "email2@example.com"]`
4. **Round-robin**: Use módulo para distribuir emails entre contas
5. **Assinatura dinâmica**: Use `{{ $json.assinatura }}` nos emails

---

## 🚀 Próximos Passos

1. Abrir N8N
2. Editar **Fluxo 1** → Nó "Execute Workflow"
3. Adicionar os 16 novos campos (5 críticos + 11 anteriores)
4. Salvar e ativar workflow
5. Editar **Fluxo 2** → Nó de IA (Claude/OpenAI)
6. Substituir prompt pelo template dinâmico acima
7. Editar **Fluxos 3/4/5** → Adicionar round-robin de senderEmails
8. Testar com uma campanha COMPLETO
9. Verificar se emails são enviados com remetentes diferentes

✅ **Pronto!** Sistema 100% configurável via dashboard.
