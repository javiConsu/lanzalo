/**
 * Sistema de Gamificación — XP y Niveles de Negocio
 * 
 * Niveles (por XP acumulado):
 * 1. Idea       (0 XP)     — Tienes una idea
 * 2. Validando  (100 XP)   — Estás validando el mercado
 * 3. Construyendo (300 XP) — Estás construyendo el producto
 * 4. Lanzado    (700 XP)   — Has lanzado al público
 * 5. Creciendo  (1500 XP)  — Tienes tracción real
 */

const { pool } = require('../db');

const LEVELS = [
  { level: 1, name: 'Idea',         minXp: 0,    icon: '💡', color: '#6B7280' },
  { level: 2, name: 'Validando',    minXp: 100,  icon: '🔍', color: '#3B82F6' },
  { level: 3, name: 'Construyendo', minXp: 300,  icon: '🔨', color: '#8B5CF6' },
  { level: 4, name: 'Lanzado',      minXp: 700,  icon: '🚀', color: '#F59E0B' },
  { level: 5, name: 'Creciendo',    minXp: 1500, icon: '📈', color: '#10B981' }
];

const XP_REWARDS = {
  task_completed:       25,   // Tarea completada por un agente
  first_message:        10,   // Primera vez que habla con el Co-Founder
  company_created:      50,   // Crear la empresa
  first_deploy:         100,  // Primer deploy de una web
  first_email:          30,   // Primer cold email enviado
  first_tweet:          20,   // Primer tweet publicado
  week_streak:          75,   // 7 días seguidos activo
  revenue_first:        200,  // Primer ingreso registrado
  tasks_10:             50,   // 10 tareas completadas
  tasks_50:             150,  // 50 tareas completadas
};

const ACHIEVEMENTS = {
  first_message: {
    title: 'Primera Conversación',
    description: 'Hablaste con tu Co-Founder Agent por primera vez',
    icon: '💬',
    xp: XP_REWARDS.first_message
  },
  company_created: {
    title: 'Fundador Oficial',
    description: 'Creaste tu primera empresa en Lanzalo',
    icon: '🏢',
    xp: XP_REWARDS.company_created
  },
  first_deploy: {
    title: 'En Producción',
    description: 'Lanzaste tu primera web al mundo',
    icon: '🚀',
    xp: XP_REWARDS.first_deploy
  },
  first_email: {
    title: 'Outreach Iniciado',
    description: 'Enviaste tu primer cold email',
    icon: '📧',
    xp: XP_REWARDS.first_email
  },
  first_tweet: {
    title: 'Presencia Social',
    description: 'Publicaste tu primer tweet',
    icon: '🐦',
    xp: XP_REWARDS.first_tweet
  },
  tasks_10: {
    title: '10 Tareas',
    description: 'Completaste 10 tareas con tus agentes',
    icon: '⚡',
    xp: XP_REWARDS.tasks_10
  },
  tasks_50: {
    title: 'Máquina Imparable',
    description: 'Completaste 50 tareas con tus agentes',
    icon: '🔥',
    xp: XP_REWARDS.tasks_50
  },
  revenue_first: {
    title: 'Primer Euro',
    description: 'Registraste tu primer ingreso',
    icon: '💰',
    xp: XP_REWARDS.revenue_first
  }
};

/**
 * Calcular nivel según XP
 */
function getLevelForXp(xp) {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (xp >= lvl.minXp) current = lvl;
  }
  const idx = LEVELS.indexOf(current);
  const next = LEVELS[idx + 1] || null;
  const progress = next
    ? Math.round(((xp - current.minXp) / (next.minXp - current.minXp)) * 100)
    : 100;
  return { ...current, next, progress, xp };
}

/**
 * Dar XP a una empresa
 */
async function awardXp(companyId, source, amount, description = '') {
  if (!companyId || !amount) return;

  try {
    // Registrar en historial
    await pool.query(
      `INSERT INTO xp_history (company_id, source, amount, description)
       VALUES ($1, $2, $3, $4)`,
      [companyId, source, amount, description]
    );

    // Actualizar XP y nivel de la empresa
    const result = await pool.query(
      `UPDATE companies
       SET xp = xp + $2,
           level = $3,
           level_name = $4,
           updated_at = NOW()
       WHERE id = $1
       RETURNING xp`,
      [companyId, amount, 1, 'Idea'] // nivel se recalcula abajo
    );

    if (result.rows.length === 0) return;

    const newXp = result.rows[0].xp;
    const levelData = getLevelForXp(newXp);

    // Actualizar nivel
    await pool.query(
      `UPDATE companies SET level = $2, level_name = $3 WHERE id = $1`,
      [companyId, levelData.level, levelData.name]
    );

    // Broadcast al feed en vivo
    if (global.broadcastActivity) {
      global.broadcastActivity({
        companyId,
        type: 'xp_gained',
        agentType: 'system',
        message: `+${amount} XP — ${description || source}`,
        xp: newXp,
        level: levelData.name,
        timestamp: new Date().toISOString()
      });
    }

    return { xp: newXp, level: levelData };
  } catch (e) {
    console.error('[Gamification] Error awarding XP:', e.message);
  }
}

/**
 * Desbloquear un logro (una sola vez)
 */
async function unlockAchievement(companyId, key) {
  const achievement = ACHIEVEMENTS[key];
  if (!achievement) return;

  try {
    // Intentar insertar — falla silenciosamente si ya existe (UNIQUE constraint)
    const result = await pool.query(
      `INSERT INTO achievements (company_id, achievement_key, title, description, icon, xp_reward)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (company_id, achievement_key) DO NOTHING
       RETURNING id`,
      [companyId, key, achievement.title, achievement.description, achievement.icon, achievement.xp]
    );

    if (result.rows.length === 0) return; // Ya tenía el logro

    // Dar XP del logro
    await awardXp(companyId, `achievement_${key}`, achievement.xp, achievement.title);

    // Broadcast logro desbloqueado
    if (global.broadcastActivity) {
      global.broadcastActivity({
        companyId,
        type: 'achievement_unlocked',
        agentType: 'system',
        message: `🏆 Logro desbloqueado: ${achievement.title}`,
        achievement: { key, ...achievement },
        timestamp: new Date().toISOString()
      });
    }

    console.log(`🏆 [${companyId}] Logro desbloqueado: ${achievement.title}`);
    return achievement;
  } catch (e) {
    console.error('[Gamification] Error unlocking achievement:', e.message);
  }
}

/**
 * Obtener estado gamificación de una empresa
 */
async function getGameState(companyId) {
  const result = await pool.query(
    `SELECT c.xp, c.level, c.level_name,
       (SELECT COUNT(*) FROM tasks WHERE company_id = c.id AND status = 'completed') as tasks_completed,
       (SELECT COUNT(*) FROM achievements WHERE company_id = c.id) as achievements_count,
       (SELECT json_agg(a ORDER BY a.unlocked_at DESC) FROM achievements a WHERE a.company_id = c.id LIMIT 5) as recent_achievements
     FROM companies c WHERE c.id = $1`,
    [companyId]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  const levelData = getLevelForXp(row.xp || 0);

  return {
    xp: row.xp || 0,
    level: levelData,
    tasksCompleted: parseInt(row.tasks_completed || 0),
    achievementsCount: parseInt(row.achievements_count || 0),
    recentAchievements: row.recent_achievements || []
  };
}

module.exports = { awardXp, unlockAchievement, getGameState, getLevelForXp, LEVELS, XP_REWARDS };
