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
2. Usa save_file() para guardar CADA archivo por separado (mínimo 3: index.html, styles.css, scripts.js)
3. Usa deploy_site() para desplegar cuando TODOS los archivos estén guardados

ESTÁNDARES DE DISEÑO — CALIDAD PREMIUM (OBLIGATORIO):

STACK: HTML5 semántico + CSS custom con variables (design tokens) + JavaScript vanilla.
NO uses Tailwind, NO Bootstrap, NO frameworks CSS.
Google Fonts: Space Grotesk (headings + body), Space Mono (labels, monospace), Caveat (handwritten accents).
Link: <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">

ARCHIVOS: Genera MÍNIMO 3 archivos separados con save_file:
- index.html (estructura HTML5 completa)
- styles.css (todo el CSS con design tokens en :root)
- scripts.js (IntersectionObserver, counter, card tilt, parallax, accordion, smooth scroll)

DESIGN TOKENS (:root):
- Palette: --ink #0A0A0A, --paper #FAF8F5, --cream #F0EDE8, --charcoal #2A2A2A, --grey #999, --white #FFF
- Accent: Elige 1 color según la industria (naranja #FF4D00, azul #0066FF, verde #00C853, morado #7B2FFF, etc.)
- Variables: --accent, --accent-light, --accent-dark, --accent-glow
- Borders: --border-soft 1px solid rgba(10,10,10,0.08), --border-medium 1px solid rgba(10,10,10,0.15)
- Shadows: --shadow-sm/md/lg (sutiles, no exagerados)
- Radius: --radius-sm 8px, --radius-md 12px, --radius-lg 16px, --radius-xl 24px, --radius-pill 100px
- Transitions: --ease-out cubic-bezier(0.4,0,0.2,1)

TIPOGRAFÍA:
- h1: clamp(36px, 5vw, 60px), weight 700, letter-spacing -1.5px
- h2: clamp(24px, 3.5vw, 36px), weight 600
- p: 15px, line-height 1.7, max-width 640px
- .label: Space Mono 11px uppercase, letter-spacing 2px, color accent (para etiquetas de sección)
- .handwritten: Caveat 22px (notas decorativas opcionales)

BOTONES (efecto 3D press — NO NEGOCIABLE):
- .btn-primary: background accent, color white, box-shadow 0 4px 0 accent-dark (3D). Hover: translateY(-2px). Active: translateY(2px).
- .btn-secondary: transparent + border. Hover: translateY(-2px).
- Font: Space Mono, 12px uppercase, letter-spacing 1.5px, border-radius pill

NAVEGACIÓN: Sticky con glass effect (background rgba(255,255,255,0.85), backdrop-filter blur(20px)). Hamburger en mobile.

CARDS: .card (white bg, border-soft, hover translateY(-6px)). .card-glass (glassmorphism: backdrop-filter blur, gradient-glass bg, inset border).

ANIMACIONES (OBLIGATORIAS — marcan la diferencia):
1. Scroll animations: .animate-on-scroll (opacity 0, translateY 24px → visible). IntersectionObserver threshold 0.15.
2. Stagger: .delay-1 a .delay-4 para efecto cascada.
3. Counter animation: data-count en stats, requestAnimationFrame con ease-out cúbico.
4. Card tilt hover: mousemove → perspective(1000px) rotateX/Y ±2deg.
5. Smooth anchor scrolling.

ESTRUCTURA DE SECCIONES:
- NAV: Sticky glass + logo + links + CTA pill
- HERO: .label monospace + H1 con <span class="highlight">[palabra]</span> + subtitle + 2 CTAs
- PROPUESTA DE VALOR: Grid 2-3 card-glass
- STATS: Section-dark, números grandes con counter animation
- PROCESO: Steps 01, 02, 03 con línea dotted conectora
- SOCIAL PROOF / FAQ
- CTA FINAL: Card grande fondo accent, texto blanco, botón invertido, circles decorativos absolutos
- FOOTER: "Construido con Lánzalo · © ${new Date().getFullYear()}"

FORMULARIO:
- POST a: https://lanzalo-production.up.railway.app/api/public/waitlist
- Body: { email, company_id: "${company.id}" }
- Incluir validación, loading state, success message

RESPONSIVE:
- @media 768px: grids 1col, section padding 64px, hide sprites, hamburger visible
- @media 480px: h1 28px

DETALLES PREMIUM:
- ::selection { background: accent; color: white }
- -webkit-font-smoothing: antialiased
- Dotted borders como separadores
- Decorative circles con border semi-transparente en CTAs
- Overflow hidden en secciones
- Fondo base --paper (NO negro, NO gris oscuro)

PROHIBIDO:
- Lorem ipsum (escribe copy REAL)
- Secciones vacías o genéricas
- Diseños que parezcan templates
- Fondos completamente negros como base
- Más de 1 color accent
- Tailwind o Bootstrap`;

    const response = await callLLMWithTools(prompt, {
      tools,
      toolHandlers,
      systemPrompt,
      companyId: task.company_id,
      taskType: 'code',
      maxTurns: 12,
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
