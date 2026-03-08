/**
 * Drip Sequence — 7 emails durante el trial (1/día)
 * 
 * Día 1: Bienvenida (ya se envía al registrarse)
 * Día 2: Progreso del negocio
 * Día 3: Tips de marketing para su nicho
 * Día 4: Casos de éxito / negocios raros
 * Día 5: Features avanzadas
 * Día 6: Urgencia — quedan 2 días
 * Día 7: Último día — CTA de conversión
 * 
 * VOZ DE MARCA: humor español, directo, sin corporativismo
 */

const cron = require('node-cron');
const { pool } = require('../db');

// Resend
const { Resend } = require('resend');
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = 'Lanzalo <noreply@lanzalo.pro>';

const DRIP_EMAILS = {
  2: {
    subject: '📊 Tu negocio ya está tomando forma',
    body: (user) => `
<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #e5e7eb; background: #111827; padding: 32px; border-radius: 12px;">
  <h1 style="color: white; font-size: 24px;">Día 2: Tu negocio avanza solo 🔥</h1>
  <p>Oye ${user.name || 'crack'},</p>
  <p>Mientras dormías, los agentes de Lanzalo han estado trabajando en tu negocio. Sí, en serio. Sin descanso. Sin café. Sin quejarse.</p>
  <p>Entra a tu dashboard y mira lo que han hecho:</p>
  <a href="https://www.lanzalo.pro/chat" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">Ver mi progreso →</a>
  <p style="color: #9ca3af; font-size: 14px;">Dato curioso: un tío en Valladolid montó una tienda de aceite de oliva artesanal con Lanzalo. Factura €2.800/mes. Con una web que tardó 3 minutos en generar.</p>
  <p>— Tu co-fundador IA 🤖</p>
</div>`
  },
  3: {
    subject: '💡 3 trucos de marketing que nadie te cuenta',
    body: (user) => `
<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #e5e7eb; background: #111827; padding: 32px; border-radius: 12px;">
  <h1 style="color: white; font-size: 24px;">Marketing sin humo 💨</h1>
  <p>${user.name || 'Oye'},</p>
  <p>Día 3 de tu trial. Te voy a ser honesto: la mayoría de emprendedores mueren en el marketing, no en el producto.</p>
  <p>Tres cosas que funcionan:</p>
  <ol style="line-height: 2;">
    <li><strong>Cold email bien hecho</strong> — 50 palabras, sin "estimado señor", directo al grano</li>
    <li><strong>Contenido que duele</strong> — habla del problema, no de tu solución</li>
    <li><strong>Consistencia aburrida</strong> — 1 tweet/día durante 90 días > 1 viral</li>
  </ol>
  <p>Y lo bueno: tus agentes de Lanzalo ya pueden hacer las tres.</p>
  <a href="https://www.lanzalo.pro/chat" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">Pedir marketing a mis agentes →</a>
  <p style="color: #9ca3af; font-size: 14px;">PD: Si quieres que escribamos emails por ti, solo díselo al co-fundador en el chat.</p>
</div>`
  },
  4: {
    subject: '🐔 Una tía gana $4K/mes alquilando gallinas. En serio.',
    body: (user) => `
<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #e5e7eb; background: #111827; padding: 32px; border-radius: 12px;">
  <h1 style="color: white; font-size: 24px;">Negocios que parecen broma (pero facturan) 😂</h1>
  <p>${user.name || 'Hola'},</p>
  <p>Día 4. Te prometo que esto es real:</p>
  <ul style="line-height: 2;">
    <li>🐔 <strong>Alquiler de gallinas ponedoras</strong> — $4K/mes. "Rent-a-Hen" en California.</li>
    <li>🐌 <strong>Cursos de cría de caracoles</strong> — Un tío en Murcia. €4K/mes.</li>
    <li>🔮 <strong>Software para tarotistas</strong> — Gestión de citas + pagos. $8K/mes.</li>
    <li>💇 <strong>App de barberos a domicilio en pueblos</strong> — Levantó inversión en serio.</li>
  </ul>
  <p>La moraleja: no necesitas la idea perfecta. Necesitas ejecutar rápido.</p>
  <p>Y para eso estamos nosotros.</p>
  <a href="https://www.lanzalo.pro/ideas" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">Descubrir ideas validadas →</a>
  <p>— Lanzalo 🚀</p>
</div>`
  },
  5: {
    subject: '⚡ Cosas que tus agentes pueden hacer (y no sabías)',
    body: (user) => `
<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #e5e7eb; background: #111827; padding: 32px; border-radius: 12px;">
  <h1 style="color: white; font-size: 24px;">El equipo invisible que trabaja para ti 🤖</h1>
  <p>${user.name || 'Oye'},</p>
  <p>Día 5. ¿Sabías que tus agentes IA pueden:</p>
  <ul style="line-height: 2;">
    <li>📧 <strong>Enviar cold emails</strong> — personalizados, verificados, con follow-up automático</li>
    <li>🐦 <strong>Postear en Twitter</strong> — con tu voz de marca, sin sonar a robot</li>
    <li>📊 <strong>Analizar tu mercado</strong> — competidores, precios, huecos</li>
    <li>🔍 <strong>Optimizar SEO</strong> — meta tags, estructura, contenido</li>
    <li>📝 <strong>Pedir cambios</strong> — dile qué no te gusta y lo rehace. Gratis. Siempre.</li>
  </ul>
  <p>Solo tienes que decirle qué necesitas en el chat. Él se encarga del resto.</p>
  <a href="https://www.lanzalo.pro/chat" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">Hablar con mi co-fundador →</a>
</div>`
  },
  6: {
    subject: '⏰ Te quedan 2 días de acceso completo',
    body: (user) => `
<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #e5e7eb; background: #111827; padding: 32px; border-radius: 12px;">
  <h1 style="color: white; font-size: 24px;">Quedan 48 horas ⏰</h1>
  <p>${user.name || 'Oye'},</p>
  <p>No voy a mentirte: en 2 días tu acceso completo se acaba.</p>
  <p>Lo que pierdes:</p>
  <ul style="line-height: 2;">
    <li>❌ Agentes trabajando 24/7 en tu negocio</li>
    <li>❌ Generación de landing pages, emails, marketing</li>
    <li>❌ Chat con tu co-fundador IA</li>
  </ul>
  <p>Lo que mantienes: acceso a <strong>Descubre Ideas</strong> (porque somos majos).</p>
  <p>$39/mes. Menos que una cena. Por un equipo completo de IA.</p>
  <a href="https://www.lanzalo.pro" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">Suscribirme antes de que expire →</a>
  <p style="color: #9ca3af; font-size: 14px;">Sin compromiso. Cancela cuando quieras. Sin preguntas.</p>
</div>`
  },
  7: {
    subject: '🔥 Último día. Tu negocio te espera.',
    body: (user) => `
<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #e5e7eb; background: #111827; padding: 32px; border-radius: 12px;">
  <h1 style="color: white; font-size: 24px;">Hoy es el día 🔥</h1>
  <p>${user.name || 'Crack'},</p>
  <p>Tu trial termina hoy. Tu negocio sigue ahí, esperándote.</p>
  <p>Piénsalo así: $39/mes son €1.30 al día. Menos que un café con leche. Por un equipo de agentes IA que:</p>
  <ul style="line-height: 2;">
    <li>✅ Construyen tu web</li>
    <li>✅ Hacen tu marketing</li>
    <li>✅ Envían tus emails</li>
    <li>✅ Analizan tu mercado</li>
    <li>✅ Trabajan mientras duermes</li>
  </ul>
  <p>Peor es irse a recoger tomates a Almería 😅... o bueno, igual no.</p>
  <a href="https://www.lanzalo.pro" style="display: inline-block; background: #dc2626; color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 18px; margin: 16px 0;">Suscribirme ahora — $39/mes →</a>
  <p style="color: #9ca3af; font-size: 14px;">Si no te suscribes, seguirás teniendo acceso a Descubre Ideas. Pero el resto se pausa.</p>
  <p>— Tu co-fundador IA 🤖</p>
</div>`
  }
};

