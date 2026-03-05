/**
 * Agente de Twitter - Automatización de redes sociales
 */

const { createTask, updateTask, createTweet, logActivity } = require('../backend/db');
const { callLLM } = require('../backend/llm');
const { postTweet } = require('../backend/twitter');

class TwitterAgent {
  async execute(company) {
    const task = await createTask(company.id, 'twitter',
      'Publicación diaria en Twitter',
      'Generar y publicar contenido atractivo');

    try {
      await updateTask(task.id, { status: 'running' });
      await logActivity(company.id, task.id, 'task_start',
        `Agente de Twitter iniciado para ${company.name}`);

      // 1. Decidir sobre qué tweetear hoy
      const strategy = await this.getTweetStrategy(company);
      
      // 2. Generar tweet(s)
      const tweets = [];
      for (const topic of strategy.topics.slice(0, 2)) { // Máx 2 tweets por día
        const tweet = await this.generateTweet(company, topic);
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

  async getTweetStrategy(company) {
    const prompt = `You are the Twitter agent for "${company.name}".
Description: ${company.description}
Industry: ${company.industry}

Decide what to tweet about TODAY to:
- Build brand awareness
- Attract potential customers
- Share value/insights
- Drive engagement

Respond in JSON:
{
  "summary": "today's strategy",
  "topics": [
    {
      "type": "educational|promotional|thought_leadership|engagement",
      "angle": "specific angle/hook",
      "keywords": ["keyword1", "keyword2"]
    }
  ]
}`;

    const response = await callLLM(prompt);
    return JSON.parse(response);
  }

  async generateTweet(company, topic) {
    const prompt = `Write a tweet for "${company.name}".

Company: ${company.description}
Topic type: ${topic.type}
Angle: ${topic.angle}
Keywords: ${topic.keywords.join(', ')}

Guidelines:
- Max 280 characters
- Engaging and authentic
- Include relevant hashtags (1-2 max)
- NO emoji spam
- Clear value or call-to-action

Respond in JSON:
{
  "content": "the tweet text",
  "mediaUrl": "optional image url or null"
}`;

    const response = await callLLM(prompt);
    return JSON.parse(response);
  }

  async executeCustomTask(company, taskDescription) {
    const prompt = `Custom Twitter task for "${company.name}": ${taskDescription}

Generate the tweet.`;
    
    const response = await callLLM(prompt);
    return JSON.parse(response);
  }
}

module.exports = TwitterAgent;
