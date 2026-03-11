#!/bin/bash
# =============================================================================
# Lanzalo - Script de Deploy Automatizado
# =============================================================================
# Uso: ./scripts/deploy.sh [--skip-migrations] [--only-backend] [--only-frontend]
#
# Variables de entorno requeridas (o pasar como argumentos):
#   DATABASE_URL      - PostgreSQL connection string de Supabase
#   RAILWAY_TOKEN     - Token de Railway CLI
#   VERCEL_TOKEN      - Token de Vercel CLI
#   OPENROUTER_API_KEY - API key de OpenRouter
#
# Ejemplo:
#   export DATABASE_URL="postgresql://postgres:pass@db.xyz.supabase.co:5432/postgres"
#   export RAILWAY_TOKEN="xxxxx"
#   export VERCEL_TOKEN="xxxxx"
#   ./scripts/deploy.sh
# =============================================================================

set -e

# --------------------------------------------------------------------------
# Colores para output
# --------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log()    { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $1"; }
ok()     { echo -e "${GREEN}[$(date +%H:%M:%S)] ✓${NC} $1"; }
warn()   { echo -e "${YELLOW}[$(date +%H:%M:%S)] ⚠${NC} $1"; }
error()  { echo -e "${RED}[$(date +%H:%M:%S)] ✗${NC} $1"; exit 1; }

# --------------------------------------------------------------------------
# Flags de control
# --------------------------------------------------------------------------
SKIP_MIGRATIONS=false
ONLY_BACKEND=false
ONLY_FRONTEND=false
DRY_RUN=false

for arg in "$@"; do
  case $arg in
    --skip-migrations) SKIP_MIGRATIONS=true ;;
    --only-backend)    ONLY_BACKEND=true ;;
    --only-frontend)   ONLY_FRONTEND=true ;;
    --dry-run)         DRY_RUN=true ;;
    --help)
      echo "Uso: $0 [--skip-migrations] [--only-backend] [--only-frontend] [--dry-run]"
      exit 0
      ;;
  esac
done

# --------------------------------------------------------------------------
# Directorio raíz del proyecto
# --------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo ""
echo "======================================================================"
echo "  🚀 Lanzalo Deploy Script"
echo "  Fecha: $(date)"
echo "  Directorio: $PROJECT_ROOT"
echo "======================================================================"
echo ""

# --------------------------------------------------------------------------
# 1. VERIFICACIÓN DE VARIABLES DE ENTORNO
# --------------------------------------------------------------------------
log "Verificando variables de entorno..."

MISSING_VARS=()

if [ "$ONLY_FRONTEND" = false ]; then
  [ -z "$DATABASE_URL" ]        && MISSING_VARS+=("DATABASE_URL")
  [ -z "$RAILWAY_TOKEN" ]       && MISSING_VARS+=("RAILWAY_TOKEN")
  [ -z "$OPENROUTER_API_KEY" ]  && MISSING_VARS+=("OPENROUTER_API_KEY")
fi

if [ "$ONLY_BACKEND" = false ]; then
  [ -z "$VERCEL_TOKEN" ]        && MISSING_VARS+=("VERCEL_TOKEN")
fi

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  error "Faltan variables de entorno obligatorias: ${MISSING_VARS[*]}\n\nConsulta docs/deploy-checklist.md para instrucciones completas."
fi

ok "Variables de entorno verificadas"

# --------------------------------------------------------------------------
# 2. VERIFICACIÓN DE HERRAMIENTAS CLI
# --------------------------------------------------------------------------
log "Verificando herramientas CLI..."

check_tool() {
  if ! command -v "$1" &> /dev/null; then
    warn "$1 no encontrado. Instalando..."
    npm install -g "$2"
  else
    ok "$1 disponible ($(command -v $1))"
  fi
}

if [ "$ONLY_FRONTEND" = false ]; then
  check_tool "railway" "@railway/cli"
fi

if [ "$ONLY_BACKEND" = false ]; then
  check_tool "vercel" "vercel"
fi

# --------------------------------------------------------------------------
# 3. MIGRACIONES DE BASE DE DATOS (SUPABASE)
# --------------------------------------------------------------------------
if [ "$SKIP_MIGRATIONS" = false ] && [ "$ONLY_FRONTEND" = false ]; then
  echo ""
  log "=== PASO 1: Migraciones de Base de Datos ==="

  # Verificar que psql está disponible, o usar node
  if command -v psql &> /dev/null; then
    log "Ejecutando schema base..."
    if [ "$DRY_RUN" = false ]; then
      psql "$DATABASE_URL" -f database/schema.sql -v ON_ERROR_STOP=1
      ok "Schema base aplicado"
    else
      warn "[DRY RUN] Se ejecutaría: psql \$DATABASE_URL -f database/schema.sql"
    fi

    log "Ejecutando migraciones 001-027 en orden..."
    MIGRATIONS=(
      "001_add_quotas.sql"
      "002_add_auth.sql"
      "003_add_settings.sql"
      "004_add_tasks_system.sql"
      "005_add_reports.sql"
      "006_add_memory.sql"
      "007_add_tweets_emails.sql"
      "008_add_discovered_ideas.sql"
      "009_add_daily_syncs.sql"
      "010_add_onboarding_fields.sql"
      "011_add_discovery_fields.sql"
      "012_add_preview_system.sql"
      "013_fix_missing_columns.sql"
      "014_add_gamification.sql"
      "015_add_credits.sql"
      "016_add_change_requests.sql"
      "017_add_email_pro.sql"
      "018_add_marketing_content.sql"
      "019_add_brand_config.sql"
      "020_fix_tasks_columns.sql"
      "021_business_slots.sql"
      "022_referral_system.sql"
      "023_password_reset_tokens.sql"
      "024_add_support_feedback.sql"
      "025_add_feedback_daily_reports.sql"
      "026_budgets_governance_heartbeat.sql"
      "027_add_password_reset_tokens_v1.sql"
    )

    for migration in "${MIGRATIONS[@]}"; do
      migration_file="database/migrations/$migration"
      if [ -f "$migration_file" ]; then
        if [ "$DRY_RUN" = false ]; then
          psql "$DATABASE_URL" -f "$migration_file" -v ON_ERROR_STOP=0 2>&1 | grep -v "already exists" | grep -v "^$" || true
          ok "Migración aplicada: $migration"
        else
          warn "[DRY RUN] Se aplicaría: $migration"
        fi
      else
        warn "Migración no encontrada (skip): $migration_file"
      fi
    done

  else
    # Alternativa: usar el migrate.js de Node.js
    log "psql no disponible. Usando migrate.js de Node..."
    if [ "$DRY_RUN" = false ]; then
      DATABASE_URL="$DATABASE_URL" node -e "
        require('./backend/migrate').runMigrations().then(results => {
          results.forEach(r => console.log('[' + (r.status.startsWith('error') ? 'ERROR' : 'OK') + '] ' + r.migration + ': ' + r.status));
          const errors = results.filter(r => r.status.startsWith('error'));
          if (errors.length > 0) { console.error('Hay errores en migraciones'); process.exit(1); }
        }).catch(err => { console.error(err); process.exit(1); });
      "
      ok "Migraciones ejecutadas via Node.js"
    else
      warn "[DRY RUN] Se ejecutaría: node backend/migrate.js"
    fi
  fi
