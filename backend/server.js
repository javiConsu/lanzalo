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
const GrowthAgent = require('../agents/growth-agent');
const { scheduleTrialChecks, scheduleTrialReminders } = require('../agents/trial-manager');
const { scheduleDripSequence } = require('./services/drip-sequence');
const { scheduleWeeklyIdeasDigest } = require('./services/weekly-ideas-digest');
const { scheduleCofounderDaily } = require('./services/cofounder-daily');
const { scheduleWeeklyCredit } = require('./services/weekly-credit-bonus');

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

// IMPORTANTE: Stripe webhook ANTES de express.json() — necesita raw body para validar firma
app.use('/api/webhooks', require('./routes/webhooks'));

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0', env: process.env.NODE_ENV || 'development' });
});

// Public routes (NO auth — MUST be before any router with catch-all requireAuth)
app.use('/', require('./routes/landing'));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/auth-reset-password', require('./routes/auth-reset-password'));
app.use('/api/onboarding', require('./routes/onboarding'));
app.use('/api/discovery', require('./routes/discovery'));
app.use('/api/preview', require('./routes/preview'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/user', require('./routes/user'));
app.use('/api/user', require('./routes/daily-syncs')); // Daily syncs routes
app.use('/api/projects', require('./routes/projects'));    // MVP Cofundador — modelo unificado Project/Idea
app.use('/api/companies', require('./routes/companies'));  // Deprecated - usar /api/user/companies
app.use('/api/tasks', require('./routes/tasks'));          // Deprecated - usar /api/user/companies/:id/tasks
app.use('/api', require('./routes/ideas'));              // Ideas marketplace (public + auth)
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/surveys', require('./routes/surveys')); // Encuestas de activación
app.use('/api/activity', require('./routes/activity')); // Live activity feed
app.use('/api/payments', require('./routes/payments'));
app.use('/api/budgets', require('./routes/budgets'));
app.use('/api/governance', require('./routes/governance'));
app.use('/api/heartbeat', require('./routes/heartbeat'));
app.use('/sites', require('./routes/sites'));
app.use('/api/migrate', require('./routes/migrate')); // Migrations (before email-pro auth catch)
app.use('/api', require('./routes/email-pro')); // Email Pro (cold email service)
app.use('/api', require('./routes/marketing-content')); // Marketing content + Gamma + Ads
app.use('/api', require('./routes/brand')); // Brand config (voice & style guide)
// Magic link login (NO auth required - must be BEFORE ceo-chat catch-all)
app.post('/api/minimal-login', require('./routes/minimal-login'));
app.get('/api/verify-magic', require('./routes/verify-magic'));

app.use('/api', require('./routes/ceo-chat')); // Co-Founder Agent chat
app.use('/api/credits', require('./routes/credits')); // Sistema de créditos
app.use('/api/analysis', require('./routes/analysis')); // Análisis de viabilidad MVP
app.use('/api/plans', require('./routes/plans')); // Planes de 14 días MVP
app.use('/api/demo', require('./routes/demo')); // Demo mode endpoint (seed-demo.js)
app.use('/api/changes', require('./routes/change-requests')); // Cambios en assets (gratis)
app.use('/api', require('./routes/feedback')); // User feedback (thumbs up/down)

// One-time: promote owner to admin
app.post('/api/promote-admin', require('./middleware/auth').requireAuth, async (req, res) => {
  const ownerEmail = 'javi@saleshackers.es';
  if (req.user.email !== ownerEmail) return res.status(403).json({ error: 'No autorizado' });
  const { pool } = require('./db');
  const targetEmail = req.body.email || ownerEmail;
  await pool.query("UPDATE users SET role = 'admin' WHERE email = $1", [targetEmail]);
  res.json({ success: true, message: `${targetEmail} ahora es admin.` });
});

// Servir frontend React (producción)
const path = require('path');
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');

// Redirects legacy: rutas que existían antes de la SPA
app.get('/panel.html', (req, res) => res.redirect(301, '/admin'));

app.use(express.static(frontendDist));
// SPA fallback: todas las rutas no-API devuelven index.html
// Incluye archivos .html inexistentes (ej: /panel.html si no fue redirigido arriba)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/sites/') || req.path === '/health') {
    return next();
  }
  const indexPath = path.join(frontendDist, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).json({ error: 'Not found' });
    }
  });
});

// Auto-run pending migrations at startup (safe: _migrations table tracks applied ones)
async function autoMigrate() {
  try {
    const { runMigrations } = require('./migrate');
    const results = await runMigrations();
    const applied = results.filter(r => r.status === 'success');
    const errors = results.filter(r => r.status.startsWith('error'));
    if (applied.length > 0) console.log(`[Migrate] Applied ${applied.length} migration(s):`, applied.map(r => r.migration).join(', '));
    if (errors.length > 0) console.error('[Migrate] Errors:', errors);
    else console.log('[Migrate] All migrations up to date');
  } catch (err) {
    console.error('[Migrate] Auto-migration failed (non-fatal):', err.message);
  }
}

// Start HTTP server
const server = app.listen(PORT, async () => {
  console.log(`🚀 Lanzalo API running on port ${PORT}`);

  // Run pending DB migrations before starting services
  await autoMigrate();

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
  
  // Schedule weekly ideas digest (Sundays at 11:00 CET)
  console.log('[Server] Scheduling Weekly Ideas Digest...');
  scheduleWeeklyIdeasDigest();
  
  // Start Growth Agent (meta-agent, runs daily at 6AM UTC)
  console.log('[Server] Starting Growth Agent...');
  const growthAgent = new GrowthAgent();
  growthAgent.start();

  // Schedule Co-Founder daily briefing (L-V 08:00 CET)
  console.log('[Server] Scheduling Co-Founder Daily Briefing...');
  scheduleCofounderDaily();

  // Schedule weekly credit bonus (Lunes 09:00 CET)
  console.log('[Server] Scheduling Weekly Credit Bonus...');
  scheduleWeeklyCredit();
  
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
