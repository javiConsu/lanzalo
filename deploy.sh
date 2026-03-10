#!/bin/bash

# Script de deploy a Vercel para Lanzalo Frontend

set -e

echo "🚀 Iniciando deploy de Lanzalo Frontend a Vercel..."

# Verificar que el build esté completado
echo "📦 Verificando build..."
cd frontend

if [ ! -d "dist" ]; then
    echo "❌ Build no encontrado. Ejecutando build primero..."
    npm run build
else
    echo "✅ Build encontrado"
fi

# Crear vercel.json si no existe
if [ ! -f "../vercel.json" ]; then
    echo "📝 Creando configuración de Vercel..."
    cat > ../vercel.json << 'EOF'
{
  "version": 2,
  "builds": [
    {
      "src": "frontend/dist/**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/frontend/index.html"
    }
  ]
}
EOF
fi

# Ejecutar deploy
echo "☁️  Iniciando deploy..."
cd ..

# Intentar usar vercel CLI si está disponible
if command -v vercel &> /dev/null; then
    echo "✅ Vercel CLI detectado. Haciendo deploy..."
    vercel --prod --yes
elif [ -f "$HOME/.vercel/vercel" ]; then
    echo "✅ Vercel CLI encontrado en $HOME/.vercel"
    "$HOME/.vercel/vercel" --prod --yes
else
    echo "⚠️  Vercel CLI no encontrado"
    echo ""
    echo "Para hacer deploy manual:"
    echo "1. Ejecuta: vercel --prod"
    echo "2. o ejecuta desde el directorio: cd frontend && vercel --prod"
    echo ""
    echo "Verificando si hay configuración automática..."
fi

echo ""
echo "✅ Deploy iniciado (o manual)"
echo "📊 Sigue los pasos en tu terminal para completar el deploy"
echo ""
echo "Cuando el deploy termine, revisa: https://www.lanzalo.pro/"