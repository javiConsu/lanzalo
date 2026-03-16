#!/usr/bin/env bash
# Smoke test post-deploy para lanzalo.pro
# Uso: ./scripts/smoke-test.sh [BASE_URL]
# Desde GitHub Actions: BASE_URL=https://lanzalo.pro ./scripts/smoke-test.sh

set -euo pipefail

BASE_URL="${BASE_URL:-https://lanzalo.pro}"
BACKEND_URL="${BACKEND_URL:-$BASE_URL}"
PASS=0
FAIL=0
RESULTS=()

# ─── Colores ────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass() { echo -e "${GREEN}✅ PASS${NC} — $1"; PASS=$((PASS+1)); RESULTS+=("PASS: $1"); }
fail() { echo -e "${RED}❌ FAIL${NC} — $1"; echo "       → $2"; FAIL=$((FAIL+1)); RESULTS+=("FAIL: $1 ($2)"); }
info() { echo -e "${YELLOW}ℹ️  ${NC}$1"; }

echo ""
echo "🔍 Smoke Test — lanzalo.pro"
echo "   BASE_URL: $BASE_URL"
echo "   $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "──────────────────────────────────────────"

# ── TEST 1: Health check ────────────────────────────────────
TEST="GET /health → 200"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$BACKEND_URL/health" || echo "000")
if [ "$STATUS" = "200" ]; then
  pass "$TEST"
else
  fail "$TEST" "HTTP $STATUS"
fi

# ── TEST 2: Ideas API ───────────────────────────────────────
TEST="GET /api/ideas → 200 con al menos 1 idea"
RESPONSE=$(curl -s --max-time 15 "$BACKEND_URL/api/ideas" || echo "{}")
STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$BACKEND_URL/api/ideas" || echo "000")

if [ "$STATUS" != "200" ]; then
  fail "$TEST" "HTTP $STATUS"
else
  # Comprobar que hay al menos 1 idea
  IDEA_COUNT=$(echo "$RESPONSE" | grep -o '"id"' | wc -l | tr -d ' ')
  if [ "$IDEA_COUNT" -ge 1 ]; then
    pass "$TEST (${IDEA_COUNT} ideas)"
  else
    fail "$TEST" "0 ideas en respuesta — ¿seed ejecutado? Response: ${RESPONSE:0:200}"
  fi
fi

# ── TEST 3: Frontend principal ──────────────────────────────
TEST="GET / (frontend) → 200"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 20 -L "$BASE_URL/" || echo "000")
if [ "$STATUS" = "200" ]; then
  pass "$TEST"
else
  fail "$TEST" "HTTP $STATUS"
fi

# ── TEST 4: No hay redirect a dev.clerk ────────────────────
TEST="Dominio principal no redirige a *.accounts.dev"
REDIRECT_URL=$(curl -s -o /dev/null -w "%{redirect_url}" --max-time 15 "$BASE_URL/" || echo "")
if echo "$REDIRECT_URL" | grep -q "accounts.dev\|clerk.shared.lcl.dev"; then
  fail "$TEST" "Redirige a: $REDIRECT_URL — Clerk en modo Development"
else
  pass "$TEST"
fi

# ── TEST 5: Auth endpoint responde ─────────────────────────
TEST="POST /api/auth/sync → no 500"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{}' \
  "$BACKEND_URL/api/auth/sync" || echo "000")
# Sin token válido esperamos 401, no 500 — si es 500 hay problema real
if [ "$STATUS" = "500" ] || [ "$STATUS" = "000" ]; then
  fail "$TEST" "HTTP $STATUS (esperado 401/400, no 500)"
else
  pass "$TEST (HTTP $STATUS — sin token, esperado)"
fi

# ── TEST 6: Landing page carga contenido HTML ───────────────
TEST="Frontend devuelve HTML con contenido"
HTML=$(curl -s --max-time 20 -L "$BASE_URL/" || echo "")
if echo "$HTML" | grep -qi "<html\|<!doctype"; then
  pass "$TEST"
else
  fail "$TEST" "Respuesta no parece HTML válido"
fi

# ── RESUMEN ─────────────────────────────────────────────────
echo ""
echo "──────────────────────────────────────────"
echo "📊 Resultados: ${PASS} PASS / ${FAIL} FAIL"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}🚨 SMOKE TEST FALLIDO${NC} — $FAIL test(s) con error"
  echo ""
  for result in "${RESULTS[@]}"; do
    if [[ "$result" == FAIL:* ]]; then
      echo "   $result"
    fi
  done
  echo ""
  exit 1
else
  echo -e "${GREEN}🎉 SMOKE TEST PASADO${NC} — Todo OK"
  exit 0
fi
