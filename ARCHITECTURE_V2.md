# Arquitectura V2 - Separación Admin/Users

## Problema Detectado

La arquitectura actual mezcla dos sistemas que deben estar separados:

```
❌ ACTUAL (mezclado):
Dashboard → muestra todas las empresas
API → sin autenticación real
Agentes → sin control admin
```

```
✅ CORRECTO (separado):
┌─────────────────────┐
│   ADMIN PANEL       │ ← TÚ (operador plataforma)
│   admin.lanzalo.app │
└─────────────────────┘
         │
         ├─ Monitorear TODAS las empresas
         ├─ Ver costos globales
         ├─ Pausar/eliminar empresas
         ├─ Ajustar quotas
         ├─ Ver logs de agentes
         └─ Analytics globales

┌─────────────────────┐
│   USER DASHBOARD    │ ← CLIENTES
│   app.lanzalo.app   │
└─────────────────────┘
         │
         ├─ Ver SOLO sus empresas
         ├─ Crear nueva empresa
         ├─ Ver actividad de SUS proyectos
         ├─ Configurar billing
         └─ On-demand tasks
```

---

## Estructura Correcta

### 1. Admin Panel (Operador)

**Ruta**: `admin.lanzalo.app` o `/admin`

**Funcionalidades**:
- 👀 Ver TODAS las empresas de TODOS los usuarios
- 💰 Dashboard de costos globales (cuánto gastas en LLM)
- 📊 Métricas de la plataforma:
  - Total MRR
  - Churn rate
  - Cost per company
  - Profit margins
- ⚙️ Controles administrativos:
  - Pausar empresa problemática
  - Ajustar quotas manualmente
  - Ver logs de errores
  - Matar tasks stuck
- 🔍 Debug tools:
  - Ver queries de agentes
  - Revisar código generado
  - Inspeccionar deploys

**Auth**:
- Solo TÚ puedes acceder
- Login con password fuerte
- 2FA obligatorio
- IP whitelist (opcional)

---

### 2. User Dashboard (Clientes)

**Ruta**: `app.lanzalo.app` o `/dashboard`

**Funcionalidades**:
- 🏢 Ver SOLO empresas del usuario logueado
- ➕ Crear nueva empresa (respetando quotas de plan)
- 📈 Ver actividad/logs de SUS proyectos
- 💳 Billing y pagos (Stripe)
- ⚡ Ejecutar tareas on-demand
- ⚙️ Configuración básica:
  - Editar descripción de empresa
  - Pausar/reactivar
  - Ver subdomain

**Auth**:
- Email + password
- OAuth (Google, GitHub)
- Email verification
- Password reset

---

## Implementación Requerida

### A. Sistema de Auth

```javascript
// backend/middleware/auth.js

// Para usuarios normales
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  const user = verifyJWT(token);
  
  if (!user) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  
  req.user = user;
  next();
}

// Para admin
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
}
```

### B. Rutas Separadas

```javascript
// backend/routes/admin.js
router.get('/admin/companies', requireAdmin, async (req, res) => {
  // Ver TODAS las empresas
  const companies = await pool.query('SELECT * FROM companies');
  res.json(companies.rows);
});

router.get('/admin/costs', requireAdmin, async (req, res) => {
  // Costos globales
  const costs = await pool.query(`
    SELECT 
      DATE(recorded_at) as date,
      SUM(estimated_cost) as total_cost
    FROM llm_usage
    GROUP BY DATE(recorded_at)
    ORDER BY date DESC
    LIMIT 30
  `);
  res.json(costs.rows);
});

// backend/routes/user.js
router.get('/user/companies', requireAuth, async (req, res) => {
  // Ver SOLO empresas del usuario
  const companies = await pool.query(
    'SELECT * FROM companies WHERE user_id = $1',
    [req.user.id]
  );
  res.json(companies.rows);
});
```

