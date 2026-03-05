/**
 * Agente de Código - Construye y mejora el producto
 */

const { createTask, updateTask, createDeployment, logActivity } = require('../backend/db');
const { deployToSubdomain } = require('../deployer/deploy');
const { callLLM } = require('../backend/llm');

class CodeAgent {
  async execute(company) {
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
      files: codeFiles,
      filesSummary: codeFiles.map(f => f.filename).join(', ')
    };
  }

  async deploy(company, codeFiles) {
    const deployer = new Deployer(company.id, company.subdomain);
    
    // Determinar tipo de deployment
    const hasPackageJson = codeFiles.files.some(f => f.filename === 'package.json');
    
    if (hasPackageJson) {
      // Deploy a Vercel si tiene package.json
      return await deployer.deployToVercel(codeFiles.files, 'nextjs');
    } else {
      // Deploy estático si es solo HTML/CSS/JS
      return await deployer.deployStatic(codeFiles.files);
    }
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
