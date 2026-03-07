#!/bin/bash
# Servidor simple para test-login.html

echo "🚀 Iniciando servidor de test..."
cd /ruta/a/tu/proyecto/lanzalo

# Si tienes Python 3
python3 -m http.server 8000

# Si prefieres usar nginx, necesitas copiar el archivo a:
# /var/www/html/test-login.html