/**
 * Database simple para desarrollo local
 * Usa SQLite en lugar de PostgreSQL
 */

const sqlite3 = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../data/lanzalo.db');

// Crear directorio data si no existe
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Conectar a SQLite
const db = new sqlite3(DB_PATH);

// Habilitar foreign keys
db.pragma('foreign_keys = ON');

// Inicializar schema si es primera vez
function initSchema() {
  const schemaPath = path.join(__dirname, '../database/schema-sqlite.sql');
  
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);
    console.log('✅ Schema SQLite inicializado');
  }
}

// Pool simulado (compatible con PostgreSQL pool)
const pool = {
  query: async (text, params = []) => {
    try {
      // Si es SELECT
      if (text.trim().toUpperCase().startsWith('SELECT')) {
        const stmt = db.prepare(text);
        const rows = params.length > 0 ? stmt.all(...params) : stmt.all();
        return { rows };
      }
      
      // Si es INSERT/UPDATE/DELETE con RETURNING
      if (text.includes('RETURNING')) {
        // SQLite no soporta RETURNING, simularlo
        const insertMatch = text.match(/INSERT INTO (\w+)/i);
        const tableName = insertMatch ? insertMatch[1] : null;
        
        // Ejecutar sin RETURNING
        const cleanText = text.replace(/RETURNING \*/i, '');
        const stmt = db.prepare(cleanText);
        const info = params.length > 0 ? stmt.run(...params) : stmt.run();
        
        // Obtener el registro insertado
        if (tableName && info.lastInsertRowid) {
          const selectStmt = db.prepare(`SELECT * FROM ${tableName} WHERE rowid = ?`);
          const rows = selectStmt.all(info.lastInsertRowid);
          return { rows };
        }
        
        return { rows: [] };
      }
      
      // INSERT/UPDATE/DELETE normal
      const stmt = db.prepare(text);
      const info = params.length > 0 ? stmt.run(...params) : stmt.run();
      return { rows: [], rowCount: info.changes };
      
    } catch (error) {
      console.error('SQL Error:', error.message);
      console.error('Query:', text);
      console.error('Params:', params);
      throw error;
    }
  },
  
  end: async () => {
    db.close();
  }
};

// Funciones helper (igual que db.js original)
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
  const id = require('crypto').randomUUID();
  
  const result = await pool.query(
    `INSERT INTO companies (id, user_id, name, description, industry, subdomain)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, userId, name, description, industry, subdomain]
  );
  
  return await getCompanyById(id);
}

async function createTask(companyId, agentType, title, description) {
  const id = require('crypto').randomUUID();
  
  await pool.query(
    `INSERT INTO tasks (id, company_id, agent_type, title, description, scheduled_for)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [id, companyId, agentType, title, description]
  );
  
  const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
  return result.rows[0];
}

async function updateTask(taskId, updates) {
  const fields = [];
  const values = [];
  
  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = ?`);
    values.push(value);
  }
  
  values.push(taskId);
  const query = `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`;
  
  await pool.query(query, values);
}

async function logActivity(companyId, taskId, activityType, message, metadata = {}) {
  const id = require('crypto').randomUUID();
  
  await pool.query(
    `INSERT INTO activity_log (id, company_id, task_id, activity_type, message, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, companyId, taskId, activityType, message, JSON.stringify(metadata)]
  );
  
  const result = await pool.query('SELECT * FROM activity_log WHERE id = $1', [id]);
  const activity = result.rows[0];
  
  if (global.broadcastActivity) {
    global.broadcastActivity(activity);
  }
  
  return activity;
}

module.exports = {
  pool,
  db,
  initSchema,
  getActiveCompanies,
  getCompanyById,
  createCompany,
  createTask,
  updateTask,
  logActivity
};
