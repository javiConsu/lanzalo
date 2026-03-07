/**
 * Endpoint de prueba simple para login
 * Accede a: https://lanzalo-production.up.railway.app/test-login
 */

const express = require('express');
const router = express.Router();

const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <title>Lanzalo Login Test</title>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #1a1a2e;
            color: #fff;
        }
        .container {
            background: #2d2d44;
            padding: 30px;
            border-radius: 10px;
        }
        input, button {
            width: 100%;
            padding: 12px;
            margin: 10px 0;
            box-sizing: border-box;
        }
        input {
            background: #1a1a2e;
            border: 1px solid #4a4a6a;
            color: #fff;
        }
        button {
            background: #4a90e2;
            border: none;
            cursor: pointer;
            font-size: 16px;
            margin-top: 15px;
        }
        button:hover {
            background: #357abd;
        }
        .result {
            margin-top: 30px;
            padding: 20px;
            background: #2d2d44;
            border-radius: 5px;
            white-space: pre-wrap;
        }
        .error { background: #4a1a1a; color: #ff6b6b; }
        .success { background: #1a4a1a; color: #6bff6b; }
        .token { word-break: break-all; color: #ffd700; }
        h2 { color: #4a90e2; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Lanzalo Login Test</h1>
        <p>Prueba directa al backend sin intermediarios</p>

        <div class="form-group">
            <input type="email" id="email" value="javi@saleshackers.es" placeholder="Email">
        </div>
        <div class="form-group">
            <input type="password" id="password" value="Lanzalo2026!" placeholder="Password">
        </div>
        <button onclick="login()">🔐 Entrar</button>

        <div id="result" class="result"></div>
    </div>

    <script>
        async function login() {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const resultDiv = document.getElementById('result');

            resultDiv.innerHTML = 'Cargando...';
            resultDiv.className = 'result';

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (response.ok) {
                    resultDiv.innerHTML = \`
                        <div class="success">
                            ✅ LOGIN EXITOSO!

                            Status: \${response.status} \${response.statusText}

                            User:
                            \${JSON.stringify(data.user, null, 2)}

                            Token:
                            <div class="token">\${data.token.substring(0, 50)}...</div>
                            <div class="token">\${data.token.substring(50)}</div>
                        </div>
                    \`;
                } else {
                    resultDiv.innerHTML = \`
                        <div class="error">
                            ❌ ERROR

                            Status: \${response.status} \${response.statusText}

                            \${JSON.stringify(data, null, 2)}
                        </div>
                    \`;
                }
            } catch (error) {
                resultDiv.innerHTML = \`
                    <div class="error">
                        ❌ ERROR DE CONEXIÓN: \${error.message}
                    </div>
                \`;
            }
        }
    </script>
</body>
</html>`;

router.get('/test-login', (req, res) => {
    res.send(htmlContent);
});

module.exports = router;
