/**
 * Validation Complete Email
 * Sent when Research Agent finishes validating idea
 * Personality: Research Agent — Honest with data
 */

import React from 'react';

export default function ValidationComplete({ company, validation }) {
  const { verdict, score } = validation;
  
  const isGreen = verdict === 'green';
  const isYellow = verdict === 'yellow';
  const isRed = verdict === 'red';
  
  const verdictEmoji = isGreen ? '🟢' : isYellow ? '🟡' : '🔴';
  const verdictText = isGreen ? 'VERDE' : isYellow ? 'AMARILLO' : 'ROJO';
  const verdictColor = isGreen ? '#10b981' : isYellow ? '#f59e0b' : '#ef4444';
  
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
          .verdict-box {
            background: #f3f4f6;
            border-left: 4px solid ${verdictColor};
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
        <h1>🔍 Idea validada — {company.name}</h1>
        
        <p>Hola,</p>
        
        <p>Terminé de investigar tu idea. Aquí el veredicto:</p>
        
        <div className="verdict-box">
          <h2 style={{ margin: 0, color: verdictColor }}>
            {verdictEmoji} Veredicto: {verdictText}
          </h2>
          <p style={{ margin: '8px 0 0 0', fontSize: '18px', fontWeight: 'bold' }}>
            Score: {score}/10
          </p>
        </div>
        
        {isGreen && (
          <>
            <p><strong>Buena idea. Mercado existe. Adelante.</strong></p>
            <p>
              He investigado demanda, competencia, y revenue potential.<br />
              Los números se ven bien. Tienes green light.
            </p>
          </>
        )}
        
        {isYellow && (
          <>
            <p><strong>Tiene potencial, pero con ajustes.</strong></p>
            <p>
              La idea base es sólida pero encontré algunos problemas<br />
              que deberías arreglar antes de lanzar full.
            </p>
          </>
        )}
        
        {isRed && (
          <>
            <p><strong>Problemas serios. Considera pivotar.</strong></p>
            <p>
              No te va a gustar esto, pero es la verdad:<br />
              Esta idea tiene demasiados red flags.
            </p>
            <p>
              <em>Mejor saber ahora que después de 6 meses de trabajo, ¿no?</em>
            </p>
          </>
        )}
        
        <hr style={{ border: 0, borderTop: '1px solid #e5e7eb', margin: '24px 0' }} />
        
        <h2 style={{ fontSize: '18px' }}>Qué encontré</h2>
        
        <p><strong>Demanda de mercado:</strong></p>
        <p style={{ paddingLeft: '20px', color: '#6b7280' }}>
          {validation.demand || 'Analizando búsquedas, trends, y evidencia real...'}
        </p>
        
        <p><strong>Competencia:</strong></p>
        <p style={{ paddingLeft: '20px', color: '#6b7280' }}>
          {validation.competition || 'Evaluando saturación y jugadores principales...'}
        </p>
        
        <p><strong>Revenue potencial:</strong></p>
        <p style={{ paddingLeft: '20px', color: '#6b7280' }}>
          {validation.revenue || 'Estimando proyecciones realistas...'}
        </p>
        
        <hr style={{ border: 0, borderTop: '1px solid #e5e7eb', margin: '24px 0' }} />
        
        <h2 style={{ fontSize: '18px' }}>Próximos pasos</h2>
        
        {isGreen && (
          <>
            <p>Code Agent ya empezó a construir tu landing page.</p>
            <p>En ~10 minutos tendrás web funcionando.</p>
          </>
        )}
        
        {isYellow && (
          <>
            <p>Revisa el reporte completo y decide:</p>
            <ul>
              <li>Ajustar según sugerencias → Construir</li>
              <li>Continuar sin cambios → Asumir riesgos</li>
              <li>Pivotar a idea mejor → Ver alternativas</li>
            </ul>
          </>
        )}
        
        {isRed && (
          <>
            <p>Mi recomendación: <strong>Pivota.</strong></p>
            <p>
              Tengo 3 ideas validadas con mejor score<br />
              que podrías lanzar en su lugar.
            </p>
            <a href="https://app.lanzalo.pro/ideas" className="cta">
              Ver ideas validadas →
            </a>
          </>
        )}
        
        {!isRed && (
          <a href={`https://app.lanzalo.pro/chat/${company.id}`} className="cta">
            Ver reporte completo →
          </a>
        )}
        
        <div className="footer">
          <p>
            <strong>Research Agent</strong><br />
            El que investiga (sin bullshit)
          </p>
          <p style={{ marginTop: '12px', fontSize: '13px', fontStyle: 'italic' }}>
            PD: Este análisis se basa en datos reales de búsquedas,<br />
            competencia, y trends. No es una garantía, pero sí es honesto.
          </p>
        </div>
      </body>
    </html>
  );
}
