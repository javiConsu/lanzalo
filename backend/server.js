/**
 * Lanzalo API Server
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const orchestrator = require('../agents/orchestrator');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/companies', require('./routes/companies'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/webhooks', require('./routes/webhooks'));

// Start HTTP server
const server = app.listen(PORT, () => {
  console.log(`🚀 Lanzalo API running on port ${PORT}`);
  
  // Start agent orchestrator
  orchestrator.start();
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
  server.close(() => {
    console.log('Process terminated');
  });
});

module.exports = app;
