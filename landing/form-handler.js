/**
 * Form Handler - Lanzalo Landing
 *
 * FIX: Llamada al backend Railway en lugar de Resend directamente
 * (Resend no permite llamadas desde el browser por CORS)
 *
 * SETUP:
 * 1. Cambia BACKEND_URL a tu URL de Railway
 * 2. Añade este script a index.html antes del </body>
 */

// ← CAMBIA ESTO por tu URL de Railway (ej: https://lanzalo-backend.up.railway.app)
const BACKEND_URL = 'https://lanzalo-production.up.railway.app';

document.getElementById('idea-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const emailInput = document.getElementById('email-input');
  const ideaInput = document.getElementById('idea-input');
  const submitBtn = e.target.querySelector('button[type="submit"]');

  const email = emailInput.value.trim();
  const idea = ideaInput ? ideaInput.value.trim() : '';

  if (!email) return;

  // Deshabilitar botón
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Enviando...';

  try {
    // Llamar al backend Railway (NO a Resend directamente)
    const response = await fetch(`${BACKEND_URL}/api/onboarding/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        password: 'temp_' + Math.random().toString(36).substring(2, 10), // password temporal
        idea: idea || 'Sin idea (explorando)'
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error en el registro');
    }

    // Guardar token JWT si viene en la respuesta
    if (data.token) {
      localStorage.setItem('lanzalo_token', data.token);
    }

    // Mostrar mensaje de exito
    const successMessage = document.getElementById('success-message');
    if (successMessage) {
      successMessage.classList.remove('hidden');
    }

    // Reset form
    e.target.reset();

    // Redirigir a onboarding (segun el backend)
    const redirect = data.redirect || '/onboarding/survey';
    setTimeout(() => {
      window.location.href = redirect;
    }, 1500);

  } catch (error) {
    console.error('Error en registro:', error);

    // Mostrar error al usuario
    const errorMsg = error.message || 'Error al registrar. Inténtalo de nuevo.';
    alert(errorMsg);

  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});
