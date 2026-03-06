/**
 * Daily Sync Agent
 * 
 * Runs daily team standup:
 * - Gathers reports from all agents
 * - CEO Agent analyzes and makes decisions
 * - Creates tasks autonomously if needed
 * - Sends email summary to user
 */

const cron = require('node-cron');
const { pool } = require('../backend/db');
const { callLLM } = require('../backend/llm');
const crypto = require('crypto');

/**
 * Schedule daily syncs
 * Runs every hour and checks which companies need sync
 */
function scheduleDailySyncs() {
  // Run every hour on the hour
  cron.schedule('0 * * * *', async () => {
    console.log('[Daily Sync] Checking for pending syncs...');
    
    try {
      const companies = await getCompaniesDueForSync();
      
      for (const company of companies) {
        try {
          await runDailySync(company.id);
        } catch (error) {
          console.error(`[Daily Sync] Error for company ${company.id}:`, error);
        }
      }
    } catch (error) {
      console.error('[Daily Sync] Scheduler error:', error);
    }
  });
  
  console.log('[Daily Sync] Scheduler started (runs hourly)');
}

/**
 * Get companies that are due for daily sync
 */
async function getCompaniesDueForSync() {
  const currentHour = new Date().getHours();
  const currentMinute = new Date().getMinutes();
  const currentTime = `${currentHour.toString().padStart(2, '0')}:00`;
  
  const result = await pool.query(
    `SELECT c.* FROM companies c
     WHERE c.daily_sync_enabled = TRUE
       AND c.daily_sync_time = ?
       AND (c.last_sync_at IS NULL 
            OR DATE(c.last_sync_at) < DATE('now'))`,
    [currentTime]
  );
  
  return result.rows || [];
}

/**
 * Run daily sync for a company
 */
async function runDailySync(companyId) {
  console.log(`[Daily Sync] Running for company ${companyId}`);
  
  const company = await getCompany(companyId);
  if (!company) {
    throw new Error(`Company ${companyId} not found`);
  }
  
  // 1. Gather reports from all agents
  const reports = await gatherAgentReports(companyId);
  
  // 2. CEO Agent analyzes
  const analysis = await analyzeDailySync({
    company,
    reports,
    date: getYesterday()
  });
  
  // 3. Save to database
  const syncId = crypto.randomUUID();
  await pool.query(
    `INSERT INTO daily_syncs 
     (id, company_id, sync_date, summary, wins, issues, trends, 
      decisions, recommendations, agent_reports, metrics_snapshot)
     VALUES (?, ?, DATE('now', '-1 day'), ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      syncId,
      companyId,
      analysis.summary,
      JSON.stringify(analysis.wins),
      JSON.stringify(analysis.issues),
      JSON.stringify(analysis.trends),
      JSON.stringify(analysis.decisions),
      JSON.stringify(analysis.recommendations),
      JSON.stringify(reports.agentReports),
      JSON.stringify(reports.businessMetrics)
    ]
  );
  
  // 4. Create tasks for autonomous decisions
  if (analysis.decisions && analysis.decisions.length > 0) {
    for (const decision of analysis.decisions) {
      await createTaskFromDecision(companyId, decision);
    }
  }
  
  // 5. Send email to user
  await sendDailySyncEmail(company, analysis, getYesterday());
  
  // 6. Update last sync time
  await pool.query(
    `UPDATE companies SET last_sync_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [companyId]
  );
  
  console.log(`[Daily Sync] Completed for ${company.name}`);
  
  return analysis;
}

/**
 * Gather reports from all agents
 */
