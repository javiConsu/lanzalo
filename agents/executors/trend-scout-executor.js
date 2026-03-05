/**
 * Trend Scout Agent - Descubre oportunidades de negocio en tiempo real
 * 
 * Escanea Twitter, Reddit, Hacker News, Product Hunt, etc.
 * buscando pain points y demanda no satisfecha
 */

const TaskExecutor = require('../task-executor');
const { callLLM } = require('../../backend/llm');
const { pool } = require('../../backend/db');
const axios = require('axios');
const crypto = require('crypto');

class TrendScoutExecutor extends TaskExecutor {
  constructor() {
    super('trend-scout-agent', 'Trend Scout Agent');
  }

  /**
   * Ejecutar tarea de trend scouting
   */
  async execute(task) {
    console.log('🔍 Trend Scout Agent buscando oportunidades...');

    // Escanear todas las fuentes
    const signals = await this.scanAllSources();

    console.log(`📊 Señales recopiladas:
  - Reddit: ${signals.reddit.length} posts
  - Hacker News: ${signals.hackerNews.length} posts
  - Product Hunt: ${signals.productHunt.length} productos
  - Total: ${signals.reddit.length + signals.hackerNews.length + signals.productHunt.length} señales`);

    // Analizar señales con LLM
    const opportunities = await this.analyzeSignals(signals);

    console.log(`💡 ${opportunities.length} oportunidades detectadas`);

    // Score y filtrar
    const scoredIdeas = await this.scoreOpportunities(opportunities);

    // Guardar ideas en DB
    const savedCount = await this.saveIdeas(scoredIdeas);

    // Crear reporte
    const reportId = await this.createReport(task, scoredIdeas);

    return {
      summary: `${savedCount} ideas nuevas descubiertas`,
      ideasCount: savedCount,
      topIdeas: scoredIdeas.slice(0, 5),
      reportId
    };
  }

  /**
   * Escanear todas las fuentes
   */
  async scanAllSources() {
    console.log('🌐 Escaneando fuentes...');

    const [reddit, hackerNews, productHunt] = await Promise.all([
      this.scanReddit(),
      this.scanHackerNews(),
      this.scanProductHunt()
      // Twitter requiere API keys (añadir cuando tengas)
      // TikTok requiere scraping avanzado (fase 2)
    ]);

    return {
      reddit,
      hackerNews,
      productHunt
    };
  }

  /**
   * Escanear Reddit
   */
  async scanReddit() {
    console.log('📱 Escaneando Reddit...');

    const subreddits = [
      'Entrepreneur',
      'SaaS',
      'startups',
      'SideProject',
      'smallbusiness',
      'EntrepreneurRideAlong',
      'IMadeThis'
    ];

    const posts = [];

    for (const subreddit of subreddits) {
      try {
        // Reddit JSON API (público, no requiere auth)
        const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=25`;
        
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'TrendScout/1.0'
          },
          timeout: 10000
        });

        const subredditPosts = response.data.data.children
          .map(child => ({
            subreddit,
            title: child.data.title,
            selftext: child.data.selftext,
            url: `https://reddit.com${child.data.permalink}`,
            score: child.data.score,
            num_comments: child.data.num_comments,
            created: child.data.created_utc
          }))
          .filter(p => 
            // Filtrar posts relevantes
            p.title.toLowerCase().includes('looking for') ||
            p.title.toLowerCase().includes('need') ||
            p.title.toLowerCase().includes('wish') ||
            p.title.toLowerCase().includes('problem') ||
            p.title.toLowerCase().includes('solution') ||
            p.selftext.toLowerCase().includes('looking for') ||
            p.selftext.toLowerCase().includes('anyone know')
          );

        posts.push(...subredditPosts);

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error escaneando r/${subreddit}:`, error.message);
      }
    }

    console.log(`  ✅ Reddit: ${posts.length} posts relevantes`);

    return posts;
  }

  /**
   * Escanear Hacker News
   */
  async scanHackerNews() {
    console.log('🔶 Escaneando Hacker News...');

    try {
      // HN API pública
      const topStoriesUrl = 'https://hacker-news.firebaseio.com/v0/topstories.json';
      const topStories = await axios.get(topStoriesUrl, { timeout: 10000 });

      const storyIds = topStories.data.slice(0, 30); // Top 30

      const stories = [];

      for (const id of storyIds) {
        try {
          const storyUrl = `https://hacker-news.firebaseio.com/v0/item/${id}.json`;
          const story = await axios.get(storyUrl, { timeout: 5000 });

