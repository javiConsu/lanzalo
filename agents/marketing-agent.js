/**
 * Agente de Marketing — Generación de contenido, estrategia y campañas
 * 
 * Capacidades:
 * - Genera contenido social (posts, carruseles) con LLM
 * - Genera presentaciones, documentos y webs con Gamma API
 * - Crea estrategias de ads con presupuestos y copies
 * - Planifica calendarios de contenido
 */

const { pool } = require('../backend/db');
const { callLLM } = require('../backend/llm');
const gamma = require('../backend/services/gamma-service');

class MarketingAgent {
  async execute(company) {
    const task = await this.createTask(company.id,
      'Marketing diario',
      'Generar contenido y revisar estrategia de marketing');

    try {
      await this.updateTask(task.id, { status: 'running' });
      await this.logActivity(company.id, task.id, 'task_start',
        `Agente de marketing iniciado para ${company.name}`);

      const results = [];

      // 1. Analyze what content is needed
      const strategy = await this.decideDailyStrategy(company);
      results.push(`Estrategia: ${strategy.focus}`);

      // 2. Generate social content (always)
      const posts = await this.generateSocialContent(company, strategy);
      results.push(`${posts.length} posts generados`);

      // 3. If Gamma is available, generate visual content periodically
      if (gamma.enabled) {
        const gammaNeeded = await this.shouldGenerateGammaContent(company.id);
        if (gammaNeeded) {
          const gammaContent = await this.generateGammaContent(company, strategy);
          if (gammaContent) results.push(`Contenido visual generado con Gamma: ${gammaContent.type}`);
        }
      }

      // 4. Review ad campaigns status
      const adStatus = await this.reviewAdCampaigns(company);
      if (adStatus) results.push(adStatus);

      const output = results.join('\n');

      await this.updateTask(task.id, {
        status: 'completed',
        output,
        completed_at: new Date()
      });

      await this.logActivity(company.id, task.id, 'task_complete', output);

      return { success: true, summary: output };

    } catch (error) {
      await this.updateTask(task.id, {
        status: 'failed',
        output: error.message,
        completed_at: new Date()
      });
      throw error;
    }
  }

  // ═══════════════════════════════════════
  // STRATEGY
  // ═══════════════════════════════════════

  async decideDailyStrategy(company) {
    // Check what content already exists
    const existing = await pool.query(
      `SELECT type, COUNT(*) as cnt FROM content_pieces 
       WHERE company_id = $1 AND created_at > NOW() - INTERVAL '7 days'
       GROUP BY type`,
      [company.id]
    );

    const recentContent = {};
    for (const row of existing.rows) {
      recentContent[row.type] = parseInt(row.cnt);
    }

    const prompt = `Eres el director de marketing de "${company.name}".
Descripción: ${company.description || 'Sin descripción'}
Industria: ${company.industry || 'General'}

Contenido de los últimos 7 días: ${JSON.stringify(recentContent) || 'ninguno'}
Gamma disponible: ${gamma.enabled ? 'SÍ (puedes crear presentaciones, carruseles visuales, documentos)' : 'NO'}

Decide la estrategia de contenido para HOY:
- ¿Qué tipo de contenido necesitamos? (post social, carrusel, presentación, blog...)
- ¿Sobre qué tema?
- ¿Para qué canal?

Responde en JSON:
{
  "focus": "tema principal del día",
  "contentTypes": ["social_post", "carousel"],
  "channels": ["linkedin", "twitter"],
  "topic": "tema específico",
  "tone": "tono a usar",
  "gammaContent": ${gamma.enabled ? '"presentation|carousel|document|webpage|none"' : '"none"'},
  "gammaReason": "por qué generar esto con Gamma (si aplica)"
}`;

    try {
      const response = await callLLM(prompt, { maxTokens: 500 });
      const content = typeof response === 'string' ? response : response.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('[MarketingAgent] Strategy error:', e);
    }

    return { focus: 'Contenido general', contentTypes: ['social_post'], channels: ['linkedin'], gammaContent: 'none' };
  }

  // ═══════════════════════════════════════
  // SOCIAL CONTENT
  // ═══════════════════════════════════════

