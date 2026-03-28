/**
 * Agente de Twitter - Automatización de redes sociales
 */

const { createTask, updateTask, createTweet, updateTweet, logActivity } = require('../backend/db');
const { callLLM } = require('../backend/llm');
const { postTweet } = require('../backend/twitter');
const governanceHelper = require('../backend/services/governance-helper');
const brandConfig = require('../backend/services/brand-config');

class TwitterAgent {
  async execute(company) {
    // GOVERNANCE CHECKS
    const budgetCheck = await governanceHelper.checkBudgetBeforeAction('Twitter');
    if (!budgetCheck.allowed) {
      return { error: budgetCheck.error, budget_exceeded: true, action: 'skipped' };
    }

    const governanceCheck = await governanceHelper.checkGovernanceStatus('Twitter', company.id);
    if (!governanceCheck.allowed) {
      return { error: 'Twitter Agent is paused or terminated', paused: governanceCheck.paused, terminated: governanceCheck.terminated };
    }

    await governanceHelper.recordHeartbeat(company.id, 'Twitter');

    const task = await createTask(company.id, 'twitter',
      'Publicación diaria en Twitter',
      'Generar y publicar contenido atractivo');

    try {
      await updateTask(task.id, { status: 'running' });
      await logActivity(company.id, task.id, 'task_start',
        `Agente de Twitter iniciado para ${company.name}`);

      // 0. Load brand config
      const brand = await brandConfig.getConfig(company.id);
      const brandContext = brandConfig.buildPromptContext(brand);

      // 1. Decidir sobre qué tweetear hoy
      const strategy = await this.getTweetStrategy(company, brandContext);
      
      // 2. Generar tweet(s)
      const tweets = [];
      for (const topic of strategy.topics.slice(0, 2)) { // Máx 2 tweets por día
        const tweet = await this.generateTweet(company, topic, brandContext, brand);
        tweets.push(tweet);
        
        // Guardar en base de datos
        await createTweet(company.id, tweet.content, 
          tweet.mediaUrl, 'draft');
      }

      // 3. Publicar tweets (si está habilitado)
      let postedCount = 0;
      if (company.twitter_automation_enabled) {
        for (const tweet of tweets) {
          const result = await postTweet(tweet);
          postedCount++;
          
          // Actualizar con ID de Twitter
          await updateTweet(tweet.id, { 
            status: 'posted',
            tweet_id: result.id,
            posted_at: new Date()
          });
        }
      }

      const output = `Estrategia: ${strategy.summary}\nGenerados ${tweets.length} tweets\nPublicados: ${postedCount}`;

      await updateTask(task.id, {
        status: 'completed',
        output,
        completed_at: new Date()
      });

      await logActivity(company.id, task.id, 'task_complete',
        `Agente de Twitter publicó ${postedCount} tweets`);

      // GOVERNANCE: Record budget usage
      governanceHelper.recordBudgetUsage(company.id, 'Twitter', 0.02, 'dollars').catch(() => {});

      return {
        success: true,
        summary: `Publicados ${postedCount} tweets`,
        tweetsPosted: postedCount
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

  async getTweetStrategy(company, brandContext) {
    const prompt = `Eres el agente de Twitter/X de "${company.name}".
${brandContext}

Descripción: ${company.description}
Industria: ${company.industry}

Decide qué tweetear HOY para:
- Construir reconocimiento de marca
- Atraer clientes potenciales
- Compartir valor/insights
- Generar engagement

IMPORTANTE: Sigue la guía de marca en tono y vocabulario.

Responde en JSON:
{
  "summary": "estrategia del día",
  "topics": [
    {
      "type": "educational|promotional|thought_leadership|engagement",
      "angle": "ángulo/hook específico",
      "keywords": ["keyword1", "keyword2"]
    }
  ]
}`;

    try {
      const response = await callLLM(prompt, { maxTokens: 500 });
      const content = typeof response === 'string' ? response : response.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('[TwitterAgent] Strategy error:', e);
    }
    return { summary: 'Contenido general', topics: [{ type: 'educational', angle: 'valor', keywords: [] }] };
  }

  async generateTweet(company, topic, brandContext, brand) {
    const platformRules = brandConfig.getPlatformRules(brand, 'twitter');
    const prompt = `Escribe un tweet para "${company.name}".
${brandContext}

Empresa: ${company.description}
Tipo: ${topic.type}
Ángulo: ${topic.angle}
Keywords: ${(topic.keywords || []).join(', ')}
Adaptación Twitter: ${platformRules.tone_shift || 'más directo y punchy'}

REGLAS:
- Máx ${platformRules.max_chars || 280} caracteres
- Engaging y auténtico
- ${platformRules.hashtags || 2} hashtags máx
- Sigue la guía de marca estrictamente
- Valor claro o call-to-action

Responde en JSON:
{
  "content": "texto del tweet",
  "mediaUrl": null
}`;

    try {
      const response = await callLLM(prompt, { maxTokens: 400 });
      const content = typeof response === 'string' ? response : response.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('[TwitterAgent] Tweet generation error:', e);
    }
    return { content: '', mediaUrl: null };
  }

  async executeCustomTask(company, taskDescription) {
    const brand = await brandConfig.getConfig(company.id);
    const brandContext = brandConfig.buildPromptContext(brand);
    const platformRules = brandConfig.getPlatformRules(brand, 'twitter');

    const prompt = `Tarea personalizada de Twitter para "${company.name}": ${taskDescription}
${brandContext}

Adaptación Twitter: ${platformRules.tone_shift || 'directo y punchy'}
Máx ${platformRules.max_chars || 280} chars.

Genera el tweet siguiendo la guía de marca. Responde en JSON: { "content": "...", "mediaUrl": null }`;
    
    try {
      const response = await callLLM(prompt, { maxTokens: 400 });
      const content = typeof response === 'string' ? response : response.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('[TwitterAgent] Custom task error:', e);
    }
    return { content: '', mediaUrl: null };
  }
}

module.exports = TwitterAgent;
