# ARKON — stop native dev processes and optionally tear down Docker stack
[CmdletBinding()]
param(
    [switch]$DockerDown
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ArkonRoot = Split-Path -Parent $ScriptDir
$CursorDir = Join-Path $ArkonRoot ".cursor"
$PidFile = Join-Path $CursorDir "dev-pids.json"

function Stop-ProcessSafe {
    param([int]$ProcessId, [string]$Label)
    if ($ProcessId -le 0) { return }
    $proc = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    if (-not $proc) {
        Write-Host "SKIP: $Label (PID $ProcessId not running)"
        return
    }
    try {
        Stop-Process -Id $ProcessId -Force -ErrorAction Stop
        Write-Host "Stopped $Label (PID $ProcessId)"
    }
    catch {
        Write-Warning "Could not stop $Label (PID $ProcessId): $_"
    }
}

function Stop-PortListeners {
    param([int[]]$Ports)
    foreach ($port in $Ports) {
        $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        foreach ($conn in $conns) {
            $procId = $conn.OwningProcess
            if ($procId -gt 0) {
                $name = (Get-Process -Id $procId -ErrorAction SilentlyContinue).ProcessName
                Stop-ProcessSafe -ProcessId $procId -Label "listener on port $port ($name)"
            }
        }
    }
}

Write-Host "ARKON stop-dev"
Write-Host "  Root=$ArkonRoot"

if (Test-Path $PidFile) {
    try {
        $saved = Get-Content $PidFile -Raw | ConvertFrom-Json
        Stop-ProcessSafe -ProcessId ([int]$saved.apiPid) -Label "dev API"
        Stop-ProcessSafe -ProcessId ([int]$saved.webPid) -Label "dev Web"
        if ($saved.shellPid) {
            Stop-ProcessSafe -ProcessId ([int]$saved.shellPid) -Label "dev shell wrapper"
        }
    }
    catch {
        Write-Warning "Could not read $PidFile : $_"
    }
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
}
else {
    Write-Host "No dev PID file at $PidFile"
}

# Fallback: free common dev ports if something is still listening
Stop-PortListeners -Ports @(8000, 3000)

Set-Location $ArkonRoot
& docker compose stop api web 2>$null | Out-Null

if ($DockerDown) {
    Write-Host "Running docker compose down ..."
    & docker compose down
    if ($LASTEXITCODE -ne 0) { throw "docker compose down failed (exit $LASTEXITCODE)" }
    Write-Host "Docker stack stopped."
}
else {
    Write-Host "Docker db left running (use -DockerDown to stop all services)."
}

Write-Host "Dev environment stopped."
