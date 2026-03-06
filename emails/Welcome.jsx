/**
 * Welcome Email
 * Sent on registration
 * Personality: CEO Agent — Welcoming but direct
 */

import React from 'react';

export default function Welcome({ user }) {
  return (
    <html>
      <head>
        <style>{`
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1.6;
            color: #1f2937;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          h1 {
            font-size: 24px;
            margin-bottom: 16px;
          }
          .cta {
            display: inline-block;
            background: #3b82f6;
            color: white !important;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 16px 0;
          }
          .footer {
            color: #6b7280;
            font-size: 14px;
            margin-top: 32px;
            padding-top: 16px;
            border-top: 1px solid #e5e7eb;
          }
        `}</style>
      </head>
      <body>
        <h1>🚀 Bienvenido a Lanzalo</h1>
        
        <p>Hola {user.name || 'ahí'},</p>
        
        <p>
          Acabas de conseguir algo raro:<br />
          <strong>Un co-fundador que te dice la verdad.</strong>
        </p>
        
        <p>
          No como esas IAs que dicen "sí" a todo.<br />
          Si tu idea es mala → Te lo digo.<br />
          Si tu plan no va a funcionar → Te explico por qué.<br />
          Si hay mejor manera → Te la muestro.
        </p>
        
        <p>
          Porque eso es lo que hace un co-fundador de verdad.
        </p>
        
        <hr style={{ border: 0, borderTop: '1px solid #e5e7eb', margin: '24px 0' }} />
        
        <h2 style={{ fontSize: '18px' }}>Tienes 14 días gratis</h2>
        
        <p>
          Sin tarjeta. Sin compromiso. Sin trucos.
        </p>
        
        <p>
          <strong>Próximos pasos:</strong>
        </p>
        
        <ol>
          <li>Cuéntame tu idea (o elige una validada)</li>
          <li>Te digo la verdad en 30 segundos</li>
          <li>Si tiene sentido → Construimos juntos</li>
        </ol>
        
        <a href="https://app.lanzalo.pro/onboarding" className="cta">
          Empezar ahora →
        </a>
        
        <p style={{ marginTop: '24px', fontSize: '14px', color: '#6b7280' }}>
          Tu trial termina el: {formatDate(user.trialEndsAt)}
        </p>
        
        <div className="footer">
          <p>
            <strong>Lanzalo</strong><br />
            Tu equipo de IA trabajando 24/7
          </p>
          <p style={{ marginTop: '12px', fontSize: '13px', fontStyle: 'italic' }}>
            PD: Si quieres un asistente que diga "sí" a todo,<br />
            hay mil opciones. Nosotros no somos esa.
          </p>
        </div>
      </body>
    </html>
  );
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}
