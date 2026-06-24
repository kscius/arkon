# ARKON — Docker Compose stack (PowerShell)
[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ArkonRoot = Split-Path -Parent $ScriptDir
Set-Location $ArkonRoot

$envExample = Join-Path $ArkonRoot ".env.example"
$envFile = Join-Path $ArkonRoot ".env"

if (-not (Test-Path $envFile)) {
    if (-not (Test-Path $envExample)) {
        throw "Missing .env.example at $envExample"
    }
    Copy-Item -Path $envExample -Destination $envFile
    Write-Host "Created .env from .env.example"
}

function Get-EnvValue {
    param(
        [string]$Name,
        [string]$Default
    )
    if (-not (Test-Path $envFile)) { return $Default }
    foreach ($line in Get-Content $envFile) {
        if ($line -match "^\s*$([regex]::Escape($Name))\s*=\s*(.+)\s*$") {
            return $Matches[1].Trim().Trim('"').Trim("'")
        }
    }
    return $Default
}

function Wait-ApiHealth {
    param(
        [string]$Url,
        [int]$TimeoutSec = 180,
        [int]$IntervalSec = 3
    )
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    Write-Host "Waiting for API health at $Url ..."
    while ((Get-Date) -lt $deadline) {
        try {
            $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
            if ($r.StatusCode -lt 400 -and $r.Content -match '"status"\s*:\s*"ok"') {
                Write-Host "OK: API healthy"
                return
            }
        }
        catch {
            # retry
        }
        Start-Sleep -Seconds $IntervalSec
    }
    throw "Timeout waiting for API health at $Url"
}

Write-Host "ARKON docker-up"
Write-Host "  Root=$ArkonRoot"

& docker compose config
if ($LASTEXITCODE -ne 0) { throw "docker compose config failed (exit $LASTEXITCODE)" }

& docker compose up --build -d
if ($LASTEXITCODE -ne 0) { throw "docker compose up failed (exit $LASTEXITCODE)" }

$apiPort = Get-EnvValue -Name "API_PORT" -Default "8000"
$webPort = Get-EnvValue -Name "WEB_PORT" -Default "8080"
$dbPort = Get-EnvValue -Name "POSTGRES_PORT" -Default "5433"

Wait-ApiHealth -Url "http://localhost:${apiPort}/api/health"

Write-Host "Running prisma db seed (TENANT_ID=conagua) ..."
& docker compose exec -e TENANT_ID=conagua api npx prisma db seed
if ($LASTEXITCODE -ne 0) { throw "prisma db seed failed (exit $LASTEXITCODE)" }

Write-Host ""
Write-Host "Stack ready:"
Write-Host ""
Write-Host "| Servicio                    | URL |"
Write-Host "|-----------------------------|-----|"
Write-Host "| Web (SPA + proxy API)       | http://localhost:${webPort} |"
Write-Host "| API directa                 | http://localhost:${apiPort}/api |"
Write-Host "| Swagger                     | http://localhost:${apiPort}/api/docs |"
Write-Host "| PostgreSQL (host)           | localhost:${dbPort} |"
Write-Host ""
