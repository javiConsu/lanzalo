/**
 * Instantly.ai API v2 Service
 * 
 * Manages: DFY email accounts, domains, warmup, campaigns, leads
 * Docs: https://developer.instantly.ai/api/v2
 */

const API_BASE = 'https://api.instantly.ai/api/v2';

class InstantlyService {
  constructor() {
    this.apiKey = process.env.INSTANTLY_API_KEY;
    if (!this.apiKey) {
      console.warn('[Instantly] API key not configured — service disabled');
    }
  }

  get enabled() {
    return !!this.apiKey;
  }

  async request(method, endpoint, body = null, params = {}) {
    if (!this.enabled) throw new Error('Instantly no configurado');

    const url = new URL(`${API_BASE}${endpoint}`);
    // Add query params
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null) url.searchParams.set(key, val);
    }

    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    };

    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(url.toString(), options);
    const text = await res.text();

    let data;
    try { data = JSON.parse(text); } catch { data = text; }

    if (!res.ok) {
      const msg = typeof data === 'object' ? (data.message || data.error || JSON.stringify(data)) : text;
      throw new Error(`Instantly API ${res.status}: ${msg}`);
    }

    return data;
  }

  // ═══════════════════════════════════════
  // DFY EMAIL ACCOUNTS (Done-For-You)
  // ═══════════════════════════════════════

  /**
   * Check domain availability for DFY setup
   */
  async checkDomainAvailability(domain) {
    return this.request('POST', '/dfy-email-account-orders/domains/check', { domain });
  }

  /**
   * Get suggested similar domains
   */
  async getSuggestedDomains(domain) {
    return this.request('GET', '/dfy-email-account-orders/domains', { domain });
  }

  /**
   * Get pre-warmed up domains available for purchase
   */
  async getPreWarmedDomains(extensions = 'com,org') {
    return this.request('GET', '/dfy-email-account-orders/domains/pre-warmed-up-list', null, { extensions });
  }

  /**
   * Order DFY email account (buys domain + creates sending account)
   * @param {Object} options
   * @param {string} options.domain - Domain to purchase (.com/.org only)
   * @param {Array<string>} options.accounts - 1-5 email account names (e.g. ['hello', 'info'])
   * @param {string} [options.forwarding_domain] - Optional forwarding domain
   * @param {string} [options.order_type='dfy'] - 'dfy', 'pre_warmed_up', or 'extra_accounts'
   * @param {boolean} [options.simulate=false] - True to get quote without charging
   */
  async orderDFYAccount({ domain, accounts, forwarding_domain, order_type = 'dfy', simulate = false }) {
    return this.request('POST', '/dfy-email-account-orders', {
      domain,
      email_provider: 1, // Google only
      accounts: accounts.map(name => ({ name })),
      forwarding_domain,
      order_type,
      simulate,
    });
  }

  /**
   * Simulate order to get pricing quote
   */
  async simulateOrder(domain, accountNames = ['hello']) {
    return this.orderDFYAccount({
      domain,
      accounts: accountNames,
      simulate: true,
    });
  }

  // ═══════════════════════════════════════
  // EMAIL ACCOUNTS (manage existing)
  // ═══════════════════════════════════════

  /**
   * List all email accounts in workspace
   */
  async listAccounts(limit = 50, skip = 0) {
    return this.request('GET', '/accounts', null, { limit, skip });
  }

  /**
   * Get a single email account by ID
   */
  async getAccount(accountId) {
    return this.request('GET', `/accounts/${accountId}`);
  }

  /**
   * Update account warmup settings
   */
  async updateAccountWarmup(accountId, warmupEnabled = true) {
    return this.request('PATCH', `/accounts/${accountId}`, {
      warmup_status: warmupEnabled ? 1 : 0,
    });
  }

  /**
   * Get warmup analytics for an account
   */
  async getWarmupAnalytics(accountId) {
    return this.request('GET', `/accounts/${accountId}/warmup-analytics`);
  }

  // ═══════════════════════════════════════
  // CAMPAIGNS
  // ═══════════════════════════════════════

  /**
   * Create a new campaign
   */
  async createCampaign({ name, account_ids = [], schedule = null }) {
    const body = { name };
    if (account_ids.length > 0) body.account_ids = account_ids;
    if (schedule) body.campaign_schedule = schedule;
    return this.request('POST', '/campaigns', body);
  }

  /**
   * Get campaign details
   */
  async getCampaign(campaignId) {
    return this.request('GET', `/campaigns/${campaignId}`);
  }

  /**
   * List all campaigns
   */
  async listCampaigns(limit = 50, skip = 0, status = null) {
    const params = { limit, skip };
    if (status) params.status = status;
    return this.request('GET', '/campaigns', null, params);
  }

  /**
   * Launch (activate) a campaign
   */
  async launchCampaign(campaignId) {
    return this.request('POST', `/campaigns/${campaignId}/launch`);
  }

  /**
   * Pause a campaign
   */
  async pauseCampaign(campaignId) {
    return this.request('POST', `/campaigns/${campaignId}/pause`);
  }

  /**
   * Set email sequence steps for a campaign
   */
  async setCampaignSequences(campaignId, sequences) {
    return this.request('PATCH', `/campaigns/${campaignId}`, {
      sequences,
    });
  }

  // ═══════════════════════════════════════
  // LEADS
  // ═══════════════════════════════════════

  /**
   * Add a single lead
   */
  async addLead({ email, first_name, last_name, company_name, campaign_id, phone, website, personalization, payload }) {
    const body = { email };
    if (first_name) body.first_name = first_name;
    if (last_name) body.last_name = last_name;
    if (company_name) body.company_name = company_name;
    if (campaign_id) body.campaign = campaign_id;
    if (phone) body.phone = phone;
    if (website) body.website = website;
    if (personalization) body.personalization = personalization;
    if (payload) body.payload = payload;
    return this.request('POST', '/leads', body);
  }

  /**
   * Add leads in bulk (array of lead objects)
   */
  async addLeadsBulk(leads, campaignId = null) {
    // Instantly may not have a dedicated bulk endpoint,
    // so we batch sequentially with small delays
    const results = [];
    for (const lead of leads) {
      try {
        if (campaignId) lead.campaign_id = campaignId;
        const result = await this.addLead(lead);
        results.push({ success: true, email: lead.email, data: result });
      } catch (err) {
        results.push({ success: false, email: lead.email, error: err.message });
      }
      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 200));
    }
    return results;
  }

  /**
   * List leads, optionally filtered by campaign
   */
  async listLeads(campaignId = null, limit = 50, skip = 0) {
    const params = { limit, skip };
    if (campaignId) params.campaign_id = campaignId;
    return this.request('GET', '/leads', null, params);
  }

  /**
   * Get lead by ID
   */
  async getLead(leadId) {
    return this.request('GET', `/leads/${leadId}`);
  }

  /**
   * Update lead interest status
   * 1=Interested, -1=Not Interested, 0=Neutral
   */
  async updateLeadInterest(leadId, interestStatus) {
    return this.request('PATCH', `/leads/${leadId}`, {
      lt_interest_status: interestStatus,
    });
  }

  // ═══════════════════════════════════════
  // LEAD LISTS
  // ═══════════════════════════════════════

  async createLeadList(name) {
    return this.request('POST', '/lead-lists', { name });
  }

  async listLeadLists(limit = 50) {
    return this.request('GET', '/lead-lists', null, { limit });
  }

  // ═══════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════

  /**
   * Get campaign analytics (sent, opens, replies, bounces)
   */
  async getCampaignAnalytics(campaignId) {
    return this.request('GET', '/analytics', null, { campaign_id: campaignId });
  }

  /**
   * Get general analytics
   */
  async getAnalytics(params = {}) {
    return this.request('GET', '/analytics', null, params);
  }

  // ═══════════════════════════════════════
  // WEBHOOKS (for receiving reply/bounce events)
  // ═══════════════════════════════════════

  /**
   * Create a webhook to receive events
   * Events: 'reply', 'bounce', 'open', 'click', 'unsubscribe', 'lead_interest_change'
   */
  async createWebhook(url, eventType) {
    return this.request('POST', '/webhooks', {
      url,
      event_type: eventType,
    });
  }

  /**
   * List all configured webhooks
   */
  async listWebhooks() {
    return this.request('GET', '/webhooks');
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId) {
    return this.request('DELETE', `/webhooks/${webhookId}`);
  }

  // ═══════════════════════════════════════
  // EMAIL VERIFICATION
  // ═══════════════════════════════════════

  /**
   * Verify a single email address
   */
  async verifyEmail(email) {
    return this.request('POST', '/email-verification', { email });
  }

  // ═══════════════════════════════════════
  // WORKSPACE
  // ═══════════════════════════════════════

  async getWorkspace() {
    return this.request('GET', '/workspaces');
  }

  async getWorkspaceBilling() {
    return this.request('GET', '/workspace-billing');
  }
}

// Singleton
module.exports = new InstantlyService();
