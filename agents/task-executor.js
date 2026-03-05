/**
 * Task Executor - Loop que ejecuta tareas del backlog
 * 
 * Los agentes polling su backlog y ejecutan tareas asignadas a ellos
 */

const { pool } = require('../backend/db');
const crypto = require('crypto');

class TaskExecutor {
  constructor(agentId, agentName) {
    this.agentId = agentId;
    this.agentName = agentName;
    this.isRunning = false;
    this.pollInterval = 10000; // 10 segundos
  }

  /**
   * Iniciar polling del backlog
   */
  start() {
    if (this.isRunning) {
      console.log(`⚠️  ${this.agentName} ya está corriendo`);
      return;
    }

    this.isRunning = true;
    console.log(`🚀 ${this.agentName} iniciado - polling cada ${this.pollInterval / 1000}s`);

    this.poll();
  }

  /**
   * Detener polling
   */
  stop() {
    this.isRunning = false;
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
    }
    console.log(`🛑 ${this.agentName} detenido`);
  }

  /**
   * Polling loop
   */
  async poll() {
    if (!this.isRunning) return;

    try {
      // Buscar tareas asignadas a este agente con status 'todo'
      const result = await pool.query(
        `SELECT * FROM tasks 
         WHERE assigned_to = ? 
         AND status = 'todo' 
         ORDER BY 
           CASE priority
             WHEN 'critical' THEN 1
             WHEN 'high' THEN 2
             WHEN 'medium' THEN 3
             WHEN 'low' THEN 4
           END,
           created_at
         LIMIT 1`,
        [this.agentId]
      );

      if (result.rows.length > 0) {
        const task = result.rows[0];
        await this.executeTask(task);
      }

    } catch (error) {
      console.error(`❌ Error en ${this.agentName} poll:`, error.message);
    }

    // Siguiente poll
    this.pollTimeout = setTimeout(() => this.poll(), this.pollInterval);
  }

  /**
   * Ejecutar una tarea
   */
  async executeTask(task) {
    console.log(`\n🔧 ${this.agentName} ejecutando: [${task.tag}] ${task.title}`);

    try {
      // Marcar como in_progress
      await this.updateTaskStatus(task.id, 'in_progress', {
        started_at: new Date().toISOString()
      });

      // Ejecutar la tarea (implementado por cada agente)
      const result = await this.execute(task);

      // Marcar como completed
      await this.updateTaskStatus(task.id, 'completed', {
        completed_at: new Date().toISOString(),
        output: JSON.stringify(result)
      });

      console.log(`✅ ${this.agentName} completó: ${task.title}`);

      // Notificar al usuario (opcional)
      await this.notifyCompletion(task, result);

    } catch (error) {
      console.error(`❌ ${this.agentName} falló en: ${task.title}`, error.message);

      // Marcar como failed
      await this.updateTaskStatus(task.id, 'failed', {
        failed_at: new Date().toISOString(),
        error_message: error.message
      });

      // Notificar fallo
      await this.notifyFailure(task, error);
    }
  }

  /**
   * Actualizar estado de tarea
   */
  async updateTaskStatus(taskId, status, additionalFields = {}) {
    const fields = ['status = ?'];
    const values = [status];

    // Añadir campos adicionales
    for (const [key, value] of Object.entries(additionalFields)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }

    values.push(taskId);

    await pool.query(
      `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  /**
   * Método de ejecución (override en cada agente)
   */
  async execute(task) {
    throw new Error('execute() debe ser implementado por el agente específico');
  }

  /**
   * Notificar completación al usuario
   */
  async notifyCompletion(task, result) {
    // Guardar mensaje en chat
    const messageId = crypto.randomUUID();
    
    await pool.query(
      `INSERT INTO chat_messages (id, company_id, user_id, role, content, task_id, action)
       VALUES (?, ?, NULL, 'assistant', ?, ?, 'task_completed')`,
      [
        messageId,
        task.company_id,
        `✅ Tarea completada: ${task.title}\n\n${this.formatResult(result)}`,
        task.id
      ]
    );

    console.log(`📬 Notificación enviada para tarea: ${task.id}`);
  }

  /**
   * Notificar fallo al usuario
   */
  async notifyFailure(task, error) {
    const messageId = crypto.randomUUID();
    
    await pool.query(
      `INSERT INTO chat_messages (id, company_id, user_id, role, content, task_id, action)
       VALUES (?, ?, NULL, 'assistant', ?, ?, 'task_failed')`,
      [
        messageId,
        task.company_id,
        `❌ Tarea falló: ${task.title}\n\nError: ${error.message}`,
        task.id
      ]
    );
  }

  /**
   * Formatear resultado para mostrar al usuario
   */
  formatResult(result) {
    if (typeof result === 'string') {
      return result;
    }
    
    if (result.summary) {
      return result.summary;
    }

    return JSON.stringify(result, null, 2);
  }
}

module.exports = TaskExecutor;
