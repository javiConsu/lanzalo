# 🌐 Browser Agent

## ¿Qué es?

El **Browser Agent** automatiza tareas en navegador web usando **Playwright**.

**Capacidades**:
- ✅ Navegar a URLs
- ✅ Scraping de contenido
- ✅ Testing de webs (responsive, links, performance)
- ✅ Rellenar formularios
- ✅ Screenshots (desktop + mobile)
- ✅ Análisis de accesibilidad
- ✅ Detección de links rotos

---

## 🎯 Tipos de Tareas

### 1. **Navigate** - Navegar a URL

```bash
# Crear tarea
curl -X POST http://localhost:3001/api/user/companies/$COMPANY_ID/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Visitar competitor",
    "description": "Navegar a https://competitor.com y capturar info",
    "tag": "browser",
    "priority": "medium"
  }'

# Resultado:
✅ Navegado a https://competitor.com
- Título: Competitor Site
- Screenshot guardado
```

### 2. **Scrape** - Extraer contenido

```bash
# Tarea de scraping
{
  "title": "Scrape competitor pricing",
  "description": "Extraer precios de https://competitor.com/pricing",
  "tag": "browser"
}

# Resultado:
📥 Scrapeado https://competitor.com/pricing
- 2,450 caracteres extraídos
- 15 links encontrados
- Análisis: "Ofrecen 3 planes: Basic ($9), Pro ($29), Enterprise (custom)"
```

### 3. **Test** - Testing automático

```bash
# Tarea de testing
{
  "title": "Test mi web",
  "description": "Probar https://mi-empresa.lanzalo.app completo",
  "tag": "browser"
}

# Resultado:
🧪 Testing completado

Issues encontrados: 3
- [warning] 2 imágenes sin alt
- [warning] Sitio lento: 3,200ms
- [warning] Link roto: /about

Performance: 3,200ms
Recursos cargados: 45

Accesibilidad:
- Imágenes sin alt: 2
- Estructura de headings: H1 > H2 > H3 ✅
```

### 4. **Form** - Rellenar formularios

```bash
# Tarea de formulario
{
  "title": "Fill contact form",
  "description": "Rellenar formulario en https://example.com/contact con email: test@example.com, nombre: Test User",
  "tag": "browser"
}

# Resultado:
📝 Formulario rellenado en https://example.com/contact
- 3 campos rellenados
- Screenshot guardado
```

### 5. **Screenshot** - Capturas de pantalla

```bash
# Tarea de screenshot
{
  "title": "Screenshot de landing",
  "description": "Screenshot completa de https://mi-empresa.lanzalo.app",
  "tag": "browser"
}

# Resultado:
📸 Screenshot de https://mi-empresa.lanzalo.app
- Full page: true
- Screenshot guardado (base64)
```

---

## 🧪 Testing Automático

El Browser Agent puede testear automáticamente tu web:

### Tests que ejecuta:

1. **Navegación básica**
   - ✅ Sitio carga correctamente
   - ⏱️ Tiempo de carga
   - 📦 Recursos cargados

2. **Responsive**
   - 📱 Vista mobile (375x667)
   - 🖥️ Vista desktop (1920x1080)
   - Screenshots de ambas

3. **Formularios**
   - Detecta todos los formularios
   - Cuenta campos
   - Valida estructura

4. **Links**
   - Encuentra todos los links
   - Verifica que no estén rotos
   - Detecta 404s

5. **Performance**
   - Tiempo de carga total
   - Número de recursos
   - Alerta si >3 segundos

6. **Accesibilidad**
   - Imágenes sin alt text
   - Botones vacíos
   - Estructura de headings

### Ejemplo de uso:

```bash
# Crear tarea de testing
curl -X POST http://localhost:3001/api/user/companies/$COMPANY_ID/chat \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message": "Testea mi web completa"}'

# CEO Agent crea tarea tag='browser'
# Browser Agent ejecuta testing automático
# Notifica resultados en chat
```

---

## 🎮 Casos de Uso

### Caso 1: Competitive Analysis

```
Usuario: "Analiza los precios de competitor.com"

CEO Agent: Crea tarea tag='browser'
Browser Agent:
  1. Navega a competitor.com/pricing
  2. Extrae contenido
  3. LLM analiza precios
  4. Crea reporte con análisis

Resultado: "Competitor ofrece 3 planes entre $9-$99. 
           Nosotros estamos competitivos con $39."
```

### Caso 2: QA Automático

```
Usuario: "Verifica que mi web funcione bien"

CEO Agent: Crea tarea tag='browser' type='test'
Browser Agent:
  1. Navega a empresa.lanzalo.app
  2. Tests de responsive
  3. Valida formularios
  4. Chequea links
  5. Mide performance
  6. Verifica accesibilidad

Resultado: "⚠️ 3 issues encontrados:
           - 2 imágenes sin alt
           - Sitio lento (3.2s)
           - 1 link roto"

CEO Agent: Crea 3 tareas para Code Agent con los fixes
```

### Caso 3: Competitor Research

```
Usuario: "¿Qué features tiene competitor.com?"

CEO Agent: Crea tarea tag='browser'
Browser Agent:
  1. Scrape competitor.com
  2. Extrae features del HTML
  3. LLM analiza y estructura

Research Agent (toma resultado):
  4. Compara con nuestras features
  5. Crea reporte competitivo

Resultado: "Competitor tiene 5 features que no tenemos:
           1. Live chat
           2. API integrations
           3. Custom domains
           ..."
```

