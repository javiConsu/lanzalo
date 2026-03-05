# 🐦📧 Twitter + Email Agents

## ¿Qué son?

Dos agentes de **marketing y comunicación**:

1. **Twitter Agent** 🐦 - Publica tweets automáticamente
2. **Email Agent** 📧 - Cold outreach y email marketing

**Estado**: Implementados y funcionando. Guardan contenido en DB, listos para publicar cuando configures APIs.

---

## 🐦 TWITTER AGENT

### Capacidades

- ✅ Genera tweets con LLM
- ✅ Rate limiting (2 tweets/día)
- ✅ Validación de 280 caracteres
- ✅ Voz de marca (dark humor, directo, sin fluff)
- ✅ Siempre incluye link a empresa.lanzalo.app
- ✅ Guarda en DB para publicar después

### Tipos de Tweets

| Tipo | Uso | Ejemplo |
|------|-----|---------|
| `launch` | Lanzamiento de producto | "Day 1. Built in 48h. lanzalo.app" |
| `milestone` | Logro alcanzado | "$500 MRR. Ramen secured. lanzalo.app" |
| `feature` | Nueva funcionalidad | "Added analytics. Works. Barely. lanzalo.app" |
| `dark_humor` | Contenido de valor con humor | "Rejected from YC. Pivoted to self-funding. lanzalo.app" |
| `question` | Engagement con audiencia | "What's your biggest marketing pain? lanzalo.app" |

### Voz de Marca

**Reglas**:
- ❌ Sin emojis, sin hashtags
- ❌ Nunca "excited/thrilled"
- ✅ Dark humor, witty, amargo
- ✅ Directo, sin fluff
- ✅ Siempre incluir link

**Ejemplos**:

```
❌ MAL:
"Excited to announce our new feature! 🎉 #startup #innovation"

✅ BIEN:
"Day 3. Still standing. lanzalo.app"

---

❌ MAL:
"We're thrilled to help you succeed with our amazing platform! ✨"

✅ BIEN:
"$500 MRR. Ramen budget secured. lanzalo.app"

---

❌ MAL:
"Check out our incredible new product! 🚀 #AI #SaaS"

✅ BIEN:
"Built this in 48h. Works on mobile. Barely. lanzalo.app"
```

### Testing

```bash
# Crear tarea de tweet
curl -X POST http://localhost:3001/api/user/companies/$COMPANY_ID/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Tweet milestone",
    "description": "Tweet sobre alcanzar $1K MRR",
    "tag": "twitter"
  }'

# Resultado (en DB, no publicado aún):
📝 Tweet creado: "$1K MRR. Month 2. lanzalo.app"
```

### Configurar Twitter API (cuando esté lista)

```javascript
// .env
TWITTER_API_KEY=your_key
TWITTER_API_SECRET=your_secret
TWITTER_ACCESS_TOKEN=your_token
TWITTER_ACCESS_SECRET=your_token_secret

// Descomentar en twitter-executor.js:
const Twitter = require('twitter-api-v2');
const client = new Twitter({ ... });
const result = await client.v2.tweet(tweet.content);
```

### Rate Limiting

- **2 tweets/día** por empresa
- Verificación automática antes de crear
- Error si se excede: `"Rate limit: 2/2 tweets hoy"`

---

## 📧 EMAIL AGENT

### Capacidades

- ✅ 5 tipos de emails (cold, followup, newsletter, transactional, generic)
- ✅ Cold email rate limiting (2/día)
- ✅ Voz founder-to-founder
- ✅ Texto plano (NO HTML)
- ✅ 50-125 palabras (corto y directo)
- ✅ Personalización automática
- ✅ Guarda en DB para enviar después

### Tipos de Emails

#### 1. **Cold Email** (Outreach)

**Uso**: Prospecting, primeros contactos

**Reglas**:
- 50-125 palabras (máximo 150)
- Solo texto plano
- Tono: Founder-to-founder, directo
- Un ask claro al final
- Personalizado

**Ejemplo**:

```
❌ MAL:
"I hope this email finds you well. I wanted to reach out because 
we have an exciting opportunity that I think would be perfect for 
your company. We're a cutting-edge startup..."

✅ BIEN:
"Saw you're hiring 3 devs on LinkedIn.

Built a tool that automates the screening — saved Company X 15hrs/week.

Worth 10 min to demo? empresa.lanzalo.app"
```

#### 2. **Follow-up**

**Uso**: Segunda (o tercera) vez que contactas

**Reglas**:
- Más corto que el original (30-50 palabras)
- Añadir valor nuevo
- Gentle nudge, no pushy

**Ejemplo**:

```
"Quick follow-up — just shipped the feature we discussed 
(automated screening).

3 companies already using it. Slides here if you want to check: 
[link]"
```

#### 3. **Newsletter**

**Uso**: Actualizar suscriptores

**Estructura**:
1. Intro (qué pasó esta semana)
2. Feature/Update principal
3. 2-3 bullets de valor
4. CTA claro

#### 4. **Transactional**

**Uso**: Confirmaciones, resets, notificaciones

**Reglas**:
- Ultra breve y claro
- CTA obvio
- NO marketing

**Ejemplo**:

```
"Confirmación de cuenta creada.

Click aquí para verificar email: [link]

- Equipo Lanzalo"
```

#### 5. **Generic**

**Uso**: Otros casos

---

