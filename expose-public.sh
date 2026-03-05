#!/bin/bash

# Script para exponer Lanzalo públicamente con Cloudflare Tunnel

echo "🌐 Exponiendo Lanzalo públicamente..."
echo ""

# Verificar que el servidor esté corriendo
if ! curl -s http://localhost:3001/health > /dev/null; then
    echo "❌ El servidor no está corriendo"
    echo "Ejecuta primero: ./start-local.sh"
    exit 1
fi

echo "✅ Servidor detectado en http://localhost:3001"
echo ""
echo "Opciones para exponer:"
echo ""
echo "1. Cloudflare Tunnel (gratis, sin registro)"
echo "2. ngrok (gratis, requiere cuenta)"
echo "3. Mostrar IP local (solo WiFi local)"
echo ""
read -p "Elige opción (1-3): " option

case $option in
    1)
        echo ""
        echo "📦 Instalando cloudflared..."
        
        # Detectar arquitectura
        ARCH=$(uname -m)
        if [ "$ARCH" = "x86_64" ]; then
            URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64"
        else
            URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64"
        fi
        
        curl -L -o /tmp/cloudflared "$URL"
        chmod +x /tmp/cloudflared
        
        echo ""
        echo "🚀 Creando túnel público..."
        echo ""
        
        /tmp/cloudflared tunnel --url http://localhost:3001
        ;;
        
    2)
        echo ""
        if command -v ngrok &> /dev/null; then
            echo "🚀 Iniciando ngrok..."
            ngrok http 3001
        else
            echo "❌ ngrok no está instalado"
            echo ""
            echo "Instalar ngrok:"
            echo "1. Ve a https://ngrok.com/download"
            echo "2. Descarga e instala"
            echo "3. Ejecuta: ngrok http 3001"
        fi
        ;;
        
    3)
        echo ""
        echo "📱 Acceso desde red local (WiFi):"
        echo ""
        
        # Obtener IP local
        IP=$(hostname -I | awk '{print $1}')
        
        echo "Tu servidor está en:"
        echo "   http://$IP:3001"
        echo ""
        echo "Desde tu iPhone (conectado a la misma WiFi):"
        echo "   Abre Safari y ve a: http://$IP:3001"
        echo ""
        echo "⚠️  Asegúrate de que tu iPhone esté en la MISMA red WiFi"
        ;;
        
    *)
        echo "Opción inválida"
        exit 1
        ;;
esac
