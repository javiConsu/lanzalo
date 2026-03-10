/**
 * Agente de Email - Outreach frío y automatización de emails
 */

const { createTask, updateTask, createEmail, logActivity } = require('../backend/db');
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

    const task = await createTask(company.id, 'email',
      'Outreach diario por email',
      'Encontrar prospectos y enviar emails fríos personalizados');

    try {
      await updateTask(task.id, { status: 'running' });
      await logActivity(company.id, task.id, 'task_start',
        `Agente de email iniciado para ${company.name}`);

      // 1. Identificar prospectos objetivo
      const prospects = await this.findProspects(company);
      
      // 2. Generar emails personalizados
      const emails = [];
      for (const prospect of prospects.slice(0, 5)) { // Máx 5 por día
        const email = await this.generateEmail(company, prospect);
        emails.push(email);
        
        // Guardar en base de datos
        await createEmail(company.id, email.campaign, 
          prospect.email, email.subject, email.body, 'draft');
      }

      // 3. Enviar emails (si está habilitado)
      let sentCount = 0;
      if (company.email_automation_enabled) {
        for (const email of emails) {
          await sendEmail(email);
          sentCount++;
        }
      }

      const output = `Encontrados ${prospects.length} prospectos\nGenerados ${emails.length} emails\nEnviados: ${sentCount}`;

      await updateTask(task.id, {
        status: 'completed',
        output,
        completed_at: new Date()
      });

      await logActivity(company.id, task.id, 'task_complete',
        `Agente de email envió ${sentCount} emails`);

      // GOVERNANCE: Record budget usage
      governanceHelper.recordBudgetUsage('Email', 1000, 0.02).catch(() => {});

      return {
        success: true,
        summary: `Enviados ${sentCount} emails fríos`,
        emailsSent: sentCount
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

  async findProspects(company) {
    // Use LLM to generate ideal customer profile and find prospects
    const prompt = `You are the email outreach agent for "${company.name}".
Description: ${company.description}
Industry: ${company.industry}

Task: Identify 10 ideal prospects who would benefit from this product.

For each prospect, provide:
- Name (can be fictional but realistic)
- Email (format: firstname@company.com)
- Company
- Why they're a good fit

Respond in JSON:
{
  "prospects": [
    {
      "name": "John Doe",
      "email": "john@acmecorp.com",
      "company": "Acme Corp",
      "reason": "They need X because Y"
    }
  ]
}`;

    const response = await callLLM(prompt);
    const data = JSON.parse(response);
    return data.prospects;
  }

  async generateEmail(company, prospect) {
    const prompt = `Write a personalized cold email from "${company.name}" to ${prospect.name} at ${prospect.company}.

Company description: ${company.description}
Why they're a good fit: ${prospect.reason}

The email should:
- Be concise (under 150 words)
- Personalized to their situation
- Clear value proposition
- Soft CTA (reply or book a call)
- Professional but conversational tone

Respond in JSON:
{
  "subject": "email subject line",
  "body": "email body text"
}`;

    const response = await callLLM(prompt);
    const email = JSON.parse(response);
    
    return {
      campaign: 'daily_outreach',
      to: prospect.email,
      subject: email.subject,
      body: email.body
    };
  }

  async executeCustomTask(company, taskDescription) {
    // For on-demand email tasks
    const prompt = `Custom email task for "${company.name}": ${taskDescription}

Generate the email content.`;
    
    const response = await callLLM(prompt);
    return JSON.parse(response);
  }
}

module.exports = EmailAgent;
