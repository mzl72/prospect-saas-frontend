# API /api/templates - CRUD de Templates

Sistema de templates para Email, WhatsApp e Prompts IA com variáveis dinâmicas `{nomeVariavel}`.

## Endpoints

### GET /api/templates
Lista templates do usuário + defaults. Query: `?type=EMAIL|WHATSAPP|PROMPT_IA`. Todos os roles.

### POST /api/templates
Cria template. Body: `{type, name, subject?, content}`. Manager+ apenas. Rate limit: 20/hora.

### PATCH /api/templates/[id]
Atualiza template. Criador ou ADMIN. Defaults não editáveis.

### DELETE /api/templates/[id]
Soft delete (isActive=false). Criador ou ADMIN. Defaults não deletáveis.

## Variáveis
Formato: `{nomeEmpresa}`, `{nomeVendedor}`, `{categoria}`, etc.
Extraídas automaticamente. Alfanumérico + underscore apenas.

## Segurança
- Rate limit: 200 GET/min, 20 POST/hora
- Validação Zod (10-10000 chars)
- Permissões por role (OPERATOR/MANAGER/ADMIN)
- Subject obrigatório para EMAIL

## Helpers
`extractVariables()`, `renderTemplate()`, `validateTemplateVariables()` em `/src/lib/template-helpers.ts`