  async generateSocialContent(company, strategy) {
    const posts = [];

    for (const channel of (strategy.channels || ['linkedin']).slice(0, 2)) {
      const prompt = `Crea un post de ${channel} para "${company.name}".
Industria: ${company.industry || 'General'}
Tema: ${strategy.topic || strategy.focus}
Tono: ${strategy.tone || 'profesional pero cercano'}

REGLAS para ${channel}:
${channel === 'linkedin' ? '- Máx 1300 chars (antes del "ver más"). Párrafos cortos. Hook potente en la primera línea.' : ''}
${channel === 'twitter' ? '- Máx 280 chars. Directo y punchy. 1-2 hashtags máximo.' : ''}
${channel === 'instagram' ? '- Caption atractivo. Emojis moderados. 3-5 hashtags al final.' : ''}

Responde en JSON:
{
  "content": "texto del post completo",
  "hashtags": ["hashtag1", "hashtag2"],
  "cta": "call to action (si aplica)"
}`;

      try {
        const response = await callLLM(prompt, { maxTokens: 800 });
        const content = typeof response === 'string' ? response : response.content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) continue;

        const post = JSON.parse(jsonMatch[0]);

        // Save to content_pieces
        await pool.query(
          `INSERT INTO content_pieces 
           (company_id, type, format, title, body, status, platform, created_by, agent_tag)
           VALUES ($1, 'social_post', $2, $3, $4, 'draft', $5, 'agent', 'marketing')`,
          [company.id, `${channel}_post`, strategy.topic || strategy.focus, post.content, channel]
        );

        posts.push({ channel, content: post.content });
      } catch (e) {
        console.error(`[MarketingAgent] Error generating ${channel} post:`, e);
      }
    }

