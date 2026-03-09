/**
 * Gamma API Service — Generate presentations, social posts, documents & webpages
 * API v1.0 GA: https://developers.gamma.app
 * 
 * Requires GAMMA_API_KEY env var (sk-gamma-xxxxx format)
 */

const BASE_URL = 'https://public-api.gamma.app/v1.0';

class GammaService {
  constructor() {
    this.apiKey = process.env.GAMMA_API_KEY || '';
    this.enabled = !!this.apiKey;
  }

  get headers() {
    return {
      'X-API-KEY': this.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  // ═══════════════════════════════════════
  // CORE API CALLS
  // ═══════════════════════════════════════

  /**
   * Generate a new Gamma (presentation, document, social post, or webpage)
   * @param {Object} opts
   * @param {string} opts.inputText - Content to generate (required)
   * @param {string} opts.textMode - 'generate' | 'condense' | 'preserve' (required)
   * @param {string} opts.format - 'presentation' | 'document' | 'social' | 'webpage'
   * @param {string} opts.themeId - Theme ID from workspace
   * @param {number} opts.numCards - Number of cards (1-60)
   * @param {string} opts.additionalInstructions - Extra instructions (max 2000 chars)
   * @param {Object} opts.textOptions - {amount, tone, audience, language}
   * @param {Object} opts.imageOptions - {source, model, style}
   * @param {Object} opts.cardOptions - {dimensions}
   * @param {string} opts.exportAs - 'pdf' | 'pptx'
   * @param {Object} opts.sharingOptions - {workspaceAccess, externalAccess}
   * @returns {Promise<{generationId: string}>}
   */
  async generate(opts) {
    if (!this.enabled) throw new Error('Gamma API no configurada. Falta GAMMA_API_KEY.');

    const body = {
      inputText: opts.inputText,
      textMode: opts.textMode || 'generate',
    };

    // Optional parameters
    if (opts.format) body.format = opts.format;
    if (opts.themeId) body.themeId = opts.themeId;
    if (opts.numCards) body.numCards = opts.numCards;
    if (opts.additionalInstructions) body.additionalInstructions = opts.additionalInstructions;
    if (opts.exportAs) body.exportAs = opts.exportAs;
    if (opts.folderIds) body.folderIds = opts.folderIds;

    if (opts.textOptions) {
      body.textOptions = {};
      if (opts.textOptions.amount) body.textOptions.amount = opts.textOptions.amount;
      if (opts.textOptions.tone) body.textOptions.tone = opts.textOptions.tone;
      if (opts.textOptions.audience) body.textOptions.audience = opts.textOptions.audience;
      if (opts.textOptions.language) body.textOptions.language = opts.textOptions.language || 'es';
    }

    if (opts.imageOptions) {
      body.imageOptions = {};
      if (opts.imageOptions.source) body.imageOptions.source = opts.imageOptions.source;
      if (opts.imageOptions.style) body.imageOptions.style = opts.imageOptions.style;
    }

    if (opts.cardOptions) {
      body.cardOptions = {};
      if (opts.cardOptions.dimensions) body.cardOptions.dimensions = opts.cardOptions.dimensions;
    }

    if (opts.sharingOptions) {
      body.sharingOptions = opts.sharingOptions;
    }

    const res = await fetch(`${BASE_URL}/generations`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Gamma API error ${res.status}: ${err.message || res.statusText}`);
    }

    return res.json(); // { generationId: "xxx" }
  }

  /**
   * Check generation status
   * @param {string} generationId
   * @returns {Promise<{status, generationId, gammaUrl?, credits?}>}
   */
  async getGenerationStatus(generationId) {
    if (!this.enabled) throw new Error('Gamma API no configurada');

    const res = await fetch(`${BASE_URL}/generations/${generationId}`, {
      headers: this.headers,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Gamma API error ${res.status}: ${err.message || res.statusText}`);
    }

    return res.json();
    // { status: "pending"|"completed"|"failed", generationId, gammaUrl?, credits?: {deducted, remaining} }
  }

  /**
   * Poll until generation completes (max 2 minutes)
   */
  async waitForGeneration(generationId, maxWaitMs = 120000) {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      const status = await this.getGenerationStatus(generationId);
      if (status.status === 'completed') return status;
      if (status.status === 'failed') throw new Error(`Gamma generation failed: ${generationId}`);
      await new Promise(r => setTimeout(r, 3000)); // Poll every 3s
    }
    throw new Error(`Gamma generation timeout: ${generationId}`);
  }