async function gatherAgentReports(companyId) {
  const yesterday = getYesterday();
  
  // Tasks completed yesterday
  const completed = await pool.query(
    `SELECT * FROM tasks 
     WHERE company_id = ? 
       AND status = 'completed'
       AND DATE(completed_at) = ?
     ORDER BY tag`,
    [companyId, yesterday]
  );
  
  // Tasks failed yesterday
  const failed = await pool.query(
    `SELECT * FROM tasks 
     WHERE company_id = ? 
       AND status = 'failed'
       AND DATE(updated_at) = ?
     ORDER BY tag`,
    [companyId, yesterday]
  );
  
  // Group by agent
  const agentReports = {};
  
  const allTasks = [...(completed.rows || []), ...(failed.rows || [])];
  
  for (const task of allTasks) {
    const agent = task.tag || 'unassigned';
    
    if (!agentReports[agent]) {
      agentReports[agent] = {
        agent,
        tasksCompleted: 0,
        tasksFailed: 0,
        highlights: [],
        issues: []
      };
    }
    
    if (task.status === 'completed') {
      agentReports[agent].tasksCompleted++;
      if (task.output) {
        agentReports[agent].highlights.push({
          task: task.title,
          result: task.output.slice(0, 150)
        });
      }
    } else if (task.status === 'failed') {
      agentReports[agent].tasksFailed++;
      agentReports[agent].issues.push({
        task: task.title,
        error: task.error_message || 'Unknown error'
      });
    }
  }
  
  // Business metrics (last 7 days)
  const metricsResult = await pool.query(
    `SELECT * FROM company_metrics 
     WHERE company_id = ? 
     ORDER BY date DESC 
     LIMIT 7`,
    [companyId]
  );
  
  // Backlog count
  const backlogResult = await pool.query(
    `SELECT COUNT(*) as count FROM tasks 
     WHERE company_id = ? AND status = 'todo'`,
    [companyId]
  );
  
  return {
    agentReports: Object.values(agentReports),
    businessMetrics: metricsResult.rows || [],
    tasksInBacklog: backlogResult.rows?.[0]?.count || 0,
    totalCompleted: completed.rows?.length || 0,
    totalFailed: failed.rows?.length || 0
  };
}

/**
 * CEO Agent analyzes daily sync
 */
async function analyzeDailySync({ company, reports, date }) {
  const { getPersonalityPrompt } = require('./personality');
  
  const prompt = `You are the CEO Agent running a daily team sync.

COMPANY: ${company.name}
DATE: ${date}

${getPersonalityPrompt('ceo')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AGENT REPORTS:

${formatAgentReports(reports.agentReports)}

SUMMARY STATS:
- Total tasks completed: ${reports.totalCompleted}
- Total tasks failed: ${reports.totalFailed}
- Backlog: ${reports.tasksInBacklog} pending tasks

BUSINESS METRICS (last 7 days):
${formatMetrics(reports.businessMetrics)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Analyze this daily sync and provide:

1. SUMMARY (2-3 sentences)
   What happened yesterday? Key achievements?

2. WINS 🎉 (2-4 items)
   What went well? Specific results from agents.
   Be concrete: "Code Agent deployed X", not "Good progress"
   
3. ISSUES ⚠️ (0-3 items)
   What failed or got blocked?
   Recurring problems? Be specific about errors.

4. TRENDS 📊
   Business metrics direction:
   - revenue: "up" | "down" | "flat" | "n/a"
   - traffic: "up" | "down" | "flat" | "n/a"
   - engagement: "up" | "down" | "flat" | "n/a"
   - notes: Brief analysis of trends (1-2 sentences)

5. DECISIONS 🎯 (0-3 items)
   Actions to take TODAY based on analysis.
   Only suggest if truly needed.
   Each decision must have:
   - action: Clear, specific task title
   - reasoning: Why this is needed now (1 sentence)
   - agent: Which agent should do it (code/research/twitter/email/marketing/data)
   - priority: high/medium/low
   
6. RECOMMENDATIONS 💡 (1-3 items)
   Strategic suggestions for the user.
   Things to focus on, opportunities spotted.

IMPORTANT:
- Be concise and actionable
- Focus on what matters
- Don't create decisions unless truly needed
- If nothing happened yesterday, say so honestly
- Write in Spanish with personality (directo, sin fluff)
- Sound like a co-founder, not a corporate bot

Examples of your tone:
- "Ayer completamos 12 tareas. No está mal para un martes."
- "Tenemos un problema. Meta Ads se quedó sin budget."
- "Buenas noticias: 5 respuestas a cold emails. Vamos bien."

Return ONLY valid JSON:
{
  "summary": "...",
  "wins": ["...", "..."],
  "issues": ["...", "..."],
  "trends": {
    "revenue": "up/down/flat/n/a",
    "traffic": "up/down/flat/n/a",
    "engagement": "up/down/flat/n/a",
    "notes": "..."
  },
  "decisions": [
    {
      "action": "...",
      "reasoning": "...",
      "agent": "code",
      "priority": "high"
    }
  ],
  "recommendations": ["...", "..."]
}`;

  const response = await callLLM(prompt, {
    temperature: 0.3,
    model: 'openrouter/anthropic/claude-sonnet-4',
    taskType: 'analysis'
  });
  
  try {
    return JSON.parse(response.content);
  } catch (error) {
    console.error('[Daily Sync] Failed to parse LLM response:', response.content);
    
    // Fallback response
    return {
      summary: "No se pudo generar el análisis automático.",
      wins: reports.totalCompleted > 0 ? [`${reports.totalCompleted} tareas completadas`] : [],
      issues: reports.totalFailed > 0 ? [`${reports.totalFailed} tareas fallaron`] : [],
      trends: {
        revenue: "n/a",
        traffic: "n/a",
        engagement: "n/a",
        notes: "Datos insuficientes"
      },
      decisions: [],
      recommendations: []
    };
  }
}

