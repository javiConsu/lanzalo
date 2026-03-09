/**
 * Task Notifications — Lánzalo
 * 
 * POLÍTICA DE EMAILS:
 * - NO se envían emails individuales por tarea (ni creación, ni completada, ni fallo)
 * - Todo se agrupa en el briefing diario (cofounder-daily.js)
 * - Las funciones se mantienen como no-ops para no romper imports existentes
 * - Solo se loggea por consola para monitoreo
 */

const { pool } = require('../db');

const TAG_NAMES = {
  code: '💻 Ingeniería',
  engineering: '💻 Ingeniería',
  marketing: '📣 Marketing',
  email: '📧 Email',
  twitter: '🐦 Twitter',
  research: '🔍 Investigación',
  data: '📊 Datos',
  browser: '🌐 Web',
  trends: '🔮 Tendencias',
  ideas: '💡 Ideas'
};

/**
 * Notificar que una tarea ha sido creada — NO envía email, solo log
 */
async function notifyTaskCreated(task) {
  console.log(`[Task Notify] Tarea creada: "${task.title}" [${task.tag}] — se incluirá en el briefing diario`);
}

/**
 * Notificar que una tarea ha sido completada — NO envía email, solo log
 */
async function notifyTaskCompleted(task) {
  console.log(`[Task Notify] Tarea completada: "${task.title}" [${task.tag}] — se incluirá en el briefing diario`);
}

/**
 * Notificar que una tarea ha fallado — NO envía email, solo log
 */
async function notifyTaskFailed(task) {
  console.log(`[Task Notify] Tarea fallida: "${task.title}" [${task.tag}] — se incluirá en el briefing diario`);
}

/**
 * Helper: Obtener owner de la empresa
 */
async function getTaskOwner(companyId) {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.name 
       FROM users u 
       INNER JOIN companies c ON c.user_id = u.id 
       WHERE c.id = $1`,
      [companyId]
    );
    return result.rows[0] || null;
  } catch (e) {
    return null;
  }
}

module.exports = { notifyTaskCreated, notifyTaskCompleted, notifyTaskFailed, getTaskOwner, TAG_NAMES };
