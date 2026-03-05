# 🎨 Frontend UI - Dashboard Web

## ¿Qué es?

**Frontend moderno** en React + Vite + Tailwind CSS para interactuar con el sistema Lanzalo.

**Stack**:
- ⚛️ React 18
- ⚡ Vite (build tool)
- 🎨 Tailwind CSS (dark theme)
- 🔄 React Router (navegación)
- 📡 WebSocket (live updates)
- 🔐 JWT Auth

---

## 🎯 Páginas

### 1. **Login** (`/`)

```
┌──────────────────────────────────┐
│                                  │
│          🚀 Lanzalo              │
│    Tu co-fundador IA autónomo    │
│                                  │
│  ┌────────────────────────────┐  │
│  │  Email                     │  │
│  │  Password                  │  │
│  │  [ Iniciar Sesión ]        │  │
│  └────────────────────────────┘  │
│                                  │
│  Demo: admin@lanzalo.local       │
│        admin123                  │
│                                  │
└──────────────────────────────────┘
```

**Features**:
- Login con email/password
- Auth JWT
- Demo credentials visible
- Dark theme gradient

---

### 2. **Chat** (`/chat`)

```
┌────────────┬──────────────────────────────────┐
│            │  [Mi Empresa ▼]    🟢 6 agentes  │
│  Sidebar   ├──────────────────────────────────┤
│            │                                  │
│ 💬 Chat    │  👤 Usuario                      │
│ 📋 Backlog │  Necesito añadir analytics       │
│ 📊 Metrics │                                  │
│            │                🤖 CEO Agent       │
│            │                Dale, creo una    │
│            │                tarea para Code    │
│            │                                  │
│            ├──────────────────────────────────┤
│            │  [ Describe lo que necesitas... ]│
│            │  [        Enviar         ]       │
│            │                                  │
│  👤 admin  │  Ejemplos: "Añade analytics"...  │
│  [Logout]  │                                  │
└────────────┴──────────────────────────────────┘
```

**Features**:
- Chat conversacional con CEO Agent
- Historial de mensajes (50 últimos)
- Auto-scroll al nuevo mensaje
- WebSocket para live updates
- Selector de empresa
- Indicador de agentes activos
- Typing indicator (cuando LLM está pensando)
- Ejemplos de prompts

---

### 3. **Backlog** (`/backlog`)

```
┌────────────┬──────────────────────────────────┐
│            │  [Mi Empresa ▼]    12 pendientes │
│  Sidebar   ├──────────────────────────────────┤
│            │                                  │
│ 💬 Chat    │  💻  Añadir Google Analytics     │
│ 📋 Backlog │      engineering • HIGH          │
│ 📊 Metrics │      [in_progress]               │
│            │      Asignado: code-agent        │
│            │                                  │
│            │  🔍  Analizar competidores       │
│            │      research • MEDIUM           │
│            │      [todo]                      │
│            │      Asignado: research-agent    │
│            │                                  │
│            │  🐦  Tweet sobre milestone       │
│            │      twitter • LOW               │
│            │      [completed] ✅              │
│            │      Asignado: twitter-agent     │
└────────────┴──────────────────────────────────┘
```

**Features**:
- Ver todas las tareas (todo, in_progress, completed, failed, blocked)
- Estados con colores (green = completed, blue = in_progress, etc.)
- Prioridades (critical, high, medium, low)
- Agente asignado con icono
- Error messages (si failed)
- Auto-refresh cada 10 segundos
- Filtros por empresa

---

### 4. **Metrics** (`/metrics`)

```
┌────────────┬──────────────────────────────────┐
│            │  [Mi Empresa ▼]    [Actualizar]  │
│  Sidebar   ├──────────────────────────────────┤
│            │                                  │
│ 💬 Chat    │  ┌─────┐  ┌─────┐  ┌─────┐      │
│ 📋 Backlog │  │ ✅  │  │ 📧  │  │ 🐦  │      │
│ 📊 Metrics │  │ 8/12│  │ 3/5 │  │  3  │      │
│            │  │ 67% │  │ 60% │  │     │      │
│            │  └─────┘  └─────┘  └─────┘      │
│            │                                  │
│            │  Features Implementadas (4)      │
│            │  ✓ Analytics                     │
│            │  ✓ Blog                          │
│            │  ✓ Contact form                  │
│            │  ✓ SEO                           │
│            │                                  │
│            │  Estado de Tareas               │
│            │  8 completadas | 2 en progreso  │
│            │  1 pendiente   | 1 fallida      │
└────────────┴──────────────────────────────────┘
```

**Features**:
- Dashboard de métricas (tasks, emails, tweets, features)
- Stats cards con porcentajes
- Progress bars visuales
- Features list (de memoria Layer 1)
- Task breakdown (completed/in_progress/pending/failed)
- Botón "Actualizar" (llama a Data Agent)

---

## 🎨 Diseño

### Dark Theme

```css
Background: #111827 (gray-900)
Cards: #1f2937 (gray-800)
Borders: #374151 (gray-700)
Text: #f3f4f6 (white/gray-100)
Accent: #0ea5e9 (blue-500)
```

### Components

- **Sidebar**: Fijo, 256px, navegación
- **Header**: Selector de empresa + info
- **Cards**: Bordes sutiles, hover effects
- **Messages**: Bubbles estilo chat moderno
- **Stats**: Cards con iconos grandes
- **Task Cards**: Iconos de agentes, badges de estado

---

## 🔄 Live Updates (WebSocket)

```javascript
const ws = new WebSocket('ws://localhost:3001/ws')

ws.onmessage = (event) => {
  const activity = JSON.parse(event.data)
  
  if (activity.type === 'task_completed') {
    // Recargar mensajes/backlog
  }
}
```

