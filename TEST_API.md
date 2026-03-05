# Testing Lanzalo API Local

El servidor está corriendo en **http://localhost:3001**

## ✅ Servidor Activo

```bash
curl http://localhost:3001/health
```

Respuesta:
```json
{
  "status": "ok",
  "timestamp": "...",
  "database": "sqlite",
  "mode": "development"
}
```

---

## 🔐 Autenticación

### Login Admin

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"admin@lanzalo.local",
    "password":"admin123"
  }'
```

### Registro de Usuario

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@test.com",
    "password":"test12345",
    "name":"Usuario Test"
  }'
```

---

## 📊 Admin Endpoints

### Dashboard Global

```bash
TOKEN="<tu-token-aqui>"

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/admin/dashboard
```

### Ver Todas las Empresas

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/admin/companies
```

---

## 👤 User Endpoints

### Ver Mis Empresas

```bash
TOKEN="<tu-token-aqui>"

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/user/companies
```

### Crear Empresa

```bash
curl -X POST http://localhost:3001/api/user/companies \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Mi Startup",
    "description":"Una plataforma SaaS innovadora",
    "industry":"SaaS",
    "tagline":"Revolucionando el mercado"
  }'
```

---

## 🌐 Acceso desde Navegador

### Abre en tu navegador:

**API Info**:  
http://localhost:3001

**Health Check**:  
http://localhost:3001/health

**Login (necesitas frontend o Postman para esto)**

---

## 🔥 Testeo Rápido

```bash
# 1. Login admin
RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lanzalo.local","password":"admin123"}')

# 2. Extraer token
TOKEN=$(echo $RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "Token: $TOKEN"

# 3. Ver dashboard
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/admin/dashboard
```

---

## 📝 Nota

El frontend no está corriendo aún. Para verlo visualmente necesitarías:

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

Pero **la API está 100% funcional** y puedes testearla con curl o Postman.
