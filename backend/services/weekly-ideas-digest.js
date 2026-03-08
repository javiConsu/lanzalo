/**
 * Weekly Ideas Digest
 * 
 * Runs every Sunday after Trend Scout scans.
 * Sends email to ALL users (free + pro) with:
 * - Summary of new ideas this week
 * - Top 3 ideas preview (1 per tab feel)
 * - CTA to unlock more (for free users)
 */

const cron = require('node-cron');
const { pool } = require('../db');
const { Resend } = require('resend');
const crypto = require('crypto');

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = 'Lanzalo <noreply@lanzalo.pro>';

/**
 * Get current week ID (e.g. "2026-W10")
 */
function getWeekId() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now - startOfYear) / 86400000);
  const weekNum = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
}

/**
 * Schedule weekly cycle:
 * 1. Sunday 07:00 UTC (08:00 CET) — Create Trend Scout task (scans all 7 sources)
 * 2. Sunday 10:00 UTC (11:00 CET) — Send digest email to all users
 */
function scheduleWeeklyIdeasDigest() {
  // Step 1: Trigger Trend Scout scan (Sunday 07:00 UTC)
  cron.schedule('0 7 * * 0', async () => {
    console.log('[Weekly Ideas] Triggering Trend Scout scan...');
    await triggerTrendScoutScan();
  });

  // Step 2: Send digest emails (Sunday 10:00 UTC — 3h after scan)
  cron.schedule('0 10 * * 0', async () => {
    console.log('[Weekly Digest] Starting Sunday ideas digest...');
    await sendWeeklyDigestToAll();
  });

  console.log('[Weekly Ideas] Scheduler started:');
  console.log('  - Trend Scout: Sundays 08:00 CET');
  console.log('  - Email digest: Sundays 11:00 CET');
}

/**
 * Create a Trend Scout task in the backlog
 * The task executor picks it up and runs the full scan
 */
async function triggerTrendScoutScan() {
  try {
    const batchId = getWeekId();
    const taskId = crypto.randomUUID();

    // Use a system company or null — Trend Scout is global, not per-company
    await pool.query(
      `INSERT INTO tasks (id, company_id, created_by, assigned_to, title, description, tag, priority, status)
       VALUES ($1, NULL, NULL, 'trend-scout', $2, $3, 'trends', 'high', 'todo')`,
      [
        taskId,
        `Trend Scout — Escaneo semanal ${batchId}`,
        `Escaneo semanal de tendencias. Batch: ${batchId}. Fuentes: Reddit, HN, YouTube, TikTok, Gumroad, Product Hunt, Twitter/X.`
      ]
    );

    console.log(`[Weekly Ideas] Trend Scout task created: ${taskId} (batch ${batchId})`);
  } catch (error) {
    console.error('[Weekly Ideas] Error creating Trend Scout task:', error.message);
  }
}

/**
 * Send digest to all users
 */
async function sendWeeklyDigestToAll() {
  if (!resend) {
    console.log('[Weekly Digest] Resend not configured, skipping');
    return;
  }

  const batchId = getWeekId();

  try {
    // Get new ideas from this week
    const ideasRes = await pool.query(
      `SELECT * FROM discovered_ideas 
       WHERE is_active = true 
       AND discovered_at >= NOW() - INTERVAL '7 days'
       ORDER BY score DESC
       LIMIT 20`
    );

    const newIdeas = ideasRes.rows;
    if (newIdeas.length === 0) {
      console.log('[Weekly Digest] No new ideas this week, skipping emails');
      return;
    }

    // Get all users (free + pro)
    const usersRes = await pool.query(
      `SELECT u.id, u.email, u.name, u.plan, u.subscription_tier
       FROM users u
       WHERE u.email IS NOT NULL
       AND u.id NOT IN (
         SELECT user_id FROM weekly_digest_log WHERE batch_id = $1
       )`,
      [batchId]
    );

    const users = usersRes.rows;
    console.log(`[Weekly Digest] Sending to ${users.length} users (${newIdeas.length} new ideas)`);

    // Top 3 ideas for the email preview
    const topIdeas = newIdeas.slice(0, 3);

    let sentCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        const isPro = user.plan === 'pro' || user.subscription_tier === 'pro' || user.plan === 'trial';
        const html = renderWeeklyDigestEmail(user, topIdeas, newIdeas.length, isPro);

        await resend.emails.send({
          from: FROM_EMAIL,
          to: user.email,
          subject: `💡 ${newIdeas.length} ideas nuevas esta semana — Lanzalo`,
          html
        });

        // Log sent
        await pool.query(
          `INSERT INTO weekly_digest_log (user_id, batch_id, ideas_count)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, batch_id) DO NOTHING`,
          [user.id, batchId, newIdeas.length]
        );

        sentCount++;

        // Rate limit: don't spam Resend
        await new Promise(r => setTimeout(r, 200));
      } catch (e) {
        console.error(`[Weekly Digest] Error sending to ${user.email}:`, e.message);
        errorCount++;
      }
    }

    console.log(`[Weekly Digest] Done: ${sentCount} sent, ${errorCount} errors`);
  } catch (error) {
    console.error('[Weekly Digest] Fatal error:', error);
  }
}

