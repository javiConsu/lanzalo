/**
 * Trend Scout Agent v2 — Descubre oportunidades de negocio en tiempo real
 * 
 * Fuentes:
 * - Reddit (API pública JSON): pain points, demanda, "looking for" posts
 * - Hacker News (API Firebase): Ask HN, Show HN, tendencias tech
 * - YouTube (Data API v3): vídeos trending por nicho, qué contenido tiene tracción
 * - TikTok (vía Brave Search): tendencias virales, necesidades de la gente
 * - Gumroad (vía Brave Search): qué productos digitales se venden bien
 * - Product Hunt (vía Brave Search): lanzamientos recientes, qué escala
 * - Twitter/X (vía Brave Search): conversaciones, quejas, pain points virales
 */

const { callLLM } = require('../../backend/llm');
const { pool } = require('../../backend/db');
const axios = require('axios');
const crypto = require('crypto');

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

class TrendScoutExecutor {
  constructor() {
    this.name = 'trend-scout';
  }

  /**
   * Ejecutar tarea de trend scouting
   */
  async execute(task) {
    console.log('🔍 [Trend Scout v2] Escaneando fuentes...');

    const signals = await this.scanAllSources();

    const totalSignals = Object.values(signals).reduce((sum, arr) => sum + arr.length, 0);
    console.log(`📊 [Trend Scout] ${totalSignals} señales recopiladas:
  - Reddit: ${signals.reddit.length}
  - Hacker News: ${signals.hackerNews.length}
  - YouTube: ${signals.youtube.length}
  - TikTok (web): ${signals.tiktok.length}
  - Gumroad (web): ${signals.gumroad.length}
  - Product Hunt (web): ${signals.productHunt.length}
  - Twitter/X (web): ${signals.twitter.length}`);

    if (totalSignals === 0) {
      return { output: 'Sin señales esta semana. Las fuentes no devolvieron datos.', summary: 'Sin datos' };
    }

    // Analizar todas las señales con LLM
    const opportunities = await this.analyzeSignals(signals);
    console.log(`💡 [Trend Scout] ${opportunities.length} oportunidades detectadas`);

    // Score y ranking
    const scoredIdeas = this.scoreOpportunities(opportunities);

    // Guardar ideas en DB
    const savedCount = await this.saveIdeas(scoredIdeas);

    // Generar reporte como output de la tarea (no en tabla reports)
    const report = this.generateReport(scoredIdeas, signals);

    return {
      output: report,
      summary: `${savedCount} ideas nuevas descubiertas de ${totalSignals} señales`,
      ideasCount: savedCount,
      topIdeas: scoredIdeas.slice(0, 5)
    };
  }

  // ─── SCAN ALL SOURCES ────────────────────────────────────────

  async scanAllSources() {
    // Run all sources in parallel — each one handles its own errors
    const [reddit, hackerNews, youtube, tiktok, gumroad, productHunt, twitter] = await Promise.allSettled([
      this.scanReddit(),
      this.scanHackerNews(),
      this.scanYouTube(),
      this.scanTikTokTrends(),
      this.scanGumroad(),
      this.scanProductHunt(),
      this.scanTwitter()
    ]);

    return {
      reddit: reddit.status === 'fulfilled' ? reddit.value : [],
      hackerNews: hackerNews.status === 'fulfilled' ? hackerNews.value : [],
      youtube: youtube.status === 'fulfilled' ? youtube.value : [],
      tiktok: tiktok.status === 'fulfilled' ? tiktok.value : [],
      gumroad: gumroad.status === 'fulfilled' ? gumroad.value : [],
      productHunt: productHunt.status === 'fulfilled' ? productHunt.value : [],
      twitter: twitter.status === 'fulfilled' ? twitter.value : []
    };
  }

  // ─── REDDIT ──────────────────────────────────────────────────

