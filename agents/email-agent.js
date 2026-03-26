/**
 * Agente de Email — Cold email outreach via Instantly.ai
 * 
 * Flujo:
 * 1. Busca leads ideales (via LLM + web search)
 * 2. Crea campañas en Instantly con secuencia de emails personalizados
 * 3. Sube leads a la campaña
 * 4. Gestiona respuestas (analiza con IA, clasifica interés)
 * 
 * Requiere: Email Pro subscription activa + Instantly API key
 */

const { pool } = require('../backend/db');
const { callLLM } = require('../backend/llm');
const { sendEmail } = require('../backend/email');
const governanceHelper = require('../backend/services/governance-helper');

class EmailAgent {
  async execute(company) {
    // GOVERNANCE CHECKS
    const budgetCheck = await governanceHelper.checkBudgetBeforeAction('Email');
    if (!budgetCheck.allowed) {
      return { error: budgetCheck.error, budget_exceeded: true, action: 'skipped' };
    }

    const governanceCheck = await governanceHelper.checkGovernanceStatus('Email');
    if (!governanceCheck.allowed) {
      return { error: 'Email Agent is paused or terminated', paused: governanceCheck.paused, terminated: governanceCheck.terminated };
    }

    await governanceHelper.recordHeartbeat('Email');

    const task = await this.createTask(company.id, 
      'Outreach diario por email',
      'Encontrar prospectos y enviar emails fríos personalizados');

    try {
      await this.updateTask(task.id, { status: 'running' });
      await this.logActivity(company.id, task.id, 'task_start',
        `Agente de email iniciado para ${company.name}`);

      // Check if Email Pro is active
      const sub = await this.getEmailProSubscription(company.id);
      
      if (!sub) {
        const output = 'Email Pro no activado. El usuario necesita suscribirse para usar cold email.';
        await this.updateTask(task.id, { status: 'completed', output, completed_at: new Date() });
        return { success: true, summary: output };
      }

      if (sub.status === 'setting_up') {
        const output = 'Email Pro configurándose. Dominio y warmup en proceso. Esperando a que esté listo.';
        await this.updateTask(task.id, { status: 'completed', output, completed_at: new Date() });
        return { success: true, summary: output };
      }

      // Check monthly limit
      if (sub.emails_sent_this_month >= sub.emails_per_month) {
        const output = `Límite mensual alcanzado (${sub.emails_sent_this_month}/${sub.emails_per_month}). Esperando al próximo ciclo.`;
        await this.updateTask(task.id, { status: 'completed', output, completed_at: new Date() });
        return { success: true, summary: output };
      }

      // 1. Check if we need leads
      const existingLeads = await this.getLeadsCount(company.id);
      if (existingLeads < 10) {
        await this.findAndSaveLeads(company);
      }

      // 2. Check if there are campaigns, if not create one
      const campaigns = await this.getActiveCampaigns(company.id);
      if (campaigns.length === 0) {
        await this.createNewCampaign(company, sub);
      }

      // 3. Sync stats from Instantly
      if (instantly.enabled) {
        await this.syncCampaignStats(company.id);
      }

      // 4. Check for new replies that need analysis
      await this.analyzeNewReplies(company);

      const finalLeads = await this.getLeadsCount(company.id);
      const finalCampaigns = await this.getActiveCampaigns(company.id);

      const output = `Leads: ${finalLeads} | Campañas activas: ${finalCampaigns.length} | Emails enviados este mes: ${sub.emails_sent_this_month}/${sub.emails_per_month}`;

      await this.updateTask(task.id, {
        status: 'completed',
        output,
        completed_at: new Date()
      });

      await this.logActivity(company.id, task.id, 'task_complete', output);

      // GOVERNANCE: Record budget usage
      governanceHelper.recordBudgetUsage('Email', 1000, 0.02).catch(() => {});

      return {
        success: true,
        summary: output,
        leads: finalLeads,
        campaigns: finalCampaigns.length
      };

    } catch (error) {
      await this.updateTask(task.id, {
        status: 'failed',
        output: error.message,
        completed_at: new Date()
      });
      throw error;
    }
  }

