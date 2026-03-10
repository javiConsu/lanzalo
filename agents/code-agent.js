/**
 * Code Agent — DEPRECATED
 * 
 * El trabajo de código ahora lo maneja el Task Executor (agents/executors/code-executor.js).
 * Este agente existe solo para compatibilidad con el Orchestrator.
 */

const { createTask, updateTask, createDeployment, logActivity } = require('../backend/db');
const { deployToSubdomain } = require('../deployer/deploy');
const { callLLM } = require('../backend/llm');
const governanceHelper = require('../backend/services/governance-helper');

class CodeAgent {
  async execute(company) {
    // GOVERNANCE CHECKS
    const budgetCheck = await governanceHelper.checkBudgetBeforeAction('Code');
    if (!budgetCheck.allowed) {
      return { error: budgetCheck.error, budget_exceeded: true, action: 'skipped' };
    }

    const governanceCheck = await governanceHelper.checkGovernanceStatus('Code');
    if (!governanceCheck.allowed) {
      return { error: 'Code Agent is paused or terminated', paused: governanceCheck.paused, terminated: governanceCheck.terminated };
    }

    await governanceHelper.recordHeartbeat('Code');

    const db = new TenantDB(company.id);
    const executor = new CodeExecutor(company.id);
    const deployer = new Deployer(company.id, company.subdomain);
    
    const task = await db.createTask('code', 
      'Ciclo de desarrollo diario', 
      'Analizar roadmap, escribir código, desplegar mejoras');

    try {
      await db.logActivity(task.id, 'task_start', 
        `Agente de código iniciado para ${company.name}`);

      // 1. Analizar estado actual y roadmap
      const analysis = await this.analyzeProduct(company);
      
      // 2. Decidir qué construir/mejorar hoy
      const decision = await this.decideDailyWork(company, analysis);
      
      // 3. Generar código
      let output = `Análisis: ${analysis.summary}\n\nDecisión: ${decision.action}\n\n`;
      
      if (decision.shouldCode) {
        const code = await this.generateCode(company, decision);
        output += `Código generado:\n${code.filesSummary}\n\n`;
        
        // 4. Desplegar si está listo
        if (decision.shouldDeploy) {
          const deployment = await this.deploy(company, code);
          output += `Desplegado en: ${deployment.url}`;
          
          await createDeployment(company.id, deployment.url, 
            deployment.type, deployment.framework, 'live');
        }
      } else {
        output += `No se necesitan cambios de código hoy. ${decision.reason}`;
      }

      await db.logActivity(task.id, 'task_complete',
        `Agente de código completado: ${decision.action}`);

      // GOVERNANCE: Record budget usage
      governanceHelper.recordBudgetUsage('Code', 5000, 0.1).catch(() => {});

      return {
        success: true,
        summary: decision.action,
        deployed: decision.shouldDeploy
      };

    } catch (error) {
      await db.logActivity(task.id, 'task_error', 
        `Error: ${error.message}`);
      throw error;
    }
  }

  async analyzeProduct(company) {
    const prompt = `Eres el agente de código para "${company.name}".
Descripción: ${company.description}
Industria: ${company.industry}
Estado actual: ${company.status}

Analiza el estado actual de este producto. ¿Qué existe? ¿Qué falta? 
¿Qué se debe priorizar?

Responde en JSON:
{
  "summary": "análisis breve",
  "existingFeatures": ["feature1", "feature2"],
  "missingCritical": ["faltante1", "faltante2"],
  "nextPriority": "qué construir siguiente"
}`;

    const result = await callLLM(prompt, {
      companyId: company.id,
      taskType: 'code'
    });
    
    return JSON.parse(result.content);
  }

  async decideDailyWork(company, analysis) {
    const prompt = `Basado en este análisis para "${company.name}":
${JSON.stringify(analysis, null, 2)}

Decide qué trabajo de código hacer HOY (si aplica).

Considera:
- ¿Hay una funcionalidad crítica faltante?
- ¿Debemos mejorar código existente?
- ¿El producto está listo para desplegar?
- ¿O debemos esperar/planificar más?

Responde en JSON:
{
  "shouldCode": true/false,
  "shouldDeploy": true/false,
  "action": "descripción breve de qué hacer",
  "reason": "por qué esta decisión",
  "files": ["file1.js", "file2.js"]
}`;

    const result = await callLLM(prompt, {
      companyId: company.id,
      taskType: 'code'
    });
    
    return JSON.parse(result.content);
  }

  async generateCode(company, decision) {
    const codeFiles = [];
    
    for (const filename of decision.files) {
      const prompt = `Genera código para "${company.name}" - ${filename}

Contexto:
- Descripción: ${company.description}
- Industria: ${company.industry}
- Tarea: ${decision.action}

Escribe código listo para producción. Incluye imports necesarios,
manejo de errores, y comentarios.

Responde SOLO con el código, sin explicaciones.`;

      const result = await callLLM(prompt, {
        companyId: company.id,
        taskType: 'code'
      });
      
      codeFiles.push({ filename, code: result.content });
    }

    return {
      success: true,
      summary: 'Delegado al Task Executor',
      deployed: false
    };
  }
}

module.exports = CodeAgent;
