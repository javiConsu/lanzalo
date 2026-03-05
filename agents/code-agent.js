/**
 * Agente de Código - Construye y mejora el producto
 */

const { createTask, updateTask, createDeployment, logActivity } = require('../backend/db');
const { deployToSubdomain } = require('../deployer/deploy');
const { callLLM } = require('../backend/llm');

class CodeAgent {
  async execute(company) {
    const task = await createTask(company.id, 'code', 
      'Ciclo de desarrollo diario', 
      'Analizar roadmap, escribir código, desplegar mejoras');

    try {
      await updateTask(task.id, { status: 'running' });
      await logActivity(company.id, task.id, 'task_start', 
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

      await updateTask(task.id, { 
        status: 'completed', 
        output,
        completed_at: new Date()
      });

      await logActivity(company.id, task.id, 'task_complete',
        `Agente de código completado: ${decision.action}`);

      return { 
        success: true, 
        summary: decision.action,
        deployed: decision.shouldDeploy 
      };

    } catch (error) {
      await updateTask(task.id, { 
        status: 'failed', 
        output: error.message,
        completed_at: new Date()
      });
      throw error;
    }
  }

  async analyzeProduct(company) {
    // Call LLM to analyze current state
    const prompt = `You are the code agent for "${company.name}".
Description: ${company.description}
Industry: ${company.industry}
Current status: ${company.status}

Analyze the current state of this product. What exists? What's missing? 
What should be prioritized next?

Respond in JSON format:
{
  "summary": "brief analysis",
  "existingFeatures": ["feature1", "feature2"],
  "missingCritical": ["missing1", "missing2"],
  "nextPriority": "what to build next"
}`;

    const response = await callLLM(prompt);
    return JSON.parse(response);
  }

  async decideDailyWork(company, analysis) {
    const prompt = `Based on this analysis for "${company.name}":
${JSON.stringify(analysis, null, 2)}

Decide what coding work should be done TODAY (if any).

Consider:
- Is there a critical missing feature?
- Should we improve existing code?
- Is the product ready to deploy?
- Or should we wait/plan more?

Respond in JSON:
{
  "shouldCode": true/false,
  "shouldDeploy": true/false,
  "action": "brief description of what to do",
  "reason": "why this decision",
  "files": ["file1.js", "file2.js"] // files to create/modify if shouldCode=true
}`;

    const response = await callLLM(prompt);
    return JSON.parse(response);
  }

  async generateCode(company, decision) {
    const codeFiles = [];
    
    for (const filename of decision.files) {
      const prompt = `Generate code for "${company.name}" - ${filename}

Context:
- Description: ${company.description}
- Industry: ${company.industry}
- Task: ${decision.action}

Write production-ready code for this file. Include all necessary imports,
error handling, and comments.

Respond ONLY with the code, no explanations.`;

      const code = await callLLM(prompt);
      codeFiles.push({ filename, code });
    }

    return {
      files: codeFiles,
      filesSummary: codeFiles.map(f => f.filename).join(', ')
    };
  }

  async deploy(company, codeFiles) {
    // Use the deployer to push code to subdomain
    return await deployToSubdomain(company.subdomain, codeFiles.files);
  }

  async executeCustomTask(company, taskDescription) {
    // For on-demand tasks
    const prompt = `Custom task for "${company.name}": ${taskDescription}

Generate code to accomplish this task.`;
    
    const code = await callLLM(prompt);
    return { code };
  }
}

module.exports = CodeAgent;
