# Checklist de Deploy - Lanzalo

> **Objetivo:** Tener todas las credenciales listas para que el deploy tarde <15 minutos.
>
> Cuando tengas todas las variables, ejecuta: `./scripts/deploy.sh`

---

## 1. Base de Datos — Supabase

| Variable | Descripción | Cómo obtenerla |
|----------|-------------|----------------|
| `DATABASE_URL` | Connection string PostgreSQL | Supabase → Settings → Database → URI |

### Pasos para obtener `DATABASE_URL`:
1. Ve a [https://supabase.com](https://supabase.com) → tu proyecto
2. Menú lateral: **Settings** → **Database**
3. Sección **Connection string** → selecciona **URI**
4. Copia el string. Reemplaza `[YOUR-PASSWORD]` por la contraseña del proyecto
5. Formato esperado: `postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres`

### Cómo verificar que es correcta:
```bash
# Test de conexión (si tienes psql local)
psql "$DATABASE_URL" -c "SELECT version();"

# Alternativa con Node.js
DATABASE_URL="postgresql://..." node -e "
  const { Pool } = require('pg');
  new Pool({ connectionString: process.env.DATABASE_URL })
    .query('SELECT NOW()')
    .then(r => console.log('✓ Conectado:', r.rows[0].now))
    .catch(e => console.error('✗ Error:', e.message));
"
```

---

## 2. Backend — Railway

| Variable | Descripción | Cómo obtenerla |
|----------|-------------|----------------|
| `RAILWAY_TOKEN` | Token de autenticación CLI | Railway → Account → API Tokens |

### Pasos para obtener `RAILWAY_TOKEN`:
1. Ve a [https://railway.app](https://railway.app) → iniciar sesión
2. Click en tu avatar (arriba derecha) → **Account Settings**
3. Sección **API Tokens** → **New Token**
4. Ponle nombre: `lanzalo-deploy` → copiar token

### Cómo verificar:
```bash
RAILWAY_TOKEN="xxxxx" railway whoami
# Debe mostrar tu email
```

---

## 3. Frontend — Vercel

| Variable | Descripción | Cómo obtenerla |
|----------|-------------|----------------|
| `VERCEL_TOKEN` | Token de autenticación CLI | Vercel → Settings → Tokens |
| `NEXT_PUBLIC_API_URL` | URL del backend Railway | Después del deploy de Railway |

### Pasos para obtener `VERCEL_TOKEN`:
1. Ve a [https://vercel.com](https://vercel.com) → iniciar sesión
2. Click en tu avatar → **Settings** → **Tokens**
3. **Create Token** → nombre: `lanzalo-deploy` → **Full Account** scope
4. Copiar token (se muestra solo una vez)

### Cómo verificar:
```bash
vercel whoami --token="xxxxx"
# Debe mostrar tu username de Vercel
```

---

## 4. LLM — OpenRouter

| Variable | Descripción | Cómo obtenerla |
|----------|-------------|----------------|
| `OPENROUTER_API_KEY` | API key para LLM | https://openrouter.ai/keys |

### Pasos:
1. Ve a [https://openrouter.ai/keys](https://openrouter.ai/keys)
2. **Create Key** → nombre: `lanzalo-prod`
3. Copiar la key (formato `sk-or-v1-...`)

### Cómo verificar:
```bash
curl https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -s | grep '"id"' | head -3
# Debe listar modelos disponibles
```

---

## 5. Pagos — Stripe (opcional para MVP)

| Variable | Descripción | Cómo obtenerla |
|----------|-------------|----------------|
| `STRIPE_SECRET_KEY` | Secret key de Stripe | Stripe → Developers → API Keys |
| `STRIPE_WEBHOOK_SECRET` | Secret del webhook | Stripe → Developers → Webhooks |

### Pasos para Stripe:
1. Ve a [https://dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
2. Copia **Secret key** (formato `sk_live_...` o `sk_test_...` para testing)
3. Para webhook: Dashboard → **Developers** → **Webhooks** → **Add endpoint**
   - URL: `https://[tu-backend].railway.app/api/webhooks/stripe`
   - Eventos: `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.deleted`

---

## 6. Email (opcional)

| Variable | Descripción | Cómo obtenerla |
|----------|-------------|----------------|
| `RESEND_API_KEY` | API key de Resend | https://resend.com/api-keys |
| `SMTP_HOST` | Host SMTP | Gmail: `smtp.gmail.com` |
| `SMTP_USER` | Usuario SMTP | Tu email |
| `SMTP_PASS` | Contraseña SMTP | App password de Gmail |

---

## Resumen de Variables — Copiar y rellenar

```bash
# =====================================================
# Lanzalo - Variables de Entorno para Deploy
# Copia este bloque, rellena los valores, y ejecuta:
# source .env.deploy && ./scripts/deploy.sh
# =====================================================

# --- OBLIGATORIAS ---
export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"
export RAILWAY_TOKEN="[TOKEN_DE_RAILWAY]"
export VERCEL_TOKEN="[TOKEN_DE_VERCEL]"
export OPENROUTER_API_KEY="sk-or-v1-[TU_KEY]"

# --- OBLIGATORIAS EN RAILWAY (configurar en dashboard) ---
# NODE_ENV=production
# PORT=3001
# DATABASE_URL=[mismo que arriba]
# OPENROUTER_API_KEY=[mismo que arriba]
# JWT_SECRET=[string aleatorio de 32+ caracteres]
# CORS_ORIGIN=https://www.lanzalo.pro

# --- OPCIONALES ---
export STRIPE_SECRET_KEY="sk_live_[TU_KEY]"
export STRIPE_WEBHOOK_SECRET="whsec_[TU_SECRET]"
export RESEND_API_KEY="re_[TU_KEY]"

# URLs de los servicios (se actualizan tras el primer deploy)
export BACKEND_URL="https://[tu-proyecto].railway.app"
export FRONTEND_URL="https://www.lanzalo.pro"
```

---

## Checklist Final Antes de Ejecutar

- [ ] `DATABASE_URL` copiada de Supabase y verificada con conexión de prueba
- [ ] `RAILWAY_TOKEN` generado y verificado (`railway whoami`)
- [ ] `VERCEL_TOKEN` generado y verificado (`vercel whoami`)
- [ ] `OPENROUTER_API_KEY` generada y verificada (curl a la API)
- [ ] Variables configuradas en Railway dashboard (DATABASE_URL, OPENROUTER_API_KEY, JWT_SECRET, NODE_ENV, CORS_ORIGIN)
- [ ] Script tiene permisos de ejecución: `chmod +x scripts/deploy.sh`
- [ ] Estás en el directorio raíz del proyecto: `/paperclip/projects/lanzalo/repo/`

## Ejecutar el Deploy

```bash
# Desde el directorio raíz del repo:
chmod +x scripts/deploy.sh

# Deploy completo (DB + backend + frontend):
./scripts/deploy.sh

# Solo backend:
./scripts/deploy.sh --only-backend

# Solo frontend:
./scripts/deploy.sh --only-frontend

# Sin correr migraciones (si ya se aplicaron):
./scripts/deploy.sh --skip-migrations

# Dry run (ver qué haría sin ejecutar nada):
./scripts/deploy.sh --dry-run
```

---

## Tiempo Estimado

| Paso | Tiempo |
|------|--------|
| Configurar variables | 5 min |
| Migraciones (schema + 027 migrations) | 2-3 min |
| Deploy Railway | 3-5 min |
| Deploy Vercel (build + upload) | 2-3 min |
| Verificación health checks | 1-2 min |
| **Total** | **~13-18 min** |

---

*Última actualización: 2026-03-11*