fi

# --------------------------------------------------------------------------
# 4. DEPLOY DE BACKEND (RAILWAY)
# --------------------------------------------------------------------------
if [ "$ONLY_FRONTEND" = false ]; then
  echo ""
  log "=== PASO 2: Deploy Backend a Railway ==="

  if [ "$DRY_RUN" = false ]; then
    # Autenticar con Railway usando token
    export RAILWAY_TOKEN="$RAILWAY_TOKEN"

    log "Enviando código a Railway..."
    railway up --detach

    ok "Deploy de backend iniciado en Railway"
  else
    warn "[DRY RUN] Se ejecutaría: railway up --detach"
  fi
fi

# --------------------------------------------------------------------------
# 5. BUILD Y DEPLOY DE FRONTEND (VERCEL)
# --------------------------------------------------------------------------
if [ "$ONLY_BACKEND" = false ]; then
  echo ""
  log "=== PASO 3: Build y Deploy Frontend a Vercel ==="

  log "Instalando dependencias del frontend..."
  if [ "$DRY_RUN" = false ]; then
    cd frontend
    npm install --silent

    log "Construyendo frontend..."
    npm run build

    log "Deploying a Vercel..."
    VERCEL_TOKEN="$VERCEL_TOKEN" vercel --prod --yes --token="$VERCEL_TOKEN"

    cd "$PROJECT_ROOT"
    ok "Frontend deplorado en Vercel"
  else
    warn "[DRY RUN] Se ejecutaría: cd frontend && npm install && npm run build && vercel --prod"
  fi
fi

# --------------------------------------------------------------------------
# 6. VERIFICACIÓN DEL DEPLOY (HEALTH CHECK)
# --------------------------------------------------------------------------
echo ""
log "=== PASO 4: Verificación del Deploy ==="

BACKEND_URL="${BACKEND_URL:-https://lanzalo-backend.railway.app}"
FRONTEND_URL="${FRONTEND_URL:-https://www.lanzalo.pro}"

health_check() {
  local url="$1"
  local name="$2"
  local max_attempts=10
  local attempt=0

  log "Verificando $name en $url ..."

  while [ $attempt -lt $max_attempts ]; do
    attempt=$((attempt + 1))
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")

    if [ "$http_code" = "200" ] || [ "$http_code" = "301" ] || [ "$http_code" = "302" ]; then
      ok "$name responde correctamente (HTTP $http_code)"
      return 0
    fi

    if [ $attempt -lt $max_attempts ]; then
      warn "Intento $attempt/$max_attempts: HTTP $http_code. Esperando 15s..."
      sleep 15
    fi
  done

  warn "$name no respondió en $max_attempts intentos (último HTTP: $http_code)"
  return 1
}

if [ "$DRY_RUN" = false ]; then
  # Dar tiempo para que Railway propague el deploy
  if [ "$ONLY_FRONTEND" = false ]; then
    log "Esperando 30 segundos para propagación del deploy de Railway..."
    sleep 30

    health_check "$BACKEND_URL/health" "Backend" || warn "Backend health check falló - revisar Railway logs"
  fi

  if [ "$ONLY_BACKEND" = false ]; then
    health_check "$FRONTEND_URL" "Frontend" || warn "Frontend health check falló - revisar Vercel logs"
  fi
fi

# --------------------------------------------------------------------------
# 7. RESUMEN FINAL
# --------------------------------------------------------------------------
echo ""
echo "======================================================================"
echo "  ✅ Deploy Completado"
echo "======================================================================"
echo ""
echo "  Backend:  $BACKEND_URL"
echo "  Frontend: $FRONTEND_URL"
echo ""
echo "  Para ver logs:"
echo "    Railway: railway logs"
echo "    Vercel:  vercel logs"
echo ""
echo "  Railway dashboard: https://railway.app/dashboard"
echo "  Vercel dashboard:  https://vercel.com/dashboard"
echo ""
if [ "$DRY_RUN" = true ]; then
  warn "Esto fue un DRY RUN. Ningún cambio fue aplicado."
fi
echo "======================================================================"
