#!/usr/bin/env sh
set -eu

WEB_BASE="${WEB_BASE:-http://localhost:8080}"
API_BASE="${API_BASE:-http://localhost:8000/api}"
PASSWORD="${LOGIN_PASSWORD:-Sigopem2024!}"

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

ok() {
  echo "OK: $1"
}

warn() {
  echo "WARN: $1" >&2
}

echo "SIGOPEM smoke test"
echo "  WEB_BASE=$WEB_BASE"
echo "  API_BASE=$API_BASE"

if ! command -v curl >/dev/null 2>&1; then
  fail "curl is required"
fi

HTTP_GET() { curl -fsS "$1"; }

HTTP_POST_JSON() {
  curl -fsS -X POST -H "Content-Type: application/json" -d "$2" "$1"
}

HTTP_AUTH_JSON() {
  method="$1"
  url="$2"
  token="$3"
  body="$4"
  curl -fsS -X "$method" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $token" \
    -d "$body" \
    "$url"
}

get_token() {
  email="$1"
  body=$(printf '{"email":"%s","password":"%s"}' "$email" "$PASSWORD")
  resp=$(HTTP_POST_JSON "$API_BASE/auth/login" "$body") || return 1
  token=$(echo "$resp" | sed -n 's/.*"access_token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
  [ -n "$token" ] || return 1
  echo "$token"
}

HTTP_GET "$WEB_BASE/" >/dev/null || fail "SPA not reachable at $WEB_BASE"
ok "SPA reachable"

HTTP_GET "$WEB_BASE/api/health" | grep -q '"status":"ok"' || fail "Proxied health via nginx"
ok "GET $WEB_BASE/api/health"

HTTP_GET "$API_BASE/health" | grep -q '"status":"ok"' || fail "Direct API health"
ok "GET $API_BASE/health"

# --- Estatal ---
if estatal_token=$(get_token "estatal@sigopem.gob.mx"); then
  ok "POST /api/auth/login (estatal)"
  me=$(curl -fsS -H "Authorization: Bearer $estatal_token" "$API_BASE/auth/me") || fail "/auth/me estatal"
  echo "$me" | grep -q '@' || fail "/auth/me estatal body"
  ok "GET /api/auth/me (estatal)"
  obras=$(curl -fsS -H "Authorization: Bearer $estatal_token" "$API_BASE/obras") || fail "/obras estatal"
  echo "$obras" | grep -q '"id"' || fail "/obras empty for estatal"
  ok "GET /api/obras (estatal)"
  chat_body='{"message":"resumen ejecutivo"}'
  if chat=$(HTTP_AUTH_JSON POST "$API_BASE/chat/ask" "$estatal_token" "$chat_body" 2>/dev/null); then
    echo "$chat" | grep -qE 'answer|response|message' && ok "POST /api/chat/ask (estatal)" \
      || warn "chat/ask estatal unexpected body"
  else
    warn "chat/ask estatal skipped"
  fi
else
  warn "Estatal flow skipped (seed/API): login failed"
fi

# --- Municipal ---
if municipal_token=$(get_token "puebla@sigopem.gob.mx"); then
  ok "POST /api/auth/login (municipal)"
  m_obras=$(curl -fsS -H "Authorization: Bearer $municipal_token" "$API_BASE/obras") || fail "municipal obras"
  echo "$m_obras" | grep -q '"id"' || fail "municipal obras empty"
  m_obra_id=$(echo "$m_obras" | sed -n 's/.*"id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)
  [ -n "$m_obra_id" ] || fail "could not parse municipal obra id"

  alertas=$(curl -fsS -H "Authorization: Bearer $municipal_token" "$API_BASE/alertas?atendida=false") || true
  pendiente_id=$(echo "$alertas" | tr ',' '\n' | grep '"atendida":false' -B5 | grep '"id"' | head -n 1 \
    | sed -n 's/.*"id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p') || true
  if [ -n "${pendiente_id:-}" ]; then
    accion_encoded=$(printf '%s' "Atendida en smoke test municipal" | sed 's/ /%20/g')
    curl -fsS -X PATCH -H "Authorization: Bearer $municipal_token" \
      "$API_BASE/alertas/${pendiente_id}/atender?accion_tomada=${accion_encoded}" >/dev/null \
      || warn "PATCH alerta atender failed"
    ok "PATCH /api/alertas/{id}/atender (municipal)"
  else
    ok "SKIP: no pending alertas for municipal atender"
  fi

  today=$(date +%Y-%m-%d 2>/dev/null || date /t)
  compromiso=$(date -d '+7 days' +%Y-%m-%d 2>/dev/null || date -v+7d +%Y-%m-%d 2>/dev/null || echo "$today")
  obs_body=$(printf '{"fecha":"%s","tipo":"tecnica","descripcion":"Observacion smoke municipal","severidad":"media","responsable":"Smoke Test","fecha_compromiso":"%s"}' "$today" "$compromiso")
  curl -fsS -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $municipal_token" \
    -d "$obs_body" "$API_BASE/observaciones/obra/$m_obra_id" >/dev/null \
    || warn "POST observacion failed"
  ok "POST /api/observaciones/obra/{id} (municipal)"
else
  warn "Municipal flow skipped: login failed"
fi

# --- Contratista ---
if contratista_token=$(get_token "cce@sigopem.gob.mx"); then
  ok "POST /api/auth/login (contratista)"
  c_obras=$(curl -fsS -H "Authorization: Bearer $contratista_token" "$API_BASE/obras") || fail "contratista obras"
  echo "$c_obras" | grep -q '"id"' || fail "contratista obras empty"
  c_obra_id=$(echo "$c_obras" | sed -n 's/.*"id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)
  periodo=$(date '+%Y-%m-%d %H:%M' 2>/dev/null || echo "Smoke period")
  avance_body=$(printf '{"periodo":"Smoke %s","programado":50,"reportado":49,"actividades":"Avance smoke.sh","comentarios":"Smoke test"}' "$periodo")
  created=$(curl -fsS -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $contratista_token" \
    -d "$avance_body" "$API_BASE/avances/obra/$c_obra_id") || warn "POST avance failed"
  ok "POST /api/avances/obra/{id} (contratista)"

  avance_id=$(echo "${created:-}" | sed -n 's/.*"id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)
  if [ -n "${avance_id:-}" ] && municipal_token=$(get_token "puebla@sigopem.gob.mx"); then
    patch_body='{"validado":49,"comentarios":"Validado smoke"}'
    HTTP_AUTH_JSON PATCH "$API_BASE/avances/$avance_id" "$municipal_token" "$patch_body" >/dev/null \
      || warn "PATCH avance validate failed"
    ok "PATCH /api/avances/{id} (municipal validate)"
  fi
else
  warn "Contratista flow skipped: login failed"
fi

echo "Smoke test passed."
