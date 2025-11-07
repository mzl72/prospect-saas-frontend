# Campanhas - Gerenciamento de Campanhas e Leads

**page.tsx**: Listagem de campanhas com polling inteligente (refetchInterval 10s apenas para status PROCESSING), timeout tracking com useRef (30min), exibe leadsRequested vs leadsCreated, leadsDuplicated, creditsRefunded. Função calcularTempoEstimado usa CAMPAIGN_TIMEOUT do constants. Previne memory leak com cleanup do useRef.
**loading.tsx**: Skeleton loading com Cards simulando listagem de campanhas (título, status badge, métricas)
**[id]/page.tsx**: Detalhes de campanha + listagem de leads com filtros (status, search), exportação CSV, modal de detalhes do lead, botão refresh manual, Progress bar de conclusão, badges de status com cores. Usa useUIStore para persistir filtros.
**[id]/leads/[leadId]/page.tsx**: Detalhes completos do lead com dados, análise IA (companyResearch, strategicAnalysis, personalization, analysisLink), histórico de emails (sequenceNumber, subject, body, status, timestamps), links para redes sociais, botão para ver mensagens WhatsApp.
**[id]/leads/[leadId]/whatsapp/page.tsx**: Histórico de mensagens WhatsApp do lead (sequenceNumber, message, phoneNumber, status com cores: PENDING/SENT/DELIVERED/READ/FAILED, timestamps sentAt/deliveredAt/readAt). Breadcrumb de navegação.