### Caso 4: Form Automation

```
Usuario: "Registra mi empresa en Product Hunt"

CEO Agent: Evalúa si es seguro → crea tarea
Browser Agent:
  1. Navega a producthunt.com/register
  2. LLM extrae campos necesarios
  3. Rellena formulario
  4. Screenshot de confirmación

Resultado: "📝 Registro completado en Product Hunt"
```

---

## ⚙️ Configuración

### Playwright Settings

```javascript
{
  headless: true, // Sin interfaz gráfica
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox'
  ],
  userAgent: 'Mozilla/5.0 ...',
  viewport: { 
    width: 1920, 
    height: 1080 
  }
}
```

### Timeouts

- Navegación: 30 segundos
- Links checking: 5 segundos por link
- Screenshots: Sin timeout

### Reuso de Browser

El navegador se mantiene abierto entre tareas para:
- ✅ Faster execution (no reiniciar cada vez)
- ✅ Mantener cookies/sesión si es necesario
- ✅ Reducir uso de memoria

Se cierra solo al detener el agente.

---

## 🔒 Seguridad & Rate Limiting

### System de Tiers (como Polsia)

**Tier 1**: Sites que NO se pueden automatizar
- Twitter, Instagram, LinkedIn, TikTok
- Solo navegar, no login/post
- Usar APIs dedicadas en su lugar

**Tier 1.5**: Sites con CAPTCHA
- HackerNews, Medium, Dev.to
- Login OK si hay credenciales
- NO puede crear cuentas (CAPTCHA bloquea)

**Tier 2**: Sites automatizables
- Hashnode, Substack, BetaList
- Acceso completo
- Puede crear cuentas

**Tier 3**: Todo lo demás
- Default: browse
- Crear cuenta si hace falta

### Verificación automática:

```javascript
const tier = await getSiteTier('twitter.com');
if (tier === 1) {
  throw new Error('Tier 1 site - usar Twitter API en su lugar');
}
```

---

## 📊 Integración con Otros Agentes

### Browser → Research

```
Browser scrapes data → Research analiza y crea reporte
```

### Browser → Code

```
Browser testea web → encuentra bugs → Code Agent arregla
```

### CEO → Browser → CEO

```
Usuario: "Analiza competitor.com"
CEO: Crea tarea browser
Browser: Scrape + análisis
CEO: Resume hallazgos al usuario
```

---

## 🚀 Performance

### Optimizaciones:

1. **Browser Reuse**: No cierra entre tareas
2. **Headless**: Sin GUI = más rápido
3. **Parallel**: Múltiples pages en mismo browser
4. **Smart Waiting**: `networkidle` en vez de timeouts fijos

### Métricas típicas:

- Navegación simple: ~2 segundos
- Scraping: ~3-5 segundos
- Testing completo: ~10-15 segundos
- Screenshot: ~1 segundo

---

## 🐛 Debugging

### Ver logs del browser:

```javascript
// En browser-executor.js
this.browser = await chromium.launch({
  headless: false, // Ver el navegador
  slowMo: 1000 // Slow motion (1s entre acciones)
});
```

### Screenshots automáticos:

Todos los tasks guardan screenshots en base64.

Decodificar:

```bash
echo "BASE64_STRING" | base64 -d > screenshot.png
```

---

## ✅ Testing

### 1. Test básico de navegación

```bash
curl -X POST http://localhost:3001/api/user/companies/$COMPANY_ID/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Test browser",
    "description": "Navegar a https://example.com",
    "tag": "browser"
  }'

# Espera 10 segundos (polling interval)
# Verás en consola:
# 🌐 Browser Agent ejecutando: Test browser
# 🌐 Navegando a: https://example.com
# ✅ Browser Agent completó: Test browser
```

### 2. Test de scraping

```bash
curl -X POST http://localhost:3001/api/user/companies/$COMPANY_ID/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Scrape HN",
    "description": "Extraer títulos de https://news.ycombinator.com",
    "tag": "browser"
  }'
```

### 3. Test de QA automático

```bash
# Vía CEO Agent (más natural)
curl -X POST http://localhost:3001/api/user/companies/$COMPANY_ID/chat \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message": "Testea mi web y dime qué issues encuentras"}'
```

---

## 📋 Roadmap

### ✅ Implementado

- [x] Navegación básica
- [x] Scraping
- [x] Testing automático
- [x] Screenshots
- [x] Análisis de performance
- [x] Accesibilidad básica

### ⏳ Próximas Mejoras

- [ ] Video recording de sesiones
- [ ] Network interception (mock APIs)
- [ ] Geolocation spoofing
- [ ] Cookie/session persistence
- [ ] Proxy support
- [ ] Multi-browser (Firefox, Safari)

---

## ✅ Conclusión

**Browser Agent FUNCIONANDO**:

- ✅ Playwright integrado
- ✅ 5 tipos de tareas (navigate, scrape, test, form, screenshot)
- ✅ Testing automático completo
- ✅ Integrado con task execution loop
- ✅ Notificaciones en chat

**Los agentes ahora pueden:**
- 🌐 Navegar webs
- 📥 Scrape contenido
- 🧪 Testear automáticamente
- 📸 Capturar screenshots
- 🔍 Analizar competidores

**Siguiente**: Frontend UI o más executors (Twitter, Email, Data)
