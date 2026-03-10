# Checklist de Configuración API Keys - Lanzalo
**Fecha:** 2026-03-09 20:24 UTC
**Estado:** Proceso iniciado
**Usuario confirmó:** OK para continuar

---

## 🔑 CHECKLIST DE CONFIGURACIÓN

### ✅ FASE 1 - YA CONFIGURADO (5/13)
- [x] OpenRouter API key (según runtime)
- [x] Stripe SECRET_KEY (según Railway)
- [x] Stripe PRICE_ID (según Railway)
- [x] Stripe WEBHOOK_SECRET (según Railway)
- [x] Resend API key (según Railway)

### ❌ FASE 2 - PENDIENTE DE CONFIGURACIÓN (8/13)

#### Prioridad CRITICAL (Marketing)
- [ ] Fal.ai API key - Video generation AI
  - Get it: https://fal.ai/keys
  - Variable: FAL_API_KEY
  - Costo: ~$0.01-0.05 por video
  - Tiempo estimado: 5 minutos

- [ ] Meta Ads ACCESS_TOKEN - Facebook/Instagram Ads
  - Get it: https://developers.facebook.com/tools/explorer/
  - Variable: META_ACCESS_TOKEN
  - Permisos: ads_management, ads_read, business_management
  - Tiempo estimado: 10 minutos

- [ ] Meta Ads AD_ACCOUNT_ID - Facebook/Instagram Ads
  - Get it: https://business.facebook.com/settings/ad-accounts/
  - Variable: META_AD_ACCOUNT_ID
  - Formato: act_xxxxxxxxxxxxxx
  - Tiempo estimado: 2 minutos

- [ ] TwitterAPI KEY - Publicar tweets
  - Get it: https://twitterapi.io/
  - Variable: TWITTERAPI_KEY
  - Costo: $0.003 por tweet
  - Tiempo estimado: 5 minutos

- [ ] TwitterAPI LOGIN_COOKIES - Autenticación Twitter
  - Get it: TwitterAPI.io browser extension
  - Variable: TWITTER_LOGIN_COOKIES
  - Tiempo estimado: 5 minutos

#### Prioridad MEDIUM (Mejoras)
- [ ] Hunter.io API key - Email verification
  - Get it: https://hunter.io/api-keys
  - Variable: HUNTER_API_KEY
  - Tiempo estimado: 5 minutos

- [ ] Brave Search API key - Research Agent
  - Get it: https://brave.com/search/api/
  - Variable: BRAVE_API_KEY
  - Tiempo estimado: 5 minutos

#### Prioridad LOW (Opcional)
- [ ] TwitterAPI PROXY - Proxy para TwitterAPI.io
  - Get it: Opcional (solo si es necesario)
  - Variable: TWITTER_PROXY
  - Tiempo estimado: 0 minutos (opcional)

---

## 📊 PROGRESO

**Total API Keys:** 13
**Configuradas:** 5 (38%)
**Pendientes:** 8 (62%)

**Prioridad Critical:** 5/8 pendientes
**Prioridad Medium:** 2/8 pendientes
**Prioridad Low:** 1/8 pendiente

**Tiempo estimado total:** 37 minutos

---

## 🚀 PLAN DE CONFIGURACIÓN

### Paso 1: Configurar Fal.ai API Key (5 min)
```bash
# Regístrate en https://fal.ai
# Ve a https://fal.ai/keys
# Crea una nueva API key
# Copia la key
# Añade a Railway Environment Variables:
#   FAL_API_KEY=fal_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Paso 2: Configurar Meta Ads ACCESS_TOKEN (10 min)
```bash
# Ve a https://developers.facebook.com/tools/explorer/
# Selecciona tu App
# Genera Access Token con permisos:
#   - ads_management
#   - ads_read
#   - business_management
# Copia el token
# Añade a Railway Environment Variables:
#   META_ACCESS_TOKEN=EAxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Paso 3: Configurar Meta Ads AD_ACCOUNT_ID (2 min)
```bash
# Ve a https://business.facebook.com/settings/ad-accounts/
# Copia el Ad Account ID
# Añade a Railway Environment Variables:
#   META_AD_ACCOUNT_ID=act_xxxxxxxxxxxxxx
```

### Paso 4: Configurar TwitterAPI KEY (5 min)
```bash
# Regístrate en https://twitterapi.io/
# Obtén tu API key
# Copia la key
# Añade a Railway Environment Variables:
#   TWITTERAPI_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Paso 5: Configurar TwitterAPI LOGIN_COOKIES (5 min)
```bash
# Instala TwitterAPI.io browser extension
# Login en @HackersSales
# Copia las cookies desde la extensión
# Añade a Railway Environment Variables:
#   TWITTER_LOGIN_COOKIES=your_cookies_here
```

### Paso 6: Configurar Hunter.io API Key (5 min)
```bash
# Regístrate en https://hunter.io/
# Ve a https://hunter.io/api-keys
# Crea una nueva API key
# Copia la key
# Añade a Railway Environment Variables:
#   HUNTER_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Paso 7: Configurar Brave Search API Key (5 min)
```bash
# Regístrate en https://brave.com/search/api/
# Obtén tu API key
# Copia la key
# Añade a Railway Environment Variables:
#   BRAVE_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## ✅ VERIFICACIÓN POST-CONFIGURACIÓN

### Test Fal.ai API
```bash
curl -H "Authorization: Key YOUR_FAL_API_KEY" \
  https://queue.fal.run/fal-ai/fast-sdxl/generate
```

### Test Meta Ads API
```bash
curl -G "https://graph.facebook.com/v18.0/YOUR_AD_ACCOUNT_ID/campaigns" \
  -d "access_token=YOUR_META_ACCESS_TOKEN" \
  -d "fields=name,status,daily_budget"
```

### Test TwitterAPI
```bash
curl -X POST https://api.twitterapi.io/twitter/create_tweet_v2 \
  -H "X-API-Key: YOUR_TWITTERAPI_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tweet": "Test tweet"}'
```

### Test Hunter.io
```bash
curl -G "https://api.hunter.io/v2/email-verifier" \
  -d "email=test@example.com" \
  -d "api_key=YOUR_HUNTER_API_KEY"
```

### Test Brave Search
```bash
curl -G "https://api.search.brave.com/res/v1/search?q=test" \
  -H "Accept: application/json" \
  -H "X-Subscription-Token: YOUR_BRAVE_API_KEY"
```

---

## 📞 CONTACTO

**Si necesitas ayuda configurando API keys:**
- Fal.ai: https://docs.fal.ai/
- Meta Ads: https://developers.facebook.com/docs/marketing-api/
- TwitterAPI.io: https://twitterapi.io/docs
- Hunter.io: https://hunter.io/docs
- Brave Search: https://brave.com/search/api/

---

## 🎯 OBJETIVO

Configurar las 8 API keys pendientes en los próximos 37 minutos.

**Consejo:** Empieza por las prioridad Critical (Fal.ai, Meta Ads, TwitterAPI) para activar marketing YA.

---

**Estado:** Proceso iniciado, esperando confirmación del usuario para proceder
**Próximo paso:** Configurar Fal.ai API Key (5 minutos)