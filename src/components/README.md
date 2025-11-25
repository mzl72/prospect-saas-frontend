# src/components - Componentes React

Componentes reutilizáveis organizados por categoria.

## Layout

### `layout/Layout.tsx`
Container principal que renderiza Sidebar condicionalmente (não mostra na landing page). Aplica margin-left quando sidebar está ativa.

### `layout/Sidebar.tsx`
Sidebar fixa com navegação (Dashboard, Campanhas, Templates, Configurações) e display de créditos do usuário no footer com sanitização. Destaque visual para rota ativa.

### `layout/TopBar.tsx`
TopBar com breadcrumbs dinâmicos, user menu (nome, role, perfil) e logout. Integrado com NextAuth. Dialog para menu do usuário.

### `layout/FilterBar.tsx`
Barra de filtros reutilizável com busca e dropdowns. Usado na página de campanhas para filtrar por status e tipo. Props: searchPlaceholder, searchValue, onSearchChange, filters (array de Filter).

## Wizard

### `wizard/LeadGenerationWizard.tsx`
Wizard de 3 etapas para geração de leads. Etapa 1: tipo negócio + localização + quantidade (4/20/40/100/200) com validação XSS em tempo real. Etapa 2: nível de serviço (básico/completo) com cálculo de custo. Etapa 3: confirmação com dialog e validação de créditos. Usa mutation TanStack Query + invalidate cache. Sanitização contra XSS e NoSQL injection.

## Campaigns (DIA 3 - Meta Ads Style)

### `campaigns/CampaignTable.tsx`
Tabela de campanhas com sortable columns, checkboxes para seleção, row expandível com métricas inline. Features: status badges coloridos, formatação de datas relativas (date-fns), skeleton loading, empty state. Colunas: Nome, Status, Tipo, Resultados, Taxa, Gasto, Data, Ações.

### `campaigns/BulkActionsBar.tsx`
Barra de ações em massa (sticky top) que aparece quando há campanhas selecionadas. Ações: Pausar, Retomar, Arquivar, Exportar, Limpar. Integração com API `/api/campaigns/bulk`. Loading indicator durante ação, toast de sucesso/erro, confirmação para arquivar.

### `campaigns/CreateCampaignModal.tsx`
Modal com 3 cards para escolher tipo de campanha: 1) Extração (ativo) → abre wizard, 2) Extração + IA (desabilitado, "Em Breve"), 3) Envio (desabilitado, "Em Breve"). Visual: hover azul no card ativo, opacity 0.5 nos desabilitados, badges coloridos.

## Error Handling

### `ErrorBoundary.tsx`
Componente de captura de erros React com logging estruturado e sanitização. Exibe UI de fallback com error ID único. Sanitiza mensagens de erro (remove URLs, emails, tokens). Stack traces apenas em dev.

## UI (Shadcn)

Componentes do Shadcn UI com customizações dark mode:

### `ui/badge.tsx`
Badge com variantes: default, secondary, destructive, outline.

### `ui/button.tsx`
Botão com variantes de tamanho e estilo. Suporte para asChild (composition pattern).

### `ui/card.tsx`
Card, CardHeader, CardTitle, CardContent - containers para conteúdo agrupado.

### `ui/dialog.tsx`
Modal Dialog com overlay, header, footer e close button.

### `ui/form.tsx`
Form components integrados com react-hook-form: Form, FormField, FormItem, FormLabel, FormControl, FormMessage.

### `ui/input.tsx`
Input text com estilização dark mode e estados de erro.

### `ui/label.tsx`
Label para inputs com acessibilidade (Radix UI).

### `ui/progress.tsx`
Barra de progresso animada (usada no wizard).

### `ui/select.tsx`
Select dropdown customizado com Radix UI: Select, SelectTrigger, SelectContent, SelectItem.

### `ui/slider.tsx`
Slider range input (não usado atualmente).

### `ui/switch.tsx`
Toggle switch (não usado atualmente).

### `ui/toaster.tsx`
Sistema de notificações toast com Sonner. Provider + componente Toaster.

## Padrões de Código

- Todos os componentes client-side usam `"use client"` directive
- Components de UI usam `cn()` helper para merge de classes Tailwind
- Wizard usa Zustand store para gerenciar estado entre etapas
- TanStack Query para data fetching (campanhas, créditos)
- Validação inline com feedback visual de erro
- Dialog de confirmação antes de operações críticas
