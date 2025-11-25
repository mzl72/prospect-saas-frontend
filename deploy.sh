#!/bin/bash

# Deploy script para Prospect SaaS
# Executa build completo do Docker e deploy com limpeza de cache

set -e  # Exit on error

echo "🚀 Iniciando deploy do Prospect SaaS..."
echo ""

# 1. Limpar cache do builder
echo "🧹 Limpando cache do Docker builder..."
docker builder prune -a -f
echo "✅ Cache do builder limpo"
echo ""

# 2. Build sem cache
echo "🔨 Construindo imagens Docker (sem cache)..."
docker compose build --no-cache
echo "✅ Build concluído"
echo ""

# 3. Subir containers com force recreate
echo "🚢 Subindo containers (force recreate)..."
docker compose up -d --force-recreate
echo "✅ Containers iniciados"
echo ""

# 4. Limpar imagens antigas
echo "🗑️  Limpando imagens Docker antigas..."
docker image prune -a -f
echo "✅ Imagens antigas removidas"
echo ""

# 5. Mostrar status dos containers
echo "📊 Status dos containers:"
docker compose ps
echo ""

# 6. Mostrar logs (últimas 20 linhas)
echo "📋 Logs recentes:"
docker compose logs --tail=20
echo ""

echo "✨ Deploy concluído com sucesso!"
echo ""
echo "🌐 Acesse: http://localhost:3000"
echo "📊 Para ver logs: docker compose logs -f"
echo "🛑 Para parar: docker compose down"