/**
 * Enviar drip email del día correspondiente
 */
async function sendDripEmail(user, dayNumber) {
  if (!resend || !DRIP_EMAILS[dayNumber]) return;

  try {
    const template = DRIP_EMAILS[dayNumber];
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: user.email,
      subject: template.subject,
      html: template.body(user)
    });

    if (error) {
      console.error(`[Drip] Error día ${dayNumber} a ${user.email}:`, error);
      return;
    }

    console.log(`[Drip] Día ${dayNumber} enviado a ${user.email}`);

    // Registrar envío
    await pool.query(
      `INSERT INTO activity_log (company_id, activity_type, message, created_at)
       SELECT id, 'drip_email', $2, NOW() FROM companies WHERE user_id = $1 LIMIT 1`,
      [user.id, `📧 Drip día ${dayNumber}: ${template.subject}`]
    ).catch(() => {});

  } catch (err) {
    console.error(`[Drip] Exception día ${dayNumber}:`, err);
  }
}

/**
 * Cron: ejecutar drip diario a las 10:30 AM UTC
 */
function scheduleDripSequence() {
  cron.schedule('30 10 * * *', async () => {
    console.log('[Drip] Checking drip sequence...');

    try {
      // Buscar usuarios en trial con días específicos
      for (const dayNumber of [2, 3, 4, 5, 6, 7]) {
        const daysFromRegistration = dayNumber;
        
        const result = await pool.query(
          `SELECT id, email, name 
           FROM users 
           WHERE plan = 'trial' 
             AND DATE(created_at) = DATE(NOW() - INTERVAL '${daysFromRegistration - 1} days')`,
          []
        );

        for (const user of result.rows || []) {
          await sendDripEmail(user, dayNumber);
        }

        if (result.rows?.length > 0) {
          console.log(`[Drip] Día ${dayNumber}: ${result.rows.length} emails enviados`);
        }
      }
    } catch (error) {
      console.error('[Drip] Error en cron:', error);
    }
  });

  console.log('[Drip] Drip sequence scheduled (daily at 10:30 AM UTC)');
}

module.exports = { sendDripEmail, scheduleDripSequence, DRIP_EMAILS };