### C. Tabla de Users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user', -- 'user' o 'admin'
  plan VARCHAR(50) DEFAULT 'free', -- 'free' o 'pro'
  stripe_customer_id VARCHAR(255),
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Admin inicial (TÚ)
INSERT INTO users (email, password_hash, role) 
VALUES ('admin@lanzalo.app', '<hash>', 'admin');
```

### D. Frontend Separado

```
frontend/
├── admin/              # Admin panel
│   ├── app/
│   │   ├── page.tsx    # Overview global
│   │   ├── companies/  # Todas las empresas
│   │   ├── costs/      # Costos LLM
│   │   ├── users/      # Gestión usuarios
│   │   └── logs/       # Debug logs
│   └── components/
│
├── app/                # User dashboard
│   ├── login/
│   ├── register/
│   ├── dashboard/      # Sus empresas
│   ├── billing/
│   └── settings/
│
└── landing/            # Landing page pública
    └── page.tsx        # Marketing site
```

---

## Flujos Correctos

### Flujo Admin (TÚ)

```
1. Login en admin.lanzalo.app
2. Ver dashboard global:
   - 150 empresas activas
   - $250/mes en costos LLM
   - $5,850 MRR
   - Margen: 95.7%
3. Detectar empresa con costos altos
4. Inspeccionar logs de agentes
5. Ajustar quota o pausar si es abuso
6. Ver código generado por agentes
7. Revisar errores de deployment
```

### Flujo Usuario (CLIENTE)

```
1. Registro en app.lanzalo.app
2. Crear primera empresa:
   - Nombre: "SaaS Analytics"
   - Descripción: "..."
   - Plan: Free (3 tareas/día)
3. Ver dashboard CON SOLO SU empresa
4. Ejecutar tarea: "crear landing page"
5. Ver actividad en tiempo real
6. Upgrade a Pro ($39/mes)
7. Ejecutar más tareas
8. Ver ingresos de su empresa
9. Lanzalo cobra 20% automáticamente
```

---

## Permisos y Scopes

### Admin puede:
- ✅ Ver todo
- ✅ Modificar todo
- ✅ Eliminar empresas
- ✅ Ajustar quotas
- ✅ Ver costos reales
- ✅ Acceder a logs internos
- ✅ Matar procesos
- ✅ Deploy manual

### User puede:
- ✅ Ver SUS empresas
- ✅ Crear empresas (dentro de su quota)
- ✅ Ejecutar tareas (dentro de su plan)
- ✅ Ver actividad de SUS proyectos
- ✅ Configurar billing
- ❌ Ver otras empresas
- ❌ Ver costos LLM reales
- ❌ Modificar quotas
- ❌ Acceder a logs de sistema

---

## Implementación Prioritaria

### Fase 1 (Crítico - 2 días)
1. Sistema de auth (JWT)
2. Tabla de users
3. Middleware requireAuth/requireAdmin
4. Separar rutas /admin y /user

### Fase 2 (Importante - 3 días)
5. Admin panel básico
6. User dashboard básico
7. Login/register UI
8. Proteger todas las rutas

### Fase 3 (Nice-to-have - 1 semana)
9. Admin analytics avanzado
10. User onboarding
11. Email verification
12. 2FA para admin

---

## Checklist de Seguridad

- [ ] Admin panel requiere auth
- [ ] Users solo ven SUS datos
- [ ] Queries filtran por user_id
- [ ] No hay endpoints públicos sensibles
- [ ] Passwords hasheados (bcrypt)
- [ ] JWT con expiry corto
- [ ] Rate limiting por user
- [ ] Logs de acceso admin
- [ ] IP whitelist para admin (opcional)
- [ ] 2FA para admin
- [ ] Audit trail de cambios admin

---

## Conclusión

**Sin esta separación, tienes un problema grave:**

❌ Cualquier usuario podría:
- Ver empresas de otros
- Ejecutar tareas sin límite
- Ver costos reales
- Acceder a datos sensibles

✅ Con la separación:
- Admin (TÚ) controlas todo
- Users solo ven lo suyo
- Seguridad por capas
- Escalable y mantenible

**Esto es CRÍTICO antes de lanzar a producción.**
