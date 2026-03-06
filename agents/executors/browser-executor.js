/**
 * Browser Agent Executor - Automatización web con Playwright
 */

const TaskExecutor = require('../task-executor');
const { callLLM } = require('../../backend/llm');
const { pool } = require('../../backend/db');
const { chromium } = require('playwright');
const crypto = require('crypto');

class BrowserExecutor extends TaskExecutor {
  constructor() {
    super('browser-agent', 'Browser Agent');
    this.browser = null;
    this.context = null;
  }

  /**
   * Inicializar navegador
   */
  async initBrowser() {
    if (!this.browser) {
      console.log('🌐 Iniciando Playwright...');
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    
    if (!this.context) {
      this.context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        viewport: { width: 1920, height: 1080 }
      });
    }
  }

  /**
   * Cerrar navegador
   */
  async closeBrowser() {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Ejecutar tarea de browser
   */
  async execute(task) {
    console.log(`🌐 Browser Agent procesando: ${task.title}`);

    await this.initBrowser();

    try {
      // Determinar tipo de tarea
      const taskType = this.determineTaskType(task);

      let result;
      switch (taskType) {
        case 'navigate':
          result = await this.navigateTask(task);
          break;
        case 'scrape':
          result = await this.scrapeTask(task);
          break;
        case 'test':
          result = await this.testTask(task);
          break;
        case 'form':
          result = await this.formTask(task);
          break;
        case 'screenshot':
          result = await this.screenshotTask(task);
          break;
        default:
          result = await this.intelligentTask(task);
      }

      return result;

    } finally {
      // No cerrar browser aquí para reusarlo entre tareas
      // Solo cerrar en shutdown
    }
  }

  /**
   * Determinar tipo de tarea
   */
  determineTaskType(task) {
    const desc = task.description.toLowerCase();
    
    if (desc.includes('screenshot') || desc.includes('captura')) return 'screenshot';
    if (desc.includes('scrape') || desc.includes('extraer')) return 'scrape';
    if (desc.includes('test') || desc.includes('probar')) return 'test';
    if (desc.includes('form') || desc.includes('formulario')) return 'form';
    if (desc.includes('navegar') || desc.includes('visitar')) return 'navigate';
    
    return 'intelligent'; // Decidir con LLM
  }

  /**
   * Tarea: Navegar a URL
   */
  async navigateTask(task) {
    const url = this.extractURL(task.description);
    
    if (!url) {
      throw new Error('URL no encontrada en la descripción');
    }

    const page = await this.context.newPage();
    
    try {
      console.log(`🌐 Navegando a: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      
      const title = await page.title();
      const screenshot = await page.screenshot({ fullPage: false });
      
      return {
        summary: `Navegado a ${url}`,
        url,
        title,
        screenshot: screenshot.toString('base64')
      };

    } finally {
      await page.close();
    }
  }

  /**
   * Tarea: Scraping
   */
  async scrapeTask(task) {
    const url = this.extractURL(task.description);
    
    if (!url) {
      throw new Error('URL no encontrada');
    }

    const page = await this.context.newPage();
    
    try {
      console.log(`📥 Scrapeando: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      
      // Extraer contenido
      const content = await page.evaluate(() => {
        // Eliminar scripts, styles, etc.
        const clone = document.body.cloneNode(true);
        clone.querySelectorAll('script, style, noscript, iframe').forEach(el => el.remove());
        
        return {
          title: document.title,
          text: clone.innerText,
          html: clone.innerHTML,
          links: Array.from(document.querySelectorAll('a')).map(a => ({
            text: a.innerText.trim(),
            href: a.href
          })).filter(l => l.text && l.href)
        };
      });

      // Analizar con LLM si es necesario
      const analysis = await this.analyzeContent(task, content);

      return {
        summary: `Scrapeado ${url}: ${content.text.length} caracteres`,
        url,
        title: content.title,
        content: content.text.substring(0, 5000), // Primeros 5K chars
        links: content.links.slice(0, 20),
        analysis
      };

    } finally {
      await page.close();
    }
  }

  /**
   * Tarea: Testing de web
   */
  async testTask(task) {
    // Obtener info de la empresa
    const companyResult = await pool.query(
      'SELECT * FROM companies WHERE id = $1',
      [task.company_id]
    );
    const company = companyResult.rows[0];
    const url = `https://${company.subdomain}.lanzalo.app`;

    const page = await this.context.newPage();
    const issues = [];

    try {
      console.log(`🧪 Testeando: ${url}`);
      
      // 1. Navegación básica
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
        console.log('✅ Sitio carga correctamente');
      } catch (error) {
        issues.push({ type: 'critical', message: 'Sitio no carga', error: error.message });
      }

      // 2. Responsive (mobile)
      await page.setViewportSize({ width: 375, height: 667 });
      const mobileScreenshot = await page.screenshot();
      
      // 3. Formularios
      const forms = await page.$$('form');
      console.log(`📋 Encontrados ${forms.length} formularios`);
      
      for (let i = 0; i < forms.length; i++) {
        const inputs = await forms[i].$$('input, textarea');
        if (inputs.length > 0) {
          console.log(`  Form ${i + 1}: ${inputs.length} campos`);
        }
      }

      // 4. Links rotos
      const links = await page.$$eval('a[href]', links => 
        links.map(a => a.href)
      );
      
      for (const link of links.slice(0, 10)) {
        if (link.startsWith('http')) {
          try {
            const response = await page.goto(link, { timeout: 5000 });
            if (response.status() >= 400) {
              issues.push({ type: 'warning', message: `Link roto: ${link}` });
            }
          } catch (error) {
            issues.push({ type: 'warning', message: `Link no accesible: ${link}` });
          }
        }
      }

      // 5. Performance
      const metrics = await page.evaluate(() => ({
        timing: performance.timing.loadEventEnd - performance.timing.navigationStart,
        resources: performance.getEntriesByType('resource').length
      }));

      if (metrics.timing > 3000) {
        issues.push({ type: 'warning', message: `Sitio lento: ${metrics.timing}ms` });
      }

      // 6. Accesibilidad básica
      const a11y = await page.evaluate(() => ({
        imagesWithoutAlt: document.querySelectorAll('img:not([alt])').length,
        buttonsWithoutText: document.querySelectorAll('button:empty').length,
        headingStructure: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.tagName)
      }));

      if (a11y.imagesWithoutAlt > 0) {
        issues.push({ type: 'warning', message: `${a11y.imagesWithoutAlt} imágenes sin alt` });
      }

      const summary = issues.length === 0 
        ? '✅ Todos los tests pasaron'
        : `⚠️ ${issues.length} issues encontrados`;

      return {
        summary,
        url,
        issues,
        metrics,
        accessibility: a11y,
        screenshots: {
          desktop: await page.screenshot({ fullPage: false }),
          mobile: mobileScreenshot
        }
      };

    } finally {
      await page.close();
    }
  }

  /**
   * Tarea: Rellenar formulario
   */
  async formTask(task) {
    const url = this.extractURL(task.description);
    
    if (!url) {
      throw new Error('URL no encontrada');
    }

    const page = await this.context.newPage();
    
    try {
      console.log(`📝 Rellenando formulario en: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      // Extraer campos del formulario con LLM
      const formData = await this.getFormData(task);

      // Rellenar campos
      for (const [selector, value] of Object.entries(formData)) {
        try {
          await page.fill(selector, value);
          console.log(`✅ Campo rellenado: ${selector}`);
        } catch (error) {
          console.log(`⚠️ No se pudo rellenar: ${selector}`);
        }
      }

      // Screenshot del resultado
      const screenshot = await page.screenshot({ fullPage: false });

      return {
        summary: `Formulario rellenado en ${url}`,
        url,
        fields: Object.keys(formData).length,
        screenshot: screenshot.toString('base64')
      };

    } finally {
      await page.close();
    }
  }

  /**
   * Tarea: Screenshot
   */
  async screenshotTask(task) {
    const url = this.extractURL(task.description);
    
    if (!url) {
      throw new Error('URL no encontrada');
    }

    const page = await this.context.newPage();
    
    try {
      console.log(`📸 Screenshot de: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      const fullPage = task.description.toLowerCase().includes('full') || 
                       task.description.toLowerCase().includes('completa');

      const screenshot = await page.screenshot({ 
        fullPage,
        type: 'png'
      });

      return {
        summary: `Screenshot de ${url}`,
        url,
        fullPage,
        screenshot: screenshot.toString('base64')
      };

    } finally {
      await page.close();
    }
  }

  /**
   * Tarea inteligente (decidir con LLM)
   */
  async intelligentTask(task) {
    const prompt = `Eres el Browser Agent.

TAREA: ${task.title}
DESCRIPCIÓN: ${task.description}

Decide qué hacer con el navegador.

RESPONDE EN JSON:

{
  "action": "navigate|scrape|test|form|screenshot|search",
  "url": "URL si aplica",
  "params": { ... }
}`;

    const response = await callLLM(prompt, {
      companyId: task.company_id,
      taskType: 'simple',
      temperature: 0.3
    });

    const decision = JSON.parse(response.content);

    // Ejecutar según decisión
    switch (decision.action) {
      case 'navigate':
        return await this.navigateTask(task);
      case 'scrape':
        return await this.scrapeTask(task);
      case 'test':
        return await this.testTask(task);
      default:
        throw new Error(`Acción no soportada: ${decision.action}`);
    }
  }

  /**
   * Extraer URL de descripción
   */
  extractURL(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const match = text.match(urlRegex);
    return match ? match[0] : null;
  }

  /**
   * Analizar contenido scrapeado con LLM
   */
  async analyzeContent(task, content) {
    const prompt = `Analiza este contenido web:

TAREA: ${task.title}
URL: ${content.title}

CONTENIDO:
${content.text.substring(0, 2000)}

¿Qué información es relevante para la tarea?

Responde en 2-3 frases:`;

    const response = await callLLM(prompt, {
      companyId: task.company_id,
      taskType: 'simple',
      temperature: 0.5
    });

    return response.content;
  }

  /**
   * Extraer datos de formulario con LLM
   */
  async getFormData(task) {
    const prompt = `Extrae los datos del formulario de esta tarea:

${task.description}

RESPONDE EN JSON:

{
  "input[name='email']": "valor",
  "input[name='name']": "valor"
}

Solo selectores CSS y valores.`;

    const response = await callLLM(prompt, {
      companyId: task.company_id,
      taskType: 'simple',
      temperature: 0.3
    });

    return JSON.parse(response.content);
  }

  /**
   * Override de stop para cerrar browser
   */
  stop() {
    super.stop();
    
    // Cerrar browser al detener agente
    if (this.browser) {
      this.closeBrowser().catch(console.error);
    }
  }

  /**
   * Override formatResult
   */
  formatResult(result) {
    if (result.issues) {
      // Test task
      return `🧪 Testing completado

${result.summary}

Issues encontrados: ${result.issues.length}
${result.issues.map(i => `- [${i.type}] ${i.message}`).join('\n')}

Performance: ${result.metrics?.timing}ms
Recursos cargados: ${result.metrics?.resources}`;
    }

    if (result.screenshot) {
      return `📸 ${result.summary}

URL: ${result.url}
Screenshot guardado`;
    }

    return result.summary || JSON.stringify(result, null, 2);
  }
}

module.exports = BrowserExecutor;
