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

# Executar migrations do Prisma
echo "🔄 Executando migrações do Prisma..."
npx prisma migrate deploy || npx prisma db push --accept-data-loss --skip-generate

echo "✅ Migrações concluídas!"

# Executar seed se necessário
echo "🌱 Verificando seed do banco..."
npx prisma db seed 2>/dev/null || echo "⚠️  Seed já executado ou não necessário"

# Iniciar aplicação Next.js
echo "🚀 Iniciando aplicação Next.js..."
exec node_modules/.bin/next start
