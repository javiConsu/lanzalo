/**
 * Shared Memory System - 3 Layers
 * 
 * Layer 1 (15K tokens): Domain knowledge específico de la empresa
 * Layer 2 (3K tokens): User preferences y contexto de empresa
 * Layer 3 (15K tokens): Cross-company patterns y aprendizajes
 */

const { pool } = require('../backend/db');
const { callLLM } = require('../backend/llm');
const crypto = require('crypto');

class MemorySystem {
  constructor(companyId = null) {
    this.companyId = companyId;
  }

  /**
   * LAYER 1: Domain Knowledge (específico de empresa)
   * Ej: "Esta empresa vende cursos online", "El público objetivo son desarrolladores junior"
   */
  async getLayer1() {
    if (!this.companyId) {
      throw new Error('Layer 1 requiere companyId');
    }

    const result = await pool.query(
      `SELECT content FROM memory 
       WHERE company_id = $1 AND layer = 1
       ORDER BY updated_at DESC
       LIMIT 1`,
      [this.companyId]
    );

    if (result.rows.length === 0) {
      return this.initializeLayer1();
    }

    return JSON.parse(result.rows[0].content);
  }

  async updateLayer1(updates) {
    if (!this.companyId) {
      throw new Error('Layer 1 requiere companyId');
    }

    const current = await this.getLayer1();
    const merged = { ...current, ...updates };

    await pool.query(
      `INSERT INTO memory (id, company_id, layer, content, updated_at)
       VALUES ($1, $2, 1, $3, NOW())
       ON CONFLICT(company_id, layer) 
       DO UPDATE SET content = $4, updated_at = NOW()`,
      [crypto.randomUUID(), this.companyId, JSON.stringify(merged), JSON.stringify(merged)]
    );

    console.log(`💾 Layer 1 actualizado para company ${this.companyId}`);
    return merged;
  }

  async initializeLayer1() {
    // Cargar contexto inicial de la empresa
    const companyResult = await pool.query(
      'SELECT * FROM companies WHERE id = $1',
      [this.companyId]
    );
    
    if (companyResult.rows.length === 0) {
      throw new Error('Company not found');
    }

    const company = companyResult.rows[0];

    const initial = {
      companyName: company.name,
      description: company.description,
      industry: company.industry,
      targetAudience: company.target_audience || 'General público',
      subdomain: company.subdomain,
      productType: 'digital',
      stage: 'early',
      keyFeatures: [],
      techStack: ['HTML', 'CSS', 'JavaScript', 'Tailwind'],
      monetization: company.revenue_model || 'subscription',
      initialized: new Date().toISOString()
    };

    await this.updateLayer1(initial);
    return initial;
  }

  /**
   * LAYER 2: User Preferences (configuración y preferencias)
   * Ej: "Usuario prefiere respuestas cortas", "No le gusta usar React"
   */
  async getLayer2() {
    if (!this.companyId) {
      throw new Error('Layer 2 requiere companyId');
    }

    const result = await pool.query(
      `SELECT content FROM memory 
       WHERE company_id = $1 AND layer = 2
       ORDER BY updated_at DESC
       LIMIT 1`,
      [this.companyId]
    );

    if (result.rows.length === 0) {
      return this.initializeLayer2();
    }

    return JSON.parse(result.rows[0].content);
  }

  async updateLayer2(updates) {
    if (!this.companyId) {
      throw new Error('Layer 2 requiere companyId');
    }

    const current = await this.getLayer2();
    const merged = { ...current, ...updates };

    await pool.query(
      `INSERT INTO memory (id, company_id, layer, content, updated_at)
       VALUES ($1, $2, 2, $3, NOW())
       ON CONFLICT(company_id, layer) 
       DO UPDATE SET content = $4, updated_at = NOW()`,
      [crypto.randomUUID(), this.companyId, JSON.stringify(merged), JSON.stringify(merged)]
    );

    console.log(`💾 Layer 2 actualizado para company ${this.companyId}`);
    return merged;
  }

  async initializeLayer2() {
    const initial = {
      communicationStyle: 'casual',
      responseLength: 'short', // short, medium, long
      techPreferences: {
        frameworks: [],
        avoidFrameworks: true,
        preferVanillaJS: true
      },
      designPreferences: {
        style: 'modern',
        colorScheme: 'dark'
      },
      priorities: ['speed', 'simplicity', 'cost-effective'],
      initialized: new Date().toISOString()
    };

    await this.updateLayer2(initial);
    return initial;
  }

