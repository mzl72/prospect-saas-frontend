#!/bin/sh
set -e

echo "🔄 Aguardando PostgreSQL estar pronto..."

# Extrair credenciais da DATABASE_URL (formato: postgresql://user:pass@host:port/db)
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

# Aguardar PostgreSQL ficar disponível
until pg_isready -h postgres -U "$DB_USER" -d "$DB_NAME"; do
  echo "⏳ PostgreSQL indisponível - aguardando..."
  sleep 2
done

echo "✅ PostgreSQL está pronto!"

# Criar schema no banco
echo "🔄 Criando schema do banco..."
npx prisma db push --skip-generate --accept-data-loss

echo "✅ Schema criado!"

# Executar seed
echo "🌱 Executando seed do banco..."
npx tsx prisma/seed.ts

# Iniciar aplicação Next.js
echo "🚀 Iniciando aplicação Next.js..."
exec node_modules/.bin/next start
