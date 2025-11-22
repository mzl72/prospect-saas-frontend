# Hooks Customizados

Hooks React reutilizáveis para lógica de negócio compartilhada.

## useCredits

Hook para gerenciar créditos do usuário com refetch automático.

**Uso:**
```tsx
import { useCredits } from "@/hooks/useCredits";

function MyComponent() {
  const { data: credits = 0, isLoading } = useCredits();

  return <div>Créditos: {credits}</div>;
}
```

**Comportamento:**
- Refetch automático a cada 30 segundos
- StaleTime: 25 segundos
- Query key: `["credits"]`
- Fallback: `0` se erro ou sem dados

**Usado em:**
- `Sidebar.tsx` - Mostra créditos no footer
- `dashboard/page.tsx` - Card de créditos
- Futuro: Wizard de criação (validação antes de criar campanha)
