const { pool } = require('../__mocks__/db');

jest.mock('../../backend/db', () => require('../__mocks__/db'));
jest.mock('../../backend/llm', () => ({
  callLLM: jest.fn(() => Promise.resolve({ 
    content: JSON.stringify({
      status: 'healthy',
      summary: 'Platform is profitable',
      problems: [],
      risks: ['Market saturation'],
      opportunities: ['Enterprise tier']
    })
  }))
}));

const FinancialAgent = require('../../agents/financial-agent');

describe('FinancialAgent', () => {
  let financialAgent;

  beforeEach(() => {
    financialAgent = new FinancialAgent();
    pool.query.mockClear();
  });

  describe('Initialization', () => {
    it('should initialize with empty decisions and actions', () => {
      const agent = new FinancialAgent();
      expect(agent.decisions).toEqual([]);
      expect(agent.actions).toEqual([]);
    });

    it('should not store company context (global agent)', () => {
      const agent = new FinancialAgent();
      expect(agent.companyId).toBeUndefined();
      expect(agent.company).toBeUndefined();
    });
  });

  describe('getFinancialData', () => {
    it('should query pro users count', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ pro_users: '10' }] });
      pool.query.mockResolvedValueOnce({ rows: [{ total: '50' }] });
      pool.query.mockResolvedValueOnce({ rows: [] });

      const data = await financialAgent.getFinancialData();

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("plan = 'pro'")
      );
    });

    it('should calculate MRR from pro users', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ pro_users: '5' }] });
      pool.query.mockResolvedValueOnce({ rows: [{ total: '50' }] });
      pool.query.mockResolvedValueOnce({ rows: [] });

      const data = await financialAgent.getFinancialData();

      expect(data.mrr).toBe(5 * 39);
      expect(data.proUsers).toBe(5);
    });

    it('should query LLM costs from last 30 days', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ pro_users: '10' }] });
      pool.query.mockResolvedValueOnce({ rows: [{ total: '100' }] });
      pool.query.mockResolvedValueOnce({ rows: [] });

      await financialAgent.getFinancialData();

      const costQuery = pool.query.mock.calls.find(
        call => call[0].includes('llm_usage')
      );
      expect(costQuery[0]).toContain('-30 days');
    });

    it('should calculate profit and margin', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ pro_users: '10' }] });
      pool.query.mockResolvedValueOnce({ rows: [{ total: '100' }] });
      pool.query.mockResolvedValueOnce({ rows: [] });

      const data = await financialAgent.getFinancialData();

      const expectedMRR = 10 * 39;
      const expectedCosts = 100 + 60;
      const expectedProfit = expectedMRR - expectedCosts;

      expect(data.profit).toBe(expectedProfit);
      expect(data.costs.infra).toBe(60);
    });

    it('should handle zero MRR gracefully', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ pro_users: '0' }] });
      pool.query.mockResolvedValueOnce({ rows: [{ total: '50' }] });
      pool.query.mockResolvedValueOnce({ rows: [] });

      const data = await financialAgent.getFinancialData();

      expect(data.mrr).toBe(0);
      expect(data.margin).toBe(0);
    });
  });

  describe('makeDecisions', () => {
    it('should recommend price increase when margin is low', async () => {
      const data = {
        margin: 20,
        mrr: 100,
        costs: { llm: 50, infra: 60, total: 110 },
        profit: -10,
        companies: []
      };

      const decisions = await financialAgent.makeDecisions({}, data);

      const pricingDecision = decisions.find(d => d.type === 'pricing' && d.action === 'increase_price');
      expect(pricingDecision).toBeDefined();
      expect(pricingDecision.autoExecute).toBe(false);
    });

    it('should recommend price decrease when margin is very high', async () => {
      const data = {
        margin: 80,
        mrr: 1000,
        costs: { llm: 100, infra: 60, total: 160 },
        profit: 840,
        companies: []
      };

      const decisions = await financialAgent.makeDecisions({}, data);

      const pricingDecision = decisions.find(d => d.type === 'pricing' && d.action === 'decrease_price');
      expect(pricingDecision).toBeDefined();
    });

    it('should flag unprofitable free tier companies', async () => {
      const data = {
        margin: 50,
        mrr: 500,
        costs: { llm: 100, infra: 60, total: 160 },
        profit: 340,
        companies: [
          { id: 'c1', name: 'Co1', plan: 'free', cost: 15, revenue: 0, profitable: false }
        ]
      };

      const decisions = await financialAgent.makeDecisions({}, data);

      const companyDecision = decisions.find(d => d.action === 'force_upgrade');
      expect(companyDecision).toBeDefined();
      expect(companyDecision.companyId).toBe('c1');
    });

    it('should recommend cheaper models for high-cost pro users', async () => {
      const data = {
        margin: 50,
        mrr: 500,
        costs: { llm: 100, infra: 60, total: 160 },
        profit: 340,
        companies: [
          { id: 'c2', name: 'Co2', plan: 'pro', cost: 60, revenue: 39, profitable: false }
        ]
      };

      const decisions = await financialAgent.makeDecisions({}, data);

      const modelDecision = decisions.find(d => d.action === 'use_cheaper_models');
      expect(modelDecision).toBeDefined();
      expect(modelDecision.autoExecute).toBe(true);
    });

    it('should recommend growth investment when profitable', async () => {
      const data = {
        margin: 60,
        mrr: 1000,
        costs: { llm: 200, infra: 60, total: 260 },
        profit: 740,
        companies: []
      };

      const decisions = await financialAgent.makeDecisions({}, data);

      const growthDecision = decisions.find(d => d.type === 'growth');
      expect(growthDecision).toBeDefined();
      expect(growthDecision.amount).toBe(Math.floor(740 * 0.3));
    });

    it('should alert when below break-even', async () => {
      const data = {
        margin: -50,
        mrr: 100,
        costs: { llm: 100, infra: 60, total: 160 },
        profit: -60,
        proUsers: 2,
        companies: []
      };

      const decisions = await financialAgent.makeDecisions({}, data);

      const alertDecision = decisions.find(d => d.action === 'acquire_users');
      expect(alertDecision).toBeDefined();
      expect(alertDecision.priority).toBe('critical');
    });
  });

  describe('executeActions', () => {
    it('should skip actions that require manual approval', async () => {
      const decisions = [
        { type: 'pricing', action: 'increase_price', autoExecute: false }
      ];

      const actions = await financialAgent.executeActions(decisions);

      expect(actions[0].executed).toBe(false);
      expect(actions[0].reason).toBe('Requiere aprobación manual');
    });

    it('should execute force_upgrade action', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const decisions = [
        { 
          action: 'force_upgrade', 
          companyId: 'c1', 
          autoExecute: true 
        }
      ];

      const actions = await financialAgent.executeActions(decisions);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'paused'"),
        ['c1']
      );
      expect(actions[0].executed).toBe(true);
    });

    it('should execute limit_quotas action', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const decisions = [
        { 
          action: 'limit_quotas', 
          companyId: 'c2', 
          autoExecute: true 
        }
      ];

      const actions = await financialAgent.executeActions(decisions);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('cost_limit_daily'),
        ['c2']
      );
      expect(actions[0].executed).toBe(true);
    });

    it('should execute use_cheaper_models action', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const decisions = [
        { 
          action: 'use_cheaper_models', 
          companyId: 'c3', 
          autoExecute: true 
        }
      ];

      const actions = await financialAgent.executeActions(decisions);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('model_override'),
        ['c3']
      );
      expect(actions[0].executed).toBe(true);
    });

    it('should handle unknown actions gracefully', async () => {
      const decisions = [
        { action: 'unknown_action', autoExecute: true }
      ];

      const actions = await financialAgent.executeActions(decisions);

      expect(actions[0].executed).toBe(false);
      expect(actions[0].result.reason).toBe('Acción no implementada');
    });

    it('should handle execution errors', async () => {
      pool.query.mockRejectedValueOnce(new Error('DB error'));

      const decisions = [
        { 
          action: 'force_upgrade', 
          companyId: 'c1', 
          autoExecute: true 
        }
      ];

      const actions = await financialAgent.executeActions(decisions);

      expect(actions[0].executed).toBe(false);
      expect(actions[0].error).toBe('DB error');
    });
  });

  describe('SQL Parameter Safety', () => {
    it('should use parameterized query for force_upgrade', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await financialAgent.forceUpgrade('company-123');

      const call = pool.query.mock.calls[pool.query.mock.calls.length - 1];
      expect(call[0]).not.toContain('company-123');
      expect(call[1]).toContain('company-123');
    });

    it('should use parameterized query for limitQuotas', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await financialAgent.limitQuotas('company-456');

      const call = pool.query.mock.calls[pool.query.mock.calls.length - 1];
      expect(call[0]).not.toContain('company-456');
      expect(call[1]).toContain('company-456');
    });

    it('should use parameterized query for useCheaperModels', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await financialAgent.useCheaperModels('company-789');

      const call = pool.query.mock.calls[pool.query.mock.calls.length - 1];
      expect(call[0]).not.toContain('company-789');
      expect(call[1]).toContain('company-789');
    });
  });

  describe('Global Agent Behavior', () => {
    it('should execute without company parameter (global scope)', () => {
      expect(financialAgent.execute.length).toBe(0);
    });

    it('should analyze all companies, not just one', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ pro_users: '10' }] });
      pool.query.mockResolvedValueOnce({ rows: [{ total: '100' }] });
      pool.query.mockResolvedValueOnce({ 
        rows: [
          { id: 'c1', name: 'Co1', plan: 'pro', cost: '10' },
          { id: 'c2', name: 'Co2', plan: 'free', cost: '5' }
        ] 
      });
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await financialAgent.execute();

      expect(result.success).toBe(true);
      expect(result.analysis).toBeDefined();
    });
  });
});
