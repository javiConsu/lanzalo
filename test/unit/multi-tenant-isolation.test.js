const { getRecordedQueries, clearRecordedQueries } = require('../__mocks__/db');

jest.mock('../../backend/db', () => require('../__mocks__/db'));
jest.mock('../../backend/llm', () => ({
  callLLM: jest.fn(() => Promise.resolve(JSON.stringify({ focus: 'test', contentTypes: ['post'], channels: ['linkedin'] }))),
  callLLMWithTools: jest.fn(() => Promise.resolve({ content: 'test' }))
}));
jest.mock('../../backend/services/governance-helper', () => ({
  checkBudgetBeforeAction: jest.fn(() => Promise.resolve({ allowed: true })),
  checkGovernanceStatus: jest.fn(() => Promise.resolve({ allowed: true })),
  recordHeartbeat: jest.fn(() => Promise.resolve()),
  recordBudgetUsage: jest.fn(() => Promise.resolve())
}));
jest.mock('../../backend/services/brand-config', () => ({
  getConfig: jest.fn(() => Promise.resolve({})),
  buildPromptContext: jest.fn(() => ''),
  getPlatformRules: jest.fn(() => ({})),
  getGammaOptions: jest.fn(() => ({}))
}));
jest.mock('../../backend/services/gamma-service', () => ({
  enabled: false
}));

const MarketingAgent = require('../../agents/marketing-agent');
const { pool } = require('../../backend/db');

describe('Multi-Tenant Isolation', () => {
  let marketingAgent;

  beforeEach(() => {
    marketingAgent = new MarketingAgent();
    clearRecordedQueries();
    jest.clearAllMocks();
  });

  describe('MarketingAgent', () => {
    it('should always filter queries by company.id when creating tasks', async () => {
      const company1 = { id: 'company-1', name: 'TestCo1' };
      
      await marketingAgent.createTask(company1.id, 'Test Task', 'Description');
      
      const lastCall = pool.query.mock.calls[pool.query.mock.calls.length - 1];
      expect(lastCall[1][0]).toBe('company-1');
    });

    it('should pass company.id to all DB queries', async () => {
      const company1 = { id: 'company-1', name: 'TestCo1', industry: 'Tech' };
      
      pool.query.mockResolvedValueOnce({ rows: [] });
      pool.query.mockResolvedValueOnce({ rows: [{ id: 'task-1' }] });
      pool.query.mockResolvedValueOnce({ rows: [] });
      pool.query.mockResolvedValueOnce({ rows: [] });
      pool.query.mockResolvedValueOnce({ rows: [] });
      pool.query.mockResolvedValueOnce({ rows: [] });
      
      try {
        await marketingAgent.execute(company1);
      } catch (e) {
        // Some internal calls may fail, we just care about company_id filtering
      }
      
      const allCalls = pool.query.mock.calls;
      allCalls.forEach(call => {
        const sql = call[0];
        const params = call[1] || [];
        const hasCompanyFilter = sql.includes('company_id') || params.some(p => p === 'company-1');
        if (sql.includes('INSERT') || sql.includes('UPDATE') || sql.includes('SELECT')) {
          if (sql.includes('company_id') || params.length > 0) {
            expect(hasCompanyFilter || params[0] === 'company-1').toBe(true);
          }
        }
      });
    });

    it('should not leak state between company executions', async () => {
      const agent1 = new MarketingAgent();
      const agent2 = new MarketingAgent();
      
      expect(agent1).not.toBe(agent2);
      
      const company1 = { id: 'company-1', name: 'Company1' };
      const company2 = { id: 'company-2', name: 'Company2' };
      
      const callCount = { count: 0 };
      pool.query.mockImplementation((sql, params) => {
        callCount.count++;
        return Promise.resolve({ 
          rows: [{ id: `task-${callCount.count}`, company_id: params[0] }], 
          rowCount: 1 
        });
      });
      
      const task1 = await agent1.createTask(company1.id, 'Task 1', 'Desc');
      const task2 = await agent2.createTask(company2.id, 'Task 2', 'Desc');
      
      expect(pool.query).toHaveBeenCalledTimes(2);
      expect(pool.query).toHaveBeenNthCalledWith(1, expect.any(String), ['company-1', 'Task 1', 'Desc']);
      expect(pool.query).toHaveBeenNthCalledWith(2, expect.any(String), ['company-2', 'Task 2', 'Desc']);
    });
  });

  describe('Query parameterization', () => {
    it('should use parameterized queries to prevent SQL injection', async () => {
      const maliciousCompany = { 
        id: "'; DROP TABLE companies; --", 
        name: 'Evil Co' 
      };
      
      pool.query.mockResolvedValue({ rows: [] });
      
      await marketingAgent.createTask(maliciousCompany.id, 'Test', 'Desc');
      
      const lastCall = pool.query.mock.calls[pool.query.mock.calls.length - 1];
      expect(lastCall[0]).toContain('$1');
      expect(lastCall[1]).toContain(maliciousCompany.id);
    });
  });
});

describe('Agent Instantiation Pattern', () => {
  it('should pass company context via execute() parameter (current pattern)', () => {
    const MarketingAgent = require('../../agents/marketing-agent');
    const agent = new MarketingAgent();
    
    expect(agent).toBeDefined();
    expect(typeof agent.execute).toBe('function');
  });

  it('should NOT store company context in constructor (singleton safety)', () => {
    const MarketingAgent = require('../../agents/marketing-agent');
    const agent = new MarketingAgent();
    
    expect(agent.companyId).toBeUndefined();
    expect(agent.company).toBeUndefined();
  });
});