    return posts;
  }

  // ═══════════════════════════════════════
  // GAMMA CONTENT
  // ═══════════════════════════════════════

  async shouldGenerateGammaContent(companyId) {
    // Don't generate Gamma content more than twice per week
    const recent = await pool.query(
      `SELECT COUNT(*) as cnt FROM content_pieces 
       WHERE company_id = $1 AND gamma_generation_id IS NOT NULL 
       AND created_at > NOW() - INTERVAL '3 days'`,
      [companyId]
    );
    return parseInt(recent.rows[0].cnt) < 2;
  }

  async generateGammaContent(company, strategy) {
    const type = strategy.gammaContent || 'carousel';
    if (type === 'none') return null;

    // Generate content prompt with LLM first
    const prompt = `Genera el contenido detallado para un/a ${type} de "${company.name}".
Tema: ${strategy.topic || strategy.focus}
Industria: ${company.industry || 'General'}
Descripción: ${company.description || ''}

${type === 'carousel' ? 'Escribe 6-8 slides de carrusel. Cada slide: título + 1-2 frases. Formato: un slide por línea separado con ---' : ''}
${type === 'presentation' ? 'Escribe el contenido de 8-10 slides para un pitch/presentación profesional.' : ''}
${type === 'document' ? 'Escribe un documento/propuesta de 4-6 secciones.' : ''}
${type === 'webpage' ? 'Escribe el contenido de una mini landing page: hero, beneficios, CTA.' : ''}

Responde SOLO con el texto del contenido, sin JSON. Usa --- para separar slides/secciones.`;

    try {
      const response = await callLLM(prompt, { maxTokens: 2000 });
      const inputText = typeof response === 'string' ? response : response.content;

      let generation;
      switch (type) {
        case 'carousel':
          generation = await gamma.generateCarousel(inputText, {
            audience: strategy.audience || `Público de ${company.industry || 'general'}`,
          });
          break;
        case 'presentation':
          generation = await gamma.generatePresentation(inputText, {
            audience: strategy.audience || 'clientes potenciales e inversores',
          });
          break;
        case 'document':
          generation = await gamma.generateDocument(inputText, {
            audience: strategy.audience,
          });
          break;
        case 'webpage':
          generation = await gamma.generateWebpage(inputText, {
            audience: strategy.audience,
          });
          break;
        default:
          return null;
      }

      // Save to DB
      await pool.query(
        `INSERT INTO content_pieces 
         (company_id, type, format, title, body, gamma_generation_id, gamma_status, status, created_by, agent_tag)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending', 'generating', 'agent', 'marketing')`,
        [company.id, type, type, strategy.topic || strategy.focus, inputText, generation.generationId]
      );

      await pool.query(
        `INSERT INTO gamma_usage (company_id, generation_id, format, status)
         VALUES ($1, $2, $3, 'pending')`,
        [company.id, generation.generationId, type]
      );

      // Poll for completion (background)
      this.pollGammaCompletion(company.id, generation.generationId).catch(e => {
        console.error('[MarketingAgent] Gamma poll error:', e);
      });

      return { type, generationId: generation.generationId };

    } catch (error) {
      console.error('[MarketingAgent] Gamma content error:', error);
      return null;
    }
  }

  async pollGammaCompletion(companyId, generationId) {
    try {
      const result = await gamma.waitForGeneration(generationId);
      
      await pool.query(
        `UPDATE content_pieces SET 
           gamma_status = 'completed', gamma_url = $1, status = 'ready',
           gamma_credits_used = $2, updated_at = NOW()
         WHERE gamma_generation_id = $3`,
        [result.gammaUrl, result.credits?.deducted || 0, generationId]
      );

      await pool.query(
        `UPDATE gamma_usage SET status = 'completed', gamma_url = $1, credits_deducted = $2
         WHERE generation_id = $3`,
        [result.gammaUrl, result.credits?.deducted || 0, generationId]
      );

      console.log(`[MarketingAgent] Gamma content ready: ${result.gammaUrl}`);
    } catch (error) {
      await pool.query(
        `UPDATE content_pieces SET gamma_status = 'failed', status = 'failed', updated_at = NOW()
         WHERE gamma_generation_id = $1`,
        [generationId]
      );
      console.error('[MarketingAgent] Gamma generation failed:', error);
    }
  }

  // ═══════════════════════════════════════
  // ADS REVIEW
  // ═══════════════════════════════════════

  async reviewAdCampaigns(company) {
    const campaigns = await pool.query(
      `SELECT * FROM ad_campaigns WHERE company_id = $1 AND status IN ('active', 'draft')
       ORDER BY created_at DESC LIMIT 5`,
      [company.id]
    );

    if (campaigns.rows.length === 0) return null;

    return `${campaigns.rows.length} campañas de ads en seguimiento`;
  }

  // ═══════════════════════════════════════
  // CUSTOM TASK (from Co-Founder)
  // ═══════════════════════════════════════

  async executeCustomTask(company, taskDescription) {
    // Detect if the task is about Gamma content
    const isGammaTask = taskDescription.match(/presentaci[oó]n|pitch|carrusel|carousel|documento|propuesta|deck|landing/i);
    
    if (isGammaTask && gamma.enabled) {
      // Determine type
      let type = 'presentation';
      if (taskDescription.match(/carrusel|carousel/i)) type = 'carousel';
      if (taskDescription.match(/documento|propuesta|report/i)) type = 'document';
      if (taskDescription.match(/landing|web/i)) type = 'webpage';

      try {
        // Generate content text first
        const prompt = `Genera el contenido para ${type === 'carousel' ? 'un carrusel' : type === 'presentation' ? 'una presentación' : type === 'document' ? 'un documento' : 'una landing'} sobre:
${taskDescription}

Empresa: "${company.name}" — ${company.description || ''}

Escribe contenido profesional y detallado. Usa --- para separar secciones/slides.`;

        const response = await callLLM(prompt, { maxTokens: 2000 });
        const inputText = typeof response === 'string' ? response : response.content;

        let generation;
        if (type === 'carousel') generation = await gamma.generateCarousel(inputText);
        else if (type === 'document') generation = await gamma.generateDocument(inputText);
        else if (type === 'webpage') generation = await gamma.generateWebpage(inputText);
        else generation = await gamma.generatePresentation(inputText);

        // Save
        await pool.query(
          `INSERT INTO content_pieces 
           (company_id, type, format, title, body, gamma_generation_id, gamma_status, status, created_by, agent_tag)
           VALUES ($1, $2, $3, $4, $5, $6, 'pending', 'generating', 'agent', 'marketing')`,
          [company.id, type, type, taskDescription.substring(0, 100), inputText, generation.generationId]
        );

        // Poll in background
        this.pollGammaCompletion(company.id, generation.generationId).catch(console.error);

        return { 
          response: `Generando ${type} con Gamma... Cuando esté listo lo verás en la pestaña de Contenido.`,
          generationId: generation.generationId
        };
      } catch (e) {
        console.error('[MarketingAgent] Custom Gamma task error:', e);
      }
    }

    // Detect ads tasks
    const isAdsTask = taskDescription.match(/anuncio|ad[s]?|publicidad|google ads|meta ads|facebook ads|linkedin ads|campaña de ads/i);

    if (isAdsTask) {
      const prompt = `Eres experto en publicidad digital. Tarea: ${taskDescription}

Empresa: "${company.name}" — ${company.description || ''} (${company.industry || 'General'})

Genera una estrategia de ads completa con copies, audiencia y presupuesto.`;

      const response = await callLLM(prompt, { maxTokens: 1500 });
      const content = typeof response === 'string' ? response : response.content;
      return { response: content };
    }

    // Default: generic marketing task
    const prompt = `Eres el director de marketing de "${company.name}".
${company.description || ''}

Tarea: ${taskDescription}

Genera contenido/estrategia específica y accionable.`;

    const response = await callLLM(prompt, { maxTokens: 1000 });
    const content = typeof response === 'string' ? response : response.content;
    return { response: content };
  }

  // ═══════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════

  async createTask(companyId, title, description) {
    const result = await pool.query(
      `INSERT INTO tasks (company_id, agent_type, tag, title, description, status, created_at)
       VALUES ($1, 'marketing', 'marketing', $2, $3, 'todo', NOW()) RETURNING *`,
      [companyId, title, description]
    );
    return result.rows[0];
  }

  async updateTask(taskId, updates) {
    const fields = [];
    const values = [];
    let idx = 1;
    for (const [key, val] of Object.entries(updates)) {
      fields.push(`${key} = $${idx++}`);
      values.push(val);
    }
    values.push(taskId);
    await pool.query(
      `UPDATE tasks SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx}`,
      values
    );
  }

  async logActivity(companyId, taskId, type, message) {
    await pool.query(
      `INSERT INTO activity_log (company_id, task_id, activity_type, message, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [companyId, taskId, type, message]
    ).catch(() => {});
  }
}

module.exports = MarketingAgent;
