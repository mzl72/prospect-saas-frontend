# Types

Definições de tipos TypeScript para o projeto.

## Estrutura

### Database Models (Prisma)

- `User` - Usuário do sistema (com créditos)
- `Campaign` - Campanha de extração de leads
- `Lead` - Lead extraído/enriquecido

### Enums

- `CampaignStatus` - PROCESSING | EXTRACTION_COMPLETED | COMPLETED | FAILED
- `CampaignType` - BASICO | COMPLETO
- `LeadStatus` - EXTRACTED | ENRICHED

### API Types

- `CreateCampaignRequest` - Payload para criar campanha
- `CampaignResponse` - Resposta de campanha com stats
- `CreditsResponse` - Resposta de créditos do usuário

### Frontend Types

- `WizardState` - Estado do wizard de geração de leads
- `CampaignStats` - Estatísticas de campanha (extraídos, enriquecidos)

## Princípios

1. **Single Source of Truth**: Tipos de DB vêm do Prisma (não duplicar)
2. **Type Safety**: Todos os endpoints da API têm types definidos
3. **Simplicidade**: Apenas types essenciais para o MVP atual
   Update Todos
