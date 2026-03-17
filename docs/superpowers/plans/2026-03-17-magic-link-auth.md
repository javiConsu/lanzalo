# Plan: Magic Link Auth (reemplazar Clerk)

## Goal
Reemplazar Clerk con magic link + JWT propio usando la infraestructura parcial que ya existe.

## Architecture Overview
La app ya tiene `minimal-login.js` (envía magic link via Resend) y `verify-magic.js` (verifica token y genera JWT). El problema es que el middleware `requireAuth` y el frontend `App.jsx` siguen usando Clerk. Este plan desconecta Clerk y conecta el sistema JWT propio.

**Flujo objetivo:**
1. Usuario introduce email → `POST /api/minimal-login` → token guardado en `login_tokens` + email enviado
2. Usuario hace click en link → `GET /api/verify-magic?token=XXX` → JWT 30 días → redirect a `/?auth_token=JWT&user=JSON`
3. Frontend lee `?auth_token`, guarda en `localStorage`, recarga sin params
4. Todas las llamadas API llevan `Authorization: Bearer <JWT>`
5. `requireAuth` verifica JWT y carga `req.user` de la DB

## Tech Stack
- Backend: Node.js, Express, `jsonwebtoken` (ya instalado), `resend` (ya instalado), PostgreSQL
- Frontend: React, localStorage para persistencia del token
- Sin dependencias nuevas

---

## File Mapping

### Crear
| Archivo | Propósito |
|---------|-----------|
| `database/migrations/034_login_tokens.sql` | Tabla `login_tokens` como migración oficial |
| `frontend/src/hooks/useAuth.js` | Hook que encapsula lógica auth (token + user desde localStorage/API) |

### Modificar
| Archivo | Cambio |
|---------|--------|
| `backend/middleware/auth.js` | Reemplazar `requireAuth` Clerk → verificación JWT propia |
| `backend/routes/auth.js` | Eliminar endpoints Clerk, mantener solo `/verify` (protegido con nuevo requireAuth) |
| `backend/routes/minimal-login.js` | Cambiar `login_tokens` para que ON CONFLICT use `email` (unique constraint desde migración) |
| `backend/routes/verify-magic.js` | Cambiar expiry de JWT: 15min → 30 días; fix magic link URL a usar FRONTEND_URL consistente |
| `backend/migrate.js` | Añadir migration 034 al array de migraciones |
| `frontend/src/main.jsx` | Eliminar `ClerkProvider`, renderizar `<App />` directamente |
| `frontend/src/App.jsx` | Reemplazar hooks Clerk con `useAuth` propio; eliminar `isSignedIn`/`isLoaded`/`getToken` |
| `frontend/src/pages/Login.jsx` | Reemplazar `<SignIn>/<SignUp>` Clerk con formulario email simple |

---

## Tasks

### FASE 1 — Base de datos

- [ ] Crear `database/migrations/034_login_tokens.sql`
  ```sql
  CREATE TABLE IF NOT EXISTS login_tokens (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_login_tokens_token ON login_tokens(token);
  CREATE INDEX IF NOT EXISTS idx_login_tokens_email ON login_tokens(email);
  ```
- [ ] Añadir migración al array en `backend/migrate.js`:
  ```js
  { name: '034_login_tokens.sql', file: path.join(__dirname, '..', 'database', 'migrations', '034_login_tokens.sql') },
  ```
- [ ] Ejecutar migración: `cd backend && node migrate.js`
- [ ] Verificar: `psql $DATABASE_URL -c "\d login_tokens"`
- [ ] Commit: `feat: migration 034 — login_tokens table`

---

### FASE 2 — Backend: nuevo middleware de auth

- [ ] Abrir `backend/middleware/auth.js`
- [ ] Reemplazar `requireAuth` por verificación JWT:
  ```js
  async function requireAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: 'No autorizado', message: 'Token JWT requerido' });
    }
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      const result = await pool.query(
        `SELECT id, email, name, role, plan, subscription_tier,
                trial_ends_at, onboarding_completed, business_slots,
                referral_code, credits, created_at
         FROM users WHERE id = $1`,
        [payload.id]
      );
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Usuario no encontrado' });
      }
      req.user = result.rows[0];
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }
  }
  ```
