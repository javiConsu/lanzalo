# Setup Landing - lanzalo.pro

## ✅ Completado

- [x] Landing HTML creada
- [x] Deploy a Vercel
- [x] DNS configurado (lanzalo.pro)
- [x] Formulario con placeholder

## ⏳ Pendiente

### 1. Configurar Resend (Email Collection)

**Paso 1: Crear cuenta**
- https://resend.com/signup
- Gratis hasta 3K emails/mes

**Paso 2: Verificar dominio**
- Dashboard → Domains → Add Domain
- Domain: `lanzalo.pro`
- Añadir records DNS en Cloudflare:
  ```
  TXT: _resend → valor que te dé Resend
  ```

**Paso 3: Crear API Key**
- Dashboard → API Keys → Create
- Copy key (empieza con `re_`)

**Paso 4: Actualizar index.html**
- Abrir `landing/index.html`
- Buscar línea 595: `const RESEND_API_KEY = 'YOUR_RESEND_API_KEY';`
- Reemplazar:
  ```javascript
  const RESEND_API_KEY = 're_tu_api_key_aqui';
  const NOTIFICATION_EMAIL = 'tu-email@ejemplo.com';
  ```
- Descomentar bloque de Resend (líneas 611-636)
- Comentar/eliminar logging local (línea 639)

**Paso 5: Re-deploy**
```bash
cd landing
vercel --prod
```

### 2. Analytics (Opcional)

**Opción A: Plausible** (Recomendado - Privacy-first)
- https://plausible.io
- $9/mes (10K pageviews)
- Añadir script antes de `</head>`:
  ```html
  <script defer data-domain="lanzalo.pro" src="https://plausible.io/js/script.js"></script>
  ```

**Opción B: Simple Analytics**
- https://simpleanalytics.com
- Similar a Plausible

**Opción C: Google Analytics** (Gratis pero invasivo)
- No recomendado (privacidad)

### 3. Testing

**Cuando lanzalo.pro cargue**:
1. Abrir https://lanzalo.pro
2. Testear formulario:
   - Email válido
   - Idea (o vacío)
   - Submit
   - Ver success message
3. Verificar email llegó (cuando Resend configurado)

### 4. Compartir

**Canales sugeridos**:
- Twitter/X personal
- LinkedIn
- Reddit (r/SideProject, r/Entrepreneur)
- Indie Hackers
- Product Hunt (cuando tenga tracción)

## 🔧 Troubleshooting

**DNS no propaga**:
- Espera 5-60 minutos
- Verifica: https://dnschecker.org/#A/lanzalo.pro
- Debe mostrar: 76.76.21.21

**SSL error**:
- Vercel genera SSL automáticamente
- Toma 1-5 minutos después de DNS
- Verifica en Vercel Dashboard → Domains

**Formulario no envía**:
- Abre Console (F12)
- Busca errores
- Verifica RESEND_API_KEY configurada
- Verifica dominio verificado en Resend

**Emails van a spam**:
- Verifica SPF/DKIM/DMARC en Resend
- Warm-up dominio (envía pocos emails primeros días)
- Evita palabras spam: "free", "guaranteed", etc.

## 📊 Métricas Esperadas

**Primeros 7 días**:
- Visitas: 50-200 (según shares)
- Signups: 5-15 (conversion 3-10%)
- Feedback: Recoger en Twitter/email

**Optimizaciones**:
- A/B test headlines
- Ajustar copy según feedback
- Añadir testimonios (cuando haya)
- Video demo (opcional)

## 🚀 Siguiente Fase

**Cuando tengas 20-50 signups**:
1. Conectar backend real
2. Onboarding flow
3. Dashboard app.lanzalo.pro
4. Email a waitlist: "Ya está listo"

## 📞 Soporte

Si algo no funciona:
1. Verifica Console (F12)
2. Verifica DNS (dnschecker.org)
3. Verifica Vercel Dashboard
4. Pregúntame :)