  async scanReddit() {
    console.log('📱 [Trend Scout] Escaneando Reddit...');

    const subreddits = [
      // Emprendimiento y negocios
      'Entrepreneur', 'SaaS', 'startups', 'SideProject', 'smallbusiness',
      'EntrepreneurRideAlong', 'IMadeThis', 'indiehackers',
      // Pain points y necesidades
      'Freelance', 'DigitalNomad', 'ecommerce', 'dropship',
      // Contenido y creadores
      'ContentCreation', 'NewTubers', 'socialmedia',
      // Español
      'emprendimiento', 'startups_es'
    ];

    // Keywords que indican pain points o demanda
    const SIGNAL_KEYWORDS = [
      'looking for', 'need', 'wish', 'problem', 'solution', 'frustrated',
      'anyone know', 'alternative to', 'how do you', 'what tool',
      'would pay', 'shut up and take my money', 'is there a',
      'struggling with', 'pain point', 'i built', 'launched',
      'just hit', 'mrr', 'revenue', 'paying customers',
      'busco', 'necesito', 'problema', 'herramienta para'
    ];

    const posts = [];

    for (const subreddit of subreddits) {
      try {
        const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=50`;
        const response = await axios.get(url, {
          headers: { 'User-Agent': 'LanzaloTrendScout/2.0' },
          timeout: 10000
        });

        const filtered = (response.data?.data?.children || [])
          .map(child => ({
            subreddit,
            title: child.data.title,
            selftext: (child.data.selftext || '').substring(0, 500),
            url: `https://reddit.com${child.data.permalink}`,
            score: child.data.score,
            num_comments: child.data.num_comments,
            created: child.data.created_utc
          }))
          .filter(p => {
            const text = `${p.title} ${p.selftext}`.toLowerCase();
            return SIGNAL_KEYWORDS.some(kw => text.includes(kw)) || p.score > 100;
          });

        posts.push(...filtered);

