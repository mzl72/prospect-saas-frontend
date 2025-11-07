# WhatsApp - Configuração de Mensagens WhatsApp

**page.tsx**: Página com 5 tabs (Templates, Cadência, Instâncias, Prompts IA, Configurações). Gerencia 3 templates de mensagens WhatsApp, cadência com MessageIntervals, instâncias Evolution API (adicionar/remover com round-robin), prompts IA específicos (overview, tática, diretrizes), limite diário (50 msgs padrão) e horário comercial. Usa React Query + mutations para salvar em /api/settings.
