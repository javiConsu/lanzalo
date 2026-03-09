/**
 * Code Agent Executor — Genera código real y lo despliega
 * 
 * Flujo:
 * 1. LLM genera código (HTML/CSS/JS) con tool use
 * 2. Vercel Deploy Service sube archivos y despliega
 * 3. URL live guardada en companies.website_url
 * 4. Resultado visible en dashboard (LinksWidget)
 */

const { callLLMWithTools } = require('../../backend/llm');
const { getSystemPrompt } = require('../system-prompts');
const { pool } = require('../../backend/db');
const vercelDeploy = require('../../backend/services/vercel-deploy');

class CodeExecutor {
  constructor() {
    this.name = 'Code Agent';
  }

  async execute(task) {
    console.log(`💻 Code Agent procesando: ${task.title}`);

    const company = await this.getCompany(task.company_id);
    if (!company) throw new Error('Company not found');

    const subdomain = company.subdomain || company.name.toLowerCase().replace(/[^a-z0-9]/g, '-');

    // System prompt
    const systemPrompt = getSystemPrompt('code', company.name);

    // Get market analysis if available (for better landing page content)
    const analysis = await this.getMarketAnalysis(task.company_id);

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
          description: 'Desplegar el sitio web del proyecto a producción',
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

        // Deploy via Vercel (o local como fallback)
        const result = await vercelDeploy.deploy(company.id, files, {
          subdomain,
          companyName: company.name
        });

        // Log actividad
        await pool.query(
          `INSERT INTO activity_log (company_id, activity_type, message, created_at)
           VALUES ($1, 'deploy', $2, NOW())`,
          [company.id, `🚀 Landing desplegada: ${result.url}`]
        );

        // Broadcast
        if (global.broadcastActivity) {
          global.broadcastActivity({
            companyId: company.id,
            type: 'deploy',
            message: `🚀 Landing live: ${result.url}`,
            timestamp: new Date().toISOString()
          });
        }

        console.log(`  🚀 Deploy completado: ${result.url}`);

        return {
          deployed: true,
          url: result.url,
          vercelUrl: result.vercelUrl,
          files: Object.keys(files),
          deploymentId: result.deploymentId,
          local: result.local || false
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

    // Build context from market analysis
    const analysisContext = analysis
      ? `\nANÁLISIS DE MERCADO DISPONIBLE:\n${analysis.substring(0, 2000)}\nUsa estos datos reales (competidores, precios, target market) para hacer la landing más persuasiva.\n`
      : '';

    // Prompt
    const prompt = `TAREA: ${task.title}
DESCRIPCIÓN: ${task.description || 'Generar landing page profesional para el negocio'}

EMPRESA:
- Nombre: ${company.name}
- Descripción: ${company.description || 'Sin descripción'}
- Industria: ${company.industry || 'General'}
- Subdominio: ${subdomain}
${company.target_market ? `- Target: ${company.target_market}` : ''}
${company.business_model ? `- Modelo: ${company.business_model}` : ''}
${analysisContext}
INSTRUCCIONES:
1. Genera una landing page COMPLETA y PROFESIONAL
2. Usa save_file() para guardar cada archivo (mínimo: index.html)
3. Usa deploy_site() para desplegar cuando esté listo

ESTÁNDARES DE DISEÑO OBLIGATORIOS:
- HTML5 completo con <!DOCTYPE html>, meta viewport, favicon
- Tailwind CSS via CDN (https://cdn.tailwindcss.com)
- Paleta oscura elegante: fondo gris 950, acentos emerald-500
- Mobile-first responsive (sm:, md:, lg:)
- Hero section con headline potente y CTA above the fold
- Secciones: Hero → Propuesta de valor → Beneficios/Features → Social proof → CTA final → Footer
- Formulario de captura de email funcional (conectado a /api/public/waitlist)
- Animaciones sutiles con CSS transitions
- Tipografía: Inter o system-ui, jerarquía clara
- Sin imágenes placeholder — usa emojis, iconos SVG inline, o gradientes
- Footer con "Construido con Lánzalo" y año
- Español nativo, tono profesional pero cercano
- El formulario hace POST a: https://lanzalo-production.up.railway.app/api/public/waitlist
  con body: { email, company_id: "${company.id}" }

NO HAGAS:
- No uses lorem ipsum — escribe copy real basado en la descripción del negocio
- No dejes secciones vacías o con texto genérico
- No hagas diseños que parezcan templates de BootstrapH
- No uses más de 2 colores de acento`;

    const response = await callLLMWithTools(prompt, {
      tools,
      toolHandlers,
      systemPrompt,
      companyId: task.company_id,
      taskType: 'code',
      maxTurns: 8,
      temperature: 0.3
    });

    // Get the final URL
    const deployStatus = await vercelDeploy.getDeployStatus(company.id);

    return {
      output: response.content || `Landing page desplegada: ${deployStatus.url || 'en proceso'}`,
      summary: `Landing page generada: ${Object.keys(files).length} archivos`,
      filesCreated: Object.keys(files),
      deployed: deployStatus.deployed,
      url: deployStatus.url,
      turns: response.turns
    };
  }

  /**
   * Get market analysis output for better landing content
   */
  async getMarketAnalysis(companyId) {
    try {
      const result = await pool.query(
        `SELECT output FROM tasks 
         WHERE company_id = $1 
         AND tag = 'research' 
         AND status = 'completed'
         AND output IS NOT NULL
         ORDER BY completed_at DESC
         LIMIT 1`,
        [companyId]
      );
      return result.rows[0]?.output || null;
    } catch (e) {
      return null;
    }
  }

  async getCompany(companyId) {
    const result = await pool.query(
      'SELECT * FROM companies WHERE id = $1', [companyId]
    );
    return result.rows[0];
  }
}

module.exports = CodeExecutor;
