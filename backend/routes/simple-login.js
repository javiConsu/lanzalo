// Ultra-simple login - no email, no database, no nada
module.exports = (req, res) => {
  console.log('[LOGIN TEST] Request received');

  res.json({
    status: 'ok',
    message: 'Backend is online and responding!'
  });
};