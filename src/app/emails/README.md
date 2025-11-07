# Emails - Configuração de Emails

**page.tsx**: Página com 4 tabs (Templates, Cadência, Configurações, Prompts IA). Gerencia 3 templates de email (Email 1 com assunto+corpo, Email 2 bump sem assunto, Email 3 breakup com assunto+corpo), cadência com MessageIntervals, emails remetentes com round-robin (adicionar/remover), prompts IA específicos (overview, tática, diretrizes), limite diário (100 emails padrão) e horário comercial. Mostra cálculo automático de delay entre emails. Usa React Query + mutations para salvar em /api/settings.
