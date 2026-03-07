/**
 * Lanzalo API Server
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const orchestrator = require('../agents/orchestrator');
const taskExecutor = require('../agents/task-executor').instance;
const { scheduleDailySyncs } = require('../agents/daily-sync');
const { scheduleTrialChecks, scheduleTrialReminders } = require('../agents/trial-manager');

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
app.use('/sites', require('./routes/sites'));
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/migrate', require('./routes/migrate'));
app.use('/api', require('./routes/ceo-chat')); // Co-Founder Agent chat

// Start HTTP server
const server = app.listen(PORT, () => {
  console.log(`🚀 Lanzalo API running on port ${PORT}`);
  
  // Start agent orchestrator
  console.log('[Server] Starting Agent Orchestrator...');
  orchestrator.start();
  
  // Start task executor (polls backlog every 10s)
  console.log('[Server] Starting Task Executor...');
  taskExecutor.start();
  
  // Schedule daily syncs (runs hourly, checks which companies need sync)
  console.log('[Server] Scheduling Daily Syncs...');
  scheduleDailySyncs();
  
  // Schedule trial management (runs daily at 9 AM)
  console.log('[Server] Scheduling Trial Manager...');
  scheduleTrialChecks();
  scheduleTrialReminders();
  
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