  // ═══════════════════════════════════════
  // LEAD FINDING
  // ═══════════════════════════════════════

  async findAndSaveLeads(company) {
    const prompt = `Eres el agente de prospección de "${company.name}".
Descripción: ${company.description}
Industria: ${company.industry}

Tarea: Identifica 20 prospectos REALES y VERIFICABLES que se beneficiarían de este producto/servicio.

IMPORTANTE:
- Usa nombres de empresas REALES que existan
- Usa formatos de email profesionales realistas (nombre@empresa.com)
- Enfócate en personas con poder de decisión (CEO, CTO, Head of...)
- Incluye empresas españolas y latinoamericanas prioritariamente

Para cada prospecto proporciona:
- name: nombre completo
- email: email profesional (formato realista)
- company_name: nombre de la empresa real
- job_title: cargo
- website: web de la empresa
- reason: por qué es buen prospecto (1 frase)

Responde en JSON:
{
  "prospects": [
    {
      "name": "Juan García",
      "email": "juan.garcia@empresa.com",
      "company_name": "Empresa Real SL",
      "job_title": "CEO",
      "website": "https://empresa.com",
      "reason": "Necesitan optimizar X porque Y"
    }
  ]
}`;

    try {
      const response = await callLLM(prompt, { maxTokens: 3000 });
      const content = typeof response === 'string' ? response : response.content;
      
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return;

      const data = JSON.parse(jsonMatch[0]);
      const prospects = data.prospects || [];

      let saved = 0;
      for (const prospect of prospects) {
        if (!prospect.email || !prospect.email.includes('@')) continue;
        try {
          await pool.query(
            `INSERT INTO leads (company_id, email, first_name, last_name, company_name, job_title, website, ai_notes, source)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'agent')
             ON CONFLICT (company_id, email) DO NOTHING`,
            [
              company.id,
              prospect.email.toLowerCase().trim(),
              prospect.name?.split(' ')[0] || null,
              prospect.name?.split(' ').slice(1).join(' ') || null,
              prospect.company_name || null,
              prospect.job_title || null,
              prospect.website || null,
              prospect.reason || null,
            ]
          );
          saved++;
        } catch (e) {
          // Skip duplicates
        }
      }

      console.log(`[EmailAgent] Saved ${saved} new leads for ${company.name}`);
    } catch (error) {
      console.error('[EmailAgent] Error finding leads:', error);
    }
  }

  // ═══════════════════════════════════════
  // CAMPAIGN CREATION
  // ═══════════════════════════════════════

