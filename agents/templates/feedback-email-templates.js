/**
 * Email Templates
 * Templates para notificaciones y reportes del Feedback Processor
 */

/**
 * Email: Reporte diario de Feedback
 *
 * Enviado a: co-founder (user_id del company.user_id)
 * Frecuencia: Diariamente a las 9:30 AM UTC
 *
 * @param {Object} options
 * @param {string} options.toEmail - Email del co-founder
 * @param {string} options.userName - Nombre del co-founder
 * @param {Object} options.stats - Stats del día
 * @param {Array} options.topThemes - Array de {theme, count} ordenados
 * @param {Array} options.suggestedTasks - Array de propuestas {title, priority, description}
 * @param {string} options.date - Fecha en formato YYYY-MM-DD
 * @returns {Object} { subject, html, text }
 */

function feedbackDailyReportEmail(options) {
  const { toEmail, userName, stats, topThemes, suggestedTasks, date } = options;

  // Priority badges
  const priorityBadges = {
    high: '<span style="background:#dc2626; color:white; padding:2px 8px; border-radius:4px; font-size:12px; font-weight:bold;">ALTA</span>',
    medium: '<span style="background:#d97706; color:white; padding:2px 8px; border-radius:4px; font-size:12px; font-weight:bold;">MEDIA</span>',
    low: '<span style="background:#6b7280; color:white; padding:2px 8px; border-radius:4px; font-size:12px; font-weight:bold;">BAJA</span>'
  };

  // Generate suggested tasks HTML
  const suggestedTasksHTML = suggestedTasks.map(task => `
    <div style="margin-bottom: 20px; border-left: 3px solid ${task.priority === 'high' ? '#dc2626' : task.priority === 'medium' ? '#d97706' : '#6b7280'}; padding-left: 12px;">
      <div style="margin-bottom: 4px;">
        <strong>${task.priority.toUpperCase()} PRIORITY</strong>
        ${priorityBadges[task.priority] || ''}
      </div>
      <h4 style="margin: 4px 0; color: #111827;">${task.title}</h4>
      <p style="margin: 4px 0; color: #4b5563; font-size: 14px;">${task.description}</p>
      <p style="margin: 4px 0; color: #6b7280; font-size: 12px;">⏱️ ${task.estimated_hours}h estimated</p>
    </div>
  `).join('');

  // Generate top themes HTML
  const topThemesHTML = topThemes.map(theme => `
    <div style="display: flex; justify-content: space-between; margin-bottom: 8px; align-items: center;">
      <span style="color: #4b5563; font-size: 14px;">${theme.theme}</span>
      <span style="background: #f3f4f6; color: #374151; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600;">${theme.count}</span>
    </div>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reporte diario de Feedback - ${date}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #111827; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 24px; border-radius: 12px; color: white; margin-bottom: 24px; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
          .header p { margin: 4px 0 0 0; font-size: 14px; opacity: 0.9; }
          .section { background: white; padding: 20px; border-radius: 8px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .section h2 { margin: 0 0 16px 0; font-size: 16px; font-weight: 700; color: #111827; }
          .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
          .stat { background: #f9fafb; padding: 12px; border-radius: 6px; text-align: center; }
          .stat-value { font-size: 24px; font-weight: 700; color: #6366f1; }
          .stat-label { font-size: 12px; color: #6b7280; margin-top: 4px; }
          .theme-list { margin-top: 12px; }
          .theme-item { margin-bottom: 12px; }
          .theme-name { font-weight: 600; margin-bottom: 4px; }
          .theme-bar { background: #e5e7eb; border-radius: 4px; height: 8px; overflow: hidden; }
          .theme-fill { height: 100%; border-radius: 4px; background: #6366f1; }
          .action-button { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 12px; }
          .action-button:hover { background: #4f46e5; }
          .footer { margin-top: 32px; text-align: center; color: #9ca3af; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Reporte diario de Feedback</h1>
            <p>Hola ${userName}, revisa las últimas propuestas de mejora de tu empresa.</p>
          </div>

          <div class="section">
            <h2>📈 Stats del día (${date})</h2>
            <div class="stats-grid">
              <div class="stat">
                <div class="stat-value">${stats.feedback_count}</div>
                <div class="stat-label">Feedback recibido</div>
              </div>
              <div class="stat">
                <div class="stat-value">${stats.bug_count}</div>
                <div class="stat-label">Bugs críticos</div>
              </div>
              <div class="stat">
                <div class="stat-value">${stats.improvement_count}</div>
                <div class="stat-label">Mejoras sugeridas</div>
              </div>
            </div>
          </div>

          ${topThemes.length > 0 ? `
          <div class="section">
            <h2>🔥 Top Themes</h2>
            <div class="theme-list">
              ${topThemesHTML}
            </div>
          </div>
          ` : ''}

          ${suggestedTasks.length > 0 ? `
          <div class="section">
            <h2>💡 Propuestas de mejora</h2>
            ${suggestedTasksHTML}

            <div style="margin-top: 20px; text-align: center;">
              <a href="${process.env.WEB_URL}/dashboard/colas" class="action-button">Ver en Dashboard</a>
              <p style="font-size: 12px; color: #6b7280; margin-top: 12px;">
                Opcional: Usa el botón aprobar/rechazar en el dashboard en 24h
              </p>
            </div>
          </div>
          ` : `
          <div class="section" style="text-align: center; padding: 32px;">
            <p style="color: #6b7280;">✅ No hay propuestas nuevas esta semana. Buen trabajo!</p>
          </div>
          `}

          <div class="footer">
            <p>Lanzalo Team • ${new Date().toLocaleDateString()}</p>
            <p>Prefieres no recibir más emails? <a href="#" style="color: #6366f1; text-decoration: none;">Unsubscribe</a></p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Reporte diario de Feedback - ${date}

Hola ${userName},

📊 Stats del día:
- Feedback recibido: ${stats.feedback_count}
- Bugs críticos: ${stats.bug_count}
- Mejoras sugeridas: ${stats.improvement_count}

${topThemes.length > 0 ? `Top themes: ${topThemes.map(t => t.theme).join(', ')}` : ''}

${suggestedTasks.length > 0 ? `

Suggested improvements:
${suggestedTasks.map(t => `- ${t.title} (${t.priority} priority, ${t.estimated_hours}h)`).join('\n')}

Ver más en: ${process.env.WEB_URL}/dashboard/colas
` : `

✅ No hay nuevas propuestas esta semana.`}

Lanzalo Team
  `.trim();

  return {
    subject: `Reporte diario de Feedback - ${date}`,
    html,
    text
  };
}

/**
 * Email: Nuevas mejoras implementadas
 *
 * Enviado a: usuario final
 * Frecuencia: Cuando co-founder aprueba mejoras
 *
 * @param {Object} options
 * @param {string} options.userName - Nombre del usuario
 * @param {Array} options.improvements - Array de mejoras {title, date}
 * @returns {Object} { subject, html, text }
 */

function improvementsImplementedEmail(options) {
  const { userName, improvements, date } = options;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Mejoras implementadas</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #111827; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; padding: 24px; border-radius: 12px; color: white; margin-bottom: 24px; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
          .content { background: white; padding: 20px; border-radius: 8px; margin-bottom: 16px; }
          .improvement { padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
          .improvement:last-child { border-bottom: none; }
          .improvement-title { font-weight: 700; margin-bottom: 4px; color: #111827; }
          .improvement-date { font-size: 12px; color: #6b7280; }
          .footer { margin-top: 32px; text-align: center; color: #9ca3af; font-size: 12px; }
          .cta-button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Mejoras implementadas</h1>
            <p>Tu feedback importó mejoras en Lanzalo.</p>
          </div>

          <div class="content">
            <p style="margin-bottom: 16px;">Hola ${userName},</p>

            <p style="margin-bottom: 16px;">¡Tus comentarios nos ayudaron a mejorar ${improvements.length} funcionalidad:</p>

            ${improvements.map(imp => `
              <div class="improvement">
                <div class="improvement-title">${imp.title}</div>
                <div class="improvement-date">Implementado: ${imp.date}</div>
              </div>
            `).join('')}

            <div style="margin-top: 24px; text-align: center;">
              <a href="${process.env.WEB_URL}/dashboard" class="cta-button">Ver mejoras en Dashboard</a>
            </div>
          </div>

          <div class="footer">
            <p>Lanzalo Team • ${new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Nuevas mejoras implementadas - ${date}

Hola ${userName},

¡Tus comentarios nos ayudaron a mejorar ${improvements.length} funcionalidad:

${improvements.map(imp => `- ${imp.title} (${imp.date})`).join('\n')}

Ver más en: ${process.env.WEB_URL}/dashboard

Lanzalo Team
  `.trim();

  return {
    subject: `✅ Mejoras implementadas`,
    html,
    text
  };
}

module.exports = {
  feedbackDailyReportEmail,
  improvementsImplementedEmail
};