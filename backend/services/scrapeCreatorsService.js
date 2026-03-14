/**
 * ScrapeCreators API Service
 *
 * Provee acceso a Facebook Ad Library para validar mercado con datos reales.
 * Docs: https://docs.scrapecreators.com/
 *
 * Endpoints usados:
 *   GET /v1/facebook/adLibrary/search/companies  — anunciantes por keyword
 *   GET /v1/facebook/adLibrary/search/ads        — anuncios por keyword
 *
 * Coste: 1 crédito por llamada (~1-3 créditos por análisis)
 */

const API_BASE = 'https://api.scrapecreators.com/v1';

class ScrapeCreatorsService {
  constructor() {
    this.apiKey = process.env.SCRAPECREATORS_API_KEY;
    if (!this.apiKey) {
      console.warn('[ScrapeCreators] API key no configurada — servicio deshabilitado');
    }
  }

  get enabled() {
    return !!this.apiKey;
  }

  async request(endpoint, params = {}) {
    if (!this.enabled) throw new Error('ScrapeCreators no configurado');

    const url = new URL(`${API_BASE}${endpoint}`);
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null) url.searchParams.set(key, String(val));
    }

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'x-api-key': this.apiKey },
    });

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }

    if (!res.ok) {
      const msg = typeof data === 'object' ? (data.message || data.error || JSON.stringify(data)) : text;
      throw new Error(`ScrapeCreators API ${res.status}: ${msg}`);
    }

    return data;
  }

  /**
   * Busca anunciantes activos en Facebook Ad Library para un nicho/keyword.
   * Ideal para validar si hay demanda comercial en el mercado hispanohablante.
   *
   * @param {string} keyword  - Nicho o keyword a buscar (ej: "curso online", "restaurantes")
   * @param {string} country  - Código país ISO (ES, MX, CO, AR). Default: ES
   * @returns {{ advertiserCount: number, signal: string, signalLabel: string, topAdvertisers: Array }}
   */
  async searchAdvertisers(keyword, country = 'ES') {
    const data = await this.request('/facebook/adLibrary/search/companies', {
      query: keyword,
      country,
    });

    const companies = data.searchResults || [];
    const advertiserCount = companies.length;

    return {
      advertiserCount,
      signal: this._getSignal(advertiserCount),
      signalLabel: this._getSignalLabel(advertiserCount),
      topAdvertisers: companies.slice(0, 5).map(c => ({
        name: c.name,
        category: c.category,
        likes: c.likes,
        country: c.country,
      })),
    };
  }

  /**
   * Obtiene señales de mercado completas: anunciantes + volumen de anuncios.
   * Usa 2 créditos. Para análisis completo de viabilidad.
   *
   * @param {string} keyword
   * @param {string} country
   * @returns {{ advertiserCount, adCount, signal, signalLabel, topAdvertisers }}
   */
  async getMarketSignals(keyword, country = 'ES') {
    const [advertisersData, adsData] = await Promise.all([
      this.request('/facebook/adLibrary/search/companies', { query: keyword, country }),
      this.request('/facebook/adLibrary/search/ads', { query: keyword, country }),
    ]);

    const companies = advertisersData.searchResults || [];
    const advertiserCount = companies.length;
    const adCount = adsData.searchResultsCount || adsData.searchResults?.length || 0;

    return {
      keyword,
      country,
      advertiserCount,
      adCount,
      signal: this._getSignal(advertiserCount),
      signalLabel: this._getSignalLabel(advertiserCount),
      topAdvertisers: companies.slice(0, 5).map(c => ({
        name: c.name,
        category: c.category,
        likes: c.likes,
      })),
    };
  }

  /**
   * Determina la señal de mercado según número de anunciantes.
   * @param {number} count
   * @returns {'none'|'emerging'|'validated'|'competitive'}
   */
  _getSignal(count) {
    if (count === 0) return 'none';
    if (count <= 5) return 'emerging';
    if (count <= 20) return 'validated';
    return 'competitive';
  }

  /**
   * Etiqueta legible de la señal de mercado.
   * @param {number} count
   * @returns {string}
   */
  _getSignalLabel(count) {
    if (count === 0) return 'Sin señal comercial detectada';
    if (count <= 5) return 'Nicho emergente con poca competencia';
    if (count <= 20) return 'Mercado validado con demanda comercial';
    return 'Mercado competitivo con alta demanda';
  }
}

// Singleton
module.exports = new ScrapeCreatorsService();
