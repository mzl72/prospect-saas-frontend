# 🚀 Guia de Deploy para Produção

## ✅ Checklist Pré-Deploy

### 1. Arquivos Criados/Modificados
- ✅ `Dockerfile` - Build otimizado multi-stage
- ✅ `docker-compose.yml` - Orquestração com PostgreSQL
- ✅ `.dockerignore` - Arquivos excluídos do build
- ✅ `.env.example` - Template de variáveis de ambiente
- ✅ `next.config.ts` - Configurado para produção (standalone)
- ✅ `react-query.tsx` - Removido DevTools

### 2. Variáveis de Ambiente (VPS)
Crie um arquivo `.env` na VPS com:

```bash
# Database
DATABASE_URL="postgresql://user:password@db:5432/app_prospect_db"

# N8N Webhook
N8N_WEBHOOK_URL="https://n8n.fflow.site/webhook/interface"

# PostgreSQL (para docker-compose)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=SuaSenhaSegura123!
POSTGRES_DB=app_prospect_db
```

### 3. Comandos para Deploy

#### Na sua máquina local:
```bash
# 1. Fazer build de produção para testar
npm run build

# 2. Testar localmente
npm start

# 3. Enviar para repositório Git
git add .
git commit -m "Production ready"
git push
```

#### Na VPS do cliente:
```bash
# 1. Clone o repositório (ou pull)
git clone <seu-repo>
cd prospect-saas-frontend

# 2. Criar .env com as variáveis acima

# 3. Build e start com Docker
docker-compose up -d --build

# 4. Verificar logs
docker-compose logs -f app

# 5. Verificar status
docker-compose ps
```

### 4. Verificações Pós-Deploy

- [ ] Aplicação rodando em `http://localhost:3000`
- [ ] Banco de dados conectado
- [ ] Dark/Light mode funcionando
- [ ] Header com créditos aparecendo
- [ ] Páginas /gerar e /campanhas acessíveis
- [ ] N8N webhook respondendo

### 5. Comandos Úteis

```bash
# Parar serviços
docker-compose down

# Parar e remover volumes (limpa BD)
docker-compose down -v

# Ver logs específicos
docker-compose logs app
docker-compose logs db

# Rebuild após mudanças
docker-compose up -d --build

# Acessar container
docker exec -it prospect-saas-frontend sh
```

## 🔒 Segurança

### Aplicadas:
- ✅ Build multi-stage otimizado
- ✅ Usuário não-root no container
- ✅ `poweredByHeader: false` (remove X-Powered-By)
- ✅ `.env` no .gitignore
- ✅ DevTools removido

### Recomendações Adicionais:
- [ ] Configurar firewall na VPS (apenas portas 80, 443, 22)
- [ ] Usar Nginx como reverse proxy
- [ ] Configurar SSL/HTTPS (Let's Encrypt)
- [ ] Configurar backup automático do PostgreSQL
- [ ] Monitoramento de logs (opcional: Sentry, LogRocket)

## 📦 Estrutura Final

```
prospect-saas-frontend/
├── Dockerfile               ✅ Criado
├── docker-compose.yml       ✅ Criado
├── .dockerignore           ✅ Criado
├── .env.example            ✅ Criado
├── .env                    ⚠️  Criar na VPS (não commitar!)
├── next.config.ts          ✅ Configurado
├── src/
│   └── lib/
│       └── react-query.tsx ✅ DevTools removido
└── package.json
```

## 🎯 URLs de Produção

Após deploy, a aplicação estará em:
- Frontend: `http://seu-ip-vps:3000`
- PostgreSQL: `seu-ip-vps:5432` (interno ao Docker)

## 🐛 Troubleshooting

### Erro de conexão com banco:
```bash
# Verificar se o PostgreSQL está rodando
docker-compose ps

# Ver logs do banco
docker-compose logs db
```

### Erro no build:
```bash
# Limpar cache do Docker
docker system prune -a

# Rebuild sem cache
docker-compose build --no-cache
```

### Porta 3000 já em uso:
```bash
# Mudar porta no docker-compose.yml
ports:
  - "8080:3000"  # Agora acessa em :8080
```
