# src/types - Definições de Tipos TypeScript

Tipos centralizados do projeto. SINGLE SOURCE OF TRUTH: Prisma schema.

## Database Models (Re-exported from Prisma)

### `User`
Re-export do Prisma: id, email, name, credits, timestamps.

### `Campaign`
Re-export do Prisma: id, userId, title, status (PROCESSING/EXTRACTION_COMPLETED/COMPLETED/FAILED), tipo (BASICO/COMPLETO), quantidade, termos, locais, planilhaUrl, tracking de leads (leadsRequested, leadsCreated, leadsDuplicated, creditsCost, creditsRefunded), timeout (processStartedAt, estimatedCompletionTime, timeoutAt).

### `Lead`
Re-export do Prisma: id, campaignId, dados básicos (nomeEmpresa, email, telefone, endereco, website, categoria, totalReviews, notaMedia, linkGoogleMaps), redes sociais (linkedinUrl, twitterUrl, instagramUrl, facebookUrl, youtubeUrl, tiktokUrl, pinterestUrl), tracking (apifyLeadId, extractedAt, enrichedAt, status), dados enriquecidos IA (companyResearch, strategicAnalysis, personalization, analysisLink).

## Enums

### `CampaignStatus`
PROCESSING - Processando extração, EXTRACTION_COMPLETED - Extração completa (BASICO finalizado), COMPLETED - Tudo finalizado (COMPLETO com enrichment), FAILED - Falha ou timeout.

### `CampaignType`
BASICO - Apenas extração de leads, COMPLETO - Extração + enriquecimento com IA.

### `LeadStatus`
EXTRACTED - Lead extraído do Google Maps, ENRICHED - Lead enriquecido com IA (apenas COMPLETO).

## API Types

### `CreateCampaignRequest`
Payload de criação de campanha: titulo (opcional), tipoNegocio (string[]), localizacao (string[]), quantidade (4|20|40|100|200), nivelServico ("basico"|"completo").

### `CampaignResponse`
Resposta de campanha da API: id, title, status, quantidade, tipo, createdAt, planilhaUrl, stats opcionais (leadsRequested, leadsCreated, leadsDuplicated, creditsRefunded), count de leads.

### `CreditsResponse`
Resposta de créditos: success (boolean), credits (number).

## Utility Types

### `CampaignStats`
Estatísticas calculadas: total, extracted, enriched (counts de leads).

### `WizardState`
Estado do wizard Zustand: currentStep, tipoNegocio, localizacao, quantidade, nivelServico, actions (setters + resetWizard).

## Validation Types (Zod)

### `CreateCampaignDto`
Tipo inferido do CreateCampaignSchema (Zod).

### `LeadData`
Tipo inferido do LeadDataSchema (Zod) para validação de webhooks.

## Princípios

1. **Single Source of Truth**: Tipos de DB vêm do Prisma via re-export (não duplicar).
2. **Type Safety**: Todos os endpoints da API têm types definidos.
3. **Simplicidade**: Apenas types essenciais para o MVP atual.
4. **Zod Integration**: Types de validação são inferidos dos schemas.
