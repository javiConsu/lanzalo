/**
 * Database utilities
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Companies
async function getActiveCompanies() {
  const result = await pool.query(
    "SELECT * FROM companies WHERE status IN ('planning', 'building', 'live') ORDER BY created_at DESC"
  );
  return result.rows;
}

async function getCompanyById(id) {
  const result = await pool.query('SELECT * FROM companies WHERE id = $1', [id]);
  return result.rows[0];
}

async function createCompany(userId, name, description, industry) {
  const subdomain = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const result = await pool.query(
    `INSERT INTO companies (user_id, name, description, industry, subdomain)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [userId, name, description, industry, subdomain]
  );
  return result.rows[0];
}

// Tasks
async function createTask(companyId, agentType, title, description) {
  const result = await pool.query(
    `INSERT INTO tasks (company_id, tag, title, description, status, created_at)
     VALUES ($1, $2, $3, $4, 'todo', NOW()) RETURNING *`,
    [companyId, agentType, title, description]
  );
  return result.rows[0];
}

async function updateTask(taskId, updates) {
  const fields = [];
  const values = [];
  let i = 1;
  
  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = $${i}`);
    values.push(value);
    i++;
  }
  
  values.push(taskId);
  const query = `UPDATE tasks SET ${fields.join(', ')} WHERE id = $${i}`;
  
  await pool.query(query, values);
}

async function getRecentTasks(companyId, limit = 10) {
  const result = await pool.query(
    'SELECT * FROM tasks WHERE company_id = $1 ORDER BY created_at DESC LIMIT $2',
    [companyId, limit]
  );
  return result.rows;
}

// Deployments
async function createDeployment(companyId, url, type, framework, status) {
  const result = await pool.query(
    `INSERT INTO deployments (company_id, url, type, framework, status)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [companyId, url, type, framework, status]
  );
  return result.rows[0];
}

// Emails
async function createEmail(companyId, campaign, toEmail, subject, body, status) {
  const result = await pool.query(
    `INSERT INTO emails (company_id, campaign_name, to_email, subject, body, status)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [companyId, campaign, toEmail, subject, body, status]
  );
  return result.rows[0];
}

// Tweets
async function createTweet(companyId, content, mediaUrl, status) {
  const result = await pool.query(
    `INSERT INTO tweets (company_id, content, media_url, status)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [companyId, content, mediaUrl, status]
  );
  return result.rows[0];
}

async function updateTweet(tweetId, updates) {
  const fields = [];
  const values = [];
  let i = 1;
  
  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = $${i}`);
    values.push(value);
    i++;
  }
  
  values.push(tweetId);
  const query = `UPDATE tweets SET ${fields.join(', ')} WHERE id = $${i}`;
  
  await pool.query(query, values);
}

// Activity Log
async function logActivity(companyId, taskId, activityType, message, metadata = {}) {
  const result = await pool.query(
    `INSERT INTO activity_log (company_id, task_id, activity_type, message, metadata)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [companyId, taskId, activityType, message, JSON.stringify(metadata)]
  );
  
  const activity = result.rows[0];
  
  // Broadcast to WebSocket clients
  if (global.broadcastActivity) {
    global.broadcastActivity(activity);
  }
  
  return activity;
}

async function getRecentActivity(limit = 50) {
  const result = await pool.query(
    `SELECT a.*, c.name as company_name 
     FROM activity_log a
     JOIN companies c ON a.company_id = c.id
     ORDER BY a.created_at DESC LIMIT $1`,
    [limit]
  );
  return result.rows;
}

// Analytics
async function recordMetric(companyId, metricName, metricValue) {
  await pool.query(
    `INSERT INTO analytics (company_id, metric_name, metric_value)
     VALUES ($1, $2, $3)`,
    [companyId, metricName, metricValue]
  );
}

module.exports = {
  pool,
  getActiveCompanies,
  getCompanyById,
  createCompany,
  createTask,
  updateTask,
  getRecentTasks,
  createDeployment,
  createEmail,
  createTweet,
  updateTweet,
  logActivity,
  getRecentActivity,
  recordMetric
};
