/**
 * Daily Sync Email Template
 * Personality: CEO Agent — Direct co-founder tone
 */

import React from 'react';

export default function DailySync({ company, sync, date }) {
  const winsCount = sync.wins?.length || 0;
  const issuesCount = sync.issues?.length || 0;
  const decisionsCount = sync.decisions?.length || 0;
  
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
            margin-bottom: 8px;
          }
          .date {
            color: #6b7280;
            margin-bottom: 24px;
          }
          .summary {
            background: #f3f4f6;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 24px;
          }
          .section {
            margin-bottom: 32px;
          }
          h2 {
            font-size: 18px;
            margin-bottom: 12px;
          }
          ul {
            padding-left: 20px;
          }
          li {
            margin-bottom: 8px;
          }
          .decision {
            background: #eff6ff;
            border-left: 4px solid #3b82f6;
            padding: 12px;
            margin-bottom: 12px;
          }
          .decision strong {
            color: #1e40af;
          }
          .decision .meta {
            font-size: 12px;
            color: #6b7280;
            margin-top: 4px;
          }
          .separator {
            border: 0;
            border-top: 1px solid #e5e7eb;
            margin: 24px 0;
          }
          .footer {
            color: #6b7280;
            font-size: 14px;
            margin-top: 32px;
            padding-top: 16px;
            border-top: 1px solid #e5e7eb;
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
          .trend-up { color: #10b981; }
          .trend-down { color: #ef4444; }
          .trend-flat { color: #6b7280; }
        `}</style>
      </head>
      <body>
        <h1>☀️ Daily Sync — {company.name}</h1>
        <p className="date">{formatDate(date)}</p>
        
        {/* Summary */}
        <div className="summary">
          <p>{sync.summary}</p>
        </div>
        
        <hr className="separator" />
        
        {/* Wins */}
        {winsCount > 0 && (
          <div className="section">
            <h2>🎉 WINS</h2>
            <ul>
              {sync.wins.map((win, i) => (
                <li key={i}>{win}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Issues */}
        {issuesCount > 0 && (
          <div className="section">
            <h2>⚠️ PROBLEMAS</h2>
            <ul>
              {sync.issues.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Trends */}
        {sync.trends && (
          <div className="section">
            <h2>📊 TENDENCIAS</h2>
            <p>
              <strong>Revenue:</strong> <span className={getTrendClass(sync.trends.revenue)}>{getTrendEmoji(sync.trends.revenue)}</span><br />
              <strong>Traffic:</strong> <span className={getTrendClass(sync.trends.traffic)}>{getTrendEmoji(sync.trends.traffic)}</span><br />
              <strong>Engagement:</strong> <span className={getTrendClass(sync.trends.engagement)}>{getTrendEmoji(sync.trends.engagement)}</span>
            </p>
            {sync.trends.notes && (
              <p style={{ marginTop: '12px', color: '#6b7280' }}>
                <em>{sync.trends.notes}</em>
              </p>
            )}
          </div>
        )}
        
        <hr className="separator" />
        
        {/* Decisions */}
        {decisionsCount > 0 && (
          <div className="section">
            <h2>🎯 DECISIONES QUE TOMÉ</h2>
            <p style={{ marginBottom: '16px', fontSize: '14px', color: '#6b7280' }}>
              Tu equipo tomó {decisionsCount} decisión{decisionsCount > 1 ? 'es' : ''} hoy:
            </p>
            {sync.decisions.map((decision, i) => (
              <div key={i} className="decision">
                <strong>{decision.action}</strong>
                <p style={{ margin: '8px 0' }}>{decision.reasoning}</p>
                <div className="meta">
                  {decision.agent.toUpperCase()} • {decision.priority.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Recommendations */}
        {sync.recommendations && sync.recommendations.length > 0 && (
          <div className="section">
            <h2>💡 RECOMENDACIONES</h2>
            <ul>
              {sync.recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
        
        <hr className="separator" />
        
        <p>
          Eso es todo. Si no estás de acuerdo con algo, me lo dices.<br />
          Soy tu co-fundador, no tu jefe.
        </p>
        
        <a href={`https://app.lanzalo.pro/dashboard/${company.id}`} className="cta">
          Ver dashboard completo →
        </a>
        
        <div className="footer">
          <p>
            <strong>Lanzalo</strong><br />
            Tu equipo trabajando mientras tú duermes
          </p>
          {decisionsCount === 0 && (
            <p style={{ marginTop: '12px', fontSize: '13px', fontStyle: 'italic' }}>
              PD: Hoy no tomé decisiones. Todo va bien por ahora.
            </p>
          )}
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

function getTrendEmoji(trend) {
  const map = {
    'up': '↗️ Creciendo',
    'down': '↘️ Bajando',
    'flat': '→ Estable',
    'n/a': '— Sin datos'
  };
  return map[trend] || map['n/a'];
}

function getTrendClass(trend) {
  const map = {
    'up': 'trend-up',
    'down': 'trend-down',
    'flat': 'trend-flat'
  };
  return map[trend] || '';
}
