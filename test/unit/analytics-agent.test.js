const db = require('../__mocks__/db');

jest.mock('../../backend/db', () => require('../__mocks__/db'));
jest.mock('../../backend/llm', () => ({
  callLLM: jest.fn(() => Promise.resolve(JSON.stringify({
    summary: 'Test Analysis',
    insights: ['insight1'],
    recommendations: ['rec1']
  })))
}));
jest.mock('../../backend/services/governance-helper', () => ({
  checkBudgetBeforeAction: jest.fn(() => Promise.resolve({ allowed: true })),
  checkGovernanceStatus: jest.fn(() => Promise.resolve({ allowed: true })),
  recordHeartbeat: jest.fn(() => Promise.resolve()),
  recordBudgetUsage: jest.fn(() => Promise.resolve())
}));

const AnalyticsAgent = require('../../agents/analytics-agent');

describe('AnalyticsAgent', () => {
  let analyticsAgent;

  beforeEach(() => {
    analyticsAgent = new AnalyticsAgent();
    jest.clearAllMocks();
    db.clearRecordedQueries();
  });

  describe('Multi-Tenant Isolation', () => {
    it('should pass company.id to createTask in execute', async () => {
      const company = { id: 'company-analytics-1', name: 'TestCo' };

      await analyticsAgent.execute(company);

      expect(db.createTask).toHaveBeenCalledWith('company-analytics-1', 'analytics', expect.any(String), expect.any(String));
    });

    it('should pass company.id to logActivity', async () => {
      const company = { id: 'company-analytics-2', name: 'TestCo' };

      await analyticsAgent.execute(company);

      expect(db.logActivity).toHaveBeenCalledWith('company-analytics-2', expect.any(String), expect.any(String), expect.any(String));
    });

    it('should pass company.id to recordMetric', async () => {
      const company = { id: 'company-analytics-3', name: 'TestCo' };

      await analyticsAgent.execute(company);

      expect(db.recordMetric).toHaveBeenCalledWith('company-analytics-3', expect.any(String), expect.any(Number));
    });

    it('should not store company context in agent instance', () => {
      const agent = new AnalyticsAgent();
      expect(agent.companyId).toBeUndefined();
      expect(agent.company).toBeUndefined();
    });

    it('should not leak data between different company executions', async () => {
      const company1 = { id: 'company-isolation-1', name: 'Company1' };
      const company2 = { id: 'company-isolation-2', name: 'Company2' };

      await analyticsAgent.execute(company1);
      await analyticsAgent.execute(company2);

      expect(db.createTask).toHaveBeenCalledWith('company-isolation-1', expect.any(String), expect.any(String), expect.any(String));
      expect(db.createTask).toHaveBeenCalledWith('company-isolation-2', expect.any(String), expect.any(String), expect.any(String));
    });
  });

  describe('Governance Integration', () => {
    it('should check budget before action with Data service type', async () => {
      const governanceHelper = require('../../backend/services/governance-helper');
      const company = { id: 'company-gov-1', name: 'TestCo' };

      await analyticsAgent.execute(company);

      expect(governanceHelper.checkBudgetBeforeAction).toHaveBeenCalledWith('Data');
    });

    it('should skip execution when budget exceeded', async () => {
      const governanceHelper = require('../../backend/services/governance-helper');
      governanceHelper.checkBudgetBeforeAction.mockResolvedValueOnce({
        allowed: false,
        error: 'Budget exceeded'
      });

      const company = { id: 'company-gov-2', name: 'TestCo' };
      const result = await analyticsAgent.execute(company);

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
      const result = await analyticsAgent.execute(company);

      expect(result.paused).toBe(true);
      expect(result.error).toContain('paused');
    });

    it('should skip execution when agent terminated', async () => {
      const governanceHelper = require('../../backend/services/governance-helper');
      governanceHelper.checkGovernanceStatus.mockResolvedValueOnce({
        allowed: false,
        paused: false,
        terminated: true
      });

      const company = { id: 'company-gov-4', name: 'TestCo' };
      const result = await analyticsAgent.execute(company);

      expect(result.terminated).toBe(true);
    });

    it('should record heartbeat during execution', async () => {
      const governanceHelper = require('../../backend/services/governance-helper');
      const company = { id: 'company-gov-5', name: 'TestCo' };

      await analyticsAgent.execute(company);

      expect(governanceHelper.recordHeartbeat).toHaveBeenCalledWith('Data');
    });
  });

  describe('Metrics Collection', () => {
    it('should collect multiple metrics', async () => {
      const company = { id: 'company-metrics-1', name: 'TestCo' };
      const metrics = await analyticsAgent.collectMetrics(company);

      expect(metrics).toBeInstanceOf(Array);
      expect(metrics.length).toBeGreaterThan(0);
    });

    it('should include required metric types', async () => {
      const company = { id: 'company-metrics-2', name: 'TestCo' };
      const metrics = await analyticsAgent.collectMetrics(company);

      const metricNames = metrics.map(m => m.name);
      expect(metricNames).toContain('visitantes');
      expect(metricNames).toContain('conversiones');
      expect(metricNames).toContain('ingresos');
      expect(metricNames).toContain('engagement');
    });

    it('should return metrics with name and value', async () => {
      const company = { id: 'company-metrics-3', name: 'TestCo' };
      const metrics = await analyticsAgent.collectMetrics(company);

      metrics.forEach(metric => {
        expect(metric).toHaveProperty('name');
        expect(metric).toHaveProperty('value');
      });
    });
  });

  describe('Metrics Analysis', () => {
    it('should analyze metrics and return insights', async () => {
      const company = { id: 'company-analysis-1', name: 'TestCo' };
      const metrics = [
        { name: 'visitantes', value: 100 },
        { name: 'conversiones', value: 10 }
      ];

      const analysis = await analyticsAgent.analyzeMetrics(company, metrics);

      expect(analysis).toHaveProperty('summary');
    });

    it('should handle LLM JSON parse errors in analyzeMetrics', async () => {
      const callLLM = require('../../backend/llm').callLLM;
      callLLM.mockResolvedValueOnce('invalid json response');

      const company = { id: 'company-analysis-2', name: 'TestCo' };
      const metrics = [{ name: 'test', value: 1 }];

      const analysis = await analyticsAgent.analyzeMetrics(company, metrics);

      expect(analysis).toHaveProperty('summary');
    });

    it('should pass company name in analysis prompt', async () => {
      const callLLM = require('../../backend/llm').callLLM;
      const company = { id: 'company-analysis-3', name: 'UniqueCompanyName' };
      const metrics = [{ name: 'test', value: 1 }];

      await analyticsAgent.analyzeMetrics(company, metrics);

      const lastCall = callLLM.mock.calls[callLLM.mock.calls.length - 1];
      expect(lastCall[0]).toContain('UniqueCompanyName');
    });
  });

  describe('Error Handling', () => {
    it('should handle governance budget exceeded gracefully', async () => {
      const governanceHelper = require('../../backend/services/governance-helper');
      governanceHelper.checkBudgetBeforeAction.mockResolvedValueOnce({ allowed: false, error: 'Budget exceeded' });

      const company = { id: 'company-error-1', name: 'TestCo' };
      const result = await analyticsAgent.execute(company);

      expect(result.error).toBe('Budget exceeded');
      expect(result.budget_exceeded).toBe(true);
    });

    it('should handle governance paused gracefully', async () => {
      const governanceHelper = require('../../backend/services/governance-helper');
      governanceHelper.checkGovernanceStatus.mockResolvedValueOnce({ allowed: false, paused: true, terminated: false });

      const company = { id: 'company-error-2', name: 'TestCo' };
      const result = await analyticsAgent.execute(company);

      expect(result.paused).toBe(true);
    });
  });

  describe('Custom Task Execution', () => {
    it('should execute custom task', async () => {
      const company = { id: 'company-custom-1', name: 'TestCo' };

      const result = await analyticsAgent.executeCustomTask(company, 'Analyze user retention');

      expect(result).toBeDefined();
    });

    it('should handle JSON response in custom task', async () => {
      const callLLM = require('../../backend/llm').callLLM;
      callLLM.mockResolvedValueOnce(JSON.stringify({ analysis: 'test result' }));

      const company = { id: 'company-custom-2', name: 'TestCo' };
      const result = await analyticsAgent.executeCustomTask(company, 'Test task');

      expect(result).toHaveProperty('analysis');
    });

    it('should handle non-JSON response in custom task', async () => {
      const callLLM = require('../../backend/llm').callLLM;
      callLLM.mockResolvedValueOnce('Plain text response');

      const company = { id: 'company-custom-3', name: 'TestCo' };
      const result = await analyticsAgent.executeCustomTask(company, 'Test task');

      expect(result).toHaveProperty('response');
    });
  });
});

describe('AnalyticsAgent Integration Patterns', () => {
  it('should execute without storing state between calls', () => {
    const agent1 = new AnalyticsAgent();
    const agent2 = new AnalyticsAgent();

    expect(agent1).not.toBe(agent2);

    const stateKeys = ['companyId', 'company', 'lastCompany', 'currentTask'];
    stateKeys.forEach(key => {
      expect(agent1[key]).toBeUndefined();
      expect(agent2[key]).toBeUndefined();
    });
  });

  it('should receive company context via execute() parameter only', () => {
    const agent = new AnalyticsAgent();

    expect(typeof agent.execute).toBe('function');
    expect(agent.execute.length).toBeGreaterThanOrEqual(1);
  });
});
