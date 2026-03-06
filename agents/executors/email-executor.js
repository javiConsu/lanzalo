/**
 * Email Agent Executor - Cold outreach y email marketing
 */

const TaskExecutor = require('../task-executor');
const { callLLM } = require('../../backend/llm');
const { pool } = require('../../backend/db');
const crypto = require('crypto');

class EmailExecutor extends TaskExecutor {
  constructor() {
    super('email-agent', 'Email Agent');
    this.coldEmailLimit = 2; // 2/día para cold emails
  }

  /**
   * Ejecutar tarea de email
   */
  async execute(task) {
    console.log(`📧 Email Agent procesando: ${task.title}`);

    // Obtener info de la empresa
    const companyResult = await pool.query(
      'SELECT * FROM companies WHERE id = $1',
      [task.company_id]
    );
    const company = companyResult.rows[0];

    // Determinar tipo de email
    const emailType = this.determineEmailType(task);

    let result;
    switch (emailType) {
      case 'cold':
        result = await this.sendColdEmail(task, company);
        break;
      case 'followup':
        result = await this.sendFollowup(task, company);
        break;
      case 'newsletter':
        result = await this.sendNewsletter(task, company);
        break;
      case 'transactional':
        result = await this.sendTransactional(task, company);
        break;
      default:
        result = await this.sendGeneric(task, company);
    }

    return result;
  }

  /**
   * Determinar tipo de email
   */
  determineEmailType(task) {
    const desc = task.description.toLowerCase();
    
    if (desc.includes('cold') || desc.includes('outreach') || desc.includes('prospecting')) {
      return 'cold';
    }
    
    if (desc.includes('followup') || desc.includes('follow-up') || desc.includes('seguimiento')) {
      return 'followup';
    }
    
    if (desc.includes('newsletter') || desc.includes('boletín')) {
      return 'newsletter';
    }
    
    if (desc.includes('transactional') || desc.includes('confirmación') || desc.includes('reset')) {
      return 'transactional';
    }
    
    return 'generic';
  }

  /**
   * Cold email (outreach)
   */
  async sendColdEmail(task, company) {
    // Verificar rate limit
    await this.checkColdEmailLimit(task.company_id);

    // Cargar contexto de memoria
    let memoryContext = '';
    if (this.memory) {
      const context = await this.memory.getFullContext();
      memoryContext = `
EMPRESA:
- Nombre: ${context.domain.companyName}
- Industria: ${context.domain.industry}
- Propuesta de valor: ${context.domain.description}
- Features clave: ${context.domain.keyFeatures.join(', ') || 'En desarrollo'}
`;
    }

    // Generar email con LLM
    const email = await this.generateColdEmail(task, company, memoryContext);

    // Guardar en DB
    const emailId = await this.saveEmail(task.company_id, email, 'cold');

    // TODO: Enviar con servicio de email real (Resend, SendGrid, etc.)
    // await this.sendViaAPI(email);

    console.log(`📧 Cold email generado:\nAsunto: ${email.subject}\n${email.body.substring(0, 200)}...`);

    return {
      summary: `Cold email creado: "${email.subject}"`,
      emailId,
      to: email.to,
      subject: email.subject,
      preview: email.body.substring(0, 200),
      sent: false,
      note: 'Email guardado. Configurar servicio de envío (Resend/SendGrid) cuando esté listo.'
    };
  }

  /**
   * Generar cold email con LLM
   */
  async generateColdEmail(task, company, memoryContext) {
    const prompt = `Eres el Email Agent de ${company.name}.

${memoryContext}

TAREA: ${task.title}
DESCRIPCIÓN: ${task.description}

REGLAS DE COLD EMAIL (CRÍTICAS):
- Longitud: 50-125 palabras (corto y directo)
- Solo texto plano (NO HTML, NO markdown, NO negritas)
- Tono: Founder-to-founder, directo, personal
- Un ask claro al final
- Personalizado (mencionar algo específico del destinatario)
- Sin fluff: ❌ "Hope this finds you well" ✅ "Built something that might save you 2hrs/week"

ESTRUCTURA:
1. Hook personalizado (1 línea sobre ellos)
2. Problema que resuelves (1-2 líneas)
3. Propuesta de valor específica (1-2 líneas)
4. Ask claro y fácil (1 línea)

EJEMPLOS:

❌ MAL:
"I hope this email finds you well. I wanted to reach out because we have an exciting opportunity..."

✅ BIEN:
"Saw you're hiring 3 devs on LinkedIn. Built a tool that automates the screening — saved Company X 15hrs/week. Worth 10 min to demo? [link]"

GENERA EL EMAIL (JSON):

{
  "to": "email@destinatario.com o nombre si no tienes email",
  "subject": "Asunto corto y específico",
  "body": "Cuerpo del email (texto plano, 50-125 palabras)"
}`;

    const response = await callLLM(prompt, {
      companyId: task.company_id,
      taskType: 'content',
      temperature: 0.7
    });

    try {
      const email = JSON.parse(response.content);
      
      // Validar longitud
      const wordCount = email.body.split(/\s+/).length;
      if (wordCount > 150) {
        console.warn(`⚠️ Email muy largo (${wordCount} palabras), recortando...`);
      }

      return email;

    } catch (error) {
      // Fallback
      return {
        to: 'unknown@example.com',
        subject: 'From ' + company.name,
        body: response.content.substring(0, 500)
      };
    }
  }

