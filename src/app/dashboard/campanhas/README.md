# /dashboard/campanhas - Lista de Campanhas (Meta Ads Style)

Interface de gerenciamento de campanhas com tabs, filtros, ações em massa e métricas inline.

## Arquivos

### `page.tsx`
Lista de campanhas com tabs (Todas/Ativas/Pausadas/Concluídas), filtros (busca, status, tipo), tabela sortable, checkboxes para ações em massa. Auto-refresh 30s.

### `[id]/page.tsx`
Detalhes da campanha com stats cards, tabela de leads, export CSV (proteção CSV injection), modal de detalhes do lead, auto-refresh condicional.

### `[id]/leads/[leadId]/page.tsx`
Timeline de emails enviados, status tracking (SENT/OPENED/REPLIED), análise IA, mensagens WhatsApp (hybrid).

### `[id]/leads/[leadId]/whatsapp/page.tsx`
Visualização de mensagens WhatsApp preparadas para o lead.

## Componentes

### `campaigns/CampaignTable.tsx`
Tabela com sortable columns, checkboxes, row expandível (métricas inline), skeleton loading, empty state. Colunas: Nome, Status, Tipo, Resultados, Taxa, Gasto, Data, Ações.

### `campaigns/BulkActionsBar.tsx`
Barra sticky top para ações em massa (Pausar, Retomar, Arquivar, Exportar). Aparece quando há seleção. Rate limit: 10 ações/hora.

### `campaigns/CreateCampaignModal.tsx`
Modal com 3 cards: Extração (ativo → wizard), Extração+IA (desabilitado), Envio (desabilitado).

## API

### `api/campaigns/bulk/route.ts`
**PATCH**: Ações em massa (pause/resume/archive). Rate limit: 10 req/hora. Valida ownership. TODO DIA 4: Adicionar status PAUSED e campo isArchived ao schema.

## Features

- ✅ Tabs com contadores dinâmicos
- ✅ Filtros (busca, status, tipo) com useMemo
- ✅ Sortable columns (ASC/DESC toggle)
- ✅ Checkboxes (select all + individual)
- ✅ Ações em massa com confirmação
- ✅ Métricas inline expandíveis
- ✅ Formatação de datas relativas (date-fns)
- ✅ Status badges coloridos (Meta Ads)

## Pendências DIA 4

⚠️ Adicionar `PAUSED` ao enum `CampaignStatus`
⚠️ Adicionar campo `isArchived` ao modelo `Campaign`
