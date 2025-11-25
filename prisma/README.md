# prisma - Database Schema

Schema do banco de dados PostgreSQL com Prisma ORM.

## Arquivo Principal

### `schema.prisma`
Schema completo do banco de dados com 3 modelos: User, Campaign, Lead.

## Models

### User
Usuário do sistema com sistema de créditos pré-pago.
- `id` (String, CUID): Identificador único
- `email` (String, unique): Email do usuário
- `name` (String?): Nome opcional
- `credits` (Int, default: 150): Saldo de créditos
- `createdAt` / `updatedAt`: Timestamps automáticos
- **Relações**: campaigns (1-N)

### Campaign
Campanha de geração de leads (básica ou completa).
- `id` (String, CUID): Identificador único
- `userId` (String): ID do usuário dono
- `title` (String): Título da campanha
- `status` (CampaignStatus): PROCESSING / EXTRACTION_COMPLETED / COMPLETED / FAILED
- `tipo` (CampaignType): BASICO / COMPLETO
- `quantidade` (Int): Quantidade de leads solicitada
- `termos` (String): Tipos de negócio (CSV)
- `locais` (String): Localizações (CSV)
- `planilhaUrl` (String?): URL da planilha gerada (opcional)
- **Tracking de Leads**:
  - `leadsRequested` (Int): Quantidade solicitada
  - `leadsCreated` (Int, default: 0): Quantidade criada
  - `leadsDuplicated` (Int, default: 0): Duplicatas detectadas
  - `creditsCost` (Int): Custo total em créditos
  - `creditsRefunded` (Float, default: 0): Créditos devolvidos (duplicatas + insuficientes)
- **Timeout**:
  - `processStartedAt` (DateTime?): Quando começou a processar
  - `estimatedCompletionTime` (Int?): Tempo estimado em segundos
  - `timeoutAt` (DateTime?): Quando deve dar timeout
- **Relações**: user (N-1), leads (1-N)

### Lead
Lead extraído do Google Maps e opcionalmente enriquecido com IA.
- `id` (String, CUID): Identificador único
- `campaignId` (String): ID da campanha
- **Dados Básicos** (extraídos do Google Maps):
  - `nomeEmpresa` (String): Nome da empresa
  - `email` (String?): Email
  - `telefone` (String?): Telefone
  - `endereco` (String?): Endereço
  - `website` (String?): Website
  - `categoria` (String?): Categoria do negócio
  - `totalReviews` (String?): Total de reviews
  - `notaMedia` (String?): Nota média
  - `linkGoogleMaps` (String?): Link do Google Maps
- **Redes Sociais**:
  - `linkedinUrl`, `twitterUrl`, `instagramUrl`, `facebookUrl`, `youtubeUrl`, `tiktokUrl`, `pinterestUrl` (String?)
- **Tracking**:
  - `apifyLeadId` (String, unique?): ID único do Apify para detectar duplicatas
  - `extractedAt` (DateTime?): Quando foi extraído
  - `enrichedAt` (DateTime?): Quando foi enriquecido
  - `status` (LeadStatus, default: EXTRACTED): EXTRACTED / ENRICHED
- **Dados Enriquecidos** (apenas COMPLETO):
  - `companyResearch` (Text?): Pesquisa sobre a empresa (IA)
  - `strategicAnalysis` (Text?): Análise estratégica (IA)
  - `personalization` (Text?): Mensagens personalizadas (IA)
  - `analysisLink` (String?): Link para análise completa
- **Relações**: campaign (N-1)

## Enums

### CampaignStatus
- `PROCESSING`: Processando extração (inicial)
- `EXTRACTION_COMPLETED`: Extração completa (BASICO finalizado, COMPLETO aguardando enrichment)
- `COMPLETED`: Tudo finalizado (COMPLETO com enrichment concluído)
- `FAILED`: Falhou ou deu timeout

### CampaignType
- `BASICO`: Apenas extração de leads do Google Maps (0.25 créditos/lead)
- `COMPLETO`: Extração + enriquecimento com IA (1 crédito/lead)

### LeadStatus
- `EXTRACTED`: Lead extraído do Google Maps (dados básicos)
- `ENRICHED`: Lead enriquecido com IA (dados de pesquisa + mensagens)

## Comandos Úteis

```bash
# Gerar Prisma Client
npx prisma generate

# Criar migration
npx prisma migrate dev --name nome_da_migration

# Aplicar migrations em produção
npx prisma migrate deploy

# Abrir Prisma Studio (visualizador de dados)
npx prisma studio

# Reset completo do banco (CUIDADO!)
npx prisma migrate reset
```

## Princípios de Design

1. **CUID como IDs**: Mais seguros que UUIDs, difíceis de enumerar
2. **Timestamps automáticos**: createdAt/updatedAt em todos os models
3. **Snake_case em DB**: Mapeamento snake_case no banco, camelCase no código
4. **Cascade Delete**: Deletar usuário deleta campanhas/leads (onDelete: Cascade)
5. **Tracking Granular**: Tracking detalhado de leads para reembolsos precisos
6. **Text para IA**: companyResearch/strategicAnalysis usam @db.Text (sem limite de tamanho)
