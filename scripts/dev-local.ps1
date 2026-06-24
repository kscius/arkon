# ARKON — native dev (API/Web local, DB in Docker)
[CmdletBinding()]
param(
    [ValidateSet("Docker", "Native")]
    [string]$Mode = "Native",

    [ValidateSet("conagua", "arkon")]
    [string]$Tenant = "conagua"
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ArkonRoot = Split-Path -Parent $ScriptDir
$CursorDir = Join-Path $ArkonRoot ".cursor"
$ApiLog = Join-Path $CursorDir "dev-api.log"
$WebLog = Join-Path $CursorDir "dev-web.log"
$PidFile = Join-Path $CursorDir "dev-pids.json"
$envExample = Join-Path $ArkonRoot ".env.example"
$envFile = Join-Path $ArkonRoot ".env"

Set-Location $ArkonRoot

function Ensure-EnvFile {
    if (-not (Test-Path $envFile)) {
        if (-not (Test-Path $envExample)) {
            throw "Missing .env.example at $envExample"
        }
        Copy-Item -Path $envExample -Destination $envFile
        Write-Host "Created .env from .env.example"
    }
}

function Wait-HttpReady {
    param(
        [string]$Url,
        [string]$Label,
        [switch]$RequireHealthOk,
        [int]$TimeoutSec = 120,
        [int]$IntervalSec = 2
    )
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    Write-Host "Waiting for $Label at $Url ..."
    while ((Get-Date) -lt $deadline) {
        try {
            $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
            if ($r.StatusCode -ge 400) {
                throw "HTTP $($r.StatusCode)"
            }
            if ($RequireHealthOk -and $r.Content -notmatch '"status"\s*:\s*"ok"') {
                throw "health body not ok"
            }
            Write-Host "OK: $Label"
            return
        }
        catch {
            # retry
        }
        Start-Sleep -Seconds $IntervalSec
    }
    throw "Timeout waiting for $Label at $Url"
}

function Get-PnpmPath {
    $cmd = Get-Command pnpm -ErrorAction SilentlyContinue
    if (-not $cmd) { throw "pnpm not found in PATH" }
    return $cmd.Source
}

function Start-BackgroundDev {
    param(
        [string]$Label,
        [string]$ScriptBlock,
        [string]$LogPath
    )
    $logDir = Split-Path -Parent $LogPath
    if (-not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }
    if (Test-Path $LogPath) {
        Remove-Item $LogPath -Force
    }

    $escapedRoot = $ArkonRoot.Replace("'", "''")
    $escapedLog = $LogPath.Replace("'", "''")
    $command = @(
        "`$env:TENANT_ID = '$Tenant'"
        "`$env:VITE_TENANT = '$Tenant'"
        '$env:DATABASE_URL = ''postgresql://arkon:arkon_password@localhost:5433/arkon_db'''
        '$env:VITE_API_URL = ''http://localhost:8000/api'''
        '$env:CORS_ORIGINS = ''http://localhost:3000,http://localhost:8080,http://localhost:5173'''
        "Set-Location '$escapedRoot'"
        "$ScriptBlock *>&1 | Tee-Object -FilePath '$escapedLog'"
    ) -join [Environment]::NewLine

    $proc = Start-Process -FilePath "powershell.exe" `
        -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $command) `
        -WorkingDirectory $ArkonRoot `
        -PassThru `
        -WindowStyle Hidden

    return $proc.Id
}

function Save-DevPids {
    param(
        [int]$ApiPid,
        [int]$WebPid
    )
    if (-not (Test-Path $CursorDir)) {
        New-Item -ItemType Directory -Path $CursorDir -Force | Out-Null
    }
    @{
        apiPid    = $ApiPid
        webPid    = $WebPid
        startedAt = (Get-Date).ToString("o")
        tenant    = $Tenant
        mode      = $Mode
    } | ConvertTo-Json | Set-Content -Path $PidFile -Encoding UTF8
}

function Start-DockerStack {
    Ensure-EnvFile

    $env:TENANT_ID = $Tenant
    $env:VITE_TENANT = $Tenant

    & docker compose config
    if ($LASTEXITCODE -ne 0) { throw "docker compose config failed (exit $LASTEXITCODE)" }

    & docker compose up --build -d
    if ($LASTEXITCODE -ne 0) { throw "docker compose up failed (exit $LASTEXITCODE)" }

    Wait-HttpReady -Url "http://localhost:8000/api/health" -Label "API health" -RequireHealthOk

    Write-Host "Running prisma db seed (TENANT_ID=$Tenant) ..."
    & docker compose exec -e "TENANT_ID=$Tenant" api npx prisma db seed
    if ($LASTEXITCODE -ne 0) { throw "prisma db seed failed (exit $LASTEXITCODE)" }

    Write-Host ""
    Write-Host "Docker stack ready:"
    Write-Host "  Web:    http://localhost:8080"
    Write-Host "  API:    http://localhost:8000/api"
    Write-Host "  Swagger http://localhost:8000/api/docs"
    Write-Host ""
    Write-Host "Smoke:  .\scripts\smoke-conagua.ps1 -WebBase http://localhost:8080"
    Write-Host "E2E:    `$env:PLAYWRIGHT_BASE_URL='http://localhost:8080'; `$env:TENANT_ID='$Tenant'; pnpm exec playwright test"
}

function Start-NativeDev {
    Ensure-EnvFile

    Write-Host "Starting PostgreSQL (docker compose up db -d) ..."
    & docker compose up db -d
    if ($LASTEXITCODE -ne 0) { throw "docker compose up db failed (exit $LASTEXITCODE)" }

    Write-Host "Stopping api/web containers to free ports 8000/3000 ..."
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & docker compose stop api web *> $null
    $ErrorActionPreference = $prevEap

    $env:TENANT_ID = $Tenant
    $env:VITE_TENANT = $Tenant
    $env:DATABASE_URL = "postgresql://arkon:arkon_password@localhost:5433/arkon_db"
    $env:VITE_API_URL = "http://localhost:8000/api"
    $env:CORS_ORIGINS = "http://localhost:3000,http://localhost:8080,http://localhost:5173"

    $nodeModules = Join-Path $ArkonRoot "node_modules"
    if (-not (Test-Path $nodeModules)) {
        Write-Host "node_modules missing - running pnpm install ..."
        & (Get-PnpmPath) install
        if ($LASTEXITCODE -ne 0) { throw "pnpm install failed (exit $LASTEXITCODE)" }
    }

    $apiDir = Join-Path $ArkonRoot "apps\api"
    Push-Location $apiDir
    try {
        Write-Host "Prisma generate ..."
        & (Get-PnpmPath) exec prisma generate
        if ($LASTEXITCODE -ne 0) { throw "prisma generate failed (exit $LASTEXITCODE)" }

        Write-Host "Prisma migrate deploy ..."
        & (Get-PnpmPath) exec prisma migrate deploy
        if ($LASTEXITCODE -ne 0) { throw "prisma migrate deploy failed (exit $LASTEXITCODE)" }

        Write-Host "Prisma db seed (TENANT_ID=$Tenant) ..."
        $env:TENANT_ID = $Tenant
        & (Get-PnpmPath) exec prisma db seed
        if ($LASTEXITCODE -ne 0) { throw "prisma db seed failed (exit $LASTEXITCODE)" }
    }
    finally {
        Pop-Location
    }

    $apiPid = Start-BackgroundDev -Label "API" -ScriptBlock "pnpm dev:api" -LogPath $ApiLog
    Start-Sleep -Seconds 2
    $webPid = Start-BackgroundDev -Label "Web" -ScriptBlock "pnpm dev:web" -LogPath $WebLog
    Save-DevPids -ApiPid $apiPid -WebPid $webPid

    Wait-HttpReady -Url "http://localhost:8000/api/health" -Label "API health" -RequireHealthOk -TimeoutSec 180
    Wait-HttpReady -Url "http://localhost:3000" -Label "Vite dev server" -TimeoutSec 180

    Write-Host ""
    Write-Host "Native dev ready (tenant: $Tenant)"
    Write-Host "  Web:     http://localhost:3000"
    Write-Host "  API:     http://localhost:8000/api"
    Write-Host "  Swagger: http://localhost:8000/api/docs"
    Write-Host "  Logs:    $ApiLog"
    Write-Host "           $WebLog"
    Write-Host ""
    Write-Host "Stop:    .\scripts\stop-dev.ps1"
    Write-Host "Smoke:   .\scripts\smoke-conagua.ps1"
    Write-Host "E2E:     `$env:PLAYWRIGHT_BASE_URL='http://localhost:3000'; `$env:TENANT_ID='$Tenant'; pnpm exec playwright test"
}

Write-Host "ARKON dev-local"
Write-Host "  Mode=$Mode Tenant=$Tenant"
Write-Host "  Root=$ArkonRoot"

if ($Mode -eq "Docker") {
    Start-DockerStack
}
else {
    Start-NativeDev
}