**Eventos**:
- `task_completed` → Nueva notificación en chat
- `task_failed` → Error visible
- Backlog se actualiza automáticamente

---

## 🚀 Cómo Usarlo

### 1. Instalar dependencias

```bash
cd frontend
npm install
```

### 2. Desarrollo

```bash
npm run dev
# Frontend en http://localhost:3000
# Proxy a backend en http://localhost:3001
```

### 3. Build producción

```bash
npm run build
# Output en frontend/dist/
```

---

## 📡 API Integration

### Auth

```javascript
POST /api/auth/login
{
  "email": "admin@lanzalo.local",
  "password": "admin123"
}

Response:
{
  "token": "jwt-token",
  "user": { "id": "...", "email": "...", "is_admin": true }
}
```

Token guardado en `localStorage`:

```javascript
localStorage.setItem('token', token)
```

Headers en requests:

```javascript
headers: {
  'Authorization': `Bearer ${token}`
}
```

### Chat

```javascript
POST /api/user/companies/:id/chat
{
  "message": "Necesito añadir analytics"
}

Response:
{
  "success": true,
  "message": "Dale, creo una tarea...",
  "action": "create_task",
  "taskId": "uuid",
  "data": { ... }
}
```

### Backlog

```javascript
GET /api/user/companies/:id/backlog

Response:
{
  "backlog": [
    {
      "id": "...",
      "title": "Añadir analytics",
      "status": "in_progress",
      "tag": "engineering",
      "assigned_to": "code-agent",
      "priority": "high"
    }
  ]
}
```

### Metrics

```javascript
// Crear tarea para Data Agent
POST /api/user/companies/:id/tasks
{
  "title": "Calcular métricas",
  "description": "Métricas de la empresa",
  "tag": "data",
  "priority": "high"
}

// Esperar 2-5 segundos
// Data Agent procesa y genera reporte
```

---

## 🎮 User Flow

### Primera vez

1. **Login** → `admin@lanzalo.local / admin123`
2. **Dashboard** → Sidebar + seleccionar empresa
3. **Chat** → "Necesito añadir analytics a mi web"
4. **CEO Agent** → Crea tarea, asigna a Code Agent
5. **Backlog** → Ver tarea `in_progress`
6. **10 segundos** → Code Agent completa
7. **Chat** → Notificación: "✅ Analytics añadido"
8. **Metrics** → Ver feature "Analytics" en lista

### Uso regular

1. **Chat** → Describir necesidad
2. **Backlog** → Monitorear progreso
3. **Metrics** → Ver resultados

---

## 🔒 Auth Flow

```
App.jsx
  ↓
¿Hay token en localStorage?
  ↓ NO
Login.jsx → login → guarda token → Dashboard
  ↓ SÍ
Verifica token con /api/user/profile
  ↓ Válido
Dashboard (authenticated)
  ↓ Inválido
Login.jsx
```

**Protected routes**: Todas excepto Login

**Logout**: Borra token de localStorage

---

## 📱 Responsive

- **Desktop**: Sidebar fijo + content
- **Tablet**: Sidebar colapsable (TODO)
- **Mobile**: Sidebar drawer (TODO)

Actualmente optimizado para desktop (1280px+)

---

## 🎨 Tailwind Config

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        500: '#0ea5e9', // Blue
        600: '#0284c7',
        700: '#0369a1'
      }
    }
  }
}
```

**Dark mode**: Default (siempre dark)

---

## 🐛 Known Issues

1. ❌ **No error boundary** (crashes no manejados)
2. ❌ **No offline mode** (necesita backend)
3. ❌ **No optimistic updates** (espera respuesta)
4. ⚠️ **WebSocket reconnection** (básico)
5. ⚠️ **Mobile responsive** (falta optimizar)

---

## ✅ Mejoras Futuras

### Prioritarias

- [ ] Error boundaries
- [ ] Loading states mejorados
- [ ] Optimistic updates (mensajes)
- [ ] Toast notifications
- [ ] Mobile responsive completo

### Nice-to-have

- [ ] Dark/Light mode toggle
- [ ] Keyboard shortcuts
- [ ] Drag & drop (reordenar tareas)
- [ ] Real-time typing indicator
- [ ] Message reactions
- [ ] File uploads
- [ ] Code syntax highlighting
- [ ] Markdown support en chat

---

## 🚀 Deploy

### Opción A: Servir desde backend

```javascript
// backend/server-local.js
const path = require('path')

app.use(express.static(path.join(__dirname, '../frontend/dist')))

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'))
})
```

### Opción B: Vercel

```bash
cd frontend
vercel deploy

# Configurar env variable:
# VITE_API_URL=https://tu-backend.railway.app
```

### Opción C: Netlify

```bash
cd frontend
npm run build
netlify deploy --prod --dir=dist
```

---

## ✅ Conclusión

**Frontend UI COMPLETO**:

- ✅ Login con JWT auth
- ✅ Chat conversacional con CEO Agent
- ✅ Backlog visual de tareas
- ✅ Dashboard de métricas
- ✅ Dark theme moderno
- ✅ WebSocket live updates
- ✅ Responsive (desktop)

**Ahora puedes**:
- 💬 Chatear con CEO Agent visualmente
- 📋 Ver backlog de tareas en tiempo real
- 📊 Dashboard de métricas
- 🎨 Interfaz moderna y profesional

**No más `curl` necesario** 🎉

**Stack**: React + Vite + Tailwind + WebSocket
**Tiempo de desarrollo**: ~2 horas
**Archivos**: 15 components/pages

**SISTEMA COMPLETO FUNCIONANDO** 🎨🤖✨
