/**
 * Code Agent — DEPRECATED
 * 
 * El trabajo de código ahora lo maneja el Task Executor (agents/executors/code-executor.js).
 * Este agente existe solo para compatibilidad con el Orchestrator.
 */

class CodeAgent {
  async execute(company) {
    // No-op: el Task Executor maneja las tareas de código
    return {
      success: true,
      summary: 'Delegado al Task Executor',
      deployed: false
    };
  }
}

module.exports = CodeAgent;
