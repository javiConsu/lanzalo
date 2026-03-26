jest.mock('../../backend/db', () => require('../__mocks__/db'));
jest.mock('node-cron', () => ({
  schedule: jest.fn()
}));

const mockCodeAgent = { execute: jest.fn(() => Promise.resolve({ summary: 'code done' })) };
const mockMarketingAgent = { execute: jest.fn(() => Promise.resolve({ summary: 'marketing done' })) };
const mockEmailAgent = { execute: jest.fn(() => Promise.resolve({ summary: 'email done' })) };
const mockTwitterAgent = { execute: jest.fn(() => Promise.resolve({ summary: 'twitter done' })) };
const mockMetaAdsAgent = { execute: jest.fn(() => Promise.resolve({ summary: 'meta done' })) };
const mockAnalyticsAgent = { execute: jest.fn(() => Promise.resolve({ summary: 'analytics done' })) };
const mockFeedbackProcessor = { execute: jest.fn(() => Promise.resolve({ summary: 'feedback done' })) };

jest.mock('../../agents/code-agent', () => jest.fn(() => mockCodeAgent));
jest.mock('../../agents/marketing-agent', () => jest.fn(() => mockMarketingAgent));
jest.mock('../../agents/email-agent', () => jest.fn(() => mockEmailAgent));
jest.mock('../../agents/twitter-agent', () => jest.fn(() => mockTwitterAgent));
jest.mock('../../agents/meta-ads-agent', () => jest.fn(() => mockMetaAdsAgent));
jest.mock('../../agents/analytics-agent', () => jest.fn(() => mockAnalyticsAgent));
jest.mock('../../agents/executors/feedback-processor-executor', () => ({ feedbackProcessor: mockFeedbackProcessor }));

const { logActivity, getActiveCompanies } = require('../../backend/db');

describe('Orchestrator Multi-Tenant Behavior', () => {
  let Orchestrator;
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    Orchestrator = require('../../agents/orchestrator');
  });

  describe('Agent execution', () => {
    it('should pass company object to each agent execute method', async () => {
      const company1 = { id: 'company-1', name: 'TestCo1' };
      
      getActiveCompanies.mockResolvedValueOnce([company1]);
      logActivity.mockResolvedValue({});
      mockCodeAgent.execute.mockResolvedValue({ summary: 'done' });
      mockMarketingAgent.execute.mockResolvedValue({ summary: 'done' });
      mockEmailAgent.execute.mockResolvedValue({ summary: 'done' });
      mockTwitterAgent.execute.mockResolvedValue({ summary: 'done' });
      mockMetaAdsAgent.execute.mockResolvedValue({ summary: 'done' });
      mockAnalyticsAgent.execute.mockResolvedValue({ summary: 'done' });
      mockFeedbackProcessor.execute.mockResolvedValue({ summary: 'done' });
      
      await Orchestrator.runCompanyCycle(company1);
      
      expect(mockCodeAgent.execute).toHaveBeenCalledWith(company1);
      expect(mockMarketingAgent.execute).toHaveBeenCalledWith(company1);
      expect(mockEmailAgent.execute).toHaveBeenCalledWith(company1);
      expect(mockTwitterAgent.execute).toHaveBeenCalledWith(company1);
      expect(mockMetaAdsAgent.execute).toHaveBeenCalledWith(company1);
      expect(mockAnalyticsAgent.execute).toHaveBeenCalledWith(company1);
    });

    it('should log activities with correct company_id', async () => {
      const company1 = { id: 'company-1', name: 'TestCo1' };
      
      logActivity.mockResolvedValue({});
      mockCodeAgent.execute.mockResolvedValue({ summary: 'done' });
      mockMarketingAgent.execute.mockResolvedValue({ summary: 'done' });
      mockEmailAgent.execute.mockResolvedValue({ summary: 'done' });
      mockTwitterAgent.execute.mockResolvedValue({ summary: 'done' });
      mockMetaAdsAgent.execute.mockResolvedValue({ summary: 'done' });
      mockAnalyticsAgent.execute.mockResolvedValue({ summary: 'done' });
      mockFeedbackProcessor.execute.mockResolvedValue({ summary: 'done' });
      
      await Orchestrator.runCompanyCycle(company1);
      
      const logCalls = logActivity.mock.calls;
      logCalls.forEach(call => {
        expect(call[0]).toBe('company-1');
      });
    });

    it('should process multiple companies sequentially', async () => {
      const companies = [
        { id: 'company-1', name: 'Co1' },
        { id: 'company-2', name: 'Co2' }
      ];
      
      getActiveCompanies.mockResolvedValueOnce(companies);
      logActivity.mockResolvedValue({});
      mockCodeAgent.execute.mockResolvedValue({ summary: 'done' });
      mockMarketingAgent.execute.mockResolvedValue({ summary: 'done' });
      mockEmailAgent.execute.mockResolvedValue({ summary: 'done' });
      mockTwitterAgent.execute.mockResolvedValue({ summary: 'done' });
      mockMetaAdsAgent.execute.mockResolvedValue({ summary: 'done' });
      mockAnalyticsAgent.execute.mockResolvedValue({ summary: 'done' });
      mockFeedbackProcessor.execute.mockResolvedValue({ summary: 'done' });
      
      await Orchestrator.runDailyCycle();
      
      expect(mockCodeAgent.execute).toHaveBeenCalledTimes(2);
      expect(mockCodeAgent.execute).toHaveBeenCalledWith(expect.objectContaining({ id: 'company-1' }));
      expect(mockCodeAgent.execute).toHaveBeenCalledWith(expect.objectContaining({ id: 'company-2' }));
    });
  });

  describe('Singleton pattern (current architecture)', () => {
    it('should export a singleton instance', () => {
      expect(Orchestrator).toBeDefined();
      expect(typeof Orchestrator.runDailyCycle).toBe('function');
      expect(typeof Orchestrator.runCompanyCycle).toBe('function');
      expect(typeof Orchestrator.start).toBe('function');
      expect(typeof Orchestrator.stop).toBe('function');
    });

    it('should share agent instances across company cycles', async () => {
      const companies = [
        { id: 'company-1', name: 'Co1' },
        { id: 'company-2', name: 'Co2' }
      ];
      
      getActiveCompanies.mockResolvedValueOnce(companies);
      logActivity.mockResolvedValue({});
      mockCodeAgent.execute.mockResolvedValue({ summary: 'done' });
      mockMarketingAgent.execute.mockResolvedValue({ summary: 'done' });
      mockEmailAgent.execute.mockResolvedValue({ summary: 'done' });
      mockTwitterAgent.execute.mockResolvedValue({ summary: 'done' });
      mockMetaAdsAgent.execute.mockResolvedValue({ summary: 'done' });
      mockAnalyticsAgent.execute.mockResolvedValue({ summary: 'done' });
      mockFeedbackProcessor.execute.mockResolvedValue({ summary: 'done' });
      
      await Orchestrator.runDailyCycle();
      
      // Same agent instance is used for both companies
      // This is the current architectural pattern (safe due to no shared state)
      expect(mockCodeAgent.execute).toHaveBeenCalledTimes(2);
    });
  });
});
