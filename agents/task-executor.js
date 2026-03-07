/**
 * Task Executor
 *
 * Main execution loop:
 * - Polls backlog every 10 seconds
 * - Assigns tasks to appropriate agents
 * - Executes tasks and updates status
 * - Handles failures and retries
 */
const { pool } = require('../backend/db');
const crypto = require('crypto');

class TaskExecutor {
  constructor() {
    this.isRunning = false;
    this.pollInterval = 10000;
    this.maxConcurrent = 5;
    this.activeTasks = new Set();
  }

  /**
   * Get executor for a task tag (lazy load to avoid circular deps)
   */
  getExecutor(tag) {
    if (!tag) return null;

    const EXECUTORS = {
      'code':        () => require('./executors/code-executor'),
      'engineering': () => require('./executors/code-executor'),
      'research':    () => require('./executors/research-executor'),
      'browser':     () => require('./executors/browser-executor'),
      'twitter':     () => require('./executors/twitter-executor'),
      'email':       () => require('./executors/email-executor'),
      'data':        () => require('./executors/data-executor'),
      'analytics':   () => require('./executors/data-executor'),
      'trends':      () => require('./executors/trend-scout-executor'),
      'ideas':       () => require('./executors/trend-scout-executor')
    };

    const loader = EXECUTORS[tag.toLowerCase()];
    if (!loader) return null;

    try {
      const ExecutorClass = loader();
      const Cls = ExecutorClass.default || ExecutorClass;
      return new Cls();
    } catch (e) {
      console.warn(`[Task Executor] Could not load executor for tag '${tag}':`, e.message);
      return null;
    }
  }

  start() {
    if (this.isRunning) {
      console.log('[Task Executor] Already running');
      return;
    }
    this.isRunning = true;
    console.log('[Task Executor] Starting execution loop...');
    this.loop();
  }

  stop() {
    this.isRunning = false;
    console.log('[Task Executor] Stopping execution loop...');
  }

  async loop() {
    while (this.isRunning) {
      try {
        if (this.activeTasks.size < this.maxConcurrent) {
          const availableSlots = this.maxConcurrent - this.activeTasks.size;
          const tasks = await this.getNextTasks(availableSlots);
          if (tasks.length > 0) {
            console.log(`[Task Executor] Found ${tasks.length} tasks to execute`);
            for (const task of tasks) {
              this.executeTask(task);
            }
          }
        }
        await this.sleep(this.pollInterval);
      } catch (error) {
        console.error('[Task Executor] Loop error:', error);
        await this.sleep(5000);
      }
    }
  }

  async getNextTasks(limit = 5) {
    try {
      const result = await pool.query(
        `SELECT * FROM tasks WHERE status = 'todo' ORDER BY priority DESC, created_at ASC LIMIT $1`,
        [limit]
      );
      return result.rows || [];
    } catch (e) {
      return [];
    }
  }

  async executeTask(task) {
    const taskId = task.id;
    this.activeTasks.add(taskId);
    try {
      console.log(`[Task Executor] Executing task ${task.id}: ${task.title}`);
      await pool.query(
        `UPDATE tasks SET status = 'in_progress', started_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [taskId]
      );
      const executor = this.getExecutor(task.tag);
      if (!executor) throw new Error(`No executor found for tag: ${task.tag}`);
      const result = await executor.execute(task);
      await pool.query(
        `UPDATE tasks SET status = 'completed', output = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [result.output || 'Task completed', taskId]
      );
      console.log(`[Task Executor] ✅ Task ${taskId} completed`);

      // Gamificación: XP por tarea completada
      try {
        const { awardXp, unlockAchievement } = require('./services/gamification').default || require('../backend/services/gamification');
        await awardXp(task.company_id, 'task_completed', 25, `Tarea completada: ${task.title}`);
        // Logros por número de tareas
        const countResult = await pool.query(
          `SELECT COUNT(*) as n FROM tasks WHERE company_id = $1 AND status = 'completed'`,
          [task.company_id]
        );
        const n = parseInt(countResult.rows[0].n);
        if (n === 10) await unlockAchievement(task.company_id, 'tasks_10');
        if (n === 50) await unlockAchievement(task.company_id, 'tasks_50');
        // Broadcast feed
        if (global.broadcastActivity) {
          global.broadcastActivity({
            companyId: task.company_id,
            type: 'task_completed',
            agentType: task.tag || task.agent_type,
            taskTitle: task.title,
            message: `Tarea completada: ${task.title}`,
            timestamp: new Date().toISOString()
          });
        }
      } catch (e) { /* silencioso */ }
    } catch (error) {
      console.error(`[Task Executor] ❌ Task ${taskId} failed:`, error.message);
      const retryCount = task.retry_count || 0;
      if (retryCount < 3) {
        await pool.query(
          `UPDATE tasks SET status = 'todo', retry_count = $1, error_message = $2 WHERE id = $3`,
          [retryCount + 1, error.message, taskId]
        );
      } else {
        await pool.query(
          `UPDATE tasks SET status = 'failed', error_message = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [error.message, taskId]
        );
      }
    } finally {
      this.activeTasks.delete(taskId);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStats() {
    return {
      isRunning: this.isRunning,
      activeTasks: this.activeTasks.size,
      maxConcurrent: this.maxConcurrent,
      pollInterval: this.pollInterval
    };
  }
}

module.exports = TaskExecutor;
module.exports.TaskExecutor = TaskExecutor;
const taskExecutorInstance = new TaskExecutor();
module.exports.instance = taskExecutorInstance;
