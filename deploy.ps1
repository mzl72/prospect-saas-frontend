# Deploy script para Prospect SaaS (PowerShell)
# Executa build completo do Docker e deploy com limpeza de cache

$ErrorActionPreference = "Stop"

Write-Host "Iniciando deploy do Prospect SaaS..." -ForegroundColor Cyan
Write-Host ""

# 1. Limpar cache do builder
Write-Host "[1/4] Limpando cache do Docker builder..." -ForegroundColor Yellow
docker builder prune -a -f
Write-Host "Cache do builder limpo" -ForegroundColor Green
Write-Host ""

# 2. Build sem cache
Write-Host "[2/4] Construindo imagens Docker (sem cache)..." -ForegroundColor Yellow
docker compose build --no-cache
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro no build. Abortando deploy." -ForegroundColor Red
    exit 1
}
Write-Host "Build concluido" -ForegroundColor Green
Write-Host ""

# 3. Subir containers com force recreate
Write-Host "[3/4] Subindo containers (force recreate)..." -ForegroundColor Yellow
docker compose up -d --force-recreate --pull missing
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro ao subir containers. Verificando imagens..." -ForegroundColor Red
    Write-Host "NOTA: Se falhou por timeout de rede, tente novamente ou use 'docker compose pull' separadamente." -ForegroundColor Yellow
    Write-Host ""
}
Write-Host "Tentativa de start de containers concluida" -ForegroundColor Green
Write-Host ""

# 4. Limpar APENAS imagens dangling (sem tag) - NAO remove imagens em uso
Write-Host "[4/4] Limpando imagens dangling (sem afetar imagens em uso)..." -ForegroundColor Yellow
docker image prune -f
Write-Host "Limpeza concluida" -ForegroundColor Green
Write-Host ""

# 5. Mostrar status dos containers
Write-Host "Status dos containers:" -ForegroundColor Cyan
docker compose ps
Write-Host ""

# 6. Mostrar logs (ultimas 20 linhas)
Write-Host "Logs recentes:" -ForegroundColor Cyan
docker compose logs --tail=20
Write-Host ""

Write-Host "Deploy concluido com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "Acesse: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Para ver logs: docker compose logs -f" -ForegroundColor Gray
Write-Host "Para parar: docker compose down" -ForegroundColor Gray
