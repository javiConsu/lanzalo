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

// Import all agent executors
const codeExecutor = require('./executors/code-executor');
const researchExecutor = require('./executors/research-executor');
const browserExecutor = require('./executors/browser-executor');
const twitterExecutor = require('./executors/twitter-executor');
const emailExecutor = require('./executors/email-executor');
const dataExecutor = require('./executors/data-executor');
const trendScoutExecutor = require('./executors/trend-scout-executor');

// Map tags to executors
const EXECUTORS = {
  'code': codeExecutor,
  'engineering': codeExecutor,
  'research': researchExecutor,
  'browser': browserExecutor,
  'twitter': twitterExecutor,
  'email': emailExecutor,
  'data': dataExecutor,
  'analytics': dataExecutor,
  'trends': trendScoutExecutor,
  'ideas': trendScoutExecutor
};

class TaskExecutor {
  constructor() {
    this.isRunning = false;
    this.pollInterval = 10000; // 10 seconds
    this.maxConcurrent = 5; // Max concurrent tasks
    this.activeTasks = new Set();
  }

  /**
   * Start the execution loop
   */
  start() {
    if (this.isRunning) {
      console.log('[Task Executor] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[Task Executor] Starting execution loop...');
    console.log(`[Task Executor] Polling every ${this.pollInterval}ms`);
    console.log(`[Task Executor] Max concurrent tasks: ${this.maxConcurrent}`);

    this.loop();
  }

  /**
   * Stop the execution loop
   */
  stop() {
    this.isRunning = false;
    console.log('[Task Executor] Stopping execution loop...');
  }

  /**
   * Main execution loop
   */
  async loop() {
    while (this.isRunning) {
      try {
        // Check if we can take more tasks
        if (this.activeTasks.size < this.maxConcurrent) {
          const availableSlots = this.maxConcurrent - this.activeTasks.size;
          
          // Get next tasks from backlog
          const tasks = await this.getNextTasks(availableSlots);
          
          if (tasks.length > 0) {
            console.log(`[Task Executor] Found ${tasks.length} tasks to execute`);
            
            // Execute each task in parallel
            for (const task of tasks) {
              this.executeTask(task); // Fire and forget
            }
          }
        }
        
        // Wait before next poll
        await this.sleep(this.pollInterval);
        
      } catch (error) {
        console.error('[Task Executor] Loop error:', error);
        await this.sleep(5000); // Wait 5s on error
      }
    }
  }

  /**
   * Get next tasks from backlog
   */
  async getNextTasks(limit = 5) {
    const result = await pool.query(
      `SELECT * FROM current_backlog 
       LIMIT ?`,
      [limit]
    );
    
    return result.rows || [];
  }

  /**
   * Execute a single task
   */
  async executeTask(task) {
    const taskId = task.id;
    
    // Mark as active
    this.activeTasks.add(taskId);
    
    try {
      console.log(`[Task Executor] Executing task ${task.id}: ${task.title}`);
      console.log(`[Task Executor] Tag: ${task.tag}, Priority: ${task.priority}`);
      
      // Update status to in_progress
      await pool.query(
        `UPDATE tasks 
         SET status = 'in_progress', 
             started_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [taskId]
      );
      
      // Get executor for this task
      const executor = this.getExecutor(task.tag);
      
      if (!executor) {
        throw new Error(`No executor found for tag: ${task.tag}`);
      }
      
      // Execute the task
      const result = await executor.execute(task);
      
      // Mark as completed
      await pool.query(
        `UPDATE tasks 
         SET status = 'completed',
             output = ?,
             completed_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [result.output || 'Task completed', taskId]
      );
      
      console.log(`[Task Executor] ✅ Task ${taskId} completed`);
      
      // If task generated artifacts, save them
      if (result.artifacts) {
        await this.saveArtifacts(taskId, result.artifacts);
      }
      
    } catch (error) {
      console.error(`[Task Executor] ❌ Task ${taskId} failed:`, error.message);
      
      // Check retry count
      const retryCount = task.retry_count || 0;
      
      if (retryCount < 3) {
        // Retry later
        await pool.query(
          `UPDATE tasks 
           SET status = 'todo',
               retry_count = ?,
               error_message = ?
           WHERE id = ?`,
          [retryCount + 1, error.message, taskId]
        );
        
        console.log(`[Task Executor] Task ${taskId} will retry (attempt ${retryCount + 1}/3)`);
      } else {
        // Failed permanently
        await pool.query(
          `UPDATE tasks 
           SET status = 'failed',
               error_message = ?,
               completed_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [error.message, taskId]
        );
        
        console.log(`[Task Executor] Task ${taskId} failed permanently after 3 retries`);
      }
      
    } finally {
      // Remove from active tasks
      this.activeTasks.delete(taskId);
    }
  }

  /**
   * Get executor for a task tag
   */
  getExecutor(tag) {
    if (!tag) {
      return null;
    }
    
    return EXECUTORS[tag.toLowerCase()];
  }

  /**
   * Save task artifacts
   */
  async saveArtifacts(taskId, artifacts) {
    // TODO: Implement artifact storage
    // For now, just log
    console.log(`[Task Executor] Artifacts for ${taskId}:`, artifacts);
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get execution stats
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      activeTasks: this.activeTasks.size,
      maxConcurrent: this.maxConcurrent,
      pollInterval: this.pollInterval
    };
  }
}

// Export both class and singleton instance
module.exports = TaskExecutor;
module.exports.TaskExecutor = TaskExecutor;

// Singleton instance for server.js to use
const taskExecutorInstance = new TaskExecutor();
module.exports.instance = taskExecutorInstance;
