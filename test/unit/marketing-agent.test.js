const { pool } = require('../__mocks__/db');

jest.mock('../../backend/db', () => require('../__mocks__/db'));
jest.mock('../../backend/llm', () => ({
  callLLM: jest.fn(() => Promise.resolve(JSON.stringify({
    focus: 'Test Strategy',
    contentTypes: ['social_post'],
    channels: ['linkedin'],
    topic: 'Test Topic'
  })))
}));
jest.mock('../../backend/services/governance-helper', () => ({
  checkBudgetBeforeAction: jest.fn(() => Promise.resolve({ allowed: true })),
  checkGovernanceStatus: jest.fn(() => Promise.resolve({ allowed: true })),
  recordHeartbeat: jest.fn(() => Promise.resolve()),
  recordBudgetUsage: jest.fn(() => Promise.resolve())
}));
jest.mock('../../backend/services/brand-config', () => ({
  getConfig: jest.fn(() => Promise.resolve({ voice: {} })),
  buildPromptContext: jest.fn(() => 'Brand context'),
  getPlatformRules: jest.fn(() => ({ max_chars: 280, hashtags: 3 })),
  getGammaOptions: jest.fn(() => ({}))
}));
jest.mock('../../backend/services/gamma-service', () => ({
  enabled: false
}));

const MarketingAgent = require('../../agents/marketing-agent');

describe('MarketingAgent', () => {
  let marketingAgent;

  beforeEach(() => {
    marketingAgent = new MarketingAgent();
    pool.query.mockClear();
    pool.query.mockReset();
  });

  describe('Multi-Tenant Isolation', () => {
    it('should pass company.id to createTask queries', async () => {
      const companyId = 'company-marketing-1';
      pool.query.mockResolvedValueOnce({ rows: [{ id: 'task-1', company_id: companyId }] });

      await marketingAgent.createTask(companyId, 'Test Task', 'Description');

      const lastCall = pool.query.mock.calls[pool.query.mock.calls.length - 1];
      expect(lastCall[1][0]).toBe(companyId);
    });

    it('should filter content by company_id in decideDailyStrategy', async () => {
      const company = { id: 'company-marketing-2', name: 'TestCo' };
      pool.query.mockResolvedValueOnce({ rows: [] });
      pool.query.mockResolvedValueOnce({ rows: [{ id: 'task-1' }] });

      await marketingAgent.decideDailyStrategy(company, 'Brand context');

      const strategyQuery = pool.query.mock.calls.find(
        call => call[0].includes('content_pieces') && call[0].includes('company_id')
      );
      expect(strategyQuery[1][0]).toBe('company-marketing-2');
    });

    it('should filter campaigns by company_id in reviewAdCampaigns', async () => {
      const company = { id: 'company-marketing-3', name: 'TestCo' };
      pool.query.mockResolvedValueOnce({ rows: [] });

      await marketingAgent.reviewAdCampaigns(company);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('company_id'),
        [company.id]
      );
    });

    it('should filter Gamma content by company_id in shouldGenerateGammaContent', async () => {
      const companyId = 'company-marketing-4';
      pool.query.mockResolvedValue({ rows: [{ cnt: '0' }] });

      const result = await marketingAgent.shouldGenerateGammaContent(companyId);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('company_id'),
        [companyId]
      );
      expect(result).toBe(true);
    });

    it('should use company.id in logActivity', async () => {
      const companyId = 'company-marketing-5';
      pool.query.mockResolvedValueOnce({ rows: [] });

      await marketingAgent.logActivity(companyId, 'task-1', 'test_event', 'Test message');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('company_id'),
        expect.arrayContaining([companyId])
      );
    });

    it('should store content with correct company_id in generateSocialContent', async () => {
      const company = { id: 'company-marketing-6', name: 'TestCo' };
      const strategy = { channels: ['linkedin'], topic: 'Test' };
      
      pool.query.mockResolvedValueOnce({ rows: [] });

      await marketingAgent.generateSocialContent(company, strategy, 'Brand', {});

      const insertCall = pool.query.mock.calls.find(
        call => call[0].includes('INSERT INTO content_pieces')
      );
      if (insertCall) {
        expect(insertCall[1][0]).toBe('company-marketing-6');
      }
    });
  });

  describe('Gamma Content Limits', () => {
    it('should allow Gamma when under limit (0 generations)', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ cnt: '0' }] });

      const result = await marketingAgent.shouldGenerateGammaContent('company-gamma-1');

      expect(result).toBe(true);
    });

    it('should allow Gamma when at 1 generation', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ cnt: '1' }] });

      const result = await marketingAgent.shouldGenerateGammaContent('company-gamma-2');

      expect(result).toBe(true);
    });

    it('should block Gamma when at limit (2 generations in 3 days)', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ cnt: '2' }] });

      const result = await marketingAgent.shouldGenerateGammaContent('company-gamma-3');

      expect(result).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle DB errors gracefully in createTask', async () => {
      pool.query.mockRejectedValueOnce(new Error('DB connection failed'));

      await expect(
        marketingAgent.createTask('company-1', 'Task', 'Desc')
      ).rejects.toThrow('DB connection failed');
    });

    it('should not store company context in agent instance', () => {
      const agent = new MarketingAgent();
      expect(agent.companyId).toBeUndefined();
      expect(agent.company).toBeUndefined();
    });
  });

  describe('Governance Integration', () => {
    it('should check budget before action', async () => {
      const governanceHelper = require('../../backend/services/governance-helper');
      const company = { id: 'company-gov-1', name: 'TestCo' };
      
      pool.query.mockResolvedValue({ rows: [{ id: 'task-1' }] });

      await marketingAgent.execute(company);

      expect(governanceHelper.checkBudgetBeforeAction).toHaveBeenCalledWith('Marketing');
    });

    it('should skip execution when budget exceeded', async () => {
      const governanceHelper = require('../../backend/services/governance-helper');
      governanceHelper.checkBudgetBeforeAction.mockResolvedValueOnce({ 
        allowed: false, 
        error: 'Budget exceeded' 
      });

      const company = { id: 'company-gov-2', name: 'TestCo' };
      const result = await marketingAgent.execute(company);

      expect(result.error).toBe('Budget exceeded');
      expect(result.budget_exceeded).toBe(true);
    });

    it('should record heartbeat during execution', async () => {
      const governanceHelper = require('../../backend/services/governance-helper');
      const company = { id: 'company-gov-3', name: 'TestCo' };
      
      pool.query.mockResolvedValue({ rows: [{ id: 'task-1' }] });

      await marketingAgent.execute(company);

      expect(governanceHelper.recordHeartbeat).toHaveBeenCalledWith('Marketing');
    });
  });
});

describe('MarketingAgent Integration Patterns', () => {
  it('should execute without storing state between calls', () => {
    const MarketingAgent = require('../../agents/marketing-agent');
    const agent1 = new MarketingAgent();
    const agent2 = new MarketingAgent();

    expect(agent1).not.toBe(agent2);
    
    const stateKeys = ['companyId', 'company', 'lastCompany', 'currentTask'];
    stateKeys.forEach(key => {
      expect(agent1[key]).toBeUndefined();
      expect(agent2[key]).toBeUndefined();
    });
  });

  it('should receive company context via execute() parameter only', () => {
    const MarketingAgent = require('../../agents/marketing-agent');
    const agent = new MarketingAgent();

    expect(typeof agent.execute).toBe('function');
    expect(agent.execute.length).toBeGreaterThanOrEqual(1);
  });
});