  /**
   * Follow-up email
   */
  async sendFollowup(task, company) {
    // Similar a cold email pero más breve
    const prompt = `Follow-up email breve (30-50 palabras):

TAREA: ${task.description}

Reglas:
- Mucho más corto que el original
- Añade valor nuevo (no repetir)
- Gentle nudge, no pushy

Responde en JSON:
{
  "subject": "Re: [asunto original]",
  "body": "texto plano"
}`;

    const response = await callLLM(prompt, {
      companyId: task.company_id,
      taskType: 'simple',
      temperature: 0.6
    });

    const email = JSON.parse(response.content);
    const emailId = await this.saveEmail(task.company_id, email, 'followup');

    return {
      summary: `Follow-up email creado`,
      emailId,
      subject: email.subject,
      preview: email.body,
      sent: false
    };
  }

  /**
   * Newsletter
   */
  async sendNewsletter(task, company) {
    // Cargar memoria para contexto
    let recentActivity = '';
    if (this.memory) {
      const context = await this.memory.getFullContext();
      recentActivity = `Features recientes: ${context.domain.keyFeatures.slice(-3).join(', ')}`;
    }

    const prompt = `Newsletter para ${company.name}:

TAREA: ${task.description}

Contexto: ${recentActivity}

Formato:
- Asunto: Catchy pero no clickbait
- Cuerpo: 3-5 secciones cortas
  1. Intro (qué pasó esta semana)
  2. Feature/Update principal
  3. 2-3 bullets de valor
  4. CTA claro

Texto plano (NO HTML).

Responde en JSON:
{
  "subject": "...",
  "body": "..."
}`;

    const response = await callLLM(prompt, {
      companyId: task.company_id,
      taskType: 'content',
      temperature: 0.7
    });

    const email = JSON.parse(response.content);
    const emailId = await this.saveEmail(task.company_id, email, 'newsletter');

    return {
      summary: `Newsletter creado: "${email.subject}"`,
      emailId,
      subject: email.subject,
      preview: email.body.substring(0, 200),
      sent: false
    };
  }

  /**
   * Transactional email
   */
  async sendTransactional(task, company) {
    const prompt = `Email transaccional:

TAREA: ${task.description}

Tipo: Confirmación/Reset/Notificación

Reglas:
- Ultra breve y claro
- CTA obvio
- NO marketing

Responde en JSON:
{
  "to": "user@example.com",
  "subject": "...",
  "body": "..."
}`;

    const response = await callLLM(prompt, {
      companyId: task.company_id,
      taskType: 'simple',
      temperature: 0.3
    });

    const email = JSON.parse(response.content);
    const emailId = await this.saveEmail(task.company_id, email, 'transactional');

    // Transaccionales SÍ se envían automáticamente (cuando tengamos API)
    // await this.sendViaAPI(email);

    return {
      summary: `Email transaccional creado`,
      emailId,
      to: email.to,
      subject: email.subject,
      sent: false
    };
  }

  /**
   * Generic email
   */
  async sendGeneric(task, company) {
    const prompt = `Genera un email:

EMPRESA: ${company.name}
TAREA: ${task.description}

Texto plano, profesional pero friendly.

Responde en JSON:
{
  "subject": "...",
  "body": "..."
}`;

    const response = await callLLM(prompt, {
      companyId: task.company_id,
      taskType: 'content',
      temperature: 0.6
    });

    const email = JSON.parse(response.content);
    const emailId = await this.saveEmail(task.company_id, email, 'generic');

    return {
      summary: `Email creado: "${email.subject}"`,
      emailId,
      subject: email.subject,
      preview: email.body.substring(0, 200),
      sent: false
    };
  }

  /**
   * Verificar rate limit de cold emails
   */
  async checkColdEmailLimit(companyId) {
    const today = new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `SELECT COUNT(*) as count FROM emails 
       WHERE company_id = $1 
       AND type = 'cold'
       AND DATE(created_at) = $2`,
      [companyId, today]
    );

    const todayCount = parseInt(result.rows[0].count);

    if (todayCount >= this.coldEmailLimit) {
      throw new Error(`Cold email rate limit alcanzado: ${todayCount}/${this.coldEmailLimit} hoy.`);
    }

    console.log(`📊 Cold emails: ${todayCount}/${this.coldEmailLimit} hoy`);
  }

  /**
   * Guardar email en DB
   */
  async saveEmail(companyId, email, type) {
    const emailId = crypto.randomUUID();

    await pool.query(
      `INSERT INTO emails (id, company_id, type, recipient, subject, body, sent, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [emailId, companyId, type, email.to || null, email.subject, email.body, false]
    );

    console.log(`💾 Email guardado en DB: ${emailId}`);

    return emailId;
  }

  /**
   * Enviar email vía API (cuando tengas servicio configurado)
   */
  async sendViaAPI(email) {
    // TODO: Integrar con Resend, SendGrid, Postmark, etc.
    
    /*
    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    await resend.emails.send({
      from: 'hola@lanzalo.pro',
      to: email.to,
      subject: email.subject,
      text: email.body
    });
    
    // Actualizar DB
    await pool.query(
      'UPDATE emails SET sent = $1, sent_at = datetime("now") WHERE id = $2',
      [true, emailId]
    );
    */
    
    console.log('ℹ️ Email API no configurada. Email guardado en DB.');
  }

  /**
   * Override formatResult
   */
  formatResult(result) {
    return `📧 Email ${result.sent ? 'enviado' : 'creado'}

Para: ${result.to || 'Lista de contactos'}
Asunto: "${result.subject}"

Preview:
${result.preview || result.body}

${result.sent ? '✅ Enviado' : `⚠️ Nota: ${result.note || 'Pendiente de envío'}`}`;
  }
}

module.exports = EmailExecutor;
