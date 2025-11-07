# [leadId] - Operações em Lead Específico

**route.ts**: API para lead específico. **GET**: Busca lead por ID com validação de formato CUID (regex: /^c[a-z0-9]{24}$/i), retorna 400 se ID inválido, inclui emails ordenados por sequenceNumber, whatsappMessages ordenados por sequenceNumber, dados da campaign (id + title), retorna 404 se lead não existe. Usado para página de detalhes do lead com histórico completo de comunicação.
