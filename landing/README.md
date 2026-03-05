# Landing Page - Lanzalo.pro

Landing page estática para **lanzalo.pro**

## Características

✅ **Copy gracioso y anti-corporativo**
- Tono cercano y directo
- Ejemplos absurdos pero reales
- Sin palabrería corporativa

✅ **Dos caminos claros**
- Opción 1: Describe tu idea
- Opción 2: Elige idea validada

✅ **2 ideas destacadas**
- Plataforma de Mentorías (95/100)
- Cold Email con IA (88/100)

✅ **Secciones incluidas**
- Hero con CTA
- Ideas validadas
- Cómo funciona
- Lo que NO hacemos
- Ejemplos reales
- Pricing ($29/mes)
- FAQ anti-corporativo
- Footer

## Deploy Rápido

### Opción 1: Vercel (Recomendado)

```bash
# 1. Instalar Vercel CLI
npm i -g vercel

# 2. Deploy
cd landing
vercel

# 3. Conectar dominio
# En Vercel Dashboard:
# Settings → Domains → Add lanzalo.pro
```

### Opción 2: Netlify

```bash
# 1. Instalar Netlify CLI
npm i -g netlify-cli

# 2. Deploy
cd landing
netlify deploy --prod

# 3. Conectar dominio
# En Netlify Dashboard:
# Domain management → Add custom domain → lanzalo.pro
```

### Opción 3: GitHub Pages

```bash
# 1. Crear repo
git init
git add .
git commit -m "Initial landing page"
git remote add origin https://github.com/tu-usuario/lanzalo-landing.git
git push -u origin main

# 2. Configurar Pages
# Settings → Pages → Source: main branch
# Custom domain: lanzalo.pro
```

## DNS Configuration

Apunta **lanzalo.pro** a tu hosting:

### Para Vercel:
```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### Para Netlify:
```
Type: A
Name: @
Value: 75.2.60.5

Type: CNAME
Name: www
Value: tu-sitio.netlify.app
```

## Email Collection

**TODO**: Conectar formulario a servicio de emails

### Opción A: Resend (Recomendado)

```javascript
// En el script del formulario
const response = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer tu-api-key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    from: 'Lanzalo <noreply@lanzalo.pro>',
    to: 'tu-email@ejemplo.com',
    subject: 'Nuevo signup: ' + email,
    html: `<p>Email: ${email}</p><p>Idea: ${idea}</p>`
  })
});
```

### Opción B: Google Sheets (Rápido)

1. Crear Google Sheet
2. Usar Apps Script como webhook
3. POST desde formulario

### Opción C: Mailchimp/ConvertKit

Integración directa con su API.

## Testing Local

```bash
# Servidor simple
python3 -m http.server 8000
# O
npx serve

# Abrir: http://localhost:8000
```

## Próximos Pasos

1. ✅ Landing creada
2. ⏳ Deploy a Vercel/Netlify
3. ⏳ Configurar DNS (lanzalo.pro)
4. ⏳ Conectar email collection
5. ⏳ Testear formulario
6. ⏳ Compartir y validar copy

## Futuras Mejoras

- Analytics (Plausible/Simple Analytics)
- A/B testing de copy
- Video demo
- Testimonios
- Integraciones con backend real
