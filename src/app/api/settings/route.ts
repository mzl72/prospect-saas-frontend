import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma-db";
import { DEMO_USER_ID, ensureDemoUser } from "@/lib/demo-user";
import { sanitizeInput, containsXSS } from "@/lib/sanitization";

// Templates padrão
const DEFAULT_SETTINGS = {
  // Prompts de IA
  templatePesquisa: `# PROMPT DE PESQUISA PROFUNDA DE EMPRESA

**EMPRESA ALVO:** {nome_empresa}
**OBJETIVO:** Coletar informações estratégicas para personalizar outreach B2B

## 1. INFORMAÇÕES BÁSICAS
- Nome completo e razão social
- Setor/indústria específica (não apenas "serviços")
- Tamanho aproximado (nº funcionários, faturamento se público)
- Localizações principais (matriz, filiais)
- Website oficial e redes sociais ativas

## 2. CONTEXTO DE NEGÓCIO
- Principais produtos/serviços oferecidos
- Proposta de valor (como se posicionam no mercado?)
- Público-alvo/ICP deles
- Principais concorrentes
- Modelo de negócio (B2B, B2C, Marketplace, SaaS, etc)

## 3. SINAIS DE COMPRA (MUITO IMPORTANTE)
- Notícias recentes (últimos 6 meses):
  * Expansão, nova sede, novos mercados
  * Rodadas de investimento
  * Lançamento de produtos
  * Contratações em massa
  * Premiações, certificações
- Tecnologias que usam (visíveis no site/LinkedIn)
- Vagas abertas relacionadas à nossa solução
- Eventos que participaram/patrocinam

## 4. IDENTIFICAÇÃO DE DORES
Com base no setor, tamanho e contexto, INFERIR:
- 2-3 desafios típicos que empresas assim enfrentam
- Processos que provavelmente são manuais/ineficientes
- Áreas onde nossa solução {informacoes_propria} se encaixa

## 5. TOMADORES DE DECISÃO (se possível)
- Cargos típicos que decidem sobre nossa solução
- Nomes no LinkedIn se disponíveis (CEO, CTO, CMO, etc)
- Perfil do decision-maker (background, tempo na empresa)

## FORMATO DA RESPOSTA:
- Markdown estruturado
- Bullet points claros
- Destacar em **negrito** os insights mais relevantes
- Sempre citar fontes quando possível
- Se não encontrar informação: escrever "Não encontrado" (não inventar)`,
  templateAnaliseEmpresa: `# PROMPT DE ANÁLISE ESTRATÉGICA E PERSONALIZAÇÃO

Você receberá dados coletados sobre **{nome_empresa}**.

**SUA MISSÃO:** Transformar dados em INSIGHTS ACIONÁVEIS para personalizar outreach.

## ENTRADA (dados da pesquisa anterior):
{company_research}

## SUA ANÁLISE DEVE CONTER:

### 1. RESUMO EXECUTIVO (2-3 frases)
- Quem são, o que fazem, tamanho/relevância
- Principal característica que se destaca

### 2. DORES IDENTIFICADAS (2-3 mais relevantes)
Com base no setor, tamanho, notícias e contexto, identificar:
- Dor #1: [descrição] → Como sabemos: [evidência]
- Dor #2: [descrição] → Como sabemos: [evidência]
- Dor #3: [descrição] → Como sabemos: [evidência]

**REGRA:** Cada dor deve ter uma EVIDÊNCIA concreta (notícia, tecnologia usada, vaga aberta, padrão do setor)

### 3. OPORTUNIDADES DE ABORDAGEM (2 principais)
Para cada dor identificada:
- **Ângulo de entrada:** Como iniciar a conversa?
- **Proposta de valor específica:** O que oferecemos que resolve ISSO?
- **Prova/credibilidade:** Case, dado ou resultado que valida

### 4. PERSONALIZAÇÃO RECOMENDADA

**Para usar em EMAIL:**
- Insight #1: [dado/notícia específica para mencionar]
- Insight #2: [relação com setor ou concorrentes]
- Gancho de abertura sugerido: "[frase para primeiro parágrafo]"

**Para usar em WHATSAPP:**
- Mensagem curta sugerida: "[exemplo de abordagem amigável]"
- Call-to-action recomendado: "[pergunta fácil de responder]"

### 5. CAMPOS PARA SUBSTITUIÇÃO NOS TEMPLATES

Preencher variáveis que serão usadas nos templates:
- **{setor}:** [setor específico, ex: "e-commerce de moda"]
- **{dor_identificada}:** [dor #1 em 1 frase]
- **{solucao}:** [como resolvemos em 1 frase]
- **{beneficio_principal}:** [principal benefício em 1 frase]
- **{area_interesse}:** [área específica onde podemos ajudar]

### 6. RECOMENDAÇÃO DE ABORDAGEM
- **Canal prioritário:** Email ou WhatsApp? (considerar formalidade do setor)
- **Tom recomendado:** Formal/Semi-formal/Informal
- **Timing ideal:** Melhor dia/hora para contato (considerar notícias recentes)
- **Persona-alvo:** Cargo/nome do tomador de decisão ideal

## FORMATO DA SAÍDA:
- Markdown estruturado
- Bullet points
- Máximo 400 palavras
- Foco em AÇÃO (o que fazer com essa informação)
- Destacar os 2-3 insights mais valiosos em **negrito**`,
  informacoesPropria: `Somos uma plataforma SaaS de prospecção automatizada que utiliza IA para:
- Gerar listas de leads qualificados do Google Maps
- Pesquisar informações detalhadas sobre cada empresa
- Criar emails personalizados automaticamente
- Economizar 80% do tempo em prospecção manual

Nossos clientes conseguem gerar 10x mais leads qualificados em 1/5 do tempo.`,

  // Prompts específicos por canal - Email
  emailPromptOverview: `Você é um Especialista em Cold Email B2B com 10+ anos de experiência.

CONTEXTO: Trabalha para {nomeEmpresa} - {informacoesPropria}

SEU PAPEL:
- Analisar empresas prospects profundamente
- Identificar dores e oportunidades reais
- Criar emails hiperpersonalizados que geram respostas

ESTILO DE ESCRITA:
- Tom profissional mas conversacional
- Direto ao ponto, sem floreios
- Foco em valor para o destinatário (WIIFM - What's In It For Me)
- Usar dados e insights da pesquisa para mostrar que você fez o dever de casa`,
  emailPromptTatica: `ESTRATÉGIA DE SEQUÊNCIA DE 3 EMAILS:

EMAIL 1 (Primeiro Contato - Dia 0):
- Objetivo: Despertar curiosidade e mostrar relevância
- Abordagem: Insight + Oportunidade identificada + Pergunta
- Tamanho: 80-120 palavras
- CTA: Pergunta aberta para iniciar conversa

EMAIL 2 (Bump - 3 dias depois):
- Objetivo: Retomar sem ser inconveniente
- Abordagem: Resposta curta na mesma thread, adicionar valor novo
- Tamanho: 40-60 palavras
- CTA: Oferta de recurso (case, whitepaper) ou agenda

EMAIL 3 (Breakup - 7 dias depois do Email 2):
- Objetivo: Última tentativa com gatilho de escassez
- Abordagem: "Entendo que pode não ser o momento, mas..."
- Tamanho: 60-80 palavras
- CTA: Deixar porta aberta ou arquivar contato

REGRAS DE TIMING:
- Sempre respeitar o horário comercial do prospect
- Evitar segundas de manhã e sextas à tarde
- Ideal: terças/quartas/quintas entre 10h-15h`,
  emailPromptDiretrizes: `REGRAS RÍGIDAS DE ESCRITA:

ESTRUTURA:
✅ Linha de assunto: máximo 50 caracteres, sem caps lock, sem emojis
✅ Primeiro parágrafo: 1 frase explicando POR QUE você está entrando em contato
✅ Segundo parágrafo: Insight ou dado específico sobre a empresa deles
✅ Terceiro parágrafo: Como você pode ajudar (1 benefício concreto)
✅ CTA: 1 pergunta simples ou sugestão de próximo passo

PROIBIDO:
❌ Começar com "Espero que este email te encontre bem"
❌ Usar jargões tipo "solução inovadora", "disruptivo", "sinergia"
❌ Fazer pitches de venda agressivos
❌ Falar mais sobre você do que sobre eles
❌ Links múltiplos ou anexos não solicitados
❌ Caps lock, múltiplos pontos de exclamação, emojis

OBRIGATÓRIO:
✅ Mencionar algo específico da empresa (notícia, conquista, desafio do setor)
✅ Usar dados quando possível ("70% das empresas em {setor} enfrentam...")
✅ Personalizar além do {nome_empresa} - mostrar research real
✅ Incluir assinatura com {assinatura}, {nomeEmpresa}, {telefoneContato}, {websiteEmpresa}
✅ Usar variáveis: {nome_empresa}, {setor}, {dor_identificada}, {solucao}, {informacoes_propria}

FORMATAÇÃO:
- Máximo 3 parágrafos curtos
- Espaçamento entre parágrafos
- Sem negrito ou itálico (pode ser filtrado como spam)
- Uma frase por linha quando fizer sentido (facilita leitura)`,

  // Prompts específicos por canal - WhatsApp
  whatsappPromptOverview: `Você é um Especialista em Vendas Conversacionais via WhatsApp.

CONTEXTO: Trabalha para {nomeEmpresa} - {informacoesPropria}

DIFERENÇA WHATSAPP vs EMAIL:
- WhatsApp é INFORMAL e ÁGIL
- As pessoas esperam respostas rápidas e diretas
- Emojis são BEM-VINDOS (mas com moderação)
- Mensagens mais curtas = maior taxa de resposta

SEU PAPEL:
- Iniciar conversas naturais e amigáveis
- Usar tom de "colega de trabalho", não vendedor
- Criar senso de urgência suave
- Facilitar transição para call ou reunião

PRINCÍPIOS WHATSAPP:
1. Seja humano (use "oi", "tudo bem?", etc)
2. Vá direto ao ponto em 2-3 mensagens
3. Faça UMA pergunta por vez
4. Use quebras de linha para facilitar leitura
5. Sempre termine com CTA clara`,
  whatsappPromptTatica: `ESTRATÉGIA DE SEQUÊNCIA DE 3 MENSAGENS WHATSAPP:

MENSAGEM 1 (Primeiro Contato):
- Tom: Descontraído mas profissional
- Objetivo: Apresentar + gerar curiosidade
- Estrutura: Saudação → Motivo do contato → Pergunta simples
- Tamanho: 150-200 caracteres (2-3 linhas)
- Timing: Entre 10h-17h, evitar horário de almoço

MENSAGEM 2 (Follow-up - 2-3 dias depois):
- Tom: Amigável, sem pressão
- Objetivo: Reforçar valor + facilitar próximo passo
- Estrutura: Bump amigável → Valor adicional → CTA fácil
- Tamanho: 120-180 caracteres
- Pode incluir emoji estratégico (👋, 💡, 📊)

MENSAGEM 3 (Última Tentativa - 3 dias depois):
- Tom: Educado mas firme
- Objetivo: Breakup amigável + deixar porta aberta
- Estrutura: Entendo que está ocupado → Sem problema → Deixo meu contato
- Tamanho: 100-150 caracteres
- Emoji de despedida (😊, 🚀)

TIMING INTELIGENTE:
- Respeitar horário comercial
- Evitar fins de semana
- Ideal: Terça/Quarta/Quinta 14h-16h`,
  whatsappPromptDiretrizes: `REGRAS DE ESCRITA WHATSAPP:

ESTRUTURA IDEAL:
✅ Primeira linha: Saudação curta + nome da empresa
✅ Segunda linha: Motivo específico do contato
✅ Terceira linha (opcional): Benefício rápido
✅ Última linha: Pergunta direta ou CTA

PROIBIDO NO WHATSAPP:
❌ Mensagens longas (máx 200 caracteres por mensagem)
❌ Links encurtados (parecem spam)
❌ Linguagem muito formal ("Prezado", "Atenciosamente")
❌ Múltiplos emojis na mesma mensagem
❌ Maiúsculas em palavras inteiras
❌ Pitch de vendas no primeiro contato

OBRIGATÓRIO:
✅ Usar quebras de linha (enviar em "blocos" curtos)
✅ Personalização real (mencionar algo da empresa)
✅ Tom de "eu pesquisei sobre vocês" não "envio em massa"
✅ CTA clara e FÁCIL de responder (sim/não, link calendar, etc)
✅ Usar variáveis: {nome_empresa}, {setor}, {beneficio_principal}, {solucao}

EMOJIS PERMITIDOS (use 1 por mensagem no máximo):
👋 (saudação) | 💡 (ideia) | 📊 (dados/resultado) |
🚀 (crescimento) | ✅ (confirmação) | 😊 (cordialidade)

FORMATAÇÃO:
- Mensagem 1: 2-3 linhas
- Mensagem 2: 2-3 linhas
- Mensagem 3: 2 linhas
- Uma ideia por linha
- Perguntas sempre na última linha`,

  // Prompts específicos por canal - Híbrido
  hybridPromptOverview: `Você é um Orquestrador de Campanhas Multicanal (Email + WhatsApp).

CONTEXTO: {nomeEmpresa} - {informacoesPropria}

ESTRATÉGIA HÍBRIDA:
A cadência híbrida combina a profundidade do EMAIL com a agilidade do WHATSAPP, criando múltiplos pontos de contato coordenados.

PRINCÍPIOS:
1. **Consistência**: Mensagens devem "conversar" entre si
2. **Complementaridade**: Email = contexto, WhatsApp = urgência
3. **Coordenação**: Respeitar espaçamento entre canais
4. **Naturalidade**: Não parecer "sequência automatizada"

PADRÃO RECOMENDADO:
Dia 0: Email 1 (contato formal, estabelece contexto)
Dia 1-2: WhatsApp 1 (follow-up rápido e amigável)
Dia 4: Email 2 (bump com valor adicional)
Dia 5-6: WhatsApp 2 (reforço de urgência)
Dia 8-10: Email 3 (breakup profissional)

OBJETIVO:
Maximizar taxa de resposta através de múltiplos touchpoints sem ser invasivo`,
  hybridPromptTatica: `TÁTICA DE SEQUÊNCIA HÍBRIDA (3 Emails + 2 WhatsApp):

FASE 1 - ABERTURA (Dia 0-2):
📧 EMAIL 1 (Dia 0):
- Contato formal e profundo
- Estabelece credibilidade
- Apresenta research detalhado
- 100-120 palavras

💬 WHATSAPP 1 (Dia 1-2):
- Follow-up amigável e leve
- "Vi que enviei um email, você conseguiu ver?"
- Facilita transição para conversa
- 150-180 caracteres

FASE 2 - ENGAJAMENTO (Dia 3-6):
📧 EMAIL 2 (Dia 4):
- Bump na mesma thread
- Adiciona case study ou dado novo
- Mantém profissionalismo
- 60-80 palavras

💬 WHATSAPP 2 (Dia 5-6):
- Cria urgência suave
- Oferece call rápida
- Tom mais direto
- 120-150 caracteres

FASE 3 - FECHAMENTO (Dia 8-10):
📧 EMAIL 3 (Dia 8-10):
- Breakup educado
- Deixa porta aberta
- Reforça valor
- 80-100 palavras

REGRA DE OURO:
Não enviar Email e WhatsApp no mesmo dia (exceto Dia 1-2).
Deixar pelo menos 24h entre mensagens de canais diferentes.`,
  hybridPromptDiretrizes: `DIRETRIZES PARA CONTEÚDO HÍBRIDO:

CONSISTÊNCIA ENTRE CANAIS:
✅ Usar mesma proposta de valor em ambos os canais
✅ Referências cruzadas quando fizer sentido ("como mencionei no email...")
✅ Manter mesmo nível de personalização
✅ Não repetir exatamente o mesmo conteúdo

SEPARAÇÃO DE RESPONSABILIDADES:

📧 EMAIL (Formal, Informativo):
- Explicações detalhadas
- Research e insights profundos
- Cases e dados
- Links para recursos
- Formatação profissional

💬 WHATSAPP (Informal, Ágil):
- Mensagens curtas e diretas
- Linguagem coloquial
- Emojis estratégicos
- CTAs simples (sim/não, link calendar)
- Tom de "colega de trabalho"

REGRAS ESPECÍFICAS:

COORDENAÇÃO DE TIMING:
✅ Email manhã → WhatsApp tarde (ou vice-versa)
✅ Mínimo 24h entre mensagens de canais diferentes
✅ Máximo 2 tentativas por canal
✅ Respeitar horário comercial de AMBOS os canais

PERSONALIZAÇÃO:
✅ Email: 2-3 dados específicos da empresa
✅ WhatsApp: 1 insight específico é suficiente
✅ Ambos devem mencionar {nome_empresa} e {setor}

CTA PROGRESSIVO:
1. Email 1: "Faz sentido conversarmos?"
2. WhatsApp 1: "Conseguiu ver o email?"
3. Email 2: "Deixo link para agendar: [calendar]"
4. WhatsApp 2: "15min essa semana?"
5. Email 3: "Entendo que não é o momento..."

VARIÁVEIS COMUNS:
- {nome_empresa}
- {setor}
- {dor_identificada}
- {solucao}
- {beneficio_principal}
- {informacoes_propria}
- {nomeEmpresa}
- {assinatura}
- {telefoneContato}
- {websiteEmpresa}`,

  // Templates de Email
  emailTitulo1: "{nome_empresa} - Oportunidade de otimizar {area_interesse}",
  emailCorpo1: `Olá, equipe {nome_empresa}!

Percebi que vocês atuam no setor de {setor} e identifiquei uma oportunidade interessante.

{dor_identificada}

{informacoes_propria}

Podemos agendar uma conversa rápida de 15 minutos?

Atenciosamente,
[Seu Nome]`,
  emailCorpo2: `Olá novamente!

Gostaria de retomar o assunto sobre como podemos ajudar a {nome_empresa} com {solucao}.

Preparei alguns cases de empresas similares no setor de {setor} que conseguiram resultados expressivos.

Teria disponibilidade para uma call esta semana?

Abraços,
[Seu Nome]`,
  emailTitulo3: "Última chance: Oportunidade para {nome_empresa}",
  emailCorpo3: `Oi!

Este é meu último contato sobre a oportunidade que identifiquei para {nome_empresa}.

Se não houver interesse agora, tudo bem! Fico à disposição caso precisem no futuro.

{informacoes_propria}

Abraços,
[Seu Nome]`,

  // Informações da Empresa
  nomeEmpresa: "",
  assinatura: "",
  telefoneContato: "",
  websiteEmpresa: "",
  senderEmails: "[]",

  // Templates WhatsApp
  whatsappMessage1: `Olá! Vi que você tem um negócio na área de {setor} e achei que poderia ser interessante trocar uma ideia.

Temos ajudado empresas como a sua a {beneficio_principal}. Podemos conversar?`,
  whatsappMessage2: `Oi novamente! 👋

Só passando aqui pra ver se você teve chance de pensar na nossa conversa sobre {solucao}.

Preparei algumas ideias que podem funcionar muito bem pra {nome_empresa}. Quando você tiver uns minutinhos, me avisa!`,
  whatsappMessage3: `Última mensagem aqui! 😊

Entendo que pode estar ocupado(a). Se não for o momento certo, sem problemas!

Qualquer coisa, é só chamar. Boa sorte com {nome_empresa}! 🚀`,
  evolutionInstances: "[]",

  // Templates Híbridos (3 Emails + 2 WhatsApp dedicados para cadência híbrida)
  hybridEmailTitulo1: "Parceria Estratégica: {nome_empresa} + {nomeEmpresa}",
  hybridEmailCorpo1: `Olá, equipe {nome_empresa}!

Sou {assinatura} da {nomeEmpresa} e identifiquei uma sinergia interessante entre nossas empresas.

Atuando no setor de {setor}, percebi que vocês têm {dor_identificada}.

{informacoes_propria}

Podemos agendar 15 minutos esta semana para conversar?

Atenciosamente,
{assinatura}
{nomeEmpresa}
{telefoneContato}`,
  hybridEmailCorpo2: `Olá novamente!

Retomando nosso contato anterior sobre {solucao} para {nome_empresa}.

Preparei uma análise específica do setor de {setor} com cases reais de empresas que alcançaram {beneficio_principal}.

Deixo aqui meu calendário para agendarmos: [link]

Abraços,
{assinatura}`,
  hybridEmailTitulo3: "Última tentativa: Oportunidade para {nome_empresa}",
  hybridEmailCorpo3: `Oi, equipe {nome_empresa}!

Este é meu último contato sobre a oportunidade que identifiquei.

Entendo que o timing pode não ser ideal agora. Se houver interesse no futuro, estarei à disposição.

{informacoes_propria}

Sucesso para vocês!
{assinatura}`,
  hybridWhatsappMessage1: `Oi! 👋 Acabei de enviar um email sobre uma oportunidade para {nome_empresa}.

Você conseguiu dar uma olhada? Acho que faz muito sentido pra vocês!`,
  hybridWhatsappMessage2: `E aí! Conseguiu pensar na proposta que mandei?

Tenho uma ideia específica pra {nome_empresa} que pode trazer {beneficio_principal}. 15min essa semana?`,

  // Cadências (JSON) - NOMES SINCRONIZADOS COM PRISMA
  emailOnlyCadence: '[{"messageNumber":1,"dayOfWeek":1,"timeWindow":"09:00-11:00","daysAfterPrevious":0},{"messageNumber":2,"dayOfWeek":3,"timeWindow":"14:00-16:00","daysAfterPrevious":2},{"messageNumber":3,"dayOfWeek":5,"timeWindow":"09:00-11:00","daysAfterPrevious":2}]',
  whatsappOnlyCadence: '[{"messageNumber":1,"dayOfWeek":1,"timeWindow":"10:00-12:00","daysAfterPrevious":0},{"messageNumber":2,"dayOfWeek":3,"timeWindow":"15:00-17:00","daysAfterPrevious":2},{"messageNumber":3,"dayOfWeek":5,"timeWindow":"10:00-12:00","daysAfterPrevious":2}]',
  hybridCadence: '[{"type":"email","messageNumber":1,"emailNumber":1,"dayOfWeek":1,"timeWindow":"09:00-11:00","daysAfterPrevious":0},{"type":"whatsapp","messageNumber":2,"whatsappNumber":1,"dayOfWeek":2,"timeWindow":"14:00-16:00","daysAfterPrevious":1},{"type":"email","messageNumber":3,"emailNumber":2,"dayOfWeek":4,"timeWindow":"09:00-11:00","daysAfterPrevious":2}]',
  useHybridCadence: false,

  // Configurações de Email
  dailyEmailLimit: 100,
  emailBusinessHourStart: 9,
  emailBusinessHourEnd: 18,

  // Configurações de WhatsApp
  whatsappDailyLimit: 50,
  whatsappBusinessHourStart: 9,
  whatsappBusinessHourEnd: 18,

  // Configurações Híbridas
  hybridDailyLimit: 70,
  hybridBusinessHourStart: 9,
  hybridBusinessHourEnd: 18,

  // Configurações Gerais
  sendOnlyBusinessHours: true,
};

