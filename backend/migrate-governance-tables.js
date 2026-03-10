/**
 * Run Governance Tables Migration
 * Creates budget_history, governance_events, heartbeat_logs, agents, agent_usage tables
 */

const { pool } = require('./db');

async function runMigration() {
  console.log('🚀 Starting governance tables migration...');

  try {
    // 1. Budget History Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS budget_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_type VARCHAR(50) NOT NULL,
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        budget_daily DECIMAL(10,2) NOT NULL,
        hourly_cost DECIMAL(10,4) NOT NULL,
        token_cost DECIMAL(10,6) NOT NULL,
        total_tokens_used INTEGER NOT NULL DEFAULT 0,
        total_hours_used DECIMAL(10,4) NOT NULL DEFAULT 0,
        total_cost DECIMAL(10,4) NOT NULL DEFAULT 0,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ budget_history table created');

    // 2. Governance Events Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS governance_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
        agent_type VARCHAR(50) NOT NULL,
        agent_name VARCHAR(100),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(50) NOT NULL,
        details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ governance_events table created');

    // 3. Heartbeat Logs Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS heartbeat_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
        agent_type VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'healthy',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ heartbeat_logs table created');

    // 4. Agents Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_type VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        paused BOOLEAN NOT NULL DEFAULT false,
        terminated_at TIMESTAMP,
        last_heartbeat TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ agents table created');

    // 5. Agent Usage Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agent_usage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_type VARCHAR(50) NOT NULL,
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        total_tokens INTEGER NOT NULL DEFAULT 0,
        total_hours DECIMAL(10,4) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ agent_usage table created');

    // 6. Indexes for Budget History
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_budget_history_agent_type ON budget_history(agent_type)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_budget_history_company_id ON budget_history(company_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_budget_history_date ON budget_history(date)`);
    console.log('✅ budget_history indexes created');

    // 7. Indexes for Governance Events
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_governance_events_agent_id ON governance_events(agent_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_governance_events_agent_type ON governance_events(agent_type)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_governance_events_user_id ON governance_events(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_governance_events_created_at ON governance_events(created_at DESC)`);
    console.log('✅ governance_events indexes created');

    // 8. Indexes for Heartbeat Logs
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_heartbeat_logs_agent_id ON heartbeat_logs(agent_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_heartbeat_logs_agent_type ON heartbeat_logs(agent_type)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_heartbeat_logs_created_at ON heartbeat_logs(created_at)`);
    console.log('✅ heartbeat_logs indexes created');

    // 9. Indexes for Agents
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_agents_agent_type ON agents(agent_type)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_agents_company_id ON agents(company_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status)`);
    console.log('✅ agents indexes created');

    // 10. Indexes for Agent Usage
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_agent_usage_agent_type ON agent_usage(agent_type)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_agent_usage_company_id ON agent_usage(company_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_agent_usage_created_at ON agent_usage(created_at)`);
    console.log('✅ agent_usage indexes created');

    // 11. Insert default agents
    await pool.query(`
      INSERT INTO agents (agent_type, name, status)
      VALUES
        ('CEO', 'CEO Agent', 'active'),
        ('Code', 'CTO / Code Agent', 'active'),
        ('Marketing', 'Marketing Agent', 'active'),
        ('Twitter', 'Twitter Agent', 'active'),
        ('Email', 'Email Agent', 'active'),
        ('Data', 'Data / Analytics Agent', 'active')
      ON CONFLICT (agent_type) DO NOTHING
    `);
    console.log('✅ default agents inserted');

    console.log('✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('🎉 All done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };