// Login SOLO de prueba - minimal
module.exports = (req, res) => {
  console.log('login request:', req.body);

  res.json({
    success: true,
    message: 'Link enviado! Revisa tu email.'
  });
};
