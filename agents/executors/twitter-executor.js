/**
 * Twitter Agent Executor - Publicar tweets automáticamente
 */

const TaskExecutor = require('../task-executor');
const { callLLM } = require('../../backend/llm');
const { pool } = require('../../backend/db');
const crypto = require('crypto');

class TwitterExecutor extends TaskExecutor {
  constructor() {
    super('twitter-agent', 'Twitter Agent');
    this.dailyTweetLimit = 2;
  }

  /**
   * Ejecutar tarea de Twitter
   */
  async execute(task) {
    console.log(`🐦 Twitter Agent procesando: ${task.title}`);

    // Obtener info de la empresa
    const companyResult = await pool.query(
      'SELECT * FROM companies WHERE id = ?',
      [task.company_id]
    );
    const company = companyResult.rows[0];

    // Verificar rate limit
    await this.checkRateLimit(task.company_id);

    // Cargar contexto de memoria
    let memoryContext = '';
    if (this.memory) {
      const context = await this.memory.getFullContext();
      memoryContext = `
CONTEXTO EMPRESA:
- Nombre: ${context.domain.companyName}
- Industria: ${context.domain.industry}
- Audiencia: ${context.domain.targetAudience}
- Features: ${context.domain.keyFeatures.join(', ') || 'En desarrollo'}
`;
    }

    // Generar tweet con LLM
    const tweet = await this.generateTweet(task, company, memoryContext);

    // Guardar tweet en DB
    const tweetId = await this.saveTweet(task.company_id, tweet);

    // TODO: Publicar en Twitter API real cuando tengas cuenta
    // await this.postToTwitterAPI(tweet);

    console.log(`📝 Tweet generado (guardado, no publicado aún):\n"${tweet.content}"`);

    return {
      summary: `Tweet creado: "${tweet.content.substring(0, 50)}..."`,
      tweetId,
      content: tweet.content,
      published: false, // true cuando tengas API keys
      note: 'Tweet guardado en DB. Publicar manualmente o configurar API cuando esté lista.'
    };
  }

  /**
   * Generar tweet con LLM
   */
  async generateTweet(task, company, memoryContext) {
    const prompt = `Eres el Twitter Agent de ${company.name}.

${memoryContext}

TAREA: ${task.title}
DESCRIPCIÓN: ${task.description}

REGLAS CRÍTICAS:
- Máximo 280 caracteres (límite estricto de Twitter)
- Tono: Dark humor, witty, amargo > emocionado
- Sin emojis, sin hashtags
- Nunca decir "excited/thrilled"
- SIEMPRE incluir link a ${company.subdomain}.lanzalo.app
- Estilo: Directo, sin fluff

EJEMPLOS DE VOZ:
❌ "Excited to announce our new feature! 🎉 #startup"
✅ "Day 3. Still standing. ${company.subdomain}.lanzalo.app"

❌ "We're thrilled to help you succeed! ✨"
✅ "$500 MRR. Ramen budget secured. ${company.subdomain}.lanzalo.app"

❌ "Check out our amazing product! #innovation"
✅ "Built this in 48h. Works on mobile. Barely. ${company.subdomain}.lanzalo.app"

TIPO DE TWEET:
${this.determineTweetType(task)}

GENERA EL TWEET (JSON):

{
  "content": "Tu tweet aquí (max 280 chars, include link)",
  "type": "launch|milestone|feature|dark_humor|question"
}`;

    const response = await callLLM(prompt, {
      companyId: task.company_id,
      taskType: 'content',
      temperature: 0.8 // Más creativo
    });

    try {
      const tweet = JSON.parse(response.content);
      
      // Validar longitud
      if (tweet.content.length > 280) {
        console.warn(`⚠️ Tweet muy largo (${tweet.content.length} chars), truncando...`);
        tweet.content = tweet.content.substring(0, 277) + '...';
      }

      // Validar que incluya link
      if (!tweet.content.includes('.lanzalo.app')) {
        console.warn('⚠️ Tweet sin link, añadiendo...');
        tweet.content += ` ${company.subdomain}.lanzalo.app`;
      }

      return tweet;

    } catch (error) {
      // Fallback: tratar como texto plano
      let content = response.content.trim();
      
      if (content.length > 280) {
        content = content.substring(0, 277) + '...';
      }
      
      if (!content.includes('.lanzalo.app')) {
        content += ` ${company.subdomain}.lanzalo.app`;
      }

      return {
        content,
        type: 'generic'
      };
    }
  }

