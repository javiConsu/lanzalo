/**
 * Twitter Agent Executor - Publicar tweets via twitterapi.io
 * 
 * Usa twitterapi.io ($0.003/tweet) en vez de la API oficial de Twitter.
 * Requiere: TWITTERAPI_KEY en .env
 */

const { callLLM } = require('../../backend/llm');
const { getSystemPrompt } = require('../system-prompts');
const { pool } = require('../../backend/db');
const axios = require('axios');
const crypto = require('crypto');

const TWITTERAPI_KEY = process.env.TWITTERAPI_KEY;
const TWITTER_LOGIN_COOKIES = process.env.TWITTER_LOGIN_COOKIES;
const TWITTER_PROXY = process.env.TWITTER_PROXY;

class TwitterExecutor {
  constructor() {
    this.name = 'Twitter Agent';
    this.dailyTweetLimit = 2;
  }

  async execute(task) {
    console.log(`🐦 Twitter Agent procesando: ${task.title}`);

    const company = await this.getCompany(task.company_id);
    await this.checkRateLimit(task.company_id);

    // Generar tweet con system prompt
    const systemPrompt = getSystemPrompt('twitter', company.name);
    const tweet = await this.generateTweet(task, company, systemPrompt);

    // Guardar en DB
    const tweetId = await this.saveTweet(task.company_id, tweet);

    // Publicar si hay credenciales
    let published = false;
    if (TWITTERAPI_KEY && TWITTER_LOGIN_COOKIES && TWITTER_PROXY) {
      published = await this.postTweet(tweet.content, tweetId);
    } else {
      console.log('⚠️ twitterapi.io no configurado. Tweet guardado en DB.');
    }

    return {
      summary: `Tweet: "${tweet.content.substring(0, 50)}..."`,
      tweetId,
      content: tweet.content,
      published
    };
  }

  async getCompany(companyId) {
    const result = await pool.query(
      'SELECT * FROM companies WHERE id = $1', [companyId]
    );
    return result.rows[0];
  }

  async generateTweet(task, company, systemPrompt) {
    const prompt = `TAREA: ${task.title}
DESCRIPCIÓN: ${task.description || 'Tweet general sobre el negocio'}
EMPRESA: ${company.name} — ${company.description || ''}
URL: ${company.subdomain || company.name.toLowerCase()}.lanzalo.app

Genera UN tweet. JSON:
{"content": "tweet aquí (max 280 chars, incluir link)", "type": "launch|milestone|feature|dark_humor"}`;

    const response = await callLLM(prompt, {
      companyId: task.company_id,
      taskType: 'twitter',
      systemPrompt,
      temperature: 0.8
    });

    try {
      // Intentar parsear JSON
      const match = response.content.match(/\{[\s\S]*\}/);
      const tweet = JSON.parse(match ? match[0] : response.content);

      // Validar longitud
      if (tweet.content.length > 280) {
        tweet.content = tweet.content.substring(0, 277) + '...';
      }

      return tweet;
    } catch {
      // Fallback: texto plano
      let content = response.content.replace(/[{}"]/g, '').trim();
      if (content.length > 280) content = content.substring(0, 277) + '...';
      return { content, type: 'generic' };
    }
  }

  async postTweet(content, dbTweetId) {
    try {
      const response = await axios.post(
        'https://api.twitterapi.io/twitter/create_tweet_v2',
        {
          login_cookies: TWITTER_LOGIN_COOKIES,
          tweet_text: content,
          proxy: TWITTER_PROXY
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': TWITTERAPI_KEY
          },
          timeout: 30000
        }
      );

      if (response.data.status === 'success') {
        // Actualizar DB con tweet_id de Twitter
        await pool.query(
          `UPDATE tweets SET status = 'posted', tweet_id = $1, posted_at = NOW() WHERE id = $2`,
          [response.data.tweet_id, dbTweetId]
        );
        console.log(`✅ Tweet publicado: ${response.data.tweet_id}`);
        return true;
      } else {
        console.error(`❌ Twitter error: ${response.data.msg}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ twitterapi.io error: ${error.message}`);
      return false;
    }
  }

  async checkRateLimit(companyId) {
    const today = new Date().toISOString().split('T')[0];
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM tweets 
       WHERE company_id = $1 AND DATE(created_at) = $2`,
      [companyId, today]
    );

    const count = parseInt(result.rows[0].count);
    if (count >= this.dailyTweetLimit) {
      throw new Error(`Rate limit: ${count}/${this.dailyTweetLimit} tweets hoy`);
    }
  }

  async saveTweet(companyId, tweet) {
    const id = crypto.randomUUID();
    await pool.query(
      `INSERT INTO tweets (id, company_id, content, status, created_at)
       VALUES ($1, $2, $3, 'draft', NOW())`,
      [id, companyId, tweet.content]
    );
    return id;
  }
}

module.exports = TwitterExecutor;
