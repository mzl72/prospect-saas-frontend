# src/ - Source Code

Estrutura do projeto seguindo padrões Next.js 15 (App Router) + Prisma + React Query.

## Estrutura

**app/**: Páginas Next.js (App Router) + API Routes + layout root
**components/**: Componentes React (layout, wizard, cadence, Shadcn/UI)
**lib/**: Core services, utilities, schedulers, estado global (Zustand), cache (React Query)
**types/**: Definições TypeScript (re-exporta Prisma + tipos de API + frontend)

## Padrões de Arquitetura

### Single Source of Truth
- **Prisma Schema**: Fonte única de tipos do banco (re-exportados em types/index.ts)
- **pricing-service.ts**: Única fonte para cálculos de créditos
- **constants.ts**: Valores hardcoded centralizados

### State Management
- **Zustand**: Estado local UI (wizard, filtros) - persist com partialize
- **React Query**: Cache de servidor (campanhas, leads, settings) - staleTime/gcTime configurados

### Validação & Segurança
- **Zod schemas**: Validação de DTOs (validation-schemas.ts)
- **Sanitização**: XSS prevention (sanitization.ts)
- **Rate limiting**: Em memória com LRU (rate-limit.ts)

### Schedulers & Services
- **base-scheduler.ts**: Lógica unificada para email + WhatsApp + híbrido
- **scheduling-utils.ts**: Funções de timing compartilhadas (horário comercial, delays, dias corretos)
- **message-service.ts**: Envio unificado (Resend + Evolution API)

### Demo User
- Sistema MVP usa DEMO_USER_ID fixo (demo-user.ts)
- Multi-tenancy será implementado pós-MVP com NextAuth

## Observações Importantes
- ⚠️ `.env` contém secrets reais (verificar .gitignore)
- ⚠️ Arquivo `nul` na raiz (parece erro, deletar)
- ✅ Dark mode padrão (layout root)
- ✅ TypeScript strict mode
- ✅ Sanitização XSS em todos inputs