  /**
   * Determinar tipo de tweet según tarea
   */
  determineTweetType(task) {
    const desc = task.description.toLowerCase();
    
    if (desc.includes('launch') || desc.includes('lanzamiento')) {
      return 'Launch tweet (anuncio de nuevo producto/feature)';
    }
    
    if (desc.includes('milestone') || desc.includes('hito') || desc.includes('mrr') || desc.includes('revenue')) {
      return 'Milestone tweet (logro alcanzado)';
    }
    
    if (desc.includes('feature') || desc.includes('nueva')) {
      return 'Feature announcement (nueva funcionalidad)';
    }
    
    if (desc.includes('question') || desc.includes('pregunta')) {
      return 'Question tweet (engage con audiencia)';
    }
    
    return 'General tweet (contenido de valor o dark humor)';
  }

  /**
   * Verificar rate limit (2 tweets/día)
   */
  async checkRateLimit(companyId) {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const result = await pool.query(
      `SELECT COUNT(*) as count FROM tweets 
       WHERE company_id = ? 
       AND DATE(created_at) = ?`,
      [companyId, today]
    );

    const todayCount = parseInt(result.rows[0].count);

    if (todayCount >= this.dailyTweetLimit) {
      throw new Error(`Rate limit alcanzado: ${todayCount}/${this.dailyTweetLimit} tweets hoy. Intenta mañana.`);
    }

    console.log(`📊 Rate limit: ${todayCount}/${this.dailyTweetLimit} tweets hoy`);
  }

  /**
   * Guardar tweet en base de datos
   */
  async saveTweet(companyId, tweet) {
    const tweetId = crypto.randomUUID();

    await pool.query(
      `INSERT INTO tweets (id, company_id, content, type, published, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [tweetId, companyId, tweet.content, tweet.type || 'generic', false]
    );

    console.log(`💾 Tweet guardado en DB: ${tweetId}`);

    return tweetId;
  }

  /**
   * Publicar en Twitter API (cuando tengas credenciales)
   */
  async postToTwitterAPI(tweet) {
    // TODO: Implementar cuando tengas:
    // 1. Cuenta de Twitter de Lanzalo
    // 2. Twitter API keys (v2)
    // 3. OAuth 2.0 setup
    
    /*
    const Twitter = require('twitter-api-v2');
    
    const client = new Twitter({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_SECRET,
    });
    
    const result = await client.v2.tweet(tweet.content);
    
    // Actualizar DB con tweet_id de Twitter
    await pool.query(
      'UPDATE tweets SET published = ?, twitter_id = ? WHERE id = ?',
      [true, result.data.id, tweetId]
    );
    
    console.log(`✅ Tweet publicado: https://twitter.com/lanzalo/status/${result.data.id}`);
    */
    
    console.log('ℹ️ Twitter API no configurada aún. Tweet guardado en DB.');
  }

  /**
   * Override formatResult
   */
  formatResult(result) {
    if (result.published) {
      return `🐦 Tweet publicado

"${result.content}"

✅ Publicado en Twitter
Link: https://twitter.com/lanzalo/status/${result.tweetId}`;
    } else {
      return `📝 Tweet creado (pendiente de publicar)

"${result.content}"

⚠️ Nota: ${result.note}

Para publicar:
1. Configurar Twitter API keys
2. O publicar manualmente en @lanzalo`;
    }
  }
}

module.exports = TwitterExecutor;