  /**
   * List available themes
   */
  async getThemes() {
    if (!this.enabled) return [];

    const res = await fetch(`${BASE_URL}/themes`, {
      headers: this.headers,
    });

    if (!res.ok) return [];
    return res.json();
  }

  // ═══════════════════════════════════════
  // HIGH-LEVEL GENERATORS
  // ═══════════════════════════════════════

  /**
   * Generate a pitch deck / presentation
   */
  async generatePresentation(inputText, opts = {}) {
    return this.generate({
      inputText,
      textMode: opts.textMode || 'generate',
      format: 'presentation',
      numCards: opts.numCards || 10,
      additionalInstructions: opts.additionalInstructions,
      textOptions: {
        amount: opts.textAmount || 'medium',
        tone: opts.tone || 'profesional, convincente',
        audience: opts.audience || 'inversores y clientes potenciales',
        language: opts.language || 'es',
      },
      imageOptions: {
        source: opts.imageSource || 'aiGenerated',
        style: opts.imageStyle,
      },
      cardOptions: {
        dimensions: opts.dimensions || '16x9',
      },
      exportAs: opts.exportAs, // 'pdf' or 'pptx'
      sharingOptions: opts.sharingOptions || {
        externalAccess: 'view',
      },
    });
  }

  /**
   * Generate a social media carousel (LinkedIn/Instagram)
   */
  async generateCarousel(inputText, opts = {}) {
    return this.generate({
      inputText,
      textMode: opts.textMode || 'generate',
      format: 'social',
      numCards: opts.numCards || 8,
      additionalInstructions: opts.additionalInstructions || 'Diseña como un carrusel de LinkedIn/Instagram profesional. Cada slide debe tener 1 idea clave.',
      textOptions: {
        amount: 'brief',
        tone: opts.tone || 'cercano, educativo',
        audience: opts.audience,
        language: opts.language || 'es',
      },
      imageOptions: {
        source: opts.imageSource || 'aiGenerated',
      },
      cardOptions: {
        dimensions: opts.dimensions || '4x5', // Instagram/LinkedIn optimal
      },
      sharingOptions: {
        externalAccess: 'view',
      },
    });
  }

  /**
   * Generate a document (proposal, blog post, report)
   */
  async generateDocument(inputText, opts = {}) {
    return this.generate({
      inputText,
      textMode: opts.textMode || 'generate',
      format: 'document',
      numCards: opts.numCards || 6,
      additionalInstructions: opts.additionalInstructions,
      textOptions: {
        amount: opts.textAmount || 'detailed',
        tone: opts.tone || 'profesional',
        audience: opts.audience,
        language: opts.language || 'es',
      },
      imageOptions: {
        source: opts.imageSource || 'aiGenerated',
      },
      cardOptions: {
        dimensions: 'fluid',
      },
      sharingOptions: {
        externalAccess: 'view',
      },
    });
  }

  /**
   * Generate a mini landing page / webpage
   */
  async generateWebpage(inputText, opts = {}) {
    return this.generate({
      inputText,
      textMode: opts.textMode || 'generate',
      format: 'webpage',
      numCards: opts.numCards || 5,
      additionalInstructions: opts.additionalInstructions || 'Diseña como una landing page moderna. Hero claro, beneficios, CTA.',
      textOptions: {
        amount: 'medium',
        tone: opts.tone || 'directo, orientado a conversión',
        audience: opts.audience,
        language: opts.language || 'es',
      },
      imageOptions: {
        source: opts.imageSource || 'aiGenerated',
      },
      sharingOptions: {
        externalAccess: 'view',
      },
    });
  }
}

module.exports = new GammaService();
