const db = require('../__mocks__/db');

jest.mock('../../backend/db', () => require('../__mocks__/db'));
jest.mock('../../backend/llm', () => ({
  callLLM: jest.fn(() => Promise.resolve(JSON.stringify({
    summary: 'Test Strategy',
    topics: [{ type: 'educational', angle: 'test', keywords: [] }]
  })))
}));
jest.mock('../../backend/twitter', () => ({
  postTweet: jest.fn(() => Promise.resolve({ id: 'tweet-123' }))
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
  getPlatformRules: jest.fn(() => ({ max_chars: 280, hashtags: 2 }))
}));

const TwitterAgent = require('../../agents/twitter-agent');

describe('TwitterAgent', () => {
  let twitterAgent;

  beforeEach(() => {
    twitterAgent = new TwitterAgent();
    jest.clearAllMocks();
    db.clearRecordedQueries();
  });

  describe('Multi-Tenant Isolation', () => {
    it('should pass company.id to createTask in execute', async () => {
      const company = { id: 'company-twitter-1', name: 'TestCo', description: 'Test' };

      await twitterAgent.execute(company);

      expect(db.createTask).toHaveBeenCalledWith('company-twitter-1', 'twitter', expect.any(String), expect.any(String));
    });

    it('should pass company.id to logActivity', async () => {
      const company = { id: 'company-twitter-2', name: 'TestCo', description: 'Test' };

      await twitterAgent.execute(company);

      expect(db.logActivity).toHaveBeenCalledWith('company-twitter-2', expect.any(String), expect.any(String), expect.any(String));
    });

    it('should pass company.id to createTweet', async () => {
      const callLLM = require('../../backend/llm').callLLM;
      callLLM.mockResolvedValueOnce(JSON.stringify({
        summary: 'Test Strategy',
        topics: [{ type: 'educational', angle: 'test', keywords: [] }]
      }));
      callLLM.mockResolvedValueOnce(JSON.stringify({ content: 'Test tweet content', mediaUrl: null }));

      const company = { id: 'company-twitter-3', name: 'TestCo', description: 'Test', twitter_automation_enabled: false };

      await twitterAgent.execute(company);

      expect(db.createTweet).toHaveBeenCalledWith('company-twitter-3', expect.any(String), null, 'draft');
    });

    it('should use company.id in brandConfig.getConfig call', async () => {
      const brandConfig = require('../../backend/services/brand-config');
      const company = { id: 'company-twitter-4', name: 'TestCo', description: 'Test' };

      await twitterAgent.execute(company);

      expect(brandConfig.getConfig).toHaveBeenCalledWith('company-twitter-4');
    });

    it('should not store company context in agent instance', () => {
      const agent = new TwitterAgent();
      expect(agent.companyId).toBeUndefined();
      expect(agent.company).toBeUndefined();
    });
  });

  describe('Governance Integration', () => {
    it('should check budget before action', async () => {
      const governanceHelper = require('../../backend/services/governance-helper');
      const company = { id: 'company-gov-1', name: 'TestCo', description: 'Test' };

      await twitterAgent.execute(company);

      expect(governanceHelper.checkBudgetBeforeAction).toHaveBeenCalledWith('Twitter');
    });

    it('should skip execution when budget exceeded', async () => {
      const governanceHelper = require('../../backend/services/governance-helper');
      governanceHelper.checkBudgetBeforeAction.mockResolvedValueOnce({
        allowed: false,
        error: 'Budget exceeded'
      });

      const company = { id: 'company-gov-2', name: 'TestCo' };
      const result = await twitterAgent.execute(company);

      expect(result.error).toBe('Budget exceeded');
      expect(result.budget_exceeded).toBe(true);
    });

    it('should skip execution when agent paused', async () => {
      const governanceHelper = require('../../backend/services/governance-helper');
      governanceHelper.checkGovernanceStatus.mockResolvedValueOnce({
        allowed: false,
        paused: true,
        terminated: false
      });

      const company = { id: 'company-gov-3', name: 'TestCo' };
      const result = await twitterAgent.execute(company);

      expect(result.paused).toBe(true);
      expect(result.error).toContain('paused');
    });

    it('should record heartbeat during execution', async () => {
      const governanceHelper = require('../../backend/services/governance-helper');
      const company = { id: 'company-gov-4', name: 'TestCo', description: 'Test' };

      await twitterAgent.execute(company);

      expect(governanceHelper.recordHeartbeat).toHaveBeenCalledWith('Twitter');
    });
  });

  describe('Tweet Generation', () => {
    it('should generate tweet strategy for company', async () => {
      const company = { id: 'company-strategy-1', name: 'TestCo', description: 'Test', industry: 'Tech' };
      const strategy = await twitterAgent.getTweetStrategy(company, 'Brand context');

      expect(strategy).toHaveProperty('summary');
      expect(strategy).toHaveProperty('topics');
    });

    it('should generate tweet content', async () => {
      const callLLM = require('../../backend/llm').callLLM;
      callLLM.mockResolvedValueOnce(JSON.stringify({ content: 'Test tweet content', mediaUrl: null }));

      const company = { id: 'company-tweet-1', name: 'TestCo' };
      const topic = { type: 'educational', angle: 'test', keywords: ['test'] };
      const brand = { voice: {} };

      const tweet = await twitterAgent.generateTweet(company, topic, 'Brand context', brand);

      expect(tweet).toHaveProperty('content');
    });

    it('should respect max_chars from platform rules', async () => {
      const callLLM = require('../../backend/llm').callLLM;
      callLLM.mockResolvedValueOnce(JSON.stringify({ content: 'Test', mediaUrl: null }));

      const company = { id: 'company-tweet-2', name: 'TestCo' };
      const topic = { type: 'educational', angle: 'test', keywords: [] };
      const brand = { voice: {} };

      await twitterAgent.generateTweet(company, topic, 'Brand context', brand);

      const lastCall = callLLM.mock.calls[callLLM.mock.calls.length - 1];
      expect(lastCall[0]).toContain('280');
    });
  });

  describe('Error Handling', () => {
    it('should handle governance budget exceeded gracefully', async () => {
      const governanceHelper = require('../../backend/services/governance-helper');
      governanceHelper.checkBudgetBeforeAction.mockResolvedValueOnce({ allowed: false, error: 'Budget exceeded' });

      const company = { id: 'company-error-1', name: 'TestCo', description: 'Test' };
      const result = await twitterAgent.execute(company);

      expect(result.error).toBe('Budget exceeded');
      expect(result.budget_exceeded).toBe(true);
    });

    it('should handle LLM JSON parse errors in getTweetStrategy', async () => {
      const callLLM = require('../../backend/llm').callLLM;
      callLLM.mockResolvedValueOnce('invalid json');

      const company = { id: 'company-parse-1', name: 'TestCo' };
      const strategy = await twitterAgent.getTweetStrategy(company, 'Brand');

      expect(strategy).toHaveProperty('summary');
      expect(strategy).toHaveProperty('topics');
    });

    it('should handle LLM JSON parse errors in generateTweet', async () => {
      const callLLM = require('../../backend/llm').callLLM;
      callLLM.mockResolvedValueOnce('invalid json');

      const company = { id: 'company-parse-2', name: 'TestCo' };
      const topic = { type: 'test', angle: 'test', keywords: [] };
      const brand = { voice: {} };

      const tweet = await twitterAgent.generateTweet(company, topic, 'Brand', brand);

      expect(tweet).toHaveProperty('content');
    });
  });

  describe('Custom Task Execution', () => {
    it('should execute custom task with brand context', async () => {
      const callLLM = require('../../backend/llm').callLLM;
      callLLM.mockResolvedValueOnce(JSON.stringify({ content: 'Custom tweet', mediaUrl: null }));

      const company = { id: 'company-custom-1', name: 'TestCo' };

      const result = await twitterAgent.executeCustomTask(company, 'Tweet about AI');

      expect(result).toHaveProperty('content');
    });
  });
});

describe('TwitterAgent Integration Patterns', () => {
  it('should execute without storing state between calls', () => {
    const agent1 = new TwitterAgent();
    const agent2 = new TwitterAgent();

    expect(agent1).not.toBe(agent2);

    const stateKeys = ['companyId', 'company', 'lastCompany', 'currentTask'];
    stateKeys.forEach(key => {
      expect(agent1[key]).toBeUndefined();
      expect(agent2[key]).toBeUndefined();
    });
  });

  it('should receive company context via execute() parameter only', () => {
    const agent = new TwitterAgent();

    expect(typeof agent.execute).toBe('function');
    expect(agent.execute.length).toBeGreaterThanOrEqual(1);
  });
});
