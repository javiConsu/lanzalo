# API Keys Needed - Lanzalo Marketing
**Fecha:** 2026-03-09 20:10 UTC
**Estado:** Requiere configuración manual

---

## 🔑 API KEYS REQUIRED

### 1. OpenRouter (LLM Provider)
**Variable:** `OPENROUTER_API_KEY`
**Purpose:** LLM API calls for agents (Claude 3.5 Sonnet, GPT-4o, etc.)
**Get it here:** https://openrouter.ai/keys
**Status:** ✅ Ya configurado (según runtime)

### 2. Stripe
**Variable:** `STRIPE_SECRET_KEY`
**Purpose:** Payment processing
**Variable:** `STRIPE_PRICE_ID`
**Purpose:** Price ID for $39/month plan
**Variable:** `STRIPE_WEBHOOK_SECRET`
**Purpose:** Webhook signature verification
**Get it here:** https://dashboard.stripe.com/apikeys
**Status:** ✅ Ya configurado (según Railway)

### 3. Fal.ai (Video Generation AI)
**Variable:** `FAL_API_KEY`
**Purpose:** Generate UGC video ads (15-30 seconds)
**Get it here:** https://fal.ai/keys
**Cost:** ~$0.01-0.05 por video
**Status:** ❌ Pendiente configuración

### 4. Meta Ads (Facebook/Instagram)
**Variable:** `META_ACCESS_TOKEN`
**Purpose:** Access Meta Ads Manager API
**Variable:** `META_AD_ACCOUNT_ID`
**Purpose:** Ad Account ID for creating ads
**Get it here:** https://developers.facebook.com/tools/explorer/
**Status:** ❌ Pendiente configuración

### 5. Twitter (TwitterAPI.io)
**Variable:** `TWITTERAPI_KEY`
**Purpose:** Publish tweets via TwitterAPI.io
**Variable:** `TWITTER_LOGIN_COOKIES`
**Purpose:** Login cookies for authentication
**Variable:** `TWITTER_PROXY`
**Purpose:** Proxy for TwitterAPI.io
**Get it here:** https://twitterapi.io/
**Cost:** $0.003 por tweet
**Status:** ❌ Pendiente configuración

### 6. Resend (Email Service)
**Variable:** `RESEND_API_KEY`
**Purpose:** Send transactional emails
**Get it here:** https://resend.com/api-keys
**Status:** ✅ Ya configurado (según Railway)

### 7. Hunter.io (Email Verification)
**Variable:** `HUNTER_API_KEY`
**Purpose:** Verify email addresses for cold outreach
**Get it here:** https://hunter.io/api-keys
**Status:** ❌ Pendiente configuración

### 8. Brave Search API
**Variable:** `BRAVE_API_KEY`
**Purpose:** Search functionality for Research Agent
**Get it here:** https://brave.com/search/api/
**Status:** ❌ Pendiente configuración

---

## 📋 CHECKLIST DE CONFIGURACIÓN

### ✅ YA CONFIGURADO (Según sistema actual)
- [x] OpenRouter API key
- [x] Stripe SECRET_KEY
- [x] Stripe PRICE_ID
- [x] Stripe WEBHOOK_SECRET
- [x] Resend API key

### ❌ PENDIENTE DE CONFIGURACIÓN
- [ ] Fal.ai API key
- [ ] Meta Ads ACCESS_TOKEN
- [ ] Meta Ads AD_ACCOUNT_ID
- [ ] TwitterAPI KEY
- [ ] TwitterAPI LOGIN_COOKIES
- [ ] TwitterAPI PROXY
- [ ] Hunter.io API key
- [ ] Brave Search API key

---

## 🚀 INSTRUCCIONES DE CONFIGURACIÓN

### 1. Fal.ai API Key
```bash
# Regístrate en https://fal.ai
# Ve a https://fal.ai/keys
# Crea una nueva API key
# Añade a .env:
FAL_API_KEY=fal_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 2. Meta Ads API Keys
```bash
# Ve a https://developers.facebook.com/tools/explorer/
# Selecciona tu App
# Genera Access Token con permisos:
# - ads_management
# - ads_read
# - business_management
# Añade a .env:
META_ACCESS_TOKEN=EAxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
META_AD_ACCOUNT_ID=act_xxxxxxxxxxxxxx
```

### 3. TwitterAPI.io
```bash
# Regístrate en https://twitterapi.io/
# Obtén tu API key
# Configura login cookies (requiere navegador)
# Añade a .env:
TWITTERAPI_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWITTER_LOGIN_COOKIES=your_cookies_here
TWITTER_PROXY=your_proxy_here (opcional)
```

### 4. Hunter.io API Key
```bash
# Regístrate en https://hunter.io/
# Ve a https://hunter.io/api-keys
# Crea una nueva API key
# Añade a .env:
HUNTER_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 5. Brave Search API Key
```bash
# Regístrate en https://brave.com/search/api/
# Obtén tu API key
# Añade a .env:
BRAVE_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 🔐 SEGURIDAD

⚠️ **IMPORTANTE:** Nunca compartas tu archivo `.env` en público
⚠️ **IMPORTANTE:** Añade `.env` a `.gitignore`
⚠️ **IMPORTANTE:** En Railway, usa Environment Variables del dashboard, no el archivo `.env`

---

## 📞 AYUDA

Si necesitas ayuda configurando API keys:
1. Fal.ai: https://docs.fal.ai/
2. Meta Ads: https://developers.facebook.com/docs/marketing-api/
3. TwitterAPI.io: https://twitterapi.io/docs
4. Hunter.io: https://hunter.io/docs
5. Brave Search: https://brave.com/search/api/

---

**Estado:** 5/13 API keys configuradas, 8 pendientes
**Próximo paso:** Configurar las 8 API keys pendientes