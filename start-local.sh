#!/bin/bash

# Script para levantar Lanzalo en local

echo "🚀 Iniciando Lanzalo en modo local..."
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Verificar .env
if [ ! -f .env ]; then
    echo "⚠️  Creando .env desde .env.example..."
    cp .env.example .env
fi

# 2. Crear base de datos SQLite
echo "📦 Inicializando base de datos local (SQLite)..."
node -e "const {initSchema} = require('./backend/db-simple'); initSchema();"

# 3. Iniciar backend
echo ""
echo "🔧 Iniciando backend en http://localhost:3001..."
echo ""

# Usar db-simple en lugar de db
export USE_SQLITE=true

# Iniciar backend
PORT=3001 node backend/server-local.js &
BACKEND_PID=$!

echo "Backend PID: $BACKEND_PID"

# Esperar a que arranque
sleep 3

# 4. Verificar que está corriendo
if curl -s http://localhost:3001/health > /dev/null; then
    echo -e "${GREEN}✅ Backend corriendo en http://localhost:3001${NC}"
else
    echo -e "${YELLOW}⚠️  Backend puede tardar unos segundos...${NC}"
fi

echo ""
echo "════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}✅ Lanzalo corriendo localmente${NC}"
echo ""
echo "📍 Backend API: http://localhost:3001"
echo "📍 Health check: http://localhost:3001/health"
echo ""
echo "🔐 Admin inicial:"
echo "   Email: admin@lanzalo.local"
echo "   Password: admin123"
echo ""
echo "📚 Endpoints disponibles:"
echo "   POST /api/auth/register - Registrar usuario"
echo "   POST /api/auth/login - Login"
echo "   GET  /api/admin/dashboard - Dashboard admin"
echo "   GET  /api/user/companies - Empresas del usuario"
echo ""
echo "Para detener: kill $BACKEND_PID"
echo ""
echo "════════════════════════════════════════════════"

# Mantener el script corriendo
wait $BACKEND_PID
