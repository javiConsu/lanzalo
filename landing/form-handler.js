/**
 * Form Handler con Resend
 * 
 * SETUP:
 * 1. Reemplaza YOUR_RESEND_API_KEY con tu key de Resend
 * 2. Reemplaza YOUR_EMAIL con tu email
 * 3. Añade este script a index.html antes del </body>
 */

const RESEND_API_KEY = 'YOUR_RESEND_API_KEY'; // ← Reemplazar
const NOTIFICATION_EMAIL = 'YOUR_EMAIL@example.com'; // ← Reemplazar

document.getElementById('idea-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const emailInput = document.getElementById('email-input');
  const ideaInput = document.getElementById('idea-input');
  const submitBtn = e.target.querySelector('button[type="submit"]');
  
  const email = emailInput.value;
  const idea = ideaInput.value || 'Sin idea (explorando)';
  
  // Disable button
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Enviando...';
  
  try {
    // Send to Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Lanzalo <noreply@lanzalo.pro>',
        to: NOTIFICATION_EMAIL,
        subject: `🚀 Nuevo signup: ${email}`,
        html: `
          <h2>Nuevo registro en Lanzalo</h2>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Idea:</strong></p>
          <p>${idea}</p>
          <hr>
          <p><small>Timestamp: ${new Date().toISOString()}</small></p>
        `
      })
    });
    
    if (!response.ok) {
      throw new Error('Error enviando email');
    }
    
    // Show success
    document.getElementById('success-message').classList.remove('hidden');
    
    // Reset form
    e.target.reset();
    
  } catch (error) {
    console.error('Error:', error);
    alert('Error al enviar. Por favor intenta de nuevo.');
  } finally {
    // Re-enable button
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});