- [ ] Actualizar `optionalAuth` de la misma forma (sin lanzar 401 si falla):
  ```js
  async function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return next();
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      const result = await pool.query('SELECT id, email, name, role, plan FROM users WHERE id = $1', [payload.id]);
      if (result.rows[0]) req.user = result.rows[0];
    } catch (e) {}
    next();
  }
  ```
- [ ] Eliminar imports de `@clerk/clerk-sdk-node` del archivo
- [ ] Eliminar `hashPassword`, `verifyPassword` (sin usos — si hay usos, dejar por ahora)
- [ ] Actualizar `generateToken` para emitir tokens de 30 días:
  ```js
  function generateToken(user) {
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role, plan: user.plan },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
  }
  ```
- [ ] Verificar que el servidor arranca sin errores: `node server.js` (Ctrl+C)
- [ ] Commit: `feat: replace Clerk middleware with JWT auth`

---

### FASE 3 — Backend: limpiar rutas de auth

- [ ] Abrir `backend/routes/auth.js`
- [ ] Eliminar imports y uso de `@clerk/clerk-sdk-node` y `clerkClient`
- [ ] Eliminar endpoint `POST /api/auth/sync` (ya no necesario)
- [ ] Mantener `GET /api/auth/verify` (protegido con `requireAuth` — ya usará JWT)
- [ ] Mantener `GET /api/auth/status` pero limpiar referencias a Clerk (devolver `{ auth: 'jwt', status: 'ok' }`)
- [ ] Verificar que el servidor arranca: `node server.js`
- [ ] Commit: `feat: remove Clerk from auth routes`

---

### FASE 4 — Backend: arreglar minimal-login y verify-magic

**Flujo de URLs:**
```
email → link en email → BACKEND /api/verify-magic?token=XXX → valida → redirect FRONTEND /?auth_token=JWT&user=JSON → App.jsx lee params y llama signIn()
```

- [ ] Abrir `backend/routes/minimal-login.js`
- [ ] Eliminar el bloque `CREATE TABLE IF NOT EXISTS login_tokens` (ya existe por migración)
- [ ] Cambiar la URL del magic link para que apunte al BACKEND (no al frontend):
  ```js
  const BACKEND_URL = process.env.BACKEND_URL || 'https://lanzalo-production.up.railway.app';
  const magicLink = `${BACKEND_URL}/api/verify-magic?token=${token}`;
  ```
  > Esto llama al backend que valida el token y hace el redirect final al frontend con el JWT
- [ ] Simplificar la inserción del token (sin ON CONFLICT, ya borramos antes):
  ```js
  // Borrar tokens anteriores de este email
  await pool.query('DELETE FROM login_tokens WHERE email = $1', [email.toLowerCase()]);
  // Insertar nuevo token
  await pool.query(
    'INSERT INTO login_tokens (email, token, expires_at) VALUES ($1, $2, $3)',
    [email.toLowerCase(), token, expiresAt]
  );
  ```
- [ ] Abrir `backend/routes/verify-magic.js`
- [ ] Verificar que el redirect apunta a `${FRONTEND_URL}?auth_token=${jwt}&user=${userEncoded}` (ya correcto)
- [ ] Verificar flujo de envío de email con curl local (sin DB real, solo verificar logs)
- [ ] Commit: `fix: cleanup minimal-login and verify-magic`

---

### FASE 5 — Frontend: eliminar Clerk

- [ ] Abrir `frontend/src/main.jsx`
- [ ] Eliminar import `ClerkProvider`, `esES`, `@clerk/clerk-react`
- [ ] Cambiar render a:
  ```jsx
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
  ```
- [ ] Commit: `feat: remove ClerkProvider from main.jsx`

---

### FASE 6 — Frontend: hook useAuth

