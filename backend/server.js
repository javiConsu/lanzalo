/**
 * Lanzalo API Server
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const orchestrator = require('../agents/orchestrator');
const taskExecutor = require('../agents/task-executor').instance;
const dailyReviewSystem = require('../agents/daily-review');
const { scheduleDailySyncs } = require('../agents/daily-sync');
const { scheduleTrialChecks, scheduleTrialReminders } = require('../agents/trial-manager');
const { scheduleDripSequence } = require('./services/drip-sequence');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const ALLOWED_ORIGINS = [
  'https://www.lanzalo.pro',
  'https://lanzalo.pro',
  process.env.CORS_ORIGIN,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Permitir requests sin origin (mobile, curl, etc.)
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.some(o => origin === o || origin.endsWith('.vercel.app'))) {
      return cb(null, true);
    }
    cb(null, true); // En producción aceptamos todo por ahora — restringir en v2
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/auth-reset-password', require('./routes/auth-reset-password'));
app.use('/api/onboarding', require('./routes/onboarding'));
app.use('/api/discovery', require('./routes/discovery'));
app.use('/api/preview', require('./routes/preview'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/user', require('./routes/user'));
app.use('/api/user', require('./routes/daily-syncs')); // Daily syncs routes
app.use('/api/companies', require('./routes/companies'));  // Deprecated - usar /api/user/companies
app.use('/api/tasks', require('./routes/tasks'));          // Deprecated - usar /api/user/companies/:id/tasks
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/budgets', require('./routes/budgets'));
app.use('/api/governance', require('./routes/governance'));
app.use('/api/heartbeat', require('./routes/heartbeat'));
app.use('/sites', require('./routes/sites'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/migrate', require('./routes/migrate'));
// Magic link login (NO auth required - must be BEFORE ceo-chat catch-all)
app.post('/api/minimal-login', require('./routes/minimal-login'));
app.get('/api/verify-magic', require('./routes/verify-magic'));

app.use('/api', require('./routes/ceo-chat')); // Co-Founder Agent chat
app.use('/api/credits', require('./routes/credits')); // Sistema de créditos
app.use('/api/changes', require('./routes/change-requests')); // Cambios en assets (gratis)

// Servir frontend React (producción)
const path = require('path');
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDist));
// SPA fallback: todas las rutas no-API devuelven index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/sites/') || req.path === '/health') {
    return next();
  }
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// Start HTTP server
const server = app.listen(PORT, () => {
  console.log(`🚀 Lanzalo API running on port ${PORT}`);
  
  // Start agent orchestrator
  console.log('[Server] Starting Agent Orchestrator...');
  orchestrator.start();
  
  // Start task executor (polls backlog every 10s)
  console.log('[Server] Starting Task Executor...');
  taskExecutor.start();
  
  // Start daily review system (T-MORNING 9:00 AM UTC, T-EVENING 6:00 PM UTC)
  console.log('[Server] Starting Daily Review System...');
  dailyReviewSystem.start();
  
  // Schedule daily syncs (runs hourly, checks which companies need sync)
  console.log('[Server] Scheduling Daily Syncs...');
  scheduleDailySyncs();
  
  // Schedule trial management (runs daily at 9 AM)
  console.log('[Server] Scheduling Trial Manager...');
  scheduleTrialChecks();
  scheduleTrialReminders();
  
  // Schedule drip sequence (daily at 10:30 AM)
  console.log('[Server] Scheduling Drip Sequence...');
  scheduleDripSequence();
  
  console.log('✅ All systems running');
});

// WebSocket server for live updates
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('📡 Client connected to live feed');
  
  ws.on('message', (message) => {
    // Handle client messages if needed
  });
  
  ws.on('close', () => {
    console.log('📡 Client disconnected');
  });
});

// Broadcast activity to all connected clients
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
  orchestrator.stop();
  taskExecutor.stop();
  dailyReviewSystem.stop();
  server.close(() => {
    console.log('Process terminated');
  });
});

module.exports = app;

// Test endpoint
app.use('/test-login', require('./routes/test-login'));

// Test endpoint
const testLogin = require('./test-login-route');
app.use('/test', testLogin);

// Test endpoint

// Login por email
const loginEmail = require('./routes/login-email');
app.use('/login', loginEmail);

// Login routes
app.use('/login', require('./routes/login-email'));

// TEMP: migración de login_tokens
app.get('/setup-login-tokens', async (req, res) => {
  const { pool } = require('./db');
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS login_tokens (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    res.json({ success: true, message: 'Tabla login_tokens creada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/api/quick-test', require('./routes/quick-test'));
app.post('/api/simple-login', require('./routes/simple-login'));