  async createNewCampaign(company, subscription) {
    // Get available leads
    const leads = await pool.query(
      `SELECT * FROM leads WHERE company_id = $1 AND status = 'new' LIMIT 50`,
      [company.id]
    );

    if (leads.rows.length === 0) {
      console.log('[EmailAgent] No new leads to create campaign');
      return null;
    }

    // Generate campaign content with LLM using the cold email playbook
    const prompt = `Eres el estratega de cold email de "${company.name}".
Descripción: ${company.description}
Industria: ${company.industry}

═══════════════════════════════════════
PLAYBOOK DE REFERENCIA (usa como guía de estructura, tono y estrategia):
═══════════════════════════════════════
${coldEmailPlaybook ? coldEmailPlaybook.substring(0, 6000) : 'No disponible — usa las reglas de abajo.'}
═══════════════════════════════════════

Tienes ${leads.rows.length} leads. Ejemplo de lead: ${leads.rows[0].company_name || 'empresa'} (${leads.rows[0].job_title || 'decisor'}).

Crea una secuencia de 4 emails ADAPTADA al negocio del cliente, siguiendo la estructura del playbook:

ESTRUCTURA OBLIGATORIA:
- Email 1 (Day 0): LA VISIÓN — Historia de éxito rápida, genera FOMO. Hook con caso relatable.
- Email 2 (Day +3): LA HISTORIA — Social proof con números concretos. Antes/después.
- Email 3 (Day +7): LA PROVOCACIÓN — Comparativa escenarios (manual vs automatizado). Urgencia competitiva.
- Email 4 (Day +12): EL CIERRE — Decision binary. Sin vueltas. 2 opciones claras.

REGLAS DE TONO (del playbook):
- Español coloquial, narrativo, provocador pero cercano
- Plain text only — sin HTML, sin imágenes, sin emojis
- Frases cortas: 2-3 líneas máximo por párrafo
- Historias específicas con números concretos
- CTA binary — quita fricción
- Firma con nombre real + rol (no "Equipo")
- Usa {{first_name}} y {{company_name}} como variables de personalización

IMPORTANTE: Adapta los casos de éxito y dolor al sector/industria del cliente (${company.industry || 'general'}).
No copies el playbook literal — úsalo como guía de estructura y tono, pero personaliza al negocio.

Responde en JSON:
{
  "campaign_name": "Nombre descriptivo de la campaña",
  "target_audience": "Descripción breve del público objetivo",
  "steps": [
    {
      "subject": "asunto del email 1 (minúsculas, sin caps innecesarias)",
      "body": "cuerpo completo del email 1",
      "delay_days": 0
    },
    {
      "subject": "asunto del email 2",
      "body": "cuerpo completo del email 2",
      "delay_days": 3
    },
    {
      "subject": "asunto del email 3",
      "body": "cuerpo completo del email 3",
      "delay_days": 7
    },
    {
      "subject": "asunto del email 4",
      "body": "cuerpo completo del email 4",
      "delay_days": 12
    }
  ]
}`;

    try {
      const response = await callLLM(prompt, { maxTokens: 2000 });
      const content = typeof response === 'string' ? response : response.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const campaign = JSON.parse(jsonMatch[0]);

      // Save campaign to DB
      const result = await pool.query(
        `INSERT INTO instantly_campaigns 
         (company_id, subscription_id, name, status, subject, email_body, followup_steps, 
          target_audience, leads_count, created_by)
         VALUES ($1, $2, $3, 'draft', $4, $5, $6, $7, $8, 'agent')
         RETURNING *`,
        [
          company.id,
          subscription.id,
          campaign.campaign_name || `Campaña ${new Date().toLocaleDateString('es-ES')}`,
          campaign.steps?.[0]?.subject || '',
          campaign.steps?.[0]?.body || '',
          JSON.stringify(campaign.steps?.slice(1) || []),
          campaign.target_audience || '',
          leads.rows.length,
        ]
      );

      const savedCampaign = result.rows[0];

      // Link leads to campaign
      await pool.query(
        `UPDATE leads SET campaign_id = $1, status = 'contacted', updated_at = NOW()
         WHERE company_id = $2 AND status = 'new' AND id IN (
           SELECT id FROM leads WHERE company_id = $2 AND status = 'new' LIMIT 50
         )`,
        [savedCampaign.id, company.id]
      );

      // If Instantly is configured, create the campaign there too
      if (instantly.enabled && subscription.instantly_account_id) {
        try {
          const instantlyCampaign = await instantly.createCampaign({
            name: savedCampaign.name,
            account_ids: [subscription.instantly_account_id],
          });

          // Set sequences (service converts to Instantly's nested format)
          if (campaign.steps && instantlyCampaign.id) {
            await instantly.setCampaignSequences(instantlyCampaign.id, campaign.steps);

            // Add leads to Instantly campaign
            for (const lead of leads.rows.slice(0, 50)) {
              await instantly.addLead({
                email: lead.email,
                first_name: lead.first_name,
                last_name: lead.last_name,
                company_name: lead.company_name,
                campaign_id: instantlyCampaign.id,
              }).catch(e => console.error(`[EmailAgent] Error adding lead ${lead.email}:`, e.message));
            }
          }

          // Update local campaign with Instantly ID
          await pool.query(
            `UPDATE instantly_campaigns SET instantly_campaign_id = $1, status = 'active', updated_at = NOW()
             WHERE id = $2`,
            [instantlyCampaign.id, savedCampaign.id]
          );

          // Launch campaign
          await instantly.launchCampaign(instantlyCampaign.id);

          console.log(`[EmailAgent] Campaign created and launched in Instantly: ${instantlyCampaign.id}`);
        } catch (err) {
          console.error('[EmailAgent] Error creating Instantly campaign:', err);
          // Campaign exists in DB but not in Instantly — can retry later
        }
      }

      console.log(`[EmailAgent] Created campaign "${savedCampaign.name}" with ${leads.rows.length} leads`);
      return savedCampaign;

    } catch (error) {
      console.error('[EmailAgent] Error creating campaign:', error);
      return null;
    }
  }

