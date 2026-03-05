#!/bin/bash

# Lanzalo - Setup completo
# Este script configura todo lo necesario para correr Lanzalo

set -e  # Salir si hay error

echo "🚀 Instalando Lanzalo..."
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Verificar Node.js
echo "📦 Verificando Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    echo "Instala Node.js 18+ desde https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js debe ser versión 18 o superior${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# 2. Verificar PostgreSQL
echo ""
echo "🗄️  Verificando PostgreSQL..."
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL no está instalado localmente${NC}"
    echo "Puedes usar Supabase o instalar PostgreSQL"
    echo "Continuando..."
else
    echo -e "${GREEN}✓ PostgreSQL instalado${NC}"
fi

# 3. Instalar dependencias
echo ""
echo "📥 Instalando dependencias del backend..."
npm install

# 4. Frontend
echo ""
echo "📥 Instalando dependencias del frontend..."
cd frontend
npm install
cd ..

# 5. Crear .env si no existe
if [ ! -f .env ]; then
    echo ""
    echo "⚙️  Creando archivo .env..."
    cp .env.example .env
    echo -e "${YELLOW}⚠️  IMPORTANTE: Edita .env con tus credenciales${NC}"
    echo "   - DATABASE_URL (PostgreSQL)"
    echo "   - OPENROUTER_API_KEY"
    echo "   - STRIPE_SECRET_KEY (opcional)"
fi

# 6. Configurar base de datos
echo ""
echo "🗄️  ¿Quieres configurar la base de datos ahora? (y/n)"
read -r SETUP_DB

if [ "$SETUP_DB" = "y" ]; then
    echo ""
    echo "Ingresa la URL de tu base de datos PostgreSQL:"
    echo "(Formato: postgresql://user:password@host:5432/database)"
    read -r DB_URL
    
    # Actualizar .env
    sed -i "s|DATABASE_URL=.*|DATABASE_URL=$DB_URL|" .env
    
    echo ""
    echo "Ejecutando migraciones..."
    
    # Ejecutar schema principal
    PGPASSWORD=$(echo $DB_URL | grep -oP '(?<=:)[^@]+(?=@)') \
    psql $DB_URL -f database/schema.sql
    
    # Ejecutar migraciones
    PGPASSWORD=$(echo $DB_URL | grep -oP '(?<=:)[^@]+(?=@)') \
    psql $DB_URL -f database/migrations/001_add_quotas.sql
    
    echo -e "${GREEN}✓ Base de datos configurada${NC}"
fi

# 7. Resumen
echo ""
echo "════════════════════════════════════════════════"
echo -e "${GREEN}✅ Instalación completa${NC}"
echo "════════════════════════════════════════════════"
echo ""
echo "📋 Próximos pasos:"
echo ""
echo "1. Edita .env con tus credenciales:"
echo "   nano .env"
echo ""
echo "2. Inicia el servidor de desarrollo:"
echo "   npm run dev"
echo ""
echo "3. El backend estará en: http://localhost:3001"
echo "4. El frontend estará en: http://localhost:3000"
echo ""
echo "📚 Documentación: README.md"
echo "🐛 Reportar problemas: https://github.com/tu-repo/lanzalo"
echo ""
echo "════════════════════════════════════════════════"
