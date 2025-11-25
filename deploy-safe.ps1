# Deploy script SEGURO para Prospect SaaS (PowerShell)
# Versão com retry e validações

$ErrorActionPreference = "Continue"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   Deploy SEGURO do Prospect SaaS" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Função para retry com backoff
function Invoke-WithRetry {
    param(
        [ScriptBlock]$ScriptBlock,
        [int]$MaxAttempts = 3,
        [int]$DelaySeconds = 5
    )

    $attempt = 1
    while ($attempt -le $MaxAttempts) {
        try {
            Write-Host "Tentativa $attempt de $MaxAttempts..." -ForegroundColor Gray
            & $ScriptBlock
            if ($LASTEXITCODE -eq 0) {
                return $true
            }
        } catch {
            Write-Host "Erro: $_" -ForegroundColor Red
        }

        if ($attempt -lt $MaxAttempts) {
            Write-Host "Aguardando ${DelaySeconds}s antes de tentar novamente..." -ForegroundColor Yellow
            Start-Sleep -Seconds $DelaySeconds
            $DelaySeconds = $DelaySeconds * 2  # Exponential backoff
        }
        $attempt++
    }
    return $false
}

# 1. Verificar se Docker está rodando
Write-Host "[1/6] Verificando Docker..." -ForegroundColor Yellow
docker info > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Docker não está rodando ou não está acessível." -ForegroundColor Red
    Write-Host "Inicie o Docker Desktop e tente novamente." -ForegroundColor Yellow
    exit 1
}
Write-Host "Docker OK" -ForegroundColor Green
Write-Host ""

# 2. Build da aplicação (sem cache)
Write-Host "[2/6] Build da aplicação Next.js..." -ForegroundColor Yellow
docker compose build --no-cache
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Build falhou." -ForegroundColor Red
    exit 1
}
Write-Host "Build concluído com sucesso" -ForegroundColor Green
Write-Host ""

# 3. Pull de imagens externas (com retry)
Write-Host "[3/6] Download de imagens externas (com retry)..." -ForegroundColor Yellow

$images = @(
    "postgres:15-alpine",
    "redis:7-alpine",
    "adminer:latest",
    "n8nio/n8n:latest",
    "evoapicloud/evolution-api:v2.3.1"
)

foreach ($image in $images) {
    Write-Host "  Baixando $image..." -ForegroundColor Cyan
    $success = Invoke-WithRetry -ScriptBlock {
        docker pull $image
    } -MaxAttempts 3 -DelaySeconds 10

    if (-not $success) {
        Write-Host "  AVISO: Falha ao baixar $image após 3 tentativas" -ForegroundColor Yellow
        Write-Host "  Continuando com outras imagens..." -ForegroundColor Yellow
    } else {
        Write-Host "  $image OK" -ForegroundColor Green
    }
}
Write-Host ""

# 4. Verificar imagens disponíveis
Write-Host "[4/6] Verificando imagens disponíveis..." -ForegroundColor Yellow
docker images
Write-Host ""

# 5. Subir containers
Write-Host "[5/6] Iniciando containers..." -ForegroundColor Yellow
docker compose up -d --remove-orphans
if ($LASTEXITCODE -ne 0) {
    Write-Host "AVISO: Alguns containers podem não ter iniciado." -ForegroundColor Yellow
} else {
    Write-Host "Containers iniciados" -ForegroundColor Green
}
Write-Host ""

# 6. Status final
Write-Host "[6/6] Status final dos containers:" -ForegroundColor Cyan
docker compose ps
Write-Host ""

# Verificar quais containers estão rodando
$runningContainers = docker compose ps --services --filter "status=running"
if ($runningContainers) {
    Write-Host "Containers RODANDO:" -ForegroundColor Green
    $runningContainers | ForEach-Object { Write-Host "  - $_" -ForegroundColor Green }
} else {
    Write-Host "NENHUM container está rodando!" -ForegroundColor Red
}
Write-Host ""

$stoppedContainers = docker compose ps --services --filter "status=exited"
if ($stoppedContainers) {
    Write-Host "Containers PARADOS (verifique logs):" -ForegroundColor Yellow
    $stoppedContainers | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
    Write-Host ""
    Write-Host "Ver logs de um container: docker compose logs [nome]" -ForegroundColor Gray
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Deploy concluído!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Comandos úteis:" -ForegroundColor Cyan
Write-Host "  Acessar app:     http://localhost:3000" -ForegroundColor Gray
Write-Host "  Ver logs:        docker compose logs -f" -ForegroundColor Gray
Write-Host "  Ver logs (app):  docker compose logs -f app" -ForegroundColor Gray
Write-Host "  Parar tudo:      docker compose down" -ForegroundColor Gray
Write-Host "  Reiniciar:       docker compose restart" -ForegroundColor Gray
Write-Host ""
