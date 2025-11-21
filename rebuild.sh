#!/bin/bash
echo "🧹 Limpando containers antigos..."
docker compose down

echo "🧼 Limpando cache de imagens"
docker builder prune -f -a

echo "🔨 Rebuild sem cache..."
docker compose build --no-cache app

echo "🚀 Subindo serviços..."
docker compose up -d

echo "Apagando imagens não utilizadas..."
docker image prune -f -a

echo "📊 Status:"
docker compose ps

echo ""
echo "📋 Logs do app (CTRL+C para sair):"
docker compose logs -f app