        // Rate limiting — Reddit limita a 1 req/s sin auth
        await this.sleep(1200);
      } catch (error) {
        console.warn(`  ⚠️ Reddit r/${subreddit}: ${error.message}`);
      }
    }

    console.log(`  ✅ Reddit: ${posts.length} posts relevantes`);
    return posts;
  }

  // ─── HACKER NEWS ─────────────────────────────────────────────

  async scanHackerNews() {
    console.log('🔶 [Trend Scout] Escaneando Hacker News...');

    try {
      const topStories = await axios.get(
        'https://hacker-news.firebaseio.com/v0/topstories.json',
        { timeout: 10000 }
      );

      const storyIds = topStories.data.slice(0, 50);
      const stories = [];

      // Fetch in batches of 10
      for (let i = 0; i < storyIds.length; i += 10) {
        const batch = storyIds.slice(i, i + 10);
        const results = await Promise.allSettled(
          batch.map(id =>
            axios.get(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { timeout: 5000 })
          )
        );

        for (const result of results) {
          if (result.status !== 'fulfilled') continue;
          const data = result.value.data;
          if (!data || data.type !== 'story') continue;

          const title = data.title || '';
          const isRelevant =
            title.startsWith('Ask HN:') ||
            title.startsWith('Show HN:') ||
            title.startsWith('Launch HN:') ||
            /\b(looking for|need|built|launched|saas|startup|revenue|mrr|side project)\b/i.test(title);

          if (isRelevant) {
            stories.push({
              title,
              url: data.url || `https://news.ycombinator.com/item?id=${data.id}`,
              score: data.score,
              comments: data.descendants || 0,
              text: (data.text || '').substring(0, 500)
            });
          }
        }

        await this.sleep(200);
      }

      console.log(`  ✅ Hacker News: ${stories.length} posts relevantes`);
      return stories;
    } catch (error) {
      console.warn(`  ⚠️ Hacker News: ${error.message}`);
      return [];
    }
  }

  // ─── YOUTUBE ─────────────────────────────────────────────────

  async scanYouTube() {
    if (!YOUTUBE_API_KEY) {
      console.log('  ⏭️ YouTube: API key no configurada (YOUTUBE_API_KEY)');
      return [];
    }

    console.log('📺 [Trend Scout] Escaneando YouTube...');

    // Búsquedas de nicho que revelan tendencias de negocio
    const queries = [
      'side hustle ideas 2026',
      'business ideas that actually work',
      'saas ideas no one is building',
      'pain points entrepreneurs',
      'ideas de negocio rentables',
      'what people are buying online',
      'micro saas tutorial',
      'passive income digital products'
    ];

    const videos = [];

    for (const query of queries) {
      try {
        const res = await axios.get('https://www.googleapis.com/youtube/v3/search', {
          params: {
            part: 'snippet',
            q: query,
            type: 'video',
            maxResults: 10,
            order: 'viewCount',
            publishedAfter: this.daysAgo(30),
            relevanceLanguage: 'en',
            key: YOUTUBE_API_KEY
          },
          timeout: 10000
        });

        const items = (res.data?.items || []).map(item => ({
          title: item.snippet.title,
          description: (item.snippet.description || '').substring(0, 300),
          channelTitle: item.snippet.channelTitle,
          url: `https://youtube.com/watch?v=${item.id.videoId}`,
          publishedAt: item.snippet.publishedAt,
          query
        }));

        videos.push(...items);
        await this.sleep(300);
      } catch (error) {
        console.warn(`  ⚠️ YouTube "${query}": ${error.message}`);
      }
    }

    // Get view counts for the videos (batch of 50 IDs)
    if (videos.length > 0) {
      try {
        const ids = videos
          .map(v => v.url.split('v=')[1])
          .filter(Boolean)
          .slice(0, 50)
          .join(',');

        const statsRes = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
          params: {
            part: 'statistics',
            id: ids,
            key: YOUTUBE_API_KEY
          },
          timeout: 10000
        });

        const statsMap = {};
        for (const item of (statsRes.data?.items || [])) {
          statsMap[item.id] = {
            views: parseInt(item.statistics.viewCount || '0'),
            likes: parseInt(item.statistics.likeCount || '0'),
            comments: parseInt(item.statistics.commentCount || '0')
          };
        }

        for (const video of videos) {
          const videoId = video.url.split('v=')[1];
          if (statsMap[videoId]) {
            Object.assign(video, statsMap[videoId]);
          }
        }
      } catch (error) {
        console.warn(`  ⚠️ YouTube stats: ${error.message}`);
      }
    }

    console.log(`  ✅ YouTube: ${videos.length} vídeos relevantes`);
    return videos;
  }

  // ─── TIKTOK (via web search) ─────────────────────────────────

  async scanTikTokTrends() {
    if (!BRAVE_API_KEY) {
      console.log('  ⏭️ TikTok: Brave API key no configurada');
      return [];
    }

    console.log('🎵 [Trend Scout] Escaneando tendencias TikTok...');

    const queries = [
      'trending on tiktok business ideas',
      'tiktok viral side hustle 2026',
      'tiktok small business trending',
      'what is going viral on tiktok entrepreneurs',
      'tendencias tiktok negocios'
    ];

    const results = [];

    for (const query of queries) {
      try {
        const res = await this.braveSearch(query, 5);
        results.push(...res.map(r => ({ ...r, source: 'tiktok_web', query })));
        await this.sleep(500);
      } catch (error) {
        console.warn(`  ⚠️ TikTok "${query}": ${error.message}`);
      }
    }

    console.log(`  ✅ TikTok (web): ${results.length} resultados`);
    return results;
  }

  // ─── GUMROAD (via web search) ─────────────────────────────────

  async scanGumroad() {
    if (!BRAVE_API_KEY) {
      console.log('  ⏭️ Gumroad: Brave API key no configurada');
      return [];
    }

    console.log('💰 [Trend Scout] Escaneando Gumroad...');

    const queries = [
      'gumroad best selling digital products 2026',
      'gumroad top creators revenue',
      'digital products that sell well gumroad',
      'gumroad templates tools making money'
    ];

    const results = [];

    for (const query of queries) {
      try {
        const res = await this.braveSearch(query, 5);
        results.push(...res.map(r => ({ ...r, source: 'gumroad_web', query })));
        await this.sleep(500);
      } catch (error) {
        console.warn(`  ⚠️ Gumroad "${query}": ${error.message}`);
      }
    }

    console.log(`  ✅ Gumroad (web): ${results.length} resultados`);
    return results;
  }

  // ─── PRODUCT HUNT (via web search) ───────────────────────────

  async scanProductHunt() {
    if (!BRAVE_API_KEY) {
      console.log('  ⏭️ Product Hunt: Brave API key no configurada');
      return [];
    }

    console.log('🚀 [Trend Scout] Escaneando Product Hunt...');

    const queries = [
      'product hunt top products this week',
      'product hunt trending saas tools',
      'product hunt new launches popular',
      'site:producthunt.com trending 2026'
    ];

    const results = [];

    for (const query of queries) {
      try {
        const res = await this.braveSearch(query, 5);
        results.push(...res.map(r => ({ ...r, source: 'producthunt_web', query })));
        await this.sleep(500);
      } catch (error) {
        console.warn(`  ⚠️ Product Hunt "${query}": ${error.message}`);
      }
    }

    console.log(`  ✅ Product Hunt (web): ${results.length} resultados`);
    return results;
  }

  // ─── TWITTER/X (via web search) ─────────────────────────────

  async scanTwitter() {
    if (!BRAVE_API_KEY) {
      console.log('  ⏭️ Twitter/X: Brave API key no configurada');
      return [];
    }

    console.log('🐦 [Trend Scout] Escaneando Twitter/X...');

    const queries = [
      'site:x.com "looking for a tool" OR "I need a" OR "wish there was"',
      'site:x.com "pain point" OR "frustrated with" startup business',
      'site:x.com "building in public" OR "just launched" saas indie',
      'site:x.com "side hustle" OR "passive income" ideas 2026',
      'site:x.com "anyone know a" OR "is there an app" OR "necesito una herramienta"',
      'twitter business ideas viral thread entrepreneur'
    ];

    const results = [];

    for (const query of queries) {
      try {
        const res = await this.braveSearch(query, 8);
        results.push(...res.map(r => ({ ...r, source: 'twitter_web', query })));
        await this.sleep(500);
      } catch (error) {
        console.warn(`  ⚠️ Twitter "${query}": ${error.message}`);
      }
    }

    console.log(`  ✅ Twitter/X (web): ${results.length} resultados`);
    return results;
  }

  // ─── BRAVE SEARCH HELPER ─────────────────────────────────────

  async braveSearch(query, count = 5) {
    const res = await axios.get('https://api.search.brave.com/res/v1/web/search', {
      params: { q: query, count },
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': BRAVE_API_KEY
      },
      timeout: 10000
    });

    return (res.data?.web?.results || []).map(r => ({
      title: r.title,
      description: (r.description || '').substring(0, 400),
      url: r.url
    }));
  }

  // ─── LLM ANALYSIS ───────────────────────────────────────────

  async analyzeSignals(signals) {
    console.log('🤖 [Trend Scout] Analizando señales con LLM...');

    // Preparar resumen compacto de cada fuente
    const redditSample = signals.reddit.slice(0, 20)
      .map(p => `[r/${p.subreddit} | ${p.score}↑] ${p.title}${p.selftext ? '\n  ' + p.selftext.substring(0, 150) : ''}`)
      .join('\n');

    const hnSample = signals.hackerNews.slice(0, 15)
      .map(h => `[${h.score}↑ ${h.comments}💬] ${h.title}`)
      .join('\n');

    const ytSample = signals.youtube
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 15)
      .map(v => `[${v.views ? (v.views/1000).toFixed(0) + 'K views' : '?'} | ${v.channelTitle}] ${v.title}`)
      .join('\n');

    const tiktokSample = signals.tiktok.slice(0, 10)
      .map(t => `${t.title}\n  ${t.description?.substring(0, 100)}`)
      .join('\n');

    const gumroadSample = signals.gumroad.slice(0, 10)
      .map(g => `${g.title}\n  ${g.description?.substring(0, 100)}`)
      .join('\n');

    const phSample = signals.productHunt.slice(0, 10)
      .map(p => `${p.title}\n  ${p.description?.substring(0, 100)}`)
      .join('\n');

    const twitterSample = signals.twitter.slice(0, 15)
      .map(t => `${t.title}\n  ${t.description?.substring(0, 150)}`)
      .join('\n');

    const prompt = `Eres el Trend Scout de Lánzalo, un crack detectando oportunidades de negocio donde otros ven ruido. Hablas en español, con gracia, sin rodeos y sin jerga corporativa. Eres como ese colega espabilado que te dice "tío, monta esto YA" cuando ve una oportunidad clara.

SEÑALES RECOPILADAS HOY:

═══ REDDIT (${signals.reddit.length} posts) ═══
${redditSample || '(sin datos)'}

═══ HACKER NEWS (${signals.hackerNews.length} posts) ═══
${hnSample || '(sin datos)'}

═══ YOUTUBE (${signals.youtube.length} vídeos trending) ═══
${ytSample || '(sin datos)'}

═══ TIKTOK TENDENCIAS (${signals.tiktok.length} señales) ═══
${tiktokSample || '(sin datos)'}

═══ GUMROAD / PRODUCTOS DIGITALES (${signals.gumroad.length} señales) ═══
${gumroadSample || '(sin datos)'}

═══ PRODUCT HUNT (${signals.productHunt.length} señales) ═══
${phSample || '(sin datos)'}

═══ TWITTER/X (${signals.twitter.length} conversaciones) ═══
${twitterSample || '(sin datos)'}

INSTRUCCIONES:
1. Cruza datos entre fuentes: si Reddit menciona un problema Y YouTube tiene vídeos sobre ello = señal fuerte
2. Detecta pain points recurrentes que la gente tiene AHORA
3. Identifica nichos con demanda real y poca oferta
4. Busca tendencias emergentes (no las que ya están saturadas)
5. Prioriza oportunidades que se pueden resolver con software/digital (SaaS, tool, template, servicio)

RESPONDE EN JSON (SOLO JSON, sin texto antes ni después):
{
  "opportunities": [
    {
      "title": "Nombre corto y molón EN ESPAÑOL (5-10 palabras). Ej: 'Autopilot de Atención al Cliente con IA', NO 'AI Customer Service Tool'",
      "problem": "El problema real, explicado como se lo contarías a un colega en un bar. 2-3 frases, sin bullshit corporativo.",
      "target_audience": "Quién tiene este problema — sé específico. 'Dueños de gimnasios pequeños' > 'emprendedores'",
      "evidence": "Qué señales lo confirman y de dónde vienen. Datos concretos, no bla bla.",
      "business_model": "Cómo se monetiza (suscripción, pago único, freemium, etc.)",
      "difficulty": "easy|medium|hard",
      "potential_revenue": "$X-Y/mes estimado (MRR)",
      "category": "saas|tool|template|marketplace|service|content",
      "sources": ["reddit", "youtube", "tiktok", "hackernews", "gumroad", "producthunt", "twitter"],
      "cross_validated": true/false
    }
  ]
}

REGLAS:
- MÍNIMO 8 oportunidades, MÁXIMO 20
- Solo las MEJORES y más VIABLES
- cross_validated = true si aparece en 2+ fuentes
- Si hay una oportunidad brutal pero solo sale en 1 fuente, inclúyela pero marca cross_validated = false
- Sé específico: "App para X" no vale, "Herramienta de automatización de presupuestos para foodtrucks" sí

IDIOMA OBLIGATORIO: TODO en ESPAÑOL. Títulos, problemas, audiencia, evidencia, modelo de negocio — TODO en castellano. Las fuentes originales están en inglés pero tú SIEMPRE traduces y redactas en español. Ejemplo: "AI Customer Service Tool" → "Asistente IA de Atención al Cliente".`;

    const response = await callLLM(prompt, {
      taskType: 'research',
      temperature: 0.5,
      maxTokens: 4000
    });

    try {
      // Extract JSON from response (handle markdown code blocks)
      let content = response.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) content = jsonMatch[0];

      const parsed = JSON.parse(content);
      return parsed.opportunities || [];
    } catch (error) {
      console.error('[Trend Scout] Error parseando oportunidades:', error.message);
      console.error('[Trend Scout] Raw response:', (response.content || '').substring(0, 500));
      return [];
    }
  }

  // ─── SCORING ─────────────────────────────────────────────────

  scoreOpportunities(opportunities) {
    for (const opp of opportunities) {
      let score = 30; // Base

      // Dificultad (easy = más puntos para un MVP)
      if (opp.difficulty === 'easy') score += 25;
      else if (opp.difficulty === 'medium') score += 15;
      else score += 5;

      // Cross-validation bonus (aparece en 2+ fuentes)
      if (opp.cross_validated) score += 20;

      // Revenue potencial
      const revenueMatch = (opp.potential_revenue || '').match(/\d+/);
      if (revenueMatch) {
        const revenue = parseInt(revenueMatch[0]);
        score += Math.min(Math.round(revenue / 100), 15);
      }

      // Categoría (SaaS y tools escalan mejor)
      const catBonus = { saas: 10, tool: 8, template: 6, marketplace: 5, service: 3, content: 2 };
      score += catBonus[opp.category] || 0;

      // Múltiples fuentes
      if (opp.sources && opp.sources.length >= 3) score += 10;
      else if (opp.sources && opp.sources.length >= 2) score += 5;

      opp.score = Math.min(Math.round(score), 100);
    }

    return opportunities.sort((a, b) => b.score - a.score);
  }

  // ─── SAVE IDEAS TO DB ────────────────────────────────────────

  async saveIdeas(ideas) {
    let savedCount = 0;

    for (const idea of ideas) {
      try {
        // Check duplicado por título similar
        const existing = await pool.query(
          `SELECT id FROM discovered_ideas WHERE LOWER(title) = LOWER($1) LIMIT 1`,
          [idea.title]
        );

        if (existing.rows.length > 0) {
          continue;
        }

        await pool.query(
          `INSERT INTO discovered_ideas (
            id, title, problem, target_audience, evidence,
            source, difficulty, potential_revenue, category, score,
            discovered_at, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), true)`,
          [
            crypto.randomUUID(),
            idea.title,
            idea.problem,
            idea.target_audience,
            idea.evidence,
            (idea.sources || []).join(', '),
            idea.difficulty,
            idea.potential_revenue,
            idea.category,
            idea.score
          ]
        );

        savedCount++;
      } catch (error) {
        // Table might not exist yet — silently skip
        if (error.code === '42P01') {
          console.warn('[Trend Scout] Tabla discovered_ideas no existe. Saltando guardado.');
          return 0;
        }
        console.warn(`[Trend Scout] Error guardando idea: ${error.message}`);
      }
    }

    console.log(`💾 [Trend Scout] ${savedCount}/${ideas.length} ideas guardadas`);
    return savedCount;
  }

  // ─── GENERATE REPORT (returned as task output) ───────────────

  generateReport(ideas, signals) {
    const topIdeas = ideas.slice(0, 15);
    const crossValidated = ideas.filter(i => i.cross_validated);

    return `# 🔍 Trend Scout Report
Generado: ${new Date().toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' })}

## Resumen
- **Señales analizadas**: ${Object.values(signals).reduce((sum, arr) => sum + arr.length, 0)}
  - Reddit: ${signals.reddit.length} | HN: ${signals.hackerNews.length} | YouTube: ${signals.youtube.length}
  - TikTok: ${signals.tiktok.length} | Gumroad: ${signals.gumroad.length} | Product Hunt: ${signals.productHunt.length}
  - Twitter/X: ${signals.twitter.length}
- **Oportunidades detectadas**: ${ideas.length}
- **Cross-validated** (2+ fuentes): ${crossValidated.length}
- **Score promedio**: ${ideas.length > 0 ? Math.round(ideas.reduce((sum, i) => sum + i.score, 0) / ideas.length) : 0}/100

## Top ${topIdeas.length} Oportunidades

${topIdeas.map((idea, i) => `
### ${i + 1}. ${idea.title}
**Score**: ${idea.score}/100 ${idea.cross_validated ? '✅ Cross-validated' : ''}
**Dificultad**: ${idea.difficulty} | **Revenue**: ${idea.potential_revenue} | **Tipo**: ${idea.category}
**Fuentes**: ${(idea.sources || []).join(', ')}

**Problema**: ${idea.problem}

**Audiencia**: ${idea.target_audience}

**Evidencia**: ${idea.evidence}

**Modelo de negocio**: ${idea.business_model || 'No especificado'}

---`).join('\n')}

## Patrones detectados
${this.detectPatterns(ideas)}

---
*Generado por Trend Scout v2 — Lánzalo*`;
  }

  detectPatterns(ideas) {
    // Count categories
    const catCounts = {};
    ideas.forEach(i => { catCounts[i.category] = (catCounts[i.category] || 0) + 1; });

    // Count difficulties
    const diffCounts = {};
    ideas.forEach(i => { diffCounts[i.difficulty] = (diffCounts[i.difficulty] || 0) + 1; });

    let patterns = '';
    patterns += `- **Categorías más frecuentes**: ${Object.entries(catCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} (${v})`).join(', ')}\n`;
    patterns += `- **Dificultad**: ${Object.entries(diffCounts).map(([k, v]) => `${k} (${v})`).join(', ')}\n`;

    const crossCount = ideas.filter(i => i.cross_validated).length;
    if (crossCount > 0) {
      patterns += `- **${crossCount} ideas aparecen en múltiples fuentes** — mayor probabilidad de demanda real\n`;
    }

    return patterns;
  }

  // ─── UTILITIES ───────────────────────────────────────────────

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString();
  }
}

module.exports = TrendScoutExecutor;
