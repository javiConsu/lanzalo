# Deployment Guide - Lanzalo

Complete guide to deploy Lanzalo to production.

---

## 🎯 Prerequisites

Before deploying, you need:

- [ ] Domain name (lanzalo.pro) ✅ Already have
- [ ] Railway account (backend + database)
- [ ] Vercel account (frontend + landing)
- [ ] OpenRouter API key
- [ ] Resend account (emails)
- [ ] Stripe account (payments)

---

## 🗄️ Database Setup (Railway PostgreSQL)

### 1. Create PostgreSQL Database

```bash
# Via Railway dashboard:
1. New Project → PostgreSQL
2. Note connection string (DATABASE_URL)
3. Keep default settings
```

### 2. Run Migrations

```bash
# Local → Railway DB
export DATABASE_URL="postgresql://..."

cd lanzalo
npm install

# Run all migrations
for i in {001..010}; do
  node scripts/migrate.js 0${i}_*.sql
done
```

### 3. Verify Tables

```sql
-- Connect to Railway DB
psql $DATABASE_URL

-- Check tables
\dt

-- Should see:
-- users, companies, tasks, chat_messages, company_metrics
-- reports, discovered_ideas, daily_syncs, etc.
```

---

## 🚀 Backend Deployment (Railway)

### 1. Create Railway Service

```bash
# Via Railway dashboard:
1. New Project → Deploy from GitHub
2. Select: javiConsu/lanzalo
3. Root directory: /
4. Build command: npm install
5. Start command: npm start
```

### 2. Environment Variables

Add to Railway:

```bash
# Database (auto-filled by Railway PostgreSQL)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# OpenRouter
OPENROUTER_API_KEY=sk-or-v1-YOUR-KEY-HERE

# JWT
JWT_SECRET=generate-random-32-char-string

# Admin
ADMIN_EMAIL=admin@lanzalo.pro
ADMIN_PASSWORD=change-me-in-production

# Server
PORT=3001
NODE_ENV=production

# Stripe (add later)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Resend (add later)
RESEND_API_KEY=re_...
```

### 3. Deploy

```bash
# Railway auto-deploys on git push
git push origin main

# Railway builds and starts server
# Get URL: https://lanzalo-production.up.railway.app
```

### 4. Custom Domain

```bash
# In Railway dashboard:
Settings → Domains → Add Custom Domain
- api.lanzalo.pro

# Add DNS record:
CNAME api.lanzalo.pro → lanzalo-production.up.railway.app
```

---

## 🎨 Frontend Deployment (Vercel)

### 1. Deploy Main App

```bash
# Via Vercel dashboard:
1. New Project → Import Git Repository
2. Select: javiConsu/lanzalo
3. Framework: Vite
4. Root directory: frontend
5. Build command: npm run build
6. Output directory: dist
```

### 2. Environment Variables

```bash
VITE_API_URL=https://api.lanzalo.pro
VITE_WS_URL=wss://api.lanzalo.pro
```

### 3. Custom Domain

```bash
# Vercel auto-suggests:
app.lanzalo.pro

# Add DNS:
CNAME app → cname.vercel-dns.com
```

### 4. Deploy Landing

```bash
# Separate Vercel project:
1. New Project → javiConsu/lanzalo
2. Root directory: landing
3. Framework: Static HTML
4. Output: .

# Domain: lanzalo.pro (already configured) ✅
```

---

## 📧 Email Setup (Resend)

### 1. Verify Domain

```bash
# In Resend dashboard:
Domains → Add Domain → lanzalo.pro

# Add DNS records:
TXT _resend.lanzalo.pro → "resend-verify=ABC123..."
MX lanzalo.pro → feedback-smtp.resend.com (priority 10)
TXT lanzalo.pro → "v=spf1 include:_spf.resend.com ~all"
```

### 2. Get API Key

```bash
# Resend dashboard → API Keys → Create
# Copy key: re_...

# Add to Railway env:
RESEND_API_KEY=re_...
```

### 3. Test Send

```bash
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "Lanzalo <noreply@lanzalo.pro>",
    "to": "your@email.com",
    "subject": "Test",
    "html": "<p>Works!</p>"
  }'
```

---

## 💳 Payments Setup (Stripe)

### 1. Create Products

```bash
# Stripe dashboard → Products → Add Product

Product: Lanzalo Pro
Price: €39/month
Billing: Recurring monthly
```

### 2. Get Keys

```bash
# Stripe dashboard → Developers → API Keys
Publishable key: pk_live_...
Secret key: sk_live_...

# Add to Railway:
STRIPE_SECRET_KEY=sk_live_...
```

### 3. Webhook

