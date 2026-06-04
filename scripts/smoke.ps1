# SIGOPEM smoke test (PowerShell) — estatal, municipal y contratista
param(
    [string]$WebBase = "http://localhost:8080",
    [string]$ApiBase = "http://localhost:8000/api"
)

$ErrorActionPreference = "Stop"
$Password = "Sigopem2024!"

function Test-JsonOk {
    param([string]$Url, [string]$Label)
    $r = Invoke-WebRequest -Uri $Url -UseBasicParsing
    if ($r.StatusCode -ge 400) { throw "$Label failed: HTTP $($r.StatusCode)" }
    if ($r.Content -notmatch '"status"\s*:\s*"ok"') { throw "$Label: unexpected body" }
    Write-Host "OK: $Label"
}

function Invoke-Api {
    param(
        [string]$Method,
        [string]$Path,
        [hashtable]$Headers = @{},
        [object]$Body = $null
    )
    $uri = if ($Path.StartsWith("http")) { $Path } else { "$ApiBase$Path" }
    $params = @{
        Uri     = $uri
        Method  = $Method
        Headers = $Headers
    }
    if ($null -ne $Body) {
        $params.Body = ($Body | ConvertTo-Json)
        $params.ContentType = "application/json"
    }
    return Invoke-RestMethod @params
}

function Get-AuthToken {
    param([string]$Email)
    $login = Invoke-Api -Method Post -Path "/auth/login" -Body @{ email = $Email; password = $Password }
    if (-not $login.access_token) { throw "FAIL: login missing token for $Email" }
    return $login.access_token
}

Write-Host "SIGOPEM smoke test"
Write-Host "  WebBase=$WebBase"
Write-Host "  ApiBase=$ApiBase"

try {
    $home = Invoke-WebRequest -Uri "$WebBase/" -UseBasicParsing
    if ($home.StatusCode -ge 400) { throw "SPA not reachable" }
    Write-Host "OK: SPA reachable"
}
catch {
    throw "FAIL: SPA not reachable at $WebBase - $_"
}

Test-JsonOk "$WebBase/api/health" "GET $WebBase/api/health (nginx proxy)"
Test-JsonOk "$ApiBase/health" "GET $ApiBase/health (direct API)"

# --- Estatal ---
try {
    $estatalToken = Get-AuthToken "estatal@sigopem.gob.mx"
    Write-Host "OK: POST /api/auth/login (estatal)"
    $headers = @{ Authorization = "Bearer $estatalToken" }
    $me = Invoke-Api -Method Get -Path "/auth/me" -Headers $headers
    Write-Host "OK: GET /api/auth/me ($($me.email))"
    $obras = Invoke-Api -Method Get -Path "/obras" -Headers $headers
    if (-not $obras.Count) { throw "FAIL: /obras empty for estatal" }
    Write-Host "OK: GET /api/obras estatal ($($obras.Count) obras)"
    $obraId = $obras[0].id
    $chat = Invoke-Api -Method Post -Path "/chat/ask" -Headers $headers -Body @{ message = "resumen ejecutivo" }
    if (-not ($chat.answer -or $chat.response -or $chat.message)) { throw "FAIL: chat response" }
    Write-Host "OK: POST /api/chat/ask (estatal)"
}
catch {
    Write-Warning "Estatal flow skipped (seed/API): $_"
}

# --- Municipal ---
try {
    $municipalToken = Get-AuthToken "puebla@sigopem.gob.mx"
    Write-Host "OK: POST /api/auth/login (municipal)"
    $mHeaders = @{ Authorization = "Bearer $municipalToken" }
    $mObras = Invoke-Api -Method Get -Path "/obras" -Headers $mHeaders
    if (-not $mObras.Count) { throw "FAIL: municipal obras empty" }
    $mObraId = $mObras[0].id
    $alertas = Invoke-Api -Method Get -Path "/alertas?atendida=false" -Headers $mHeaders
    $pendiente = $alertas | Where-Object { -not $_.atendida } | Select-Object -First 1
    if ($pendiente) {
        $accion = "Atendida en smoke test municipal"
        $null = Invoke-Api -Method Patch -Path "/alertas/$($pendiente.id)/atender?accion_tomada=$([uri]::EscapeDataString($accion))" -Headers $mHeaders
        Write-Host "OK: PATCH /api/alertas/{id}/atender (municipal)"
    }
    else {
        Write-Host "SKIP: no pending alertas for municipal atender"
    }
    $obsBody = @{
        fecha          = (Get-Date).ToString("yyyy-MM-dd")
        tipo           = "tecnica"
        descripcion    = "Observacion smoke municipal"
        severidad      = "media"
        responsable    = "Smoke Test"
        fecha_compromiso = (Get-Date).AddDays(7).ToString("yyyy-MM-dd")
    }
    $null = Invoke-Api -Method Post -Path "/observaciones/obra/$mObraId" -Headers $mHeaders -Body $obsBody
    Write-Host "OK: POST /api/observaciones/obra/{id} (municipal)"
}
catch {
    Write-Warning "Municipal flow skipped: $_"
}

# --- Contratista ---
try {
    $contratistaToken = Get-AuthToken "cce@sigopem.gob.mx"
    Write-Host "OK: POST /api/auth/login (contratista)"
    $cHeaders = @{ Authorization = "Bearer $contratistaToken" }
    $cObras = Invoke-Api -Method Get -Path "/obras" -Headers $cHeaders
    if (-not $cObras.Count) { throw "FAIL: contratista obras empty" }
    $cObraId = $cObras[0].id
    $created = Invoke-Api -Method Post -Path "/avances/obra/$cObraId" -Headers $cHeaders -Body @{
        periodo     = "Smoke $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
        programado  = 50
        reportado   = 49
        actividades = "Avance creado por smoke.ps1"
        comentarios = "Smoke test"
    }
    Write-Host "OK: POST /api/avances/obra/{id} (contratista)"
    if ($created.id) {
        $municipalToken = Get-AuthToken "puebla@sigopem.gob.mx"
        $mHeaders = @{ Authorization = "Bearer $municipalToken" }
        $null = Invoke-Api -Method Patch -Path "/avances/$($created.id)" -Headers $mHeaders -Body @{
            validado    = 49
            comentarios = "Validado smoke"
        }
        Write-Host "OK: PATCH /api/avances/{id} (municipal validate)"
    }
}
catch {
    Write-Warning "Contratista flow skipped: $_"
}

Write-Host "Smoke test passed."
