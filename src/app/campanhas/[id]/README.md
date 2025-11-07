# [id] - Detalhes da Campanha

**page.tsx**: Página de detalhes de campanha específica. Busca campanha + leads via React Query, exibe Progress bar de conclusão (leadsCreated/leadsRequested), listagem de leads com filtros persistidos via useUIStore (status, searchTerm), botão exportar CSV (usa csv-export.ts), botão refresh manual, Dialog modal com detalhes completos do lead (dados, redes sociais, análise IA, emails/WhatsApp). Tipos: LeadStatus enum (EXTRACTED, ENRICHED, EMAIL_1/2/3_SENT, REPLIED, OPTED_OUT, BOUNCED).
