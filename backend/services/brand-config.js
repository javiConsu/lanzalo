/**
 * Brand Config Service — Centralised brand voice & style guide
 * 
 * Every content-generating agent reads from here to stay on-brand.
 * The brand config lives in companies.brand_config (JSONB).
 * 
 * Usage:
 *   const brand = require('./services/brand-config');
 *   const config = await brand.getConfig(companyId);
 *   const prompt = brand.buildPromptContext(config);         // → string to inject in LLM prompts
 *   const gammaOpts = brand.getGammaOptions(config);         // → Gamma-specific options
 *   const platformRules = brand.getPlatformRules(config, 'linkedin');
 */

const { pool } = require('../db');

// ─── Default brand config (used when company has none) ──────
const DEFAULT_CONFIG = {
  voice: {
    tone: 'profesional pero cercano',
    personality: ['directo', 'honesto', 'accesible'],
    formality: 5,
    humor: 3,
    confidence: 6,
    warmth: 6,
    language: 'es',
    use_emojis: true,
    emoji_level: 'moderado',
  },
  vocabulary: {
    preferred: [],
    avoid: ['disruptivo', 'sinergia', 'paradigma', 'holístico', 'apalancamiento'],
    jargon_level: 'light',
    signature_phrases: [],
  },
  visual: {
    primary_color: '#10b981',
    secondary_color: '#3b82f6',
    accent_color: '#ec4899',
    font_preference: 'moderna sans-serif',
    style: 'minimalista y limpio',
    image_style: 'profesional',
  },
  platform_rules: {
    linkedin: { max_chars: 1300, tone_shift: 'más profesional y con datos', hashtags: 3 },
    twitter: { max_chars: 280, tone_shift: 'más directo y punchy', hashtags: 2 },
    instagram: { tone_shift: 'más visual y cercano', hashtags: 5 },
    email: { tone_shift: 'más personal y cálido' },
    presentations: { tone_shift: 'formal y convincente, con datos', style: 'limpio' },
    ads: { tone_shift: 'orientado a beneficios, urgencia sutil' },
  },
  dos: [],
  donts: [],
  examples: { on_brand: [], off_brand: [] },
};

// In-memory cache (per-company, 5-min TTL)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

class BrandConfigService {

  /**
   * Get brand config for a company (with defaults merged)
   */
  async getConfig(companyId) {
    // Check cache
    const cached = cache.get(companyId);
    if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.config;

    try {
      const result = await pool.query(
        'SELECT brand_config, name, description, industry FROM companies WHERE id = $1',
        [companyId]
      );
      if (result.rows.length === 0) return { ...DEFAULT_CONFIG };

      const row = result.rows[0];
      const stored = row.brand_config || {};

      // Deep-merge stored over defaults
      const config = {
        brand_name: stored.brand_name || row.name || '',
        tagline: stored.tagline || '',
        description: row.description || '',
        industry: row.industry || '',
        voice: { ...DEFAULT_CONFIG.voice, ...(stored.voice || {}) },
        vocabulary: { 
          ...DEFAULT_CONFIG.vocabulary, 
          ...(stored.vocabulary || {}),
          // Merge arrays instead of replacing
          preferred: [...(DEFAULT_CONFIG.vocabulary.preferred || []), ...(stored.vocabulary?.preferred || [])],
          avoid: [...new Set([...(DEFAULT_CONFIG.vocabulary.avoid || []), ...(stored.vocabulary?.avoid || [])])],
        },
        visual: { ...DEFAULT_CONFIG.visual, ...(stored.visual || {}) },
        audience: stored.audience || {},
        platform_rules: {
          ...DEFAULT_CONFIG.platform_rules,
          ...(stored.platform_rules || {}),
        },
        dos: [...(DEFAULT_CONFIG.dos || []), ...(stored.dos || [])],
        donts: [...(DEFAULT_CONFIG.donts || []), ...(stored.donts || [])],
        examples: {
          on_brand: [...(DEFAULT_CONFIG.examples.on_brand || []), ...(stored.examples?.on_brand || [])],
          off_brand: [...(DEFAULT_CONFIG.examples.off_brand || []), ...(stored.examples?.off_brand || [])],
        },
      };

      cache.set(companyId, { config, ts: Date.now() });
      return config;
    } catch (error) {
      console.error('[BrandConfig] Error loading config:', error);
      return { ...DEFAULT_CONFIG };
    }
  }

  /**
   * Save/update brand config
   */
  async saveConfig(companyId, brandConfig) {
    brandConfig.updated_at = new Date().toISOString();
    await pool.query(
      'UPDATE companies SET brand_config = $1 WHERE id = $2',
      [JSON.stringify(brandConfig), companyId]
    );
    cache.delete(companyId); // Invalidate cache
    return brandConfig;
  }

