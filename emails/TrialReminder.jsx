/**
 * Trial Reminder Email
 * Sent 3, 2, 1 days before trial ends
 */

import React from 'react';

export default function TrialReminder({ user, daysLeft }) {
  const isUrgent = daysLeft === 1;
  
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
          .urgent {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 16px;
            margin: 16px 0;
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
        <h1>⏰ Tu trial termina en {daysLeft} día{daysLeft > 1 ? 's' : ''}</h1>
        
        <p>Hola {user.name},</p>
        
        {isUrgent ? (
          <div className="urgent">
            <strong>Último día de trial.</strong><br />
            Mañana tu cuenta pasa a plan Free automáticamente.
          </div>
        ) : (
          <p>
            Te quedan {daysLeft} días de trial completo.<br />
            Después, downgradeas a Free automáticamente.
          </p>
        )}
        
        <hr style={{ border: 0, borderTop: '1px solid #e5e7eb', margin: '24px 0' }} />
        
        <h2 style={{ fontSize: '18px' }}>Qué pasa con plan Free</h2>
        
        <p><strong>Mantiene access a:</strong></p>
        <ul>
          <li>1 negocio (el primero que creaste)</li>
          <li>Landing page funcionando</li>
          <li>Dashboard básico</li>
          <li>Chat con CEO Agent (limitado)</li>
        </ul>
        
        <p><strong>Pierdes access a:</strong></p>
        <ul>
          <li>Meta Ads automáticas</li>
          <li>Email marketing</li>
          <li>Twitter automation</li>
          <li>Analytics completo</li>
          <li>Daily Syncs del equipo</li>
          <li>Múltiples negocios</li>
        </ul>
        
        <hr style={{ border: 0, borderTop: '1px solid #e5e7eb', margin: '24px 0' }} />
        
        <h2 style={{ fontSize: '18px' }}>Plan Pro — €39/mes</h2>
        
        <p>Todo ilimitado. Sin límites. Para siempre.</p>
        
        <ul>
          <li>Todos los agentes activos 24/7</li>
          <li>Meta Ads + Email + Twitter automático</li>
          <li>Daily Syncs y reportes</li>
          <li>Múltiples negocios</li>
          <li>Analytics completo</li>
          <li>Soporte prioritario</li>
        </ul>
        
        <a href="https://app.lanzalo.pro/upgrade" className="cta">
          Upgrade a Pro →
        </a>
        
        <p style={{ marginTop: '24px', fontSize: '14px', color: #6b7280' }}>
          Puedes upgradearte en cualquier momento.<br />
          También puedes quedarte en Free si te funciona.
        </p>
        
        <div className="footer">
          <p>
            <strong>Lanzalo</strong><br />
            Tu equipo de IA trabajando 24/7
          </p>
          <p style={{ marginTop: '12px', fontSize: '13px', fontStyle: 'italic' }}>
            {isUrgent ? (
              'PD: No te preocupes, no perdemos tu data. Todo se queda en Free.'
            ) : (
              `PD: Trial termina ${formatDate(user.trialEndsAt)}`
            )}
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
