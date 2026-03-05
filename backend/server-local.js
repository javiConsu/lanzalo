/**
 * Servidor local para desarrollo
 * Usa SQLite en lugar de PostgreSQL
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Usar db-simple (SQLite)
const dbSimple = require('./db-simple');
dbSimple.initSchema();

console.log('✅ Usando SQLite para desarrollo local');

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: 'sqlite',
    mode: 'development'
  });
});

// Info endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Lanzalo API',
    version: '1.0.0',
    mode: 'local-development',
    database: 'SQLite',
    endpoints: {
      health: '/health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login'
      },
      admin: {
        dashboard: 'GET /api/admin/dashboard (requiere auth + admin)',
        companies: 'GET /api/admin/companies (requiere auth + admin)'
      },
      user: {
        profile: 'GET /api/user/profile (requiere auth)',
        companies: 'GET /api/user/companies (requiere auth)',
        createCompany: 'POST /api/user/companies (requiere auth)'
      }
    },
    adminCredentials: {
      email: 'admin@lanzalo.local',
      password: 'admin123',
      note: 'Usa estos credenciales para login admin'
    }
  });
});

// API Routes
try {
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/admin', require('./routes/admin'));
  app.use('/api/admin', require('./routes/admin-settings'));
  app.use('/api/admin', require('./routes/admin-financials'));
  app.use('/api/admin', require('./routes/admin-agent'));
  app.use('/api/user', require('./routes/user'));
  console.log('✅ Rutas cargadas correctamente');
} catch (error) {
  console.error('❌ Error cargando rutas:', error.message);
}

// Start HTTP server
const server = app.listen(PORT, () => {
  console.log('');
  console.log('════════════════════════════════════════════════');
  console.log(`🚀 Lanzalo API corriendo en http://localhost:${PORT}`);
  console.log('════════════════════════════════════════════════');
  console.log('');
  console.log('📍 Endpoints:');
  console.log(`   http://localhost:${PORT}/health`);
  console.log(`   http://localhost:${PORT}/api/auth/login`);
  console.log(`   http://localhost:${PORT}/api/admin/dashboard`);
  console.log('');
  console.log('🔐 Admin:');
  console.log('   Email: admin@lanzalo.local');
  console.log('   Password: admin123');
  console.log('');
  console.log('📝 Para ver todos los endpoints:');
  console.log(`   curl http://localhost:${PORT}`);
  console.log('');
  console.log('════════════════════════════════════════════════');
});

// WebSocket server para live updates
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('📡 Cliente conectado al live feed');
  
  ws.on('close', () => {
    console.log('📡 Cliente desconectado');
  });
});

// Broadcast activity a todos los clientes conectados
global.broadcastActivity = (activity) => {
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // OPEN
      client.send(JSON.stringify(activity));
    }
  });
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    dbSimple.pool.end();
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('\n👋 Cerrando servidor...');
  server.close(() => {
    dbSimple.pool.end();
    console.log('✅ Servidor cerrado');
    process.exit(0);
  });
});

module.exports = app;
