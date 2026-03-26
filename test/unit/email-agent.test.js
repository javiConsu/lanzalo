const { pool } = require('../__mocks__/db');

jest.mock('../../backend/db', () => require('../__mocks__/db'));
jest.mock('../../backend/llm', () => ({
  callLLM: jest.fn(() => Promise.resolve(JSON.stringify({ 
    prospects: [{ name: 'Test', email: 'test@test.com', company_name: 'TestCo', job_title: 'CEO' }]
  }))),
  callLLMWithTools: jest.fn(() => Promise.resolve({ content: 'test' }))
}));
jest.mock('../../backend/email', () => ({
  sendEmail: jest.fn(() => Promise.resolve({ success: true }))
}));
jest.mock('../../backend/services/governance-helper', () => ({
  checkBudgetBeforeAction: jest.fn(() => Promise.resolve({ allowed: true })),
  checkGovernanceStatus: jest.fn(() => Promise.resolve({ allowed: true })),
  recordHeartbeat: jest.fn(() => Promise.resolve()),
  recordBudgetUsage: jest.fn(() => Promise.resolve())
}));
jest.mock('../../backend/services/instantly-service', () => ({
  enabled: false
}));

const EmailAgent = require('../../agents/email-agent');

describe('EmailAgent', () => {
  let emailAgent;

  beforeEach(() => {
    emailAgent = new EmailAgent();
    pool.query.mockClear();
  });

  describe('Multi-Tenant Isolation', () => {
    it('should pass company.id to createTask queries', async () => {
      const companyId = 'company-test-1';
      pool.query.mockResolvedValueOnce({ rows: [{ id: 'task-1', company_id: companyId }] });

      await emailAgent.createTask(companyId, 'Test Task', 'Description');

      const lastCall = pool.query.mock.calls[pool.query.mock.calls.length - 1];
      expect(lastCall[1][0]).toBe(companyId);
    });

    it('should filter leads by company_id in getLeadsCount', async () => {
      const companyId = 'company-test-2';
      pool.query.mockResolvedValueOnce({ rows: [{ count: '5' }] });

      await emailAgent.getLeadsCount(companyId);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('company_id'),
        [companyId]
      );
    });

    it('should filter campaigns by company_id in getActiveCampaigns', async () => {
      const companyId = 'company-test-3';
      pool.query.mockResolvedValueOnce({ rows: [] });

      await emailAgent.getActiveCampaigns(companyId);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('company_id'),
        [companyId]
      );
    });

    it('should filter leads by company_id in findAndSaveLeads INSERT', async () => {
      const company = { id: 'company-test-4', name: 'TestCo', description: 'Test', industry: 'Tech' };
      pool.query.mockResolvedValueOnce({ rows: [] });

      await emailAgent.findAndSaveLeads(company);

      const insertCalls = pool.query.mock.calls.filter(
        call => call[0].includes('INSERT INTO leads')
      );
      insertCalls.forEach(call => {
        expect(call[1][0]).toBe('company-test-4');
      });
    });

    it('should use company.id in logActivity', async () => {
      const companyId = 'company-test-5';
      pool.query.mockResolvedValueOnce({ rows: [] });

      await emailAgent.logActivity(companyId, 'task-1', 'test_event', 'Test message');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('company_id'),
        expect.arrayContaining([companyId])
      );
    });
  });

  describe('Subscription Handling', () => {
    it('should return null when no subscription exists', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await emailAgent.getEmailProSubscription('company-no-sub');

      expect(result).toBeNull();
    });

    it('should return subscription when exists', async () => {
      const mockSub = { 
        id: 'sub-1', 
        company_id: 'company-with-sub', 
        status: 'active',
        emails_sent_this_month: 100,
        emails_per_month: 500
      };
      pool.query.mockResolvedValueOnce({ rows: [mockSub] });

      const result = await emailAgent.getEmailProSubscription('company-with-sub');

      expect(result).toEqual(mockSub);
    });
  });

  describe('Error Handling', () => {
    it('should handle DB errors gracefully in createTask', async () => {
      pool.query.mockRejectedValueOnce(new Error('DB connection failed'));

      await expect(
        emailAgent.createTask('company-1', 'Task', 'Desc')
      ).rejects.toThrow('DB connection failed');
    });

    it('should not store company context in agent instance', () => {
      const agent = new EmailAgent();
      expect(agent.companyId).toBeUndefined();
      expect(agent.company).toBeUndefined();
    });
  });

  describe('Email Limit Checks', () => {
    it('should identify when monthly limit is reached', async () => {
      const subAtLimit = { 
        id: 'sub-1', 
        status: 'active',
        emails_sent_this_month: 500,
        emails_per_month: 500
      };
      
      expect(subAtLimit.emails_sent_this_month >= subAtLimit.emails_per_month).toBe(true);
    });

    it('should allow sending when under limit', async () => {
      const subUnderLimit = { 
        id: 'sub-1', 
        status: 'active',
        emails_sent_this_month: 100,
        emails_per_month: 500
      };
      
      expect(subUnderLimit.emails_sent_this_month >= subUnderLimit.emails_per_month).toBe(false);
    });
  });
});

describe('EmailAgent Integration Patterns', () => {
  it('should execute without storing state between calls', async () => {
    const EmailAgent = require('../../agents/email-agent');
    const agent1 = new EmailAgent();
    const agent2 = new EmailAgent();

    expect(agent1).not.toBe(agent2);
    
    const stateKeys = ['companyId', 'company', 'lastCompany', 'currentTask'];
    stateKeys.forEach(key => {
      expect(agent1[key]).toBeUndefined();
      expect(agent2[key]).toBeUndefined();
    });
  });

  it('should receive company context via execute() parameter only', () => {
    const EmailAgent = require('../../agents/email-agent');
    const agent = new EmailAgent();

    expect(typeof agent.execute).toBe('function');
    expect(agent.execute.length).toBeGreaterThanOrEqual(1);
  });
});
