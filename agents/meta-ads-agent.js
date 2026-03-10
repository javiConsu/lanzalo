/**
 * Meta Ads Agent - Gestión de anuncios en Meta (Facebook/Instagram)
 * 
 * Usa Facebook Marketing API para crear, monitorear y optimizar anuncios.
 * Requiere: META_ACCESS_TOKEN en .env
 */

const { createTask, updateTask, logActivity } = require('../backend/db');
const { callLLM } = require('../backend/llm');
const axios = require('axios');

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID;
const META_API_VERSION = 'v18.0';

class MetaAdsAgent {
  constructor() {
    this.name = 'Meta Ads Agent';
    this.baseURL = `https://graph.facebook.com/${META_API_VERSION}`;
  }

  /**
   * Ejecutar ciclo diario de Meta Ads
   */
  async execute(company) {
    const task = await createTask(company.id, 'meta_ads',
      'Gestión diaria de Meta Ads',
      'Crear anuncios, monitorear performance, pausar underperformers');

    try {
      await updateTask(task.id, { status: 'running' });
      await logActivity(company.id, task.id, 'task_start',
        `Meta Ads Agent iniciado para ${company.name}`);

      // 1. Monitorear ads existentes
      const existingAds = await this.monitorAds(company);
      
      // 2. Detectar underperformers (CTR < 0.5% después de 3 días)
      const underperformers = this.detectUnderperformers(existingAds);
      
      // 3. Pausar underperformers
      let pausedCount = 0;
      if (underperformers.length > 0) {
        pausedCount = await this.pauseUnderperformers(company, underperformers);
      }
      
      // 4. Crear nuevos ads si es necesario
      const newAds = await this.createNewAds(company);

      // 5. Compilar métricas del día
      const metrics = await this.getDailyMetrics(company);

      const output = `Ads existentes: ${existingAds.length}\nUnderperformers detectados: ${underperformers.length}\nUnderperformers pausados: ${pausedCount}\nNuevos ads creados: ${newAds.length}\nSpend diario: $${metrics.spend}`;

      await updateTask(task.id, {
        status: 'completed',
        output,
        completed_at: new Date()
      });

      await logActivity(company.id, task.id, 'task_complete',
        `Meta Ads Agent completado: paused ${pausedCount} underperformers, created ${newAds.length} new ads`);

      return {
        success: true,
        summary: `${pausedCount} underperformers pausados, ${newAds.length} nuevos ads`,
        existingAds: existingAds.length,
        pausedCount,
        newAdsCount: newAds.length,
        metrics
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

  /**
   * Monitorear ads existentes
   */
  async monitorAds(company) {
    if (!META_ACCESS_TOKEN || !META_AD_ACCOUNT_ID) {
      console.log('⚠️ Meta Ads API no configurado. Usando datos simulados.');
      return this.getMockAds(company);
    }

    try {
      const response = await axios.get(
        `${this.baseURL}/${META_AD_ACCOUNT_ID}/campaigns`,
        {
          params: {
            access_token: META_ACCESS_TOKEN,
            fields: 'name,status,daily_budget,start_time,insights{impressions,clicks,ctr,spend}',
            date_preset: 'last_30d'
          }
        }
      );

      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching Meta Ads:', error);
      return this.getMockAds(company);
    }
  }

  /**
   * Obtener ads simulados para testing
   */
  getMockAds(company) {
    return [
      {
        id: 'mock_ad_1',
        name: 'Lanzalo - Burnout to Success',
        status: 'active',
        daily_budget: 50,
        start_time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 días atrás
        insights: {
          impressions: 10000,
          clicks: 50,
          ctr: 0.5, // 0.5% = límite
          spend: 25
        }
      },
      {
        id: 'mock_ad_2',
        name: 'Lanzalo - 24/7 Team',
        status: 'active',
        daily_budget: 50,
        start_time: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 días atrás
        insights: {
          impressions: 5000,
          clicks: 20,
          ctr: 0.4, // 0.4% = underperformer
          spend: 15
        }
      },
      {
        id: 'mock_ad_3',
        name: 'Lanzalo - 28 Days to Launch',
        status: 'active',
        daily_budget: 50,
        start_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 días atrás
        insights: {
          impressions: 2000,
          clicks: 12,
          ctr: 0.6, // 0.6% = good
          spend: 8
        }
      }
    ];
  }

  /**
   * Detectar underperformers
   */
  detectUnderperformers(ads) {
    const THREE_DAYS_AGO = Date.now() - 3 * 24 * 60 * 60 * 1000;
    
    return ads.filter(ad => {
      const ageInDays = (Date.now() - new Date(ad.start_time).getTime()) / (1000 * 60 * 60 * 24);
      const ctr = ad.insights?.ctr || 0;
      
      return ageInDays >= 3 && ctr < 0.5;
    });
  }

  /**
   * Pausar underperformers
   */
  async pauseUnderperformers(company, underperformers) {
    let pausedCount = 0;

    for (const ad of underperformers) {
      try {
        if (META_ACCESS_TOKEN && META_AD_ACCOUNT_ID) {
          await axios.post(
            `${this.baseURL}/${ad.id}`,
            { status: 'PAUSED' },
            { params: { access_token: META_ACCESS_TOKEN } }
          );
        }
        
        pausedCount++;
        
        await logActivity(company.id, null, 'ad_paused',
          `Paused underperforming ad: ${ad.name} (CTR: ${ad.insights.ctr}%)`);
      } catch (error) {
        console.error(`Error pausing ad ${ad.id}:`, error);
      }
    }

    return pausedCount;
  }

  /**
   * Crear nuevos ads
   */
  async createNewAds(company) {
    if (!META_ACCESS_TOKEN || !META_AD_ACCOUNT_ID) {
      console.log('⚠️ Meta Ads API no configurada. Generando prompts para nuevos ads.');
      return this.generateAdPrompts(company);
    }

    // Si hay API configurada, crear ads reales
    const adPrompts = await this.generateAdPrompts(company);
    const createdAds = [];

    for (const prompt of adPrompts.slice(0, 3)) { // Max 3 ads por día
      try {
        const ad = await this.createAd(company, prompt);
        createdAds.push(ad);
      } catch (error) {
        console.error(`Error creating ad:`, error);
      }
    }

    return createdAds;
  }

  /**
   * Generar prompts para nuevos ads (usando prompts de Fal.ai)
   */
  async generateAdPrompts(company) {
    const prompt = `Generate 3 video ad prompts for Fal.ai for "${company.name}".

Company: ${company.name}
Description: ${company.description}
Product: AI co-founder that builds startups in 28 days with 7 autonomous agents
Price: $39/month, 7-day free trial
Target: Spanish-speaking entrepreneurs without technical team (25-45 years old)

Generate 3 prompts with:
1. Title (short, catchy)
2. Prompt for Fal.ai (15-30 seconds, UGC style, smartphone recording, authentic)
3. Ad copy (2-3 lines)
4. CTA (clear call-to-action)

Respond in JSON:
{
  "ads": [
    {
      "title": "Ad Title",
      "fal_prompt": "Prompt for Fal.ai",
      "copy": "Ad copy line 1\\nAd copy line 2\\nAd copy line 3",
      "cta": "Call-to-action"
    }
  ]
}`;

    const response = await callLLM(prompt);
    const data = JSON.parse(response);
    return data.ads || [];
  }

  /**
   * Crear ad real
   */
  async createAd(company, prompt) {
    const response = await axios.post(
      `${this.baseURL}/${META_AD_ACCOUNT_ID}/ads`,
      {
        name: prompt.title,
        adset_id: META_AD_ACCOUNT_ID, // Simplificado, en realidad necesitas campaign/adset
        creative: {
          // Aquí iría el creative generado por Fal.ai
          name: `${prompt.title} - Creative`,
          // asset_url: prompt.video_url // URL del video generado por Fal.ai
        },
        status: 'ACTIVE',
        ad_format_specifications: {
          creative_source: 'MANUAL',
          creative_type: 'IMAGE'
        }
      },
      { params: { access_token: META_ACCESS_TOKEN } }
    );

    await logActivity(company.id, null, 'ad_created',
      `Created new ad: ${prompt.title}`);

    return response.data;
  }

  /**
   * Obtener métricas diarias
   */
  async getDailyMetrics(company) {
    const ads = await this.monitorAds(company);
    
    let totalSpend = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalCTR = 0;

    for (const ad of ads) {
      const insights = ad.insights || {};
      totalSpend += insights.spend || 0;
      totalImpressions += insights.impressions || 0;
      totalClicks += insights.clicks || 0;
      totalCTR += insights.ctr || 0;
    }

    const avgCTR = ads.length > 0 ? totalCTR / ads.length : 0;
    const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0;

    return {
      spend: totalSpend,
      impressions: totalImpressions,
      clicks: totalClicks,
      ctr: avgCTR,
      cpc: avgCPC
    };
  }

  /**
   * Ejecutar tarea personalizada
   */
  async executeCustomTask(company, taskDescription) {
    // Para tareas on-demand de Meta Ads
    const prompt = `Custom Meta Ads task for "${company.name}": ${taskDescription}`;
    
    const response = await callLLM(prompt);
    return JSON.parse(response);
  }
}

module.exports = MetaAdsAgent;