### Testing

```bash
# Cold email
curl -X POST http://localhost:3001/api/user/companies/$COMPANY_ID/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Cold email a founder",
    "description": "Enviar cold email a founder de SaaS sobre nuestra solución",
    "tag": "email"
  }'

# Follow-up
curl -X POST http://localhost:3001/api/user/companies/$COMPANY_ID/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Follow-up",
    "description": "Seguimiento de email enviado hace 5 días",
    "tag": "email"
  }'
```

### Configurar Email API (cuando esté lista)

**Opciones**:

1. **Resend** (recomendado)
2. SendGrid
3. Postmark
4. AWS SES

**Setup con Resend**:

```javascript
// .env
RESEND_API_KEY=re_xxxxx

// Descomentar en email-executor.js:
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'hola@lanzalo.pro',
  to: email.to,
  subject: email.subject,
  text: email.body
});
```

### Rate Limiting

**Cold emails**: 2/día por empresa
**Otros tipos**: Sin límite

---

## 📊 Base de Datos

### Tabla `tweets`

```sql
CREATE TABLE tweets (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  content TEXT,
  type TEXT, -- launch, milestone, feature, etc.
  published BOOLEAN,
  twitter_id TEXT, -- ID del tweet en Twitter
  created_at TEXT,
  published_at TEXT
);
```

### Tabla `emails`

```sql
CREATE TABLE emails (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  type TEXT, -- cold, followup, newsletter, etc.
  recipient TEXT,
  subject TEXT,
  body TEXT,
  sent BOOLEAN,
  sent_at TEXT,
  opened BOOLEAN,
  clicked BOOLEAN,
  created_at TEXT
);
```

---

## 🎯 Casos de Uso

### Caso 1: Launch Tweet

```
Usuario: "Anuncia el lanzamiento en Twitter"

CEO Agent: Crea tarea tag='twitter' type='launch'
Twitter Agent:
  - Carga contexto de empresa
  - Genera tweet estilo dark humor
  - Valida 280 chars
  - Incluye link
  - Guarda en DB

Resultado: "Day 1. Built in 48h. lanzalo.app"
```

### Caso 2: Cold Outreach Campaign

```
Usuario: "Envía cold emails a 10 founders de SaaS"

CEO Agent: Crea tarea tag='email'
Email Agent:
  - Verifica rate limit (2/día)
  - Genera email personalizado
  - 75 palabras, texto plano
  - Ask claro al final
  - Guarda en DB

CEO Agent: "Email guardado. Rate limit: 1/2 hoy. 
            Configura Resend para enviar automáticamente."
```

### Caso 3: Newsletter Semanal

```
Usuario: "Crea newsletter con updates de esta semana"

CEO Agent: Crea tarea tag='email' type='newsletter'
Email Agent:
  - Carga memoria (features recientes)
  - Genera newsletter estructurado
  - 3-5 secciones
  - CTA claro
  - Guarda en DB

Resultado: Newsletter listo para enviar a lista
```

---

## ⚙️ Integración con CEO Agent

CEO Agent routing:

```javascript
{
  'twitter': 'twitter-agent',
  'email': 'email-agent',
  'content': 'email-agent' // Alias
}
```

**Ejemplos de prompts**:

```
"Tweetea sobre nuestro milestone de $1K MRR"
→ tag='twitter'

"Envía cold email a founders"
→ tag='email'

"Crea newsletter semanal"
→ tag='email' type='newsletter'
```

---

## 📈 Estado Actual

### ✅ Implementado

- [x] Twitter Agent (genera + guarda tweets)
- [x] Email Agent (5 tipos de emails)
- [x] Rate limiting (2/día para cold/tweets)
- [x] Validación de longitud
- [x] Voz de marca consistente
- [x] Base de datos completa

### ⏳ Pendiente

- [ ] Configurar Twitter API (cuando tengas cuenta @lanzalo)
- [ ] Configurar email service (Resend/SendGrid)
- [ ] Auto-tracking de opens/clicks
- [ ] A/B testing de subject lines
- [ ] Email sequences (drip campaigns)

---

## 🚀 Activar Publicación Automática

### Para Twitter:

1. Crear cuenta [@lanzalo](https://twitter.com)
2. Aplicar a Twitter API v2 (Developer Portal)
3. Obtener keys (API key, secret, access token)
4. Añadir a `.env`
5. Descomentar código en `twitter-executor.js`
6. ✅ Tweets se publican automáticamente

### Para Email:

1. Crear cuenta en [Resend](https://resend.com) (gratis hasta 3K emails/mes)
2. Verificar dominio `lanzalo.pro`
3. Obtener API key
4. Añadir a `.env`
5. Descomentar código en `email-executor.js`
6. ✅ Emails se envían automáticamente

---

## ✅ Conclusión

**Twitter + Email Agents FUNCIONANDO**:

- ✅ Generan contenido con LLM
- ✅ Respetan voz de marca
- ✅ Rate limiting automático
- ✅ Guardan en DB
- ✅ Listos para publicar con APIs

**Mientras tanto**:
- Tweets y emails se crean y guardan
- Puedes revisarlos antes de publicar
- Copiar/pegar manualmente si quieres

**Cuando configures APIs**:
- Todo automático
- Agentes publican directamente
- Tracking de métricas

**5 agentes activos**: Code, Research, Browser, Twitter, Email 🎉
