# App - Next.js 15 (App Router)

## 📂 Estrutura Root

**layout.tsx**: Root layout com providers (ReactQuery, ErrorBoundary, Toaster), SEO metadata
**page.tsx**: Landing page com hero, features, pricing, CTA
**globals.css**: Estilos globais Tailwind + dark mode

---

## 🎯 Páginas Frontend

### `/gerar` - Criação de Campanhas
**page.tsx**: Renderiza LeadGenerationWizard (3 etapas: tipo de negócio, localização, quantidade + nível básico/completo)
**loading.tsx**: Skeleton com progress bar, inputs, botões

---

### `/campanhas` - Gerenciamento de Campanhas

**page.tsx**: Listagem de campanhas
- Polling inteligente (refetchInterval 10s apenas para PROCESSING)
- Timeout tracking 30min via useRef (previne memory leak com cleanup)
- Exibe: leadsRequested vs leadsCreated, leadsDuplicated, creditsRefunded
- calcularTempoEstimado usa CAMPAIGN_TIMEOUT

**loading.tsx**: Skeleton Cards de campanhas (título, status badge, métricas)

#### `/campanhas/[id]` - Detalhes da Campanha
**page.tsx**: Detalhes + listagem de leads
- Filtros (status, search) persistidos via useUIStore
- Exportação CSV (csv-export.ts)
- Modal de detalhes do lead
- Progress bar de conclusão
- Badges de status com cores
- Botão refresh manual

#### `/campanhas/[id]/leads/[leadId]` - Detalhes do Lead
**page.tsx**: Página completa do lead
- Breadcrumb de navegação
- Dados básicos (nome, endereço, website, telefone, categoria)
- Análise IA (companyResearch, strategicAnalysis, personalization, analysisLink)
- Timeline de emails (sequenceNumber, subject, body, status com cores: PENDING/SENT/OPENED/REPLIED/BOUNCED, timestamps)
- Histórico WhatsApp (preview)
- Botão "Ver Mensagens WhatsApp"

#### `/campanhas/[id]/leads/[leadId]/whatsapp` - Histórico WhatsApp
**page.tsx**: Histórico completo de WhatsApp
- Breadcrumb de navegação
- Todas mensagens ordenadas por sequenceNumber
- phoneNumber, message completa
- Status com cores (PENDING: gray, SENT: blue, DELIVERED: cyan, READ: green, FAILED: red)
- Timestamps sentAt/deliveredAt/readAt formatados

---

### `/emails` - Configuração de Emails

**page.tsx**: 4 tabs (Templates, Cadência, Configurações, Prompts IA)
- **Templates**: 3 emails (Email 1: assunto+corpo, Email 2 bump: sem assunto, Email 3 breakup: assunto+corpo)
- **Cadência**: MessageIntervals, cálculo automático de delay
- **Configurações**: Emails remetentes com round-robin (adicionar/remover), limite diário (100 padrão), horário comercial
- **Prompts IA**: overview, tática, diretrizes específicos de email
- React Query + mutations

---

### `/whatsapp` - Configuração de WhatsApp

**page.tsx**: 5 tabs (Templates, Cadência, Instâncias, Prompts IA, Configurações)
- **Templates**: 3 mensagens WhatsApp
- **Cadência**: MessageIntervals
- **Instâncias**: Evolution API (adicionar/remover com round-robin)
- **Prompts IA**: overview, tática, diretrizes específicos de WhatsApp
- **Configurações**: Limite diário (50 msgs padrão), horário comercial
- React Query + mutations

---

### `/cadencia-hibrida` - Configuração Híbrida

**page.tsx**: 4 tabs (Templates, Cadência, Configurações, Prompts IA)
- **Templates ESPECÍFICOS** (não reutiliza /emails ou /whatsapp):
  - 3 emails híbridos (hybridEmailTitulo1, hybridEmailCorpo1/2/3, hybridEmailTitulo3)
  - 2 WhatsApp híbridos (hybridWhatsappMessage1/2)
- **Cadência**: Componente HybridCadence (intercala mensagens)
- **Switch**: useHybridCadence ativa/desativa modo híbrido
- **Configurações**: hybridDailyLimit (70 padrão), horário comercial
- **Prompts IA**: Específicos do híbrido
- React Query + mutations

---

### `/configuracoes` - Dados da Empresa

**page.tsx**: 2 tabs (Empresa, Prompts IA)
- **Empresa**: nomeEmpresa, assinatura (obrigatórios), telefone, website, descrição
- **Prompts IA**: Genéricos (templatePesquisa, templateAnaliseEmpresa) usados por todos canais
- Navegação via hash (#company, #prompts)
- React Query + mutations com setQueryData (atualiza cache direto)

**loading.tsx**: Skeleton Cards com formulários

---

## 📡 API Routes

Ver [api/README.md](api/README.md) para documentação completa de todos endpoints.
