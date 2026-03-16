/**
 * Sentry — error tracking backend (Node.js/Express)
 * Inicializar ANTES de importar cualquier otro módulo.
 * Requiere SENTRY_DSN en variables de entorno.
 */

let Sentry = null;

function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    console.warn('[Sentry] SENTRY_DSN no configurado — error tracking desactivado');
    return;
  }

  try {
    Sentry = require('@sentry/node');
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 0.2,           // 20% de transacciones para performance
      // Filtrar errores de ruido
      ignoreErrors: [
        'ECONNRESET',
        'ETIMEDOUT',
        'EPIPE',
      ],
    });
    console.log('[Sentry] Error tracking inicializado');
  } catch (err) {
    console.error('[Sentry] Error inicializando:', err.message);
  }
}

/**
 * Middleware de Sentry para Express — captura errores no manejados.
 * Añadir DESPUÉS de todas las rutas.
 * @param {import('express').Application} app
 */
function setupSentryErrorHandler(app) {
  if (!Sentry) return;
  Sentry.setupExpressErrorHandler(app);
}

/**
 * Captura un error manualmente con contexto adicional.
 * @param {Error} error
 * @param {object} [context]
 */
function captureError(error, context = {}) {
  if (!Sentry) return;
  Sentry.withScope(scope => {
    Object.entries(context).forEach(([key, value]) => scope.setExtra(key, value));
    Sentry.captureException(error);
  });
}

/**
 * Captura un mensaje de error (string) sin excepción.
 * @param {string} message
 * @param {'fatal'|'error'|'warning'|'info'} [level]
 */
function captureMessage(message, level = 'error') {
  if (!Sentry) return;
  Sentry.captureMessage(message, level);
}

module.exports = { initSentry, setupSentryErrorHandler, captureError, captureMessage };
