/**
 * Lanzalo Agent Orchestrator
 * Manages daily autonomous cycles for each company
 */

const cron = require('node-cron');
const { getActiveCompanies, logActivity } = require('../backend/db');
const CodeAgent = require('./code-agent');
const MarketingAgent = require('./marketing-agent');
const EmailAgent = require('./email-agent');
const TwitterAgent = require('./twitter-agent');
const AnalyticsAgent = require('./analytics-agent');

class AgentOrchestrator {
  constructor() {
    this.agents = {
      code: new CodeAgent(),
      marketing: new MarketingAgent(),
      email: new EmailAgent(),
      twitter: new TwitterAgent(),
      analytics: new AnalyticsAgent()
    };
    
    this.isRunning = false;
  }

  /**
   * Start the orchestrator - runs daily cycles
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  Orchestrator already running');
      return;
    }

    console.log('🚀 Lanzalo Agent Orchestrator started');
    this.isRunning = true;

    // Run daily at 9 AM UTC
    cron.schedule('0 9 * * *', async () => {
      await this.runDailyCycle();
    });

    // Also run immediately on startup
    this.runDailyCycle();
  }

  /**
   * Execute one complete daily cycle for all companies
   */
  async runDailyCycle() {
    console.log('⏰ Starting daily cycle...');
    
    try {
      const companies = await getActiveCompanies();
      console.log(`📊 Processing ${companies.length} active companies`);

      for (const company of companies) {
        await this.runCompanyCycle(company);
      }

      console.log('✅ Daily cycle complete');
    } catch (error) {
      console.error('❌ Daily cycle failed:', error);
    }
  }

  /**
   * Run autonomous cycle for a single company
   */
  async runCompanyCycle(company) {
    console.log(`\n🏢 Running cycle for: ${company.name}`);
    
    try {
      await logActivity(company.id, null, 'cycle_start', 
        `Starting daily autonomous cycle for ${company.name}`);

      // 1. Code Agent - build/improve the product
      await this.runAgent('code', company);
      
      // 2. Marketing Agent - generate content/campaigns
      await this.runAgent('marketing', company);
      
      // 3. Email Agent - cold outreach
      await this.runAgent('email', company);
      
      // 4. Twitter Agent - social presence
      await this.runAgent('twitter', company);
      
      // 5. Analytics Agent - track metrics
      await this.runAgent('analytics', company);

      await logActivity(company.id, null, 'cycle_complete',
        `Daily cycle completed for ${company.name}`);

    } catch (error) {
      console.error(`❌ Cycle failed for ${company.name}:`, error);
      await logActivity(company.id, null, 'cycle_error',
        `Cycle failed: ${error.message}`);
    }
  }

  /**
   * Run a specific agent for a company
   */
  async runAgent(agentType, company) {
    const agent = this.agents[agentType];
    if (!agent) {
      console.error(`❌ Unknown agent type: ${agentType}`);
      return;
    }

    console.log(`  🤖 Running ${agentType} agent...`);
    
    try {
      const result = await agent.execute(company);
      console.log(`  ✅ ${agentType} agent completed:`, result.summary);
      return result;
    } catch (error) {
      console.error(`  ❌ ${agentType} agent failed:`, error.message);
      throw error;
    }
  }

  /**
   * Run on-demand task for a company
   */
  async runOnDemandTask(companyId, agentType, taskDescription) {
    console.log(`⚡ On-demand task: ${agentType} for company ${companyId}`);
    
    // Fetch company details
    const company = await getCompanyById(companyId);
    if (!company) {
      throw new Error(`Company ${companyId} not found`);
    }

    // Run the specific agent with custom task
    const agent = this.agents[agentType];
    return await agent.executeCustomTask(company, taskDescription);
  }

  /**
   * Stop the orchestrator
   */
  stop() {
    console.log('🛑 Stopping Agent Orchestrator');
    this.isRunning = false;
  }
}

module.exports = new AgentOrchestrator();
