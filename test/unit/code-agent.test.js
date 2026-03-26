const { pool } = require('../__mocks__/db');

jest.mock('../../backend/db', () => require('../__mocks__/db'));
jest.mock('../../backend/services/governance-helper', () => ({
  checkBudgetBeforeAction: jest.fn(() => Promise.resolve({ allowed: true })),
  checkGovernanceStatus: jest.fn(() => Promise.resolve({ allowed: true })),
  recordHeartbeat: jest.fn(() => Promise.resolve()),
  recordBudgetUsage: jest.fn(() => Promise.resolve())
}));
jest.mock('../../backend/middleware/tenant', () => ({
  TenantDB: jest.fn().mockImplementation(() => ({
    createTask: jest.fn(() => Promise.resolve({ id: 'task-1' })),
    logActivity: jest.fn(() => Promise.resolve())
  }))
}));
const mockExecute = jest.fn(() => Promise.resolve({ summary: 'Code executed', deployed: true }));
jest.mock('../../agents/executors/code-executor', () => {
  return jest.fn().mockImplementation(() => ({
    execute: mockExecute
  }));
});

const CodeAgent = require('../../agents/code-agent');

describe('CodeAgent', () => {
  let codeAgent;

  beforeEach(() => {
    codeAgent = new CodeAgent();
    pool.query.mockClear();
  });

  describe('Multi-Tenant Isolation', () => {
    it('should receive company context via execute() parameter', () => {
      expect(typeof codeAgent.execute).toBe('function');
      expect(codeAgent.execute.length).toBeGreaterThanOrEqual(1);
    });

    it('should not store company context in agent instance', () => {
      const agent = new CodeAgent();
      expect(agent.companyId).toBeUndefined();
      expect(agent.company).toBeUndefined();
    });
  });

  describe('Governance Integration', () => {
    it('should check budget before action', async () => {
      const governanceHelper = require('../../backend/services/governance-helper');
      const company = { id: 'company-1', name: 'TestCo' };

      await codeAgent.execute(company);

      expect(governanceHelper.checkBudgetBeforeAction).toHaveBeenCalledWith('Code');
    });

    it('should check governance status before action', async () => {
      const governanceHelper = require('../../backend/services/governance-helper');
      const company = { id: 'company-1', name: 'TestCo' };

      await codeAgent.execute(company);

      expect(governanceHelper.checkGovernanceStatus).toHaveBeenCalledWith('Code');
    });

    it('should record heartbeat after governance checks', async () => {
      const governanceHelper = require('../../backend/services/governance-helper');
      const company = { id: 'company-1', name: 'TestCo' };

      await codeAgent.execute(company);

      expect(governanceHelper.recordHeartbeat).toHaveBeenCalledWith('Code');
    });

    it('should skip execution when budget exceeded', async () => {
      const governanceHelper = require('../../backend/services/governance-helper');
      governanceHelper.checkBudgetBeforeAction.mockResolvedValueOnce({ 
        allowed: false, 
        error: 'Budget exceeded' 
      });

      const company = { id: 'company-1', name: 'TestCo' };
      const result = await codeAgent.execute(company);

      expect(result.error).toBe('Budget exceeded');
      expect(result.budget_exceeded).toBe(true);
      expect(result.action).toBe('skipped');
    });

    it('should skip execution when agent paused', async () => {
      const governanceHelper = require('../../backend/services/governance-helper');
      governanceHelper.checkGovernanceStatus.mockResolvedValueOnce({ 
        allowed: false, 
        paused: true 
      });

      const company = { id: 'company-1', name: 'TestCo' };
      const result = await codeAgent.execute(company);

      expect(result.error).toBe('Code Agent is paused or terminated');
      expect(result.paused).toBe(true);
    });
  });

  describe('Executor Delegation', () => {
    it('should create CodeExecutor instance', () => {
      const CodeExecutor = require('../../agents/executors/code-executor');
      expect(CodeExecutor).toHaveBeenCalled();
    });

    it('should delegate to executor with task and company_id', async () => {
      mockExecute.mockClear();
      const company = { id: 'company-1', name: 'TestCo' };

      await codeAgent.execute(company);

      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({ company_id: 'company-1' })
      );
    });
  });

  describe('TenantDB Integration', () => {
    it('should create TenantDB with company.id', async () => {
      const { TenantDB } = require('../../backend/middleware/tenant');
      const company = { id: 'company-test-123', name: 'TestCo' };

      await codeAgent.execute(company);

      expect(TenantDB).toHaveBeenCalledWith('company-test-123');
    });
  });

  describe('Error Handling', () => {
    it('should propagate errors from executor', async () => {
      mockExecute.mockRejectedValueOnce(new Error('Executor failed'));

      const company = { id: 'company-1', name: 'TestCo' };

      await expect(codeAgent.execute(company)).rejects.toThrow('Executor failed');
    });
  });
});

describe('CodeAgent Integration Patterns', () => {
  it('should execute without storing state between calls', () => {
    const agent1 = new CodeAgent();
    const agent2 = new CodeAgent();

    expect(agent1).not.toBe(agent2);

    const stateKeys = ['companyId', 'company', 'lastCompany', 'currentTask'];
    stateKeys.forEach(key => {
      expect(agent1[key]).toBeUndefined();
      expect(agent2[key]).toBeUndefined();
    });
  });

  it('should be a thin wrapper around CodeExecutor', () => {
    const agent = new CodeAgent();
    expect(agent.executor).toBeDefined();
    expect(typeof agent.executor.execute).toBe('function');
  });
});