  // ═══════════════════════════════════════
  // REPLY ANALYSIS
  // ═══════════════════════════════════════

  async analyzeNewReplies(company) {
    const replies = await pool.query(
      `SELECT * FROM leads WHERE company_id = $1 AND status = 'replied' AND interest_score IS NULL
       ORDER BY last_replied_at DESC LIMIT 10`,
      [company.id]
    );

    for (const lead of replies.rows) {
      if (!lead.reply_content) continue;

      const prompt = `Analiza esta respuesta a un cold email de "${company.name}":

Respuesta del lead ${lead.first_name || ''} ${lead.last_name || ''} (${lead.company_name || 'empresa'}):
"${lead.reply_content}"

Clasifica:
- interest_score: 0.0 a 1.0 (0 = no interesado, 1 = muy interesado)
- status: "interested" | "not_interested" | "replied" (si es ambiguo)
- action: qué hacer ahora (1 frase)

JSON:
{"interest_score": 0.0, "status": "interested", "action": "Agendar demo"}`;

      try {
        const response = await callLLM(prompt, { maxTokens: 200 });
        const content = typeof response === 'string' ? response : response.content;
        const jsonMatch = content.match(/\{[\s\S]*?\}/);
        if (!jsonMatch) continue;

        const analysis = JSON.parse(jsonMatch[0]);

        await pool.query(
          `UPDATE leads SET interest_score = $1, status = $2, ai_notes = $3, updated_at = NOW()
           WHERE id = $4`,
          [
            analysis.interest_score || 0,
            analysis.status || 'replied',
            analysis.action || '',
            lead.id
          ]
        );

        // If interested, create a task for the user
        if (analysis.interest_score > 0.6) {
          await pool.query(
            `INSERT INTO tasks (company_id, tag, title, description, status, priority, created_at)
             VALUES ($1, 'email', $2, $3, 'todo', 'high', NOW())`,
            [
              company.id,
              `Lead caliente: ${lead.first_name || lead.email}`,
              `${lead.first_name || ''} de ${lead.company_name || 'empresa'} está interesado. Acción: ${analysis.action || 'Contactar'}`
            ]
          );
        }
      } catch (e) {
        console.error(`[EmailAgent] Error analyzing reply from ${lead.email}:`, e);
      }
    }
  }

  // ═══════════════════════════════════════
  // STATS SYNC
  // ═══════════════════════════════════════

  async syncCampaignStats(companyId) {
    if (!instantly.enabled) return;

    const campaigns = await pool.query(
      `SELECT * FROM instantly_campaigns WHERE company_id = $1 AND instantly_campaign_id IS NOT NULL`,
      [companyId]
    );

    for (const campaign of campaigns.rows) {
      try {
        const analytics = await instantly.getCampaignAnalytics(campaign.instantly_campaign_id);
        if (analytics) {
          await pool.query(
            `UPDATE instantly_campaigns SET 
             emails_sent = COALESCE($1, emails_sent),
             emails_opened = COALESCE($2, emails_opened),
             emails_replied = COALESCE($3, emails_replied),
             emails_bounced = COALESCE($4, emails_bounced),
             updated_at = NOW()
             WHERE id = $5`,
            [
              analytics.sent || analytics.emails_sent,
              analytics.opened || analytics.emails_opened,
              analytics.replied || analytics.emails_replied,
              analytics.bounced || analytics.emails_bounced,
              campaign.id
            ]
          );
        }
      } catch (e) {
        // Stats sync is non-critical
        console.error(`[EmailAgent] Stats sync error for campaign ${campaign.id}:`, e.message);
      }
    }
  }

