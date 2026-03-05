/**
 * Code Agent Executor - Ejecuta tareas de engineering
 */

const TaskExecutor = require('../task-executor');
const { callLLM } = require('../../backend/llm');
const { pool } = require('../../backend/db');
const fs = require('fs').promises;
const path = require('path');

class CodeExecutor extends TaskExecutor {
  constructor() {
    super('code-agent', 'Code Agent');
  }

  /**
   * Ejecutar tarea de código
   */
  async execute(task) {
    console.log(`💻 Code Agent procesando: ${task.title}`);

    // Obtener info de la empresa
    const companyResult = await pool.query(
      'SELECT * FROM companies WHERE id = ?',
      [task.company_id]
    );
    const company = companyResult.rows[0];

    // Construir prompt para el LLM
    const prompt = this.buildPrompt(task, company);

    // Llamar al LLM
    const response = await callLLM(prompt, {
      companyId: task.company_id,
      taskType: 'code',
      temperature: 0.3
    });

    // Procesar respuesta
    const result = await this.processResponse(task, company, response.content);

    return {
      summary: result.summary,
      filesModified: result.files,
      deployed: result.deployed
    };
  }

  /**
   * Construir prompt para el LLM
   */
  buildPrompt(task, company) {
    return `Eres el Code Agent de ${company.name}.

TAREA: ${task.title}
DESCRIPCIÓN: ${task.description}
TIPO: ${task.task_type || 'feature'}
PRIORIDAD: ${task.priority}

EMPRESA:
- Nombre: ${company.name}
- Industria: ${company.industry}
- Web: ${company.subdomain}.lanzalo.app

INSTRUCCIONES:

1. Analiza la tarea y determina qué código escribir/modificar
2. Genera el código necesario (HTML/CSS/JS)
3. Proporciona resumen de cambios

TU RESPUESTA DEBE SER JSON:

{
  "summary": "Resumen breve de lo que hiciste (1-2 frases)",
  "files": [
    {
      "path": "index.html",
      "content": "... código completo ..."
    }
  ],
  "needsDeploy": true/false
}

REGLAS:
- Código completo, sin placeholders
- Responsive (mobile-first)
- Tailwind CSS para estilos
- JavaScript vanilla (sin frameworks)
- Accesible (ARIA labels)

GENERA EL CÓDIGO:`;
  }

  /**
   * Procesar respuesta del LLM
   */
  async processResponse(task, company, responseContent) {
    try {
      // Parsear JSON
      const response = JSON.parse(responseContent);

      // Guardar archivos (si aplica)
      if (response.files && response.files.length > 0) {
        const projectPath = path.join(__dirname, '../../projects', company.subdomain);
        
        for (const file of response.files) {
          const filePath = path.join(projectPath, file.path);
          await fs.mkdir(path.dirname(filePath), { recursive: true });
          await fs.writeFile(filePath, file.content, 'utf8');
          console.log(`📝 Archivo guardado: ${file.path}`);
        }
      }

      // Deploy si es necesario
      let deployed = false;
      if (response.needsDeploy) {
        // TODO: Implementar deploy real
        console.log(`🚀 Deploy a ${company.subdomain}.lanzalo.app`);
        deployed = true;
      }

      return {
        summary: response.summary,
        files: response.files.map(f => f.path),
        deployed
      };

    } catch (error) {
      console.error('Error parseando respuesta:', error);
      
      // Fallback: tratar como texto plano
      return {
        summary: responseContent.substring(0, 200),
        files: [],
        deployed: false
      };
    }
  }
}

module.exports = CodeExecutor;
