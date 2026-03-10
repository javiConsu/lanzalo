const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  try {
    console.log('🔧 Executing budget, governance, and heartbeat schema...');

    // Create budget_history table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS budget_history (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        agent_role VARCHAR(50) NOT NULL,
        used_amount DECIMAL(10, 2) NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        metric_type VARCHAR(50) DEFAULT 'tokens',
        recorded_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('✅ budget_history table created');

    // Create governance_events table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS governance_events (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        agent_id INTEGER NOT NULL,
        agent_name VARCHAR(100) NOT NULL,
        agent_role VARCHAR(50) NOT NULL,
        action VARCHAR(50) NOT NULL,
        reason TEXT,
        performed_by VARCHAR(50) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('✅ governance_events table created');

    // Create heartbeat_logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS heartbeat_logs (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        agent_role VARCHAR(50) NOT NULL,
        timestamp TIMESTAMP NOT NULL,
        status VARCHAR(20) DEFAULT 'healthy',
        data JSONB DEFAULT '{}',
        recorded_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('✅ heartbeat_logs table created');

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_budget_history_company ON budget_history(company_id);
      CREATE INDEX IF NOT EXISTS idx_budget_history_agent ON budget_history(agent_role);
      CREATE INDEX IF NOT EXISTS idx_budget_history_date ON budget_history(recorded_at);
      CREATE INDEX IF NOT EXISTS idx_governance_events_company ON governance_events(company_id);
      CREATE INDEX IF NOT EXISTS idx_governance_events_agent ON governance_events(agent_id);
      CREATE INDEX IF NOT EXISTS idx_governance_events_action ON governance_events(action);
      CREATE INDEX IF NOT EXISTS idx_governance_events_date ON governance_events(created_at);
      CREATE INDEX IF NOT EXISTS idx_heartbeat_logs_company ON heartbeat_logs(company_id);
      CREATE INDEX IF NOT EXISTS idx_heartbeat_logs_agent ON heartbeat_logs(agent_role);
      CREATE INDEX IF NOT EXISTS idx_heartbeat_logs_status ON heartbeat_logs(status);
      CREATE INDEX IF NOT EXISTS idx_heartbeat_logs_date ON heartbeat_logs(timestamp);
    `);

    console.log('✅ Indexes created');

    // Insert default budget allocations
    const defaultBudgets = [
      { role: 'CEO', total: 4.00 },
      { role: 'CTO', total: 8.00 },
      { role: 'Marketing', total: 4.00 },
      { role: 'Twitter', total: 2.00 },
      { role: 'Email', total: 2.00 },
      { role: 'Data', total: 4.00 },
      { role: 'Trends', total: 2.00 }
    ];

    for (const budget of defaultBudgets) {
      await pool.query(`
        INSERT INTO budget_history (company_id, agent_role, used_amount, total_amount, metric_type, recorded_at)
        SELECT
          c.id,
          $1::VARCHAR,
          0.00,
          $2::DECIMAL,
          'dollars',
          NOW()
        FROM companies c
        WHERE NOT EXISTS (
          SELECT 1 FROM budget_history bh WHERE bh.company_id = c.id AND bh.agent_role = $1
        )
        ON CONFLICT DO NOTHING
      `, [budget.role, budget.total]);
    }

    console.log('✅ Default budget allocations created');

    // Verify tables
    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('budget_history', 'governance_events', 'heartbeat_logs')
    `);

    console.log('\n📊 Created tables:');
    tables.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();