  /**
   * Generate brand config from Co-Founder conversation
   * (Called when user describes their brand to the CEO agent)
   */
  async generateFromDescription(companyId, userInput) {
    const { callLLM } = require('../llm');
    const current = await this.getConfig(companyId);

    const prompt = `Eres un experto en branding. A partir de la descripción del usuario, genera una configuración de marca.

EMPRESA: "${current.brand_name}"
Descripción actual: ${current.description}
Industria: ${current.industry}

LO QUE DICE EL USUARIO SOBRE SU MARCA:
${userInput}

CONFIG ACTUAL (mejórala, no la borres):
${JSON.stringify(current.voice || {}, null, 2)}

Genera un JSON con la configuración de marca COMPLETA:
{
  "brand_name": "nombre de la marca",
  "tagline": "eslogan corto",
  "voice": {
    "tone": "descripción del tono en 5-10 palabras",
    "personality": ["rasgo1", "rasgo2", "rasgo3"],
    "formality": 5,
    "humor": 3,
    "confidence": 7,
    "warmth": 6,
    "language": "es"
  },
  "vocabulary": {
    "preferred": ["palabra1", "palabra2"],
    "avoid": ["palabra1", "palabra2"],
    "jargon_level": "none|light|moderate|heavy"
  },
  "visual": {
    "primary_color": "#hex",
    "secondary_color": "#hex",
    "accent_color": "#hex",
    "style": "descripción del estilo visual",
    "image_style": "descripción del estilo de imágenes"
  },
  "audience": {
    "description": "descripción del público objetivo",
    "sophistication": "beginner|intermediate|advanced",
    "pain_points": ["dolor1", "dolor2"],
    "goals": ["meta1", "meta2"]
  },
  "dos": ["hacer esto", "hacer aquello"],
  "donts": ["no hacer esto"],
  "examples": {
    "on_brand": ["frase ejemplo que sí suena a la marca"],
    "off_brand": ["frase ejemplo que NO suena a la marca"]
  }
}`;

    try {
      const response = await callLLM(prompt, { maxTokens: 1500 });
      const content = typeof response === 'string' ? response : response.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const newConfig = JSON.parse(jsonMatch[0]);
      newConfig.updated_by = 'cofounder';
      await this.saveConfig(companyId, newConfig);
      return newConfig;
    } catch (error) {
      console.error('[BrandConfig] Error generating config:', error);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════
  // PROMPT BUILDERS (for injecting into agent prompts)
  // ═══════════════════════════════════════════════════

  /**
   * Build a brand context block to inject into any LLM prompt
   * This is the KEY function that keeps all agents aligned
   */
  buildPromptContext(config) {
    if (!config || !config.voice) return '';

    const lines = [];
    lines.push('═══ GUÍA DE MARCA (OBLIGATORIO seguir estas instrucciones) ═══');
    
    if (config.brand_name) lines.push(`MARCA: "${config.brand_name}"`);
    if (config.tagline) lines.push(`ESLOGAN: "${config.tagline}"`);
    if (config.description) lines.push(`DESCRIPCIÓN: ${config.description}`);
    
    // Voice
    const v = config.voice;
    lines.push(`\nTONO DE VOZ: ${v.tone}`);
    if (v.personality?.length) lines.push(`PERSONALIDAD: ${v.personality.join(', ')}`);
    lines.push(`FORMALIDAD: ${v.formality}/10 | HUMOR: ${v.humor}/10 | CONFIANZA: ${v.confidence}/10 | CALIDEZ: ${v.warmth}/10`);
    if (v.language) lines.push(`IDIOMA: ${v.language}`);
    if (v.use_emojis !== undefined) lines.push(`EMOJIS: ${v.use_emojis ? `sí (${v.emoji_level || 'moderado'})` : 'no'}`);

    // Vocabulary
    const vocab = config.vocabulary;
    if (vocab?.preferred?.length) lines.push(`\nPALABRAS A USAR: ${vocab.preferred.join(', ')}`);
    if (vocab?.avoid?.length) lines.push(`PALABRAS A EVITAR: ${vocab.avoid.join(', ')}`);
    if (vocab?.jargon_level) lines.push(`NIVEL DE JERGA: ${vocab.jargon_level}`);
    if (vocab?.signature_phrases?.length) lines.push(`FRASES FIRMA: ${vocab.signature_phrases.join(' | ')}`);

    // Audience
    if (config.audience?.description) {
      lines.push(`\nAUDIENCIA: ${config.audience.description}`);
      if (config.audience.pain_points?.length) lines.push(`PUNTOS DE DOLOR: ${config.audience.pain_points.join(', ')}`);
      if (config.audience.goals?.length) lines.push(`METAS: ${config.audience.goals.join(', ')}`);
    }

    // Do's and don'ts
    if (config.dos?.length) lines.push(`\nHAZ: ${config.dos.join(' | ')}`);
    if (config.donts?.length) lines.push(`NO HAGAS: ${config.donts.join(' | ')}`);

    // Examples
    if (config.examples?.on_brand?.length) {
      lines.push(`\nEJEMPLOS ON-BRAND: "${config.examples.on_brand.join('" | "')}"`)
    }
    if (config.examples?.off_brand?.length) {
      lines.push(`EJEMPLOS OFF-BRAND (EVITAR): "${config.examples.off_brand.join('" | "')}"`)
    }

    lines.push('═══ FIN GUÍA DE MARCA ═══');
    return lines.join('\n');
  }

  /**
   * Get platform-specific rules
   */
  getPlatformRules(config, platform) {
    const rules = config?.platform_rules?.[platform] || {};
    return {
      ...rules,
      tone: `${config?.voice?.tone || 'profesional'} — ${rules.tone_shift || ''}`.trim(),
    };
  }

  /**
   * Get Gamma-specific generation options derived from brand config
   */
  getGammaOptions(config) {
    const v = config?.voice || {};
    const vis = config?.visual || {};

    return {
      tone: v.tone || 'profesional',
      audience: config?.audience?.description || '',
      language: v.language || 'es',
      // Gamma textOptions
      textOptions: {
        tone: v.tone || 'profesional',
        audience: config?.audience?.description || '',
        language: v.language || 'es',
      },
      // Gamma additionalInstructions for visual consistency
      additionalInstructions: [
        vis.style ? `Estilo visual: ${vis.style}` : '',
        vis.primary_color ? `Color principal de marca: ${vis.primary_color}` : '',
        vis.image_style ? `Estilo de imágenes: ${vis.image_style}` : '',
        config?.brand_name ? `La marca se llama "${config.brand_name}"` : '',
        config?.tagline ? `Eslogan: "${config.tagline}"` : '',
      ].filter(Boolean).join('. '),
    };
  }
}

module.exports = new BrandConfigService();
