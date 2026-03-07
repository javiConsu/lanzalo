// Login SOLO de prueba - minimal
module.exports = {
  post: (req, res) => {
    console.log('Login request:', req.body);

    res.json({
      success: true,
      message: 'Link enviado! Revisa tu email.'
    });
  }
};