/**
 * Format agent reports for LLM
 */
function formatAgentReports(reports) {
  if (!reports || reports.length === 0) {
    return "No agent activity yesterday.";
  }
  
  return reports.map(r => {
    let report = `${r.agent.toUpperCase()}:`;
    report += `\n- Completed: ${r.tasksCompleted} tasks`;
    report += `\n- Failed: ${r.tasksFailed} tasks`;
    
    if (r.highlights.length > 0) {
      report += `\n- Highlights:`;
      r.highlights.slice(0, 3).forEach(h => {
        report += `\n  • ${h.task}: ${h.result}`;
      });
    }
    
    if (r.issues.length > 0) {
      report += `\n- Issues:`;
      r.issues.slice(0, 2).forEach(i => {
        report += `\n  • ${i.task}: ${i.error}`;
      });
    }
    
    return report;
  }).join('\n\n');
}

/**
 * Format metrics for LLM
 */
function formatMetrics(metrics) {
  if (!metrics || metrics.length === 0) {
    return "No metrics data available.";
  }
  
  return metrics.map(m => 
    `${m.date}: Visits: ${m.visits || 0}, Revenue: $${m.revenue || 0}, Conversions: ${m.conversions || 0}`
  ).join('\n');
}

/**
 * Create task from autonomous decision
 */
async function createTaskFromDecision(companyId, decision) {
  const taskId = crypto.randomUUID();
  
  await pool.query(
    `INSERT INTO tasks 
     (id, company_id, title, description, tag, priority, status, auto_created)
     VALUES (?, ?, ?, ?, ?, ?, 'todo', TRUE)`,
    [
      taskId,
      companyId,
      decision.action,
      `[Daily Sync Decision]\n\n${decision.reasoning}`,
      decision.agent,
      decision.priority
    ]
  );
  
  console.log(`[Daily Sync] Created task: ${decision.action} (${decision.agent})`);
}

/**
 * Send daily sync email (placeholder - will integrate with Resend later)
 */
async function sendDailySyncEmail(company, analysis, date) {
  console.log(`[Daily Sync] Email would be sent to ${company.subdomain} owner`);
  console.log('Summary:', analysis.summary);
  console.log('Wins:', analysis.wins.length);
  console.log('Issues:', analysis.issues.length);
  console.log('Decisions:', analysis.decisions.length);
  
  // TODO: Integrate with Resend when email system is ready
  // For now, just log
}

/**
 * Helpers
 */
async function getCompany(id) {
  const result = await pool.query('SELECT * FROM companies WHERE id = ?', [id]);
  return result.rows?.[0];
}

function getYesterday() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
}

/**
 * Manual trigger for testing
 */
async function runSyncNow(companyId) {
  return await runDailySync(companyId);
}

module.exports = {
  scheduleDailySyncs,
  runDailySync,
  runSyncNow
};
