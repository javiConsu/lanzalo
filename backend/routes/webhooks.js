/**
 * Webhooks (Stripe, etc.)
 */

const express = require('express');
const router = express.Router();

// TODO: Implementar Stripe webhook para pagos

router.post('/stripe', express.raw({ type: 'application/json' }), (req, res) => {
  // Verificar signature de Stripe
  // Procesar eventos de pago
  res.json({ received: true });
});

module.exports = router;
