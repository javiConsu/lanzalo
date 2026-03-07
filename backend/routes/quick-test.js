// POST /api/quick-test
// TEST simple - sin timeout, sin email, sin nada complejo
module.exports = (req, res) => {
  console.log('[QUICK TEST] Receiving request');

  // Responder INMEDIATAMENTE sin hacer nada
  res.json({
    status: 'ok',
    message: 'Quick test working!',
    timestamp: new Date().toISOString()
  });
};