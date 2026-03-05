# Guía de Deployment - Lanzalo

## Deployment a Producción

### Pre-requisitos

- Cuenta de Railway o Fly.io (backend)
- Cuenta de Vercel (frontend)
- Cuenta de Supabase (database)
- OpenRouter API key
- Stripe account (opcional)

---

## 1. Base de Datos (Supabase)

### Crear Proyecto

1. Ve a [supabase.com](https://supabase.com)
2. Crea nuevo proyecto
3. Espera a que se complete el setup (~2 min)

### Ejecutar Migraciones

1. Ve a SQL Editor en Supabase
2. Copia y ejecuta: `database/schema.sql`
3. Copia y ejecuta: `database/migrations/001_add_quotas.sql`

### Obtener Connection String

```
Settings → Database → Connection string (URI)
postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
```

---

## 2. Backend (Railway)

### Opción A: Deploy con CLI

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Crear proyecto
railway init

# Agregar variables de entorno
railway variables set DATABASE_URL="postgresql://..."
railway variables set OPENROUTER_API_KEY="sk-or-..."
railway variables set STRIPE_SECRET_KEY="sk_..."

# Deploy
railway up
```

### Opción B: Deploy desde GitHub

1. Conecta tu repo a Railway
2. Agrega variables de entorno en el dashboard
3. Railway detectará automáticamente `package.json`
4. Deploy automático en cada push

### Variables de Entorno Requeridas

```env
DATABASE_URL=postgresql://...
OPENROUTER_API_KEY=sk-or-...
NODE_ENV=production
PORT=3001
```

### Variables Opcionales

```env
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
SMTP_HOST=smtp.gmail.com
SMTP_USER=...
SMTP_PASS=...
VERCEL_TOKEN=...
```

---

## 3. Frontend (Vercel)

### Deploy desde Dashboard

1. Importa tu repo en [vercel.com](https://vercel.com)
2. Framework preset: **Next.js**
3. Root directory: `frontend`
4. Build command: `npm run build`
5. Output directory: `.next`

### Variables de Entorno

```env
NEXT_PUBLIC_API_URL=https://tu-backend.railway.app
```

### Deploy

```bash
cd frontend
vercel --prod
```

---

## 4. Dominio Personalizado

### Backend

En Railway:
1. Settings → Domains
2. Agregar dominio custom: `api.lanzalo.app`
3. Configurar DNS:
   ```
   CNAME api.lanzalo.app → [tu-proyecto].railway.app
   ```

### Frontend

En Vercel:
1. Settings → Domains
2. Agregar: `lanzalo.app` y `www.lanzalo.app`
3. Configurar DNS:
   ```
   A lanzalo.app → 76.76.21.21
   CNAME www → cname.vercel-dns.com
   ```

### Wildcard Subdomain (para empresas)

Para `*.lanzalo.app`:

```
CNAME * → cname.vercel-dns.com
```

Esto permite:
- `empresa1.lanzalo.app`
- `empresa2.lanzalo.app`
- etc.

---

## 5. Webhooks de Stripe

### Crear Webhook

1. Dashboard de Stripe → Developers → Webhooks
2. Add endpoint: `https://api.lanzalo.app/api/webhooks/stripe`
3. Selecciona eventos:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `customer.subscription.deleted`

### Configurar Secret

Copia el webhook secret y agrégalo a Railway:

```bash
railway variables set STRIPE_WEBHOOK_SECRET="whsec_..."
```

---

## 6. Monitoreo

### Logs

**Railway:**
```bash
railway logs
```

**Vercel:**
```bash
vercel logs
```

### Health Checks

Configura uptime monitoring:
- [UptimeRobot](https://uptimerobot.com)
- [Pingdom](https://pingdom.com)

Endpoint: `https://api.lanzalo.app/health`

### Error Tracking

Integrar Sentry:

```bash
npm install @sentry/node
```

```javascript
// backend/server.js
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV
});
```

---

## 7. Backups

### Base de Datos (Supabase)

Backups automáticos cada 24h en plan Pro.

Para backups manuales:
```bash
# Exportar
pg_dump -h [HOST] -U postgres -d postgres > backup.sql

# Restaurar
psql -h [HOST] -U postgres -d postgres < backup.sql
```

### Código

Git tags para releases:

```bash
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

---

## 8. CI/CD

### GitHub Actions

Crear `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm test

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: vercel --prod
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

---

## 9. Escalado

### Horizontal Scaling (Railway)

1. Settings → Resources
2. Aumentar replicas según carga
3. Load balancer automático

### Database Scaling (Supabase)

1. Upgrade a plan superior
2. Habilitar read replicas
3. Implementar connection pooling

### Caching

Agregar Redis para cache:

```bash
railway add redis
```

```javascript
const redis = require('redis');
const client = redis.createClient({
  url: process.env.REDIS_URL
});
```

---

## 10. Seguridad

### SSL/TLS

Railway y Vercel proveen SSL automático.

### Rate Limiting

Ya implementado en el código, pero puedes agregar Cloudflare:

1. Agregar dominio a Cloudflare
2. Habilitar "Under Attack Mode" si hay DDoS
3. Configurar WAF rules

### Variables de Entorno

**NUNCA** commitear `.env` a Git.

Usar secrets managers:
- Railway secrets (incluido)
- Vercel environment variables (incluido)
- AWS Secrets Manager (opcional)

---

## 11. Costos Estimados

### Stack Mínimo (MVP)

- **Railway**: $5-20/mes (backend)
- **Vercel**: $0 (hobby) o $20/mes (pro)
- **Supabase**: $0 (free tier) o $25/mes (pro)
- **OpenRouter**: Variable (~$100-300/mes)

**Total: ~$130-365/mes** para operar 100 empresas

### Revenue Break-even

Con 10 clientes pagando: `10 × $39 = $390/mes`

Break-even: ~10 clientes

---

## 12. Troubleshooting

### Backend no inicia

```bash
railway logs
# Revisar errores de conexión a DB o missing env vars
```

### Frontend 500 error

```bash
vercel logs
# Revisar que NEXT_PUBLIC_API_URL esté configurado
```

### Database connection timeout

- Verificar IP allowlist en Supabase
- Aumentar `max_connections` en DB settings

### Costos LLM muy altos

- Revisar uso por empresa en `llm_usage` table
- Ajustar quotas en `backend/middleware/quotas.js`
- Usar modelos más baratos para tareas simples

---

## Checklist de Go-Live

- [ ] Base de datos creada y migrada
- [ ] Backend desplegado en Railway
- [ ] Frontend desplegado en Vercel
- [ ] Variables de entorno configuradas
- [ ] Dominios configurados
- [ ] SSL activo
- [ ] Webhooks de Stripe configurados
- [ ] Monitoring activo (Sentry, UptimeRobot)
- [ ] Backups programados
- [ ] CI/CD configurado
- [ ] Documentación actualizada
- [ ] Rate limiting testeado
- [ ] Primeros 5 usuarios beta invitados

---

**¡Listo para lanzar! 🚀**
