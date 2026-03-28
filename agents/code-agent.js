/**
 * Code Agent — DEPRECATED
 * 
 * El trabajo de código ahora lo maneja el Task Executor (agents/executors/code-executor.js).
 * Este agente existe solo para compatibilidad con el Orchestrator.
 */

const governanceHelper = require('../backend/services/governance-helper');
const { TenantDB } = require('../backend/middleware/tenant');
const CodeExecutor = require('./executors/code-executor');

class CodeAgent {
  constructor() {
    this.executor = new CodeExecutor();
  }

  async execute(company) {
    // GOVERNANCE CHECKS
    const budgetCheck = await governanceHelper.checkBudgetBeforeAction('Code');
    if (!budgetCheck.allowed) {
      return { error: budgetCheck.error, budget_exceeded: true, action: 'skipped' };
    }

    const governanceCheck = await governanceHelper.checkGovernanceStatus('Code', company.id);
    if (!governanceCheck.allowed) {
      return { error: 'Code Agent is paused or terminated', paused: governanceCheck.paused, terminated: governanceCheck.terminated };
    }

    await governanceHelper.recordHeartbeat(company.id, 'Code');

    const db = new TenantDB(company.id);
    
    const task = await db.createTask('code', 
      'Ciclo de desarrollo diario', 
      'Analizar roadmap, escribir código, desplegar mejoras');

    try {
      await db.logActivity(task.id, 'task_start', 
        `Agente de código iniciado para ${company.name}`);

      // Delegar al CodeExecutor
      const result = await this.executor.execute({
        ...task,
        company_id: company.id
      });

      await db.logActivity(task.id, 'task_complete',
        `Agente de código completado: ${result.summary || 'OK'}`);

      // GOVERNANCE: Record budget usage
      governanceHelper.recordBudgetUsage(company.id, 'Code', 0.1, 'dollars').catch(() => {});

      return {
        success: true,
        summary: result.summary || 'Delegado al CodeExecutor',
        deployed: result.deployed || false
      };

    } catch (error) {
      await db.logActivity(task.id, 'task_error', 
        `Error: ${error.message}`);
      throw error;
    }
  }
}

module.exports = CodeAgent;
