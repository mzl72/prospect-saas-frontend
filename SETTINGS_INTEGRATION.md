# 🔧 Integração das Configurações com N8N

## 📊 Estrutura de Dados

### 1. Banco de Dados
As configurações são salvas na tabela `user_settings` vinculada ao `userId`:

```prisma
model UserSettings {
  id                      String
  userId                  String (FK -> User)
  templatePesquisa        Text
  templateAnaliseEmpresa  Text
  emailTitulo1            String
  emailCorpo1             Text
  emailTitulo2            String
  emailCorpo2             Text
  emailTitulo3            String
  emailCorpo3             Text
  informacoesPropria      Text
}
```

## 🔄 Fluxo de Integração com N8N

### Opção 1: Enviar na Requisição (RECOMENDADO)
Quando o usuário cria uma campanha, enviar os templates junto:

```typescript
// src/components/wizard/LeadGenerationWizard.tsx

const response = await fetch(N8N_WEBHOOK_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    // Dados da campanha
    termos: data.termos,
    locais: data.locais,
    quantidade: data.quantidade,
    tipo: data.tipo,

    // ⭐ ADICIONAR: Configurações do usuário
    settings: {
      templatePesquisa: userSettings.templatePesquisa,
      templateAnaliseEmpresa: userSettings.templateAnaliseEmpresa,
      emailTemplates: [
        {
          titulo: userSettings.emailTitulo1,
          corpo: userSettings.emailCorpo1,
        },
        {
          titulo: userSettings.emailTitulo2,
          corpo: userSettings.emailCorpo2,
        },
        {
          titulo: userSettings.emailTitulo3,
          corpo: userSettings.emailCorpo3,
        },
      ],
      informacoesPropria: userSettings.informacoesPropria,
    },
  }),
});
```

**Vantagens:**
- ✅ N8N recebe tudo de uma vez
- ✅ Mais simples de implementar
- ✅ Menos requisições
- ✅ Funciona offline/desconectado

### Opção 2: N8N Busca as Configurações
N8N faz uma requisição para buscar settings:

```
N8N Workflow:
1. Recebe webhook com campaignId
2. Faz GET para /api/settings?userId={userId}
3. Usa os templates recebidos
4. Processa campanha
```

**Vantagens:**
- ✅ Dados sempre atualizados
- ✅ Menor payload inicial

**Desvantagens:**
- ⚠️ Mais complexo
- ⚠️ Precisa autenticação
- ⚠️ Mais requisições

## 🎯 Implementação Recomendada

### Passo 1: Buscar Settings Antes de Enviar
Modificar `LeadGenerationWizard.tsx`:

```typescript
// Buscar configurações do usuário
const { data: userSettings } = useQuery({
  queryKey: ["settings"],
  queryFn: async () => {
    const response = await fetch("/api/settings");
    const data = await response.json();
    return data.settings;
  },
});

// Ao enviar para N8N, incluir settings
const handleSubmit = async () => {
  const payload = {
    campaignId,
    termos,
    locais,
    quantidade,
    tipo,
    settings: userSettings, // ⭐ Incluir aqui
  };

  await fetch(N8N_WEBHOOK_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  });
};
```

### Passo 2: N8N Usa os Templates

No N8N, os templates ficam disponíveis em `{{ $json.settings }}`:

**Nó de Pesquisa (IA):**
```
Prompt: {{ $json.settings.templatePesquisa }}
  .replace('{nome_empresa}', $json.nomeEmpresa)
```

**Nó de Análise (IA):**
```
Prompt: {{ $json.settings.templateAnaliseEmpresa }}
  .replace('{nome_empresa}', $json.nomeEmpresa)
  .replace('{setor}', $json.setor)
```

**Nó de Email (IA):**
```
Email 1:
Título: {{ $json.settings.emailTemplates[0].titulo }}
Corpo: {{ $json.settings.emailTemplates[0].corpo }}
  .replace('{nome_empresa}', $json.nomeEmpresa)
  .replace('{informacoes_propria}', $json.settings.informacoesPropria)
```

## 🔐 Variáveis Disponíveis

Essas variáveis podem ser usadas nos templates:

```
{nome_empresa}        - Nome da empresa
{setor}              - Setor de atuação
{area_interesse}     - Área identificada
{dor_identificada}   - Dor/problema encontrado
{solucao}            - Solução proposta
{informacoes_propria} - Info da sua empresa
{assunto_anterior}   - Para follow-ups
```

## 📝 Exemplo Completo de Payload

```json
{
  "campaignId": "clxxx123",
  "termos": "restaurante",
  "locais": "São Paulo, SP",
  "quantidade": 50,
  "tipo": "completo",
  "settings": {
    "templatePesquisa": "Pesquise {nome_empresa}...",
    "templateAnaliseEmpresa": "Analise {nome_empresa}...",
    "emailTemplates": [
      {
        "titulo": "{nome_empresa} - Oportunidade",
        "corpo": "Olá {nome_empresa}..."
      },
      {
        "titulo": "Re: {nome_empresa}",
        "corpo": "Seguindo..."
      },
      {
        "titulo": "Última chance",
        "corpo": "Última tentativa..."
      }
    ],
    "informacoesPropria": "Somos uma plataforma..."
  }
}
```

## ⚙️ Migração do Banco

Após editar `schema.prisma`, rodar:

```bash
# Criar migration
npx prisma migrate dev --name add_user_settings

# Gerar cliente Prisma
npx prisma generate
```

## 🔍 Como Testar

1. Acesse `/configuracoes`
2. Preencha os templates
3. Salve
4. Vá em `/gerar` e crie uma campanha
5. Verifique no N8N se recebeu os `settings` no payload