  /**
   * LAYER 3: Cross-Company Patterns (aprendizajes globales)
   * Ej: "Para SaaS B2B, pricing page aumenta conversión 40%"
   */
  async getLayer3() {
    const result = await pool.query(
      `SELECT content FROM memory 
       WHERE company_id IS NULL AND layer = 3
       ORDER BY updated_at DESC
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      return this.initializeLayer3();
    }

    return JSON.parse(result.rows[0].content);
  }

  async updateLayer3(updates) {
    const current = await this.getLayer3();
    const merged = { ...current, ...updates };

    await pool.query(
      `INSERT INTO memory (id, company_id, layer, content, updated_at)
       VALUES ($1, NULL, 3, $2, NOW())
       ON CONFLICT(layer) WHERE company_id IS NULL
       DO UPDATE SET content = $3, updated_at = NOW()`,
      [crypto.randomUUID(), JSON.stringify(merged), JSON.stringify(merged)]
    );

    console.log(`💾 Layer 3 (global) actualizado`);
    return merged;
  }

  async initializeLayer3() {
    const initial = {
      patterns: {
        saas: {
          bestPractices: [
            'Pricing page aumenta conversión',
            'Free trial de 7 días óptimo',
            'Testimonials en landing page críticos'
          ]
        },
        ecommerce: {
          bestPractices: [
            'Checkout en 1 página mejor que multi-step',
            'Trust badges aumentan conversión 15%'
          ]
        }
      },
      commonBugs: [
        'Mobile responsive issues',
        'Form validation missing',
        'Analytics not tracking conversions'
      ],
      successfulFeatures: [
        'Email capture with lead magnet',
        'Social proof section',
        'Clear CTA above fold'
      ],
      initialized: new Date().toISOString()
    };

    await this.updateLayer3(initial);
    return initial;
  }

  /**
   * Buscar en memoria (semantic search)
   */
  async search(query, options = {}) {
    const {
      layers = [1, 2, 3],
      limit = 5
    } = options;

    // TODO: Implementar semantic search real con embeddings
    // Por ahora: búsqueda simple por keywords

    const results = [];

    for (const layer of layers) {
      let layerData;
      
      if (layer === 1 || layer === 2) {
        if (!this.companyId) continue;
        layerData = layer === 1 ? await this.getLayer1() : await this.getLayer2();
      } else {
        layerData = await this.getLayer3();
      }

      // Búsqueda simple por keywords en el JSON
      const content = JSON.stringify(layerData).toLowerCase();
      const queryLower = query.toLowerCase();

      if (content.includes(queryLower)) {
        results.push({
          layer,
          relevance: 0.8, // TODO: calcular relevancia real
          data: layerData
        });
      }
    }

    return results.slice(0, limit);
  }

  /**
   * Curar memoria automáticamente (llamar post-ejecución)
   */
  async curate(task, result) {
    if (!this.companyId) return;

    console.log(`🧠 Curando memoria post-ejecución de: ${task.title}`);

    // Analizar qué aprendimos de esta tarea
    const learnings = await this.extractLearnings(task, result);

    // Actualizar Layer 1 si aprendimos algo del dominio
    if (learnings.domain) {
      const layer1 = await this.getLayer1();
      await this.updateLayer1({
        ...layer1,
        lastLearning: learnings.domain,
        lastUpdated: new Date().toISOString()
      });
    }

    // Actualizar Layer 2 si aprendimos preferencias
    if (learnings.preferences) {
      const layer2 = await this.getLayer2();
      await this.updateLayer2({
        ...layer2,
        ...learnings.preferences
      });
    }

    // Actualizar Layer 3 si es un patrón cross-company
    if (learnings.pattern) {
      const layer3 = await this.getLayer3();
      // Añadir a patrones si es relevante
      await this.updateLayer3(layer3);
    }
  }

  /**
   * Extraer aprendizajes de una tarea ejecutada
   */
  async extractLearnings(task, result) {
    const prompt = `Analiza esta tarea ejecutada y extrae aprendizajes:

TAREA: ${task.title}
DESCRIPCIÓN: ${task.description}
RESULTADO: ${JSON.stringify(result, null, 2)}

¿Qué aprendimos?

RESPONDE EN JSON:

{
  "domain": "Información nueva sobre el dominio/producto (o null)",
  "preferences": { "clave": "valor" } o null,
  "pattern": "Patrón cross-company detectado (o null)"
}`;

    const response = await callLLM(prompt, {
      companyId: this.companyId,
      taskType: 'simple',
      temperature: 0.3
    });

    try {
      return JSON.parse(response.content);
    } catch {
      return { domain: null, preferences: null, pattern: null };
    }
  }

  /**
   * Obtener contexto completo (todas las layers)
   */
  async getFullContext() {
    const [layer1, layer2, layer3] = await Promise.all([
      this.getLayer1(),
      this.getLayer2(),
      this.getLayer3()
    ]);

    return {
      domain: layer1,
      preferences: layer2,
      patterns: layer3
    };
  }

  /**
   * Formatear contexto para incluir en prompts
   */
  formatForPrompt() {
    return async () => {
      const context = await this.getFullContext();

      return `
CONTEXTO DE MEMORIA:

📊 DOMINIO (Layer 1):
- Empresa: ${context.domain.companyName}
- Industria: ${context.domain.industry}
- Audiencia: ${context.domain.targetAudience}
- Stack: ${context.domain.techStack.join(', ')}

⚙️ PREFERENCIAS (Layer 2):
- Estilo: ${context.preferences.communicationStyle}
- Respuestas: ${context.preferences.responseLength}
- Tech: ${context.preferences.techPreferences.preferVanillaJS ? 'Vanilla JS' : 'Frameworks OK'}

🎯 PATRONES (Layer 3):
- Best practices conocidas
- Bugs comunes a evitar
- Features exitosas probadas
`;
    };
  }
}

module.exports = MemorySystem;