  // ═══════════════════════════════════════
  // CUSTOM TASK (from Co-Founder)
  // ═══════════════════════════════════════

  async executeCustomTask(company, taskDescription) {
    // Check if Email Pro is active
    const sub = await this.getEmailProSubscription(company.id);
    
    const prompt = `Eres el estratega de cold email de "${company.name}".
${sub ? 'Email Pro ACTIVO — puedes crear campañas y buscar leads.' : 'Email Pro NO ACTIVO — solo puedes sugerir acciones.'}

Tarea del fundador: ${taskDescription}

═══ PLAYBOOK DE REFERENCIA (estructura, tono, estrategia) ═══
${coldEmailPlaybook ? coldEmailPlaybook.substring(0, 4000) : 'No disponible.'}
════════════════════════════════════════════════════════

USA el playbook como guía de tono, estructura de secuencia (4 emails: Visión → Historia → Provocación → Cierre) y reglas de formato.
Adapta siempre al sector/industria del cliente (${company.industry || 'general'}).
${sub ? 'Ejecuta la tarea. Si necesitas buscar leads o crear campaña, hazlo.' : 'Explica que necesita activar Email Pro para usar cold email y qué podría lograr con ello.'}

Responde de forma directa y práctica.`;

    const response = await callLLM(prompt, { maxTokens: 500 });
    const content = typeof response === 'string' ? response : response.content;
    
    // If task involves finding leads, do it
    if (sub && taskDescription.toLowerCase().match(/lead|prospecto|contacto|busca|encontr/)) {
      await this.findAndSaveLeads(company);
    }

    // If task involves creating a campaign, do it
    if (sub && taskDescription.toLowerCase().match(/camp|email|enviar|lanzar|outreach/)) {
      await this.createNewCampaign(company, sub);
    }

    return { response: content };
  }

  // ═══════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════

  async getEmailProSubscription(companyId) {
    const result = await pool.query(
      `SELECT * FROM email_pro_subscriptions 
       WHERE company_id = $1 AND status IN ('active', 'setting_up')
       ORDER BY created_at DESC LIMIT 1`,
      [companyId]
    );
    return result.rows[0] || null;
  }

  async getLeadsCount(companyId) {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM leads WHERE company_id = $1',
      [companyId]
    );
    return parseInt(result.rows[0].count);
  }

  async getActiveCampaigns(companyId) {
    const result = await pool.query(
      `SELECT * FROM instantly_campaigns WHERE company_id = $1 AND status IN ('active', 'draft')`,
      [companyId]
    );
    return result.rows;
  }

  async createTask(companyId, title, description) {
    const result = await pool.query(
      `INSERT INTO tasks (company_id, tag, title, description, status, created_at)
       VALUES ($1, 'email', $2, $3, 'todo', NOW()) RETURNING *`,
      [companyId, title, description]
    );
    return result.rows[0];
  }

  async updateTask(taskId, updates) {
    const fields = [];
    const values = [];
    let idx = 1;
    for (const [key, val] of Object.entries(updates)) {
      fields.push(`${key} = $${idx++}`);
      values.push(val);
    }
    values.push(taskId);
    await pool.query(
      `UPDATE tasks SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx}`,
      values
    );
  }

  async logActivity(companyId, taskId, type, message) {
    await pool.query(
      `INSERT INTO activity_log (company_id, task_id, activity_type, message, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [companyId, taskId, type, message]
    ).catch(() => {});
  }
}

module.exports = EmailAgent;
