# src/components - Componentes React

Componentes reutilizáveis organizados por categoria.

## Layout

### `layout/Layout.tsx`
Container principal que renderiza Sidebar condicionalmente (não mostra na landing page). Aplica margin-left quando sidebar está ativa.

### `layout/Sidebar.tsx`
Sidebar fixa com navegação (Início, Gerar Leads, Campanhas) e display de créditos do usuário no footer. Destaque visual para rota ativa.

### `layout/Header.tsx`
Header alternativo (não usado atualmente) com navegação horizontal completa: Emails, WhatsApp, Híbrido, Configurações. Display de créditos inline.

## Wizard

### `wizard/LeadGenerationWizard.tsx`
Wizard de 3 etapas para geração de leads. Etapa 1: tipo negócio + localização + quantidade (4/20/40/100/200). Etapa 2: nível de serviço (básico/completo) com cálculo de custo. Etapa 3: confirmação com dialog e validação de créditos. Usa mutation TanStack Query + invalidate cache.

## Error Handling

### `ErrorBoundary.tsx`
Componente de captura de erros React. Exibe UI de fallback com opção de reload.

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