- [ ] Crear `frontend/src/hooks/useAuth.js`:
  ```js
  import { useState, useEffect, useCallback } from 'react'
  import { apiUrl } from '../api.js'

  export function useAuth() {
    const [token, setToken] = useState(() => localStorage.getItem('token'))
    const [user, setUser] = useState(() => {
      try { return JSON.parse(localStorage.getItem('lanzalo_user') || 'null') } catch { return null }
    })
    const [loading, setLoading] = useState(!token) // si hay token, empezar con loading=false

    const isSignedIn = !!token && !!user

    // Si hay token en localStorage pero no user, cargar desde API
    useEffect(() => {
      if (!token) { setLoading(false); return }
      if (user) { setLoading(false); return }

      setLoading(true)
      fetch(apiUrl('/api/user/profile'), {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.ok ? res.json() : Promise.reject(res.status))
        .then(data => {
          const u = data.user || data
          setUser(u)
          localStorage.setItem('lanzalo_user', JSON.stringify(u))
        })
        .catch(() => {
          // Token inválido — limpiar
          localStorage.removeItem('token')
          localStorage.removeItem('lanzalo_user')
          setToken(null)
          setUser(null)
        })
        .finally(() => setLoading(false))
    }, [token])

    const signIn = useCallback((newToken, newUser) => {
      localStorage.setItem('token', newToken)
      localStorage.setItem('lanzalo_user', JSON.stringify(newUser))
      if (newUser?.id) localStorage.setItem('lanzalo_user_id', newUser.id)
      setToken(newToken)
      setUser(newUser)
    }, [])

    const signOut = useCallback(() => {
      localStorage.removeItem('token')
      localStorage.removeItem('lanzalo_user')
      localStorage.removeItem('lanzalo_user_id')
      setToken(null)
      setUser(null)
    }, [])

    return { token, user, loading, isSignedIn, signIn, signOut }
  }
  ```
- [ ] Commit: `feat: add useAuth hook for JWT-based auth`

---

### FASE 7 — Frontend: Login.jsx (formulario email)

- [ ] Abrir `frontend/src/pages/Login.jsx`
- [ ] Reemplazar completamente con formulario de email:
  ```jsx
  import { useState } from 'react'
  import { apiUrl } from '../api.js'

  export default function Login({ onClose }) {
    const [email, setEmail] = useState('')
    const [sent, setSent] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
      e.preventDefault()
      setLoading(true)
      setError('')
      try {
        const res = await fetch(apiUrl('/api/minimal-login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.toLowerCase() })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Error enviando email')
        setSent(true)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (sent) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full text-center border border-gray-700">
            <div className="text-5xl mb-4">📧</div>
            <h2 className="text-2xl font-bold text-white mb-2">Revisa tu email</h2>
            <p className="text-gray-400 mb-4">
              Enviamos un enlace mágico a <strong className="text-white">{email}</strong>
            </p>
            <p className="text-sm text-gray-500">El enlace expira en 15 minutos.</p>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-4">
        <div className="text-center mb-6">
          {onClose && (
            <button onClick={onClose} className="text-sm text-gray-500 hover:text-white transition-colors mb-4 inline-flex items-center gap-1">
              ← Volver
            </button>
          )}
          <h1 className="text-4xl font-bold text-white mb-2">🚀 Lanzalo</h1>
          <p className="text-gray-400">Tu co-fundador IA autónomo</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-2xl p-8 max-w-md w-full border border-gray-700">
          <h2 className="text-xl font-bold text-white mb-6 text-center">Entrar con email</h2>
          <label className="block text-sm text-gray-400 mb-2">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 mb-4"
          />
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-gray-900 font-bold rounded-lg transition-colors"
          >
            {loading ? 'Enviando...' : 'Enviar enlace mágico'}
          </button>
          <p className="text-center text-gray-500 text-xs mt-4">Te enviaremos un enlace para acceder sin contraseña.</p>
        </form>
      </div>
    )
  }
  ```
- [ ] Commit: `feat: replace Clerk SignIn/SignUp with magic link email form`

---

### FASE 8 — Frontend: App.jsx (reemplazar Clerk hooks)

- [ ] Abrir `frontend/src/App.jsx`
- [ ] Añadir import del nuevo hook: `import { useAuth } from './hooks/useAuth'`
- [ ] Reemplazar las líneas de Clerk:
  ```js
  // ANTES:
  import { useAuth, useClerk } from '@clerk/clerk-react'
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const { signOut } = useClerk()

  // DESPUÉS:
  import { useAuth } from './hooks/useAuth'
  const { token, user, loading: authLoading, isSignedIn, signIn, signOut } = useAuth()
  ```