          const data = story.data;

          // Filtrar Ask HN y Show HN
          if (data.type === 'story' && 
              (data.title.startsWith('Ask HN:') || 
               data.title.startsWith('Show HN:') ||
               data.title.toLowerCase().includes('looking for') ||
               data.title.toLowerCase().includes('need'))) {
            
            stories.push({
              id: data.id,
              title: data.title,
              url: data.url || `https://news.ycombinator.com/item?id=${data.id}`,
              score: data.score,
              descendants: data.descendants, // comments
              text: data.text || ''
            });
          }

          await new Promise(resolve => setTimeout(resolve, 200));

        } catch (error) {
          // Skip failed stories
        }
      }

      console.log(`  ✅ Hacker News: ${stories.length} posts relevantes`);

      return stories;

    } catch (error) {
      console.error('Error escaneando HN:', error.message);
      return [];
    }
  }

  /**
   * Escanear Product Hunt
   */
  async scanProductHunt() {
    console.log('🚀 Escaneando Product Hunt...');

    try {
      // Product Hunt tiene API pero requiere token
      // Por ahora, scraping básico o mock data
      
      // TODO: Implementar con API real cuando tengas token
      // https://api.producthunt.com/v2/api/graphql
      
      console.log('  ⚠️  Product Hunt: API requiere token (pendiente)');
      
      return [];

    } catch (error) {
      console.error('Error escaneando Product Hunt:', error.message);
      return [];
    }
  }

  /**
   * Analizar señales con LLM
   */
  async analyzeSignals(signals) {
    console.log('🤖 Analizando señales con LLM...');

    // Preparar datos para análisis
    const redditSample = signals.reddit.slice(0, 15)
      .map(p => `[r/${p.subreddit}] ${p.title}\n${p.selftext.substring(0, 200)}`)
      .join('\n\n');

    const hnSample = signals.hackerNews.slice(0, 10)
      .map(h => `${h.title}\n${h.text ? h.text.substring(0, 200) : ''}`)
      .join('\n\n');

    const prompt = `Eres un experto en detectar oportunidades de negocio.

Analiza estas señales del mercado y extrae oportunidades concretas:

REDDIT (${signals.reddit.length} posts):
${redditSample}

HACKER NEWS (${signals.hackerNews.length} posts):
${hnSample}

INSTRUCCIONES:
1. Identifica pain points recurrentes
2. Detecta problemas sin solución clara
3. Encuentra nichos con demanda validada
4. Busca tendencias emergentes

REGLAS:
- Solo oportunidades B2B/SaaS/Digital (no físico)
- Problemas que se pueden resolver con software
- Audiencia identificable online
- Potencial de automatización

RESPONDE EN JSON:

{
  "opportunities": [
    {
      "title": "Nombre corto de la oportunidad (5-8 palabras)",
      "problem": "Problema específico que resuelve (1-2 frases)",
      "target_audience": "Quién tiene este problema",
      "evidence": "Por qué hay demanda (menciones, threads, etc.)",
      "difficulty": "easy|medium|hard",
      "potential_revenue": "$X-Y/mes estimado",
      "category": "saas|marketplace|tool|service",
      "source": "reddit|hackernews"
    }
  ]
}

MÍNIMO 5 oportunidades, MÁXIMO 15.
Solo las MEJORES y más VIABLES.`;

    const response = await callLLM(prompt, {
      taskType: 'research',
      temperature: 0.6
    });

    try {
      const parsed = JSON.parse(response.content);
      return parsed.opportunities || [];
    } catch (error) {
      console.error('Error parseando oportunidades:', error.message);
      return [];
    }
  }

  /**
   * Score y ranking de oportunidades
   */
  async scoreOpportunities(opportunities) {
    console.log('📊 Scoring oportunidades...');

    for (const opp of opportunities) {
      opp.score = this.calculateScore(opp);
    }

    // Sort por score (mayor a menor)
    return opportunities.sort((a, b) => b.score - a.score);
  }

  /**
   * Calcular score (0-100)
   */
  calculateScore(opportunity) {
    let score = 40; // Base

    // Dificultad (invertido: easy = más puntos)
    if (opportunity.difficulty === 'easy') score += 30;
    else if (opportunity.difficulty === 'medium') score += 20;
    else if (opportunity.difficulty === 'hard') score += 10;

    // Revenue potencial
    const revenueMatch = opportunity.potential_revenue.match(/\d+/);
    if (revenueMatch) {
      const revenue = parseInt(revenueMatch[0]);
      score += Math.min(revenue / 100, 20); // Max 20 puntos
    }

    // Categoría (preferir SaaS y tools)
    if (opportunity.category === 'saas') score += 10;
    else if (opportunity.category === 'tool') score += 8;
    else if (opportunity.category === 'marketplace') score += 5;

    return Math.min(Math.round(score), 100);
  }

  /**
   * Guardar ideas en base de datos
   */
  async saveIdeas(ideas) {
    console.log('💾 Guardando ideas en DB...');

    let savedCount = 0;

    for (const idea of ideas) {
      try {
        // Check si ya existe (por título similar)
        const existing = await pool.query(
          `SELECT id FROM discovered_ideas WHERE title = ? LIMIT 1`,
          [idea.title]
        );

        if (existing.rows.length > 0) {
          console.log(`  ⏭️  Ya existe: ${idea.title}`);
          continue;
        }

        // Insertar nueva idea
        const ideaId = crypto.randomUUID();

        await pool.query(
          `INSERT INTO discovered_ideas (
            id, title, problem, target_audience, evidence,
            source, difficulty, potential_revenue, category, score,
            discovered_at, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 1)`,
          [
            ideaId,
            idea.title,
            idea.problem,
            idea.target_audience,
            idea.evidence,
            idea.source,
            idea.difficulty,
            idea.potential_revenue,
            idea.category,
            idea.score
          ]
        );

        console.log(`  ✅ Guardada: ${idea.title} (score: ${idea.score})`);
        savedCount++;

      } catch (error) {
        console.error(`  ❌ Error guardando idea:`, error.message);
      }
    }

    console.log(`💾 Total guardadas: ${savedCount}/${ideas.length}`);

    return savedCount;
  }

  /**
   * Crear reporte
   */
  async createReport(task, ideas) {
    const reportId = crypto.randomUUID();

    const content = `# Trend Scout Report

## Resumen
- **Ideas descubiertas**: ${ideas.length}
- **Score promedio**: ${Math.round(ideas.reduce((sum, i) => sum + i.score, 0) / ideas.length)}
- **Top categoría**: ${this.getTopCategory(ideas)}

## Top 10 Oportunidades

${ideas.slice(0, 10).map((idea, i) => `
### ${i + 1}. ${idea.title}

**Score**: ${idea.score}/100  
**Dificultad**: ${idea.difficulty}  
**Revenue potencial**: ${idea.potential_revenue}  
**Categoría**: ${idea.category}

**Problema**:  
${idea.problem}

**Audiencia**:  
${idea.target_audience}

**Evidencia de demanda**:  
${idea.evidence}

**Fuente**: ${idea.source}

---
`).join('\n')}

## Análisis

Las oportunidades detectadas muestran demanda clara en:
${this.analyzeCategories(ideas)}

**Recomendación**: Priorizar ideas con score >80 y dificultad "easy".

---

Generado: ${new Date().toISOString()}
`;

    await pool.query(
      `INSERT INTO reports (id, company_id, task_id, type, title, content, created_at)
       VALUES (?, NULL, ?, 'trend_scout', 'Trend Scout Report', ?, datetime('now'))`,
      [reportId, task.id, content]
    );

    console.log(`📊 Reporte creado: ${reportId}`);

    return reportId;
  }

  /**
   * Obtener categoría más frecuente
   */
  getTopCategory(ideas) {
    const counts = {};
    ideas.forEach(i => {
      counts[i.category] = (counts[i.category] || 0) + 1;
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
  }

  /**
   * Analizar categorías
   */
  analyzeCategories(ideas) {
    const counts = {};
    ideas.forEach(i => {
      counts[i.category] = (counts[i.category] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([cat, count]) => `- ${cat}: ${count} oportunidades`)
      .join('\n');
  }

  /**
   * Override formatResult
   */
  formatResult(result) {
    return `🔍 Trend Scout completado

${result.ideasCount} ideas nuevas descubiertas

Top 5:
${result.topIdeas.map((idea, i) => `${i + 1}. ${idea.title} (score: ${idea.score})`).join('\n')}

Ver reporte completo: ${result.reportId}`;
  }
}

module.exports = TrendScoutExecutor;