// Funções de sanitização movidas para @/lib/sanitization

// Esquema de validação com Zod + proteção XSS
const settingsSchema = z.object({
  templatePesquisa: z
    .string()
    .max(5000, "Template muito longo")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),
  templateAnaliseEmpresa: z
    .string()
    .max(5000, "Template muito longo")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),
  informacoesPropria: z
    .string()
    .max(5000, "Texto muito longo")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),

  // Prompts específicos por canal - Email
  emailPromptOverview: z
    .string()
    .max(5000, "Prompt muito longo")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),
  emailPromptTatica: z
    .string()
    .max(5000, "Prompt muito longo")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),
  emailPromptDiretrizes: z
    .string()
    .max(5000, "Prompt muito longo")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),

  // Prompts específicos por canal - WhatsApp
  whatsappPromptOverview: z
    .string()
    .max(5000, "Prompt muito longo")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),
  whatsappPromptTatica: z
    .string()
    .max(5000, "Prompt muito longo")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),
  whatsappPromptDiretrizes: z
    .string()
    .max(5000, "Prompt muito longo")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),

  // Prompts específicos por canal - Híbrido
  hybridPromptOverview: z
    .string()
    .max(5000, "Prompt muito longo")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),
  hybridPromptTatica: z
    .string()
    .max(5000, "Prompt muito longo")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),
  hybridPromptDiretrizes: z
    .string()
    .max(5000, "Prompt muito longo")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),

  // Email Templates
  emailTitulo1: z
    .string()
    .max(200, "Título muito longo")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),
  emailCorpo1: z
    .string()
    .max(5000, "Corpo muito longo")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),
  emailCorpo2: z
    .string()
    .max(5000, "Corpo muito longo")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),
  emailTitulo3: z
    .string()
    .max(200, "Título muito longo")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),
  emailCorpo3: z
    .string()
    .max(5000, "Corpo muito longo")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),

  // Informações Críticas da Empresa
  nomeEmpresa: z
    .string()
    .max(200, "Nome muito longo")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),
  assinatura: z
    .string()
    .max(200, "Assinatura muito longa")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),
  telefoneContato: z
    .string()
    .max(50, "Telefone muito longo")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),
  websiteEmpresa: z
    .string()
    .max(500, "Website muito longo")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),
  senderEmails: z
    .string()
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default("[]"),

  // WhatsApp Templates
  whatsappMessage1: z
    .string()
    .max(5000, "Mensagem muito longa")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),
  whatsappMessage2: z
    .string()
    .max(5000, "Mensagem muito longa")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),
  whatsappMessage3: z
    .string()
    .max(5000, "Mensagem muito longa")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),

  // Hybrid Templates (3 Emails + 2 WhatsApp)
  hybridEmailTitulo1: z
    .string()
    .max(200, "Título muito longo")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),
  hybridEmailCorpo1: z
    .string()
    .max(5000, "Corpo muito longo")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),
  hybridEmailCorpo2: z
    .string()
    .max(5000, "Corpo muito longo")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),
  hybridEmailTitulo3: z
    .string()
    .max(200, "Título muito longo")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),
  hybridEmailCorpo3: z
    .string()
    .max(5000, "Corpo muito longo")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),
  hybridWhatsappMessage1: z
    .string()
    .max(5000, "Mensagem muito longa")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),
  hybridWhatsappMessage2: z
    .string()
    .max(5000, "Mensagem muito longa")
    .refine((val) => !containsXSS(val), {
      message: "Conteúdo potencialmente malicioso detectado",
    })
    .transform(sanitizeInput)
    .optional()
    .default(""),

  // Evolution API Instances
  evolutionInstances: z
    .string()
    .refine((val) => {
      try {
        JSON.parse(val);
        return true;
      } catch {
        return false;
      }
    }, { message: "JSON inválido" })
    .optional()
    .default("[]"),

  // Cadências (JSON fields) - NOMES SINCRONIZADOS COM PRISMA
  emailOnlyCadence: z
    .string()
    .refine((val) => {
      try {
        JSON.parse(val);
        return true;
      } catch {
        return false;
      }
    }, { message: "JSON inválido" })
    .optional()
    .default('[{"messageNumber":1,"dayOfWeek":1,"timeWindow":"09:00-11:00","daysAfterPrevious":0},{"messageNumber":2,"dayOfWeek":3,"timeWindow":"14:00-16:00","daysAfterPrevious":2},{"messageNumber":3,"dayOfWeek":5,"timeWindow":"09:00-11:00","daysAfterPrevious":2}]'),
  whatsappOnlyCadence: z
    .string()
    .refine((val) => {
      try {
        JSON.parse(val);
        return true;
      } catch {
        return false;
      }
    }, { message: "JSON inválido" })
    .optional()
    .default('[{"messageNumber":1,"dayOfWeek":1,"timeWindow":"10:00-12:00","daysAfterPrevious":0},{"messageNumber":2,"dayOfWeek":3,"timeWindow":"15:00-17:00","daysAfterPrevious":2},{"messageNumber":3,"dayOfWeek":5,"timeWindow":"10:00-12:00","daysAfterPrevious":2}]'),
  hybridCadence: z
    .string()
    .refine((val) => {
      try {
        JSON.parse(val);
        return true;
      } catch {
        return false;
      }
    }, { message: "JSON inválido" })
    .optional()
    .default('[{"type":"email","messageNumber":1,"emailNumber":1,"dayOfWeek":1,"timeWindow":"09:00-11:00","daysAfterPrevious":0},{"type":"whatsapp","messageNumber":2,"whatsappNumber":1,"dayOfWeek":2,"timeWindow":"14:00-16:00","daysAfterPrevious":1},{"type":"email","messageNumber":3,"emailNumber":2,"dayOfWeek":4,"timeWindow":"09:00-11:00","daysAfterPrevious":2}]'),
  useHybridCadence: z.boolean().optional().default(false),

  // Configurações de Timing de Emails
  dailyEmailLimit: z
    .number()
    .int()
    .min(1, "Mínimo 1 email")
    .max(1000, "Máximo 1000 emails")
    .optional()
    .default(100),

  // WhatsApp-specific timing settings
  whatsappDailyLimit: z
    .number()
    .int()
    .min(1, "Mínimo 1 mensagem")
    .max(1000, "Máximo 1000 mensagens")
    .optional()
    .default(50),
  sendOnlyBusinessHours: z.boolean().optional().default(true),

  // Per-channel business hours (new fields)
  emailBusinessHourStart: z
    .number()
    .int()
    .min(0, "Mínimo 0h")
    .max(23, "Máximo 23h")
    .optional()
    .default(9),
  emailBusinessHourEnd: z
    .number()
    .int()
    .min(0, "Mínimo 0h")
    .max(23, "Máximo 23h")
    .optional()
    .default(18),
  whatsappBusinessHourStart: z
    .number()
    .int()
    .min(0, "Mínimo 0h")
    .max(23, "Máximo 23h")
    .optional()
    .default(9),
  whatsappBusinessHourEnd: z
    .number()
    .int()
    .min(0, "Mínimo 0h")
    .max(23, "Máximo 23h")
    .optional()
    .default(18),
  hybridBusinessHourStart: z
    .number()
    .int()
    .min(0, "Mínimo 0h")
    .max(23, "Máximo 23h")
    .optional()
    .default(9),
  hybridBusinessHourEnd: z
    .number()
    .int()
    .min(0, "Mínimo 0h")
    .max(23, "Máximo 23h")
    .optional()
    .default(18),
  hybridDailyLimit: z
    .number()
    .int()
    .min(1, "Mínimo 1 mensagem")
    .max(1000, "Máximo 1000 mensagens")
    .optional()
    .default(70),
});