- [ ] Reemplazar el `useEffect` de Clerk (líneas ~98-170) con:
  ```js
  // Leer ?auth_token de la URL (viene del magic link callback)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const authToken = urlParams.get('auth_token')
    const userParam = urlParams.get('user')
    if (authToken && userParam) {
      try {
        const userData = JSON.parse(decodeURIComponent(userParam))
        signIn(authToken, userData)
        // Limpiar URL sin recargar
        window.history.replaceState({}, '', window.location.pathname)
      } catch (e) {
        console.error('[App] Error parsing auth callback:', e)
      }
    }
  }, [])

  // Analytics identify cuando user carga
  useEffect(() => {
    if (!user?.id) return
    localStorage.setItem('lanzalo_user_id', user.id)
    identifyLanzaloUser({
      userId: user.id,
      plan: user.plan || 'trial',
      fechaRegistro: user.created_at || '',
      tipoUsuario: user.is_agent ? 'agente_autonomo' : 'founder_humano',
    })
    trackSessionAndCheckActivation({
      userId: user.id,
      plan: user.plan || 'trial',
      fechaRegistro: user.created_at || '',
    })
  }, [user?.id])
  ```
- [ ] Reemplazar el estado `[token, setToken]` y `[user, setUser]` — eliminarlos (ahora vienen del hook)
- [ ] Actualizar `handleLogout` para usar `signOut` del hook (ya no hay `signOut()` de Clerk asíncrono):
  ```js
  const handleLogout = () => {
    signOut()
    window.location.href = '/'
  }
  ```
- [ ] Actualizar el guard de loading: cambiar `!isLoaded || loading` → `authLoading`
- [ ] Eliminar el intervalo de refresh de Clerk (el JWT de 30 días no necesita refresh frecuente)
- [ ] Eliminar imports de `@clerk/clerk-react`
- [ ] Commit: `feat: replace Clerk hooks with useAuth in App.jsx`

---

### FASE 9 — Verificación end-to-end

- [ ] Iniciar el servidor: `cd backend && node server.js`
- [ ] Verificar que arranca sin errores de Clerk
- [ ] Test con curl:
  ```bash
  curl -X POST http://localhost:3000/api/minimal-login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com"}'
  # Esperado: { "success": true, "message": "Link enviado! Revisa tu email." }
  ```
- [ ] Test de endpoint protegido sin token:
  ```bash
  curl http://localhost:3000/api/user/profile
  # Esperado: 401 { "error": "No autorizado" }
  ```
- [ ] Iniciar el frontend: `cd frontend && npm run dev`
- [ ] Verificar que la landing carga sin errores de consola relacionados con Clerk
- [ ] Verificar que el formulario de Login muestra el campo de email (no `<SignIn>`)
- [ ] Commit: `test: verify magic link end-to-end`

---

### FASE 10 — Limpieza de dependencias (opcional, post-verificación)

- [ ] En `frontend/package.json`: eliminar `@clerk/clerk-react`
- [ ] En `backend/package.json`: eliminar `@clerk/clerk-sdk-node`
- [ ] `cd frontend && npm install` + `cd backend && npm install`
- [ ] Verificar que todo sigue funcionando
- [ ] Commit: `chore: remove Clerk dependencies`

---

## Consideraciones

- **`clerk_user_id` en DB**: La columna existe en `users` — dejarla, no rompe nada. No es necesario eliminarla en este plan.
- **`password_hash`**: `minimal-login.js` actualmente inserta `password_hash = 'magic-link'` para usuarios nuevos. Si la columna no existe en `users`, esto fallará — verificar con `\d users` antes de la FASE 4.
- **`RecoverPassword.jsx`**: Usa `password_hash` de Clerk. Después de este plan ya no será necesario — dejarlo por ahora, no conectarlo desde ningún lugar.
- **Variables de entorno ya no necesarias** (post-limpieza): `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`

## Orden de ejecución recomendado

```
FASE 1 (DB) → FASE 2 (middleware) → FASE 3 (routes) → FASE 4 (magic routes)
→ FASE 5 (main.jsx) → FASE 6 (hook) → FASE 7 (Login) → FASE 8 (App.jsx)
→ FASE 9 (verificar) → FASE 10 (limpiar deps)
```