/**
 * Render the weekly digest email
 */
function renderWeeklyDigestEmail(user, topIdeas, totalCount, isPro) {
  const scoreColor = (score) => {
    if (score >= 90) return '#34d399';
    if (score >= 80) return '#60a5fa';
    if (score >= 70) return '#fbbf24';
    return '#9ca3af';
  };

  const difficultyLabel = (d) => {
    if (d === 'easy') return '🟢 Principiante';
    if (d === 'medium') return '🟡 Intermedio';
    return '🔴 Avanzado';
  };

  const ideaCards = topIdeas.map((idea, i) => `
    <tr>
      <td style="padding: 16px 0; ${i < topIdeas.length - 1 ? 'border-bottom: 1px solid #1f2937;' : ''}">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="60" valign="top" style="padding-right: 16px;">
              <div style="width: 56px; height: 56px; border-radius: 12px; background-color: #111827; border: 2px solid ${scoreColor(idea.score)}; text-align: center; line-height: 52px;">
                <span style="font-size: 18px; font-weight: 800; color: ${scoreColor(idea.score)};">${idea.score}%</span>
              </div>
            </td>
            <td valign="top">
              <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 700; color: #f3f4f6;">${idea.title}</p>
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #9ca3af; line-height: 1.5;">${(idea.problem || '').substring(0, 120)}${idea.problem?.length > 120 ? '...' : ''}</p>
              <p style="margin: 0; font-size: 12px; color: #6b7280;">
                ${difficultyLabel(idea.difficulty)} · ${idea.potential_revenue || '—'} · ${idea.source || 'Trend Scout'}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('');

  const ctaText = isPro 
    ? 'Ver todas las ideas →'
    : `Desbloquear las ${totalCount} ideas →`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0a0a0a;">
        <tr>
          <td align="center" style="padding: 40px 16px;">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">
              
              <!-- Logo -->
              <tr>
                <td style="padding-bottom: 32px;">
                  <span style="font-size: 20px; font-weight: 800; color: #10b981; letter-spacing: -0.5px;">Lanzalo.pro</span>
                </td>
              </tr>
              
              <!-- Header -->
              <tr>
                <td style="padding-bottom: 8px;">
                  <h1 style="margin: 0; font-size: 24px; color: #f3f4f6; font-weight: 800;">
                    💡 ${totalCount} ideas nuevas esta semana
                  </h1>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom: 24px;">
                  <p style="margin: 0; font-size: 15px; color: #9ca3af;">
                    ${user.name ? user.name + ', t' : 'T'}u Trend Scout ha analizado Reddit, YouTube, TikTok, Twitter y más. Esto es lo mejor que ha encontrado.
                  </p>
                </td>
              </tr>
              
              <!-- Ideas list -->
              <tr>
                <td style="background-color: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 20px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    ${ideaCards}
                  </table>
                </td>
              </tr>

              ${totalCount > 3 ? `
              <!-- More ideas teaser -->
              <tr>
                <td style="padding: 16px 0 0 0; text-align: center;">
                  <p style="margin: 0; font-size: 14px; color: #6b7280;">
                    + ${totalCount - 3} ideas más esperándote en la plataforma
                  </p>
                </td>
              </tr>
              ` : ''}
              
              <!-- CTA -->
              <tr>
                <td style="padding: 24px 0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                    <tr>
                      <td style="background-color: #10b981; border-radius: 10px;">
                        <a href="https://lanzalo.pro/ideas" target="_blank" style="display: inline-block; padding: 14px 32px; color: #000000; text-decoration: none; font-weight: 700; font-size: 15px;">
                          ${ctaText}
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              ${!isPro ? `
              <!-- Upgrade nudge for free users -->
              <tr>
                <td style="padding: 16px 20px; background-color: #111827; border: 1px solid #1f2937; border-left: 3px solid #f59e0b; border-radius: 8px;">
                  <p style="margin: 0 0 4px 0; font-size: 14px; color: #f59e0b; font-weight: 600;">🔒 Solo ves 3 ideas</p>
                  <p style="margin: 0; font-size: 13px; color: #9ca3af;">
                    Con Pro desbloqueas todas las ideas, análisis detallado de cada una, y el Trend Scout trabajando para ti cada semana.
                  </p>
                </td>
              </tr>
              ` : ''}
              
              <!-- Footer -->
              <tr>
                <td style="padding-top: 32px; border-top: 1px solid #1f2937; margin-top: 24px;">
                  <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px 0;">
                    <strong style="color: #9ca3af;">Lanzalo</strong> — Tu equipo de IA que no duerme
                  </p>
                  <p style="color: #4b5563; font-size: 12px; margin: 0;">
                    Recibes esto cada domingo porque quieres ser el primero en pillar las mejores oportunidades.
                  </p>
                </td>
              </tr>
              
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

module.exports = {
  scheduleWeeklyIdeasDigest,
  sendWeeklyDigestToAll,
  getWeekId
};
