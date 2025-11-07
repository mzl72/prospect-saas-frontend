# Cadência Híbrida - Configuração de Sequência Email + WhatsApp

**page.tsx**: Página com 4 tabs (Templates, Cadência, Configurações, Prompts IA). Templates híbridos ESPECÍFICOS (não reutiliza /emails ou /whatsapp): 3 emails (hybridEmailTitulo1, hybridEmailCorpo1/2/3, hybridEmailTitulo3) + 2 WhatsApp (hybridWhatsappMessage1/2). Usa componente HybridCadence para intercalar mensagens. Switch useHybridCadence ativa/desativa modo híbrido. Configurações: hybridDailyLimit (70 padrão), horário comercial. Prompts IA específicos do híbrido. Usa React Query + mutations.
