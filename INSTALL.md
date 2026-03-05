# Guía de Instalación - Lanzalo

## Requisitos Previos

- **Node.js** 18 o superior
- **PostgreSQL** 14+ (o cuenta de Supabase)
- **OpenRouter API Key** ([obtener aquí](https://openrouter.ai/))
- **Stripe Account** (opcional, para pagos)

## Instalación Rápida

```bash
# 1. Clonar repositorio
git clone https://github.com/tu-usuario/lanzalo.git
cd lanzalo

# 2. Ejecutar script de instalación
chmod +x setup.sh
./setup.sh

# 3. Configurar variables de entorno
nano .env

# 4. Iniciar servidor
npm run dev
```

## Instalación Manual

### 1. Instalar Dependencias

```bash
# Backend
npm install

# Frontend
cd frontend
npm install
cd ..
```

### 2. Configurar Base de Datos

#### Opción A: PostgreSQL Local

```bash
# Crear base de datos
createdb lanzalo

# Ejecutar migraciones
psql lanzalo < database/schema.sql
psql lanzalo < database/migrations/001_add_quotas.sql
```

#### Opción B: Supabase (Recomendado)

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Obtener connection string
3. Ejecutar SQL desde el editor de Supabase:
   - Copiar contenido de `database/schema.sql`
   - Copiar contenido de `database/migrations/001_add_quotas.sql`

### 3. Configurar Variables de Entorno

Copia `.env.example` a `.env`:

```bash
cp .env.example .env
```

Edita `.env` con tus credenciales:

```env
# Base de datos
DATABASE_URL=postgresql://user:password@localhost:5432/lanzalo

# OpenRouter (para LLM)
OPENROUTER_API_KEY=sk-or-v1-xxxxx

# Stripe (opcional)
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Email (opcional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-app-password

# Deployment (opcional)
VERCEL_TOKEN=xxxxx
DEPLOY_DOMAIN=lanzalo.app
```

### 4. Iniciar Servidores

#### Modo Desarrollo (Backend + Frontend)

```bash
npm run dev
```

Esto inicia:
- Backend API: `http://localhost:3001`
- Frontend Dashboard: `http://localhost:3000`

#### Solo Backend

```bash
npm run dev:backend
```

#### Solo Frontend

```bash
npm run dev:frontend
```

### 5. Verificar Instalación

```bash
# Test de salud
curl http://localhost:3001/health

# Debería retornar:
# {"status":"ok","timestamp":"..."}
```

## Testing

```bash
# Test de integración completo
npm test
```

El test creará una empresa de prueba y ejecutará todo el ciclo:
- Creación de empresa
- Ejecución de agentes
- Verificación de quotas
- Tracking de costos
- Cleanup

## Deployment

### Backend (Railway)

```bash
# Instalar CLI de Railway
npm i -g @railway/cli

# Login
railway login

# Deploy
railway up
```

### Frontend (Vercel)

```bash
# Instalar CLI de Vercel
npm i -g vercel

# Deploy
cd frontend
vercel --prod
```

## Troubleshooting

### Error: "Cannot connect to database"

- Verifica que PostgreSQL esté corriendo: `pg_isready`
- Verifica la URL de conexión en `.env`
- Si usas Supabase, verifica que la IP esté permitida

### Error: "OPENROUTER_API_KEY not configured"

- Obtén una API key en [openrouter.ai](https://openrouter.ai/)
- Agrégala a `.env`
- Reinicia el servidor

### Error: "Port 3001 already in use"

```bash
# Encontrar proceso usando el puerto
lsof -i :3001

# Matar proceso
kill -9 <PID>
```

### Los agentes no se ejecutan

- Verifica que el orchestrator esté corriendo
- Revisa logs: `npm run dev:backend`
- Verifica quotas de la empresa

### Costos LLM muy altos

- Revisa `MODEL_STRATEGY` en `backend/llm.js`
- Usa modelos más baratos para tareas simples
- Ajusta límites de tokens en quotas

## Siguientes Pasos

1. **Crear tu primera empresa**: `POST /api/companies`
2. **Ejecutar un agente**: `POST /api/tasks/run`
3. **Ver el dashboard**: `http://localhost:3000`
4. **Configurar webhooks de Stripe** (para revenue share)

## Soporte

- **Documentación**: [README.md](./README.md)
- **Arquitectura**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Issues**: [GitHub Issues](https://github.com/tu-usuario/lanzalo/issues)

## Licencia

MIT - Ver [LICENSE](./LICENSE) para más detalles