```bash
# Stripe dashboard → Webhooks → Add endpoint
URL: https://api.lanzalo.pro/api/webhooks/stripe

Events:
- checkout.session.completed
- invoice.payment_succeeded
- customer.subscription.deleted

# Get signing secret: whsec_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 🔑 OpenRouter Setup

### 1. Create Account

```bash
# https://openrouter.ai
Sign up → Verify email
```

### 2. Add Credits

```bash
# OpenRouter dashboard → Credits
Add $20 for testing
Add $100+ for production
```

### 3. Get API Key

```bash
# API Keys → Create
Copy: sk-or-v1-...

# Add to Railway:
OPENROUTER_API_KEY=sk-or-v1-...
```

### 4. Set Preferences

```bash
# Models to use:
- anthropic/claude-sonnet-4 (default)
- anthropic/claude-haiku-3.5 (cheap tasks)

# Cost tracking:
Dashboard → Usage → Monitor daily
```

---

## ✅ Post-Deployment Checklist

### Backend

- [ ] Railway service running
- [ ] Database migrations applied
- [ ] Environment variables set
- [ ] Custom domain (api.lanzalo.pro) working
- [ ] HTTPS enabled
- [ ] CORS configured for app.lanzalo.pro
- [ ] Health check: https://api.lanzalo.pro/health

### Frontend

- [ ] Vercel app deployed
- [ ] Environment variables set
- [ ] Custom domain (app.lanzalo.pro) working
- [ ] HTTPS enabled
- [ ] API calls working (check Network tab)

### Landing

- [ ] Vercel landing deployed
- [ ] Domain (lanzalo.pro) working
- [ ] Form submission working
- [ ] Analytics configured

### Email

- [ ] Domain verified in Resend
- [ ] DNS records added
- [ ] Test email sent successfully
- [ ] Templates working

### Payments

- [ ] Stripe products created
- [ ] Webhook configured
- [ ] Test payment successful

### Agents

- [ ] OpenRouter API key working
- [ ] Task Executor running
- [ ] Daily Syncs scheduled
- [ ] Trial Manager scheduled
- [ ] Test task executed successfully

---

## 🔧 Maintenance

### Monitoring

```bash
# Railway:
- Logs: Railway dashboard → Logs
- Metrics: CPU, Memory, Network
- Alerts: Configure on spikes

# Sentry (optional):
- Error tracking
- Performance monitoring
```

### Backups

```bash
# Railway PostgreSQL:
- Auto-backups daily
- Manual backup:
  pg_dump $DATABASE_URL > backup.sql

# Restore:
  psql $DATABASE_URL < backup.sql
```

### Updates

```bash
# Backend:
git push origin main
→ Railway auto-deploys

# Frontend:
git push origin main
→ Vercel auto-deploys

# Database migrations:
node scripts/migrate.js 011_new_migration.sql
```

---

## 💰 Costs (Monthly)

```
Railway:
- PostgreSQL: $5
- Backend service: $5
Total: ~$10/mo

Vercel:
- Free tier (sufficient for start)
- Pro if needed: $20/mo

OpenRouter:
- Pay as you go
- ~$30-50/mo for 10-20 active users

Resend:
- Free: 3K emails/mo
- Pro if needed: $20/mo

Stripe:
- Free (2.9% + €0.30 per transaction)

Domain:
- Already paid ✅

TOTAL: ~$10-15/mo base + LLM usage
```

---

## 🚨 Troubleshooting

### "Database connection failed"
```bash
# Check DATABASE_URL in Railway env
# Verify PostgreSQL service running
# Test connection:
psql $DATABASE_URL -c "SELECT 1"
```

### "OpenRouter API error"
```bash
# Check API key valid
# Verify credits available
# Test:
curl https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer $OPENROUTER_API_KEY"
```

### "Email not sending"
```bash
# Verify domain in Resend
# Check DNS records propagated:
dig TXT _resend.lanzalo.pro
dig MX lanzalo.pro

# Test API:
curl -X POST https://api.resend.com/emails/...
```

### "CORS error"
```bash
# Add to backend/server.js:
app.use(cors({
  origin: ['https://app.lanzalo.pro', 'https://lanzalo.pro']
}));
```

---

## 📝 Next Steps After Deployment

1. **Test full user journey**
   - Register → Onboarding → Create company → Chat
   
2. **Monitor first day**
   - Check logs for errors
   - Verify cron jobs running
   - Test email delivery

3. **Invite beta users**
   - 5-10 trusted users
   - Collect feedback
   - Fix bugs

4. **Scale**
   - Monitor costs
   - Optimize LLM usage
   - Add caching if needed

---

**Ready to deploy!** 🚀

When you have Railway + OpenRouter + Resend configured, this guide has everything you need.
