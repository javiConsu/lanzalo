/**
 * Code Agent Executor — Genera código real y lo despliega
 * 
 * Flujo:
 * 1. LLM genera código (HTML/CSS/JS) con tool use
 * 2. Código se guarda en DB (deployments table)
 * 3. Se sirve via ruta /sites/:subdomain
 * 4. Resultado visible en dashboard
 */

const { callLLMWithTools } = require('../../backend/llm');
const { getSystemPrompt } = require('../system-prompts');
const { pool } = require('../../backend/db');
const crypto = require('crypto');

class CodeExecutor {
  constructor() {
    this.name = 'Code Agent';
  }

  async execute(task) {
    console.log(`💻 Code Agent procesando: ${task.title}`);

    const company = await this.getCompany(task.company_id);
    if (!company) throw new Error('Company not found');

    // System prompt
    const systemPrompt = getSystemPrompt('code', company.name);

    // Tools para el code agent
    const tools = [
      {
        type: 'function',
        function: {
          name: 'save_file',
          description: 'Guardar archivo de código para el proyecto',
          parameters: {
            type: 'object',
            required: ['path', 'content'],
            properties: {
              path: { type: 'string', description: 'Ruta del archivo (ej: index.html, styles.css, app.js)' },
              content: { type: 'string', description: 'Contenido completo del archivo' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'deploy_site',
          description: 'Desplegar el sitio web del proyecto',
          parameters: {
            type: 'object',
            properties: {
              message: { type: 'string', description: 'Mensaje de deploy' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_current_site',
          description: 'Obtener el código actual del sitio',
          parameters: { type: 'object', properties: {} }
        }
      }
    ];

    // Files buffer — acumula archivos generados
    const files = {};

    const toolHandlers = {
      save_file: async (args) => {
        files[args.path] = args.content;
        console.log(`  📝 Archivo: ${args.path} (${args.content.length} bytes)`);
        return { saved: true, path: args.path, size: args.content.length };
      },

      deploy_site: async (args) => {
        if (Object.keys(files).length === 0) {
          return { error: 'No hay archivos para desplegar' };
        }

        // Guardar en DB como deployment
        const deployId = crypto.randomUUID();
        const htmlContent = files['index.html'] || this.buildDefaultHTML(files, company);

        await pool.query(
          `INSERT INTO deployments (id, company_id, url, type, framework, status, deploy_log, created_at)
           VALUES ($1, $2, $3, 'landing_page', 'static', 'live', $4, NOW())`,
          [
            deployId,
            company.id,
            `${company.subdomain || company.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.lanzalo.app`,
            JSON.stringify({ files, message: args.message || 'Deploy automático' })
          ]
        );

        // Guardar HTML completo en tabla separada para servir
        await pool.query(
          `INSERT INTO build_previews (id, company_id, html_content, created_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (company_id) DO UPDATE SET html_content = $3, created_at = NOW()`,
          [crypto.randomUUID(), company.id, htmlContent]
        );

        // Log actividad
        await pool.query(
          `INSERT INTO activity_log (company_id, activity_type, message, created_at)
           VALUES ($1, 'deploy', $2, NOW())`,
          [company.id, `🚀 Sitio desplegado: ${Object.keys(files).length} archivos`]
        );

        // Actualizar status de la empresa
        await pool.query(
          `UPDATE companies SET status = 'live', updated_at = NOW() WHERE id = $1`,
          [company.id]
        );

        console.log(`  🚀 Deploy completado: ${Object.keys(files).length} archivos`);

        return {
          deployed: true,
          url: `${company.subdomain || 'preview'}.lanzalo.app`,
          files: Object.keys(files),
          deployId
        };
      },

      get_current_site: async () => {
        const result = await pool.query(
          'SELECT html_content FROM build_previews WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1',
          [company.id]
        );
        if (result.rows.length === 0) {
          return { exists: false, message: 'No hay sitio desplegado aún' };
        }
        return {
          exists: true,
          html: result.rows[0].html_content.substring(0, 2000) + '...(truncado)'
        };
      }
    };

    // Prompt
    const prompt = `TAREA: ${task.title}
DESCRIPCIÓN: ${task.description || 'Generar landing page para el negocio'}

EMPRESA:
- Nombre: ${company.name}
- Descripción: ${company.description || 'Sin descripción'}
- Industria: ${company.industry || 'General'}
- Web: ${company.subdomain || company.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.lanzalo.app

INSTRUCCIONES:
1. Genera el código HTML/CSS/JS necesario
2. Usa save_file() para guardar cada archivo
3. Usa deploy_site() para desplegar cuando esté listo

ESTÁNDARES:
- HTML completo con <!DOCTYPE html>
- Tailwind CSS via CDN (https://cdn.tailwindcss.com)
- Dark theme por defecto
- Mobile responsive
- CTA claro above the fold
- Formulario de captura de email
- Sin placeholders — todo funcional
- Español`;

    const response = await callLLMWithTools(prompt, {
      tools,
      toolHandlers,
      systemPrompt,
      companyId: task.company_id,
      taskType: 'code',
      maxTurns: 8,
      temperature: 0.3
    });

    return {
      summary: response.content || `${Object.keys(files).length} archivos generados y desplegados`,
      filesCreated: Object.keys(files),
      deployed: Object.keys(files).length > 0,
      turns: response.turns
    };
  }

  /**
   * Si no hay index.html explícito, construir uno que incluya los demás archivos
   */
  buildDefaultHTML(files, company) {
    const css = files['styles.css'] || files['style.css'] || '';
    const js = files['app.js'] || files['script.js'] || '';

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${company.name} — Powered by Lanzalo</title>
  <script src="https://cdn.tailwindcss.com"></script>
  ${css ? `<style>${css}</style>` : ''}
</head>
<body class="bg-gray-900 text-white">
  <div class="min-h-screen flex items-center justify-center">
    <div class="text-center p-8">
      <h1 class="text-4xl font-bold mb-4">${company.name}</h1>
      <p class="text-gray-400 text-lg mb-8">${company.description || 'Próximamente'}</p>
      <p class="text-sm text-gray-500">Construido con Lanzalo.pro</p>
    </div>
  </div>
  ${js ? `<script>${js}</script>` : ''}
</body>
</html>`;
  }

  async getCompany(companyId) {
    const result = await pool.query(
      'SELECT * FROM companies WHERE id = $1', [companyId]
    );
    return result.rows[0];
  }
}

module.exports = CodeExecutor;