// GET - Buscar configurações do usuário
export async function GET() {
  try {
    console.log("[API /settings GET] 🔍 Starting GET request");

    // Garante que usuário existe
    await ensureDemoUser();
    console.log("[API /settings GET] ✅ Demo user ensured");

    // Buscar ou criar settings do usuário
    let settings = await prisma.userSettings.findUnique({
      where: { userId: DEMO_USER_ID },
    });

    // Se não existir, cria com valores padrão
    if (!settings) {
      console.log("[API /settings GET] ⚠️ No settings found, creating with DEFAULT_SETTINGS");
      console.log("[API /settings GET] 📋 DEFAULT_SETTINGS keys:", Object.keys(DEFAULT_SETTINGS));

      settings = await prisma.userSettings.create({
        data: {
          userId: DEMO_USER_ID,
          ...DEFAULT_SETTINGS,
        },
      });

      console.log("[API /settings GET] ✅ Settings created successfully");
      console.log("[API /settings GET] 📊 Created settings sample (first 3 prompts):");
      console.log("  - templatePesquisa length:", settings.templatePesquisa?.length || 0);
      console.log("  - emailPromptOverview length:", settings.emailPromptOverview?.length || 0);
      console.log("  - whatsappMessage1 length:", settings.whatsappMessage1?.length || 0);
    } else {
      console.log("[API /settings GET] ✅ Settings found in database");
      console.log("[API /settings GET] 📊 Existing settings sample:");
      console.log("  - templatePesquisa length:", settings.templatePesquisa?.length || 0);
      console.log("  - emailPromptOverview length:", settings.emailPromptOverview?.length || 0);
      console.log("  - whatsappMessage1 length:", settings.whatsappMessage1?.length || 0);
    }

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("[API /settings GET] ❌ Erro ao buscar configurações:", {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      { success: false, error: "Erro ao buscar configurações" },
      { status: 500 }
    );
  }
}

// POST - Salvar configurações do usuário
export async function POST(request: NextRequest) {
  try {
    // Garante que usuário existe
    await ensureDemoUser();

    const body = await request.json();
    console.log("📥 [API] Received body:", JSON.stringify(body, null, 2));

    // Validação robusta com Zod (inclui sanitização)
    const validatedBody = settingsSchema.safeParse(body);
    if (!validatedBody.success) {
      console.error("❌ [API] Validation failed:", validatedBody.error.flatten());
      return NextResponse.json(
        {
          success: false,
          error: "Dados inválidos",
          details: validatedBody.error.flatten(),
        },
        { status: 400 }
      );
    }

    const dataToSave = validatedBody.data;
    console.log("✅ [API] Validation passed, saving:", JSON.stringify(dataToSave, null, 2));

    // PROTEÇÃO: Buscar settings existentes para preservar templates preenchidos
    const existingSettings = await prisma.userSettings.findUnique({
      where: { userId: DEMO_USER_ID },
    });

    // Lista de campos que NUNCA devem ser sobrescritos com vazio
    const protectedFields = [
      // Templates e Prompts (>50 chars mínimo)
      'templatePesquisa',
      'templateAnaliseEmpresa',
      'informacoesPropria',
      'emailPromptOverview',
      'emailPromptTatica',
      'emailPromptDiretrizes',
      'whatsappPromptOverview',
      'whatsappPromptTatica',
      'whatsappPromptDiretrizes',
      'hybridPromptOverview',
      'hybridPromptTatica',
      'hybridPromptDiretrizes',
      'whatsappMessage1',
      'whatsappMessage2',
      'whatsappMessage3',
      'emailTitulo1',
      'emailCorpo1',
      'emailCorpo2',
      'emailTitulo3',
      'emailCorpo3',
      'hybridEmailTitulo1',
      'hybridEmailCorpo1',
      'hybridEmailCorpo2',
      'hybridEmailTitulo3',
      'hybridEmailCorpo3',
      'hybridWhatsappMessage1',
      'hybridWhatsappMessage2',
      // Dados da Empresa (>1 char mínimo)
      'nomeEmpresa',
      'assinatura',
      'telefoneContato',
      'websiteEmpresa',
      // Arrays de Configuração (JSON com dados - >2 chars = não vazio: "[]")
      'senderEmails',
      'evolutionInstances',
    ] as const;

    // Se settings existem, preservar campos preenchidos
    if (existingSettings) {
      protectedFields.forEach((field) => {
        const existingValue = existingSettings[field];
        const newValue = dataToSave[field];

        // Definir tipo de campo
        const isCompanyField = ['nomeEmpresa', 'assinatura', 'telefoneContato', 'websiteEmpresa'].includes(field);
        const isArrayField = ['senderEmails', 'evolutionInstances'].includes(field);
        const isEmailSubject = ['emailTitulo1', 'emailTitulo3', 'hybridEmailTitulo1', 'hybridEmailTitulo3'].includes(field);

        // Helper: Verificar se valor de array está realmente preenchido
        const isArrayFilled = (value: string | undefined | null): boolean => {
          if (!value) return false;
          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) && parsed.length > 0;
          } catch {
            return false;
          }
        };

        // Helper: Verificar se campo está preenchido baseado no tipo
        const isFilled = (value: string | undefined | null): boolean => {
          if (!value) return false;

          if (isArrayField) {
            return isArrayFilled(value);
          } else if (isCompanyField) {
            return value.length > 1;
          } else if (isEmailSubject) {
            return value.length > 5;
          } else {
            return value.length > 50; // Templates/Prompts
          }
        };

        // Se o existente está preenchido e o novo NÃO está, PRESERVA o existente
        if (isFilled(existingValue) && !isFilled(newValue)) {
          console.log(`⚠️ [API] Preserving existing ${field} (${existingValue?.length || 0} chars) - new value is empty or invalid (${newValue?.length || 0} chars)`);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (dataToSave as any)[field] = existingValue;
        }
      });
    }

    // Upsert (criar ou atualizar) settings
    const settings = await prisma.userSettings.upsert({
      where: { userId: DEMO_USER_ID },
      create: { userId: DEMO_USER_ID, ...dataToSave },
      update: dataToSave,
    });

    console.log("✅ [API] Settings saved successfully");

    return NextResponse.json({
      success: true,
      message: "Configurações salvas com sucesso",
      settings,
    });
  } catch (error) {
    console.error("[API /settings POST] ❌ Erro ao salvar configurações:", {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      {
        success: false,
        error: "Erro ao salvar configurações",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
