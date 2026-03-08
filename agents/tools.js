/**
 * Tool Definitions + Handlers para agentes de Lanzalo
 * 
 * Cada agente recibe un subset de tools según su rol.
 * Format: OpenAI function calling compatible.
 */

const { pool } = require('../backend/db');
const axios = require('axios');

// ═══════════════════════════════════════
// TOOL DEFINITIONS (schema para el LLM)
// ═══════════════════════════════════════

const TOOL_DEFS = {
  // --- Tasks ---
  create_task: {
    type: 'function',
    function: {
      name: 'create_task',
      description: 'Crear una nueva tarea en el backlog para que otro agente la ejecute',
      parameters: {
        type: 'object',
        required: ['title', 'agent_type'],
        properties: {
          title: { type: 'string', description: 'Título claro de la tarea' },
          description: { type: 'string', description: 'Descripción detallada con contexto' },
          agent_type: { type: 'string', enum: ['code', 'marketing', 'email', 'twitter', 'research', 'data', 'trends', 'browser'], description: 'Agente que ejecutará la tarea' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'], default: 'medium' }
        }
      }
    }
  },

  get_tasks: {
    type: 'function',
    function: {
      name: 'get_tasks',
      description: 'Obtener tareas del backlog de una empresa',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['pending', 'running', 'completed', 'failed', 'all'], default: 'all' },
          limit: { type: 'number', default: 10 }
        }
      }
    }
  },

  // --- Memory ---
  read_memory: {
    type: 'function',
    function: {
      name: 'read_memory',
      description: 'Leer contexto de memoria de la empresa (Layer 1: dominio, Layer 2: preferencias, Layer 3: patrones globales)',
      parameters: {
        type: 'object',
        properties: {
          layer: { type: 'number', enum: [1, 2, 3], description: '1=dominio empresa, 2=preferencias usuario, 3=patrones globales' }
        }
      }
    }
  },

  update_memory: {
    type: 'function',
    function: {
      name: 'update_memory',
      description: 'Actualizar memoria con nuevo aprendizaje o contexto',
      parameters: {
        type: 'object',
        required: ['layer', 'updates'],
        properties: {
          layer: { type: 'number', enum: [1, 2, 3] },
          updates: { type: 'object', description: 'Key-value pairs a actualizar' }
        }
      }
    }
  },

  // --- Search ---
  web_search: {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Buscar en la web usando Brave Search',
      parameters: {
        type: 'object',
        required: ['query'],
        properties: {
          query: { type: 'string', description: 'Términos de búsqueda' },
          count: { type: 'number', default: 5 }
        }
      }
    }
  },

  // --- Database ---
  query_db: {
    type: 'function',
    function: {
      name: 'query_db',
      description: 'Ejecutar query SQL de solo lectura en la base de datos',
      parameters: {
        type: 'object',
        required: ['sql'],
        properties: {
          sql: { type: 'string', description: 'Query SQL (solo SELECT)' }
        }
      }
    }
  },

  // --- Reports ---
  create_report: {
    type: 'function',
    function: {
      name: 'create_report',
      description: 'Guardar un reporte de negocio (análisis, resultados, métricas)',
      parameters: {
        type: 'object',
        required: ['title', 'content'],
        properties: {
          title: { type: 'string' },
          content: { type: 'string', description: 'Contenido del reporte en markdown' },
          type: { type: 'string', enum: ['research', 'analytics', 'marketing', 'engineering', 'daily_sync'] }
        }
      }
    }
  },

  // --- Email ---
  send_email: {
    type: 'function',
    function: {
      name: 'send_email',
      description: 'Enviar email a un contacto',
      parameters: {
        type: 'object',
        required: ['to', 'subject', 'body'],
        properties: {
          to: { type: 'string', description: 'Email del destinatario' },
          subject: { type: 'string' },
          body: { type: 'string', description: 'Contenido del email (texto plano)' },
          type: { type: 'string', enum: ['cold', 'transactional', 'marketing'], default: 'transactional' }
        }
      }
    }
  },

  // --- Twitter ---
  post_tweet: {
    type: 'function',
    function: {
      name: 'post_tweet',
      description: 'Publicar un tweet (max 280 chars)',
      parameters: {
        type: 'object',
        required: ['content'],
        properties: {
          content: { type: 'string', maxLength: 280 }
        }
      }
    }
  },

  // --- Multi-step Planning ---
  create_plan: {
    type: 'function',
    function: {
      name: 'create_plan',
      description: 'Crear un plan de múltiples tareas coordinadas para un objetivo complejo (lanzamiento, campaña, redesign, etc.)',
      parameters: {
        type: 'object',
        required: ['objective'],
        properties: {
          objective: { type: 'string', description: 'Objetivo del plan (ej: "lanzar campaña de email marketing", "rediseñar landing page")' }
        }
      }
    }
  },

  // --- Company ---
  get_company_info: {
    type: 'function',
    function: {
      name: 'get_company_info',
      description: 'Obtener información completa de la empresa',
      parameters: { type: 'object', properties: {} }
    }
  }
};

// ═══════════════════════════════════════
// TOOL HANDLERS (ejecutan la acción real)
// ═══════════════════════════════════════

function createToolHandlers(companyId, userId) {
  const MemorySystem = require('./memory-system');
  const memory = new MemorySystem(companyId);

  return {
    create_task: async (args) => {
      const crypto = require('crypto');
      const taskId = crypto.randomUUID();
      const tag = args.agent_type || 'research';
      const priority = args.priority || 'medium';
      
      const result = await pool.query(
        `INSERT INTO tasks (id, company_id, created_by, title, description, tag, priority, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'todo', NOW()) RETURNING id, title, tag, priority, status`,
        [taskId, companyId, userId || 'cofounder', args.title, args.description || '', tag, priority]
      );
      const task = result.rows[0];
      console.log(`[CEO Tools] Tarea creada: [${task.tag}/${task.priority}] ${task.title}`);
      // Broadcast al feed en vivo
      if (global.broadcastActivity) {
        global.broadcastActivity({
          companyId,
          type: 'task_created',
          agentType: task.tag,
          taskTitle: task.title,
          message: `Nueva tarea para ${task.tag}: ${task.title}`,
          timestamp: new Date().toISOString()
        });
      }
      return { success: true, taskId: task.id, title: task.title, agent: task.tag, priority: task.priority, status: task.status };
    },

    get_tasks: async (args) => {
      const status = args.status || 'all';
      const limit = args.limit || 10;
      let query = 'SELECT id, title, tag, priority, status, created_at, completed_at FROM tasks WHERE company_id = $1';
      const params = [companyId];
      if (status !== 'all') {
        query += ' AND status = $2';
        params.push(status === 'pending' ? 'todo' : status);
      }
      query += ` ORDER BY created_at DESC LIMIT ${limit}`;
      const result = await pool.query(query, params);
      return { tasks: result.rows, count: result.rows.length };
    },

    read_memory: async (args) => {
      const layer = args.layer || 1;
      if (layer === 1) return await memory.getLayer1();
      if (layer === 2) return await memory.getLayer2();
      return await memory.getLayer3();
    },

    update_memory: async (args) => {
      const layer = args.layer;
      if (layer === 1) return await memory.updateLayer1(args.updates);
      if (layer === 2) return await memory.updateLayer2(args.updates);
      return await memory.updateLayer3(args.updates);
    },

    web_search: async (args) => {
      if (!process.env.BRAVE_API_KEY) {
        return { error: 'Brave Search no configurado' };
      }
      try {
        const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
          params: { q: args.query, count: args.count || 5 },
          headers: { 'X-Subscription-Token': process.env.BRAVE_API_KEY }
        });
        return {
          results: (response.data.web?.results || []).map(r => ({
            title: r.title,
            url: r.url,
            description: r.description
          }))
        };
      } catch (error) {
        return { error: `Search failed: ${error.message}` };
      }
    },

    query_db: async (args) => {
      // Solo permitir SELECT
      const sql = args.sql.trim();
      if (!sql.toUpperCase().startsWith('SELECT')) {
        return { error: 'Solo queries SELECT permitidas' };
      }
      try {
        const result = await pool.query(sql);
        return { rows: result.rows.slice(0, 50), count: result.rows.length };
      } catch (error) {
        return { error: `Query failed: ${error.message}` };
      }
    },

    create_report: async (args) => {
      const result = await pool.query(
        `INSERT INTO reports (company_id, title, content, type, created_at)
         VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
        [companyId, args.title, args.content, args.type || 'research']
      );
      return { success: true, reportId: result.rows[0].id };
    },

    send_email: async (args) => {
      // Guardar en DB
      await pool.query(
        `INSERT INTO emails (company_id, to_email, subject, body, status, created_at)
         VALUES ($1, $2, $3, $4, 'draft', NOW())`,
        [companyId, args.to, args.subject, args.body]
      );
      // TODO: Enviar via Resend cuando esté configurado
      return { success: true, status: 'draft', note: 'Email guardado. Se enviará cuando Resend esté configurado.' };
    },

    post_tweet: async (args) => {
      // Guardar en DB
      const result = await pool.query(
        `INSERT INTO tweets (company_id, content, status, created_at)
         VALUES ($1, $2, 'draft', NOW()) RETURNING id`,
        [companyId, args.content]
      );
      return { success: true, tweetId: result.rows[0].id, status: 'draft' };
    },

    get_company_info: async () => {
      const result = await pool.query(
        'SELECT * FROM companies WHERE id = $1', [companyId]
      );
      return result.rows[0] || { error: 'Company not found' };
    },

    create_plan: async (args) => {
      const CEOAgent = require('./ceo-agent');
      const ceo = new CEOAgent(companyId, userId);
      await ceo.initialize();

      // Build memory context for planning
      let memContext = '';
      try {
        const compRes = await pool.query('SELECT * FROM companies WHERE id = $1', [companyId]);
        const c = compRes.rows[0];
        if (c) memContext = `Empresa: ${c.name}\nIndustria: ${c.industry || 'N/A'}\nDescripción: ${c.description || 'N/A'}`;
      } catch(e) {}

      const plan = await ceo.createMultiStepPlan(args.objective, memContext);
      if (!plan) return { error: 'No se pudo crear el plan' };
      return { success: true, plan: plan.planName, tasks: plan.tasks.length, description: plan.planDescription };
    }
  };
}

// ═══════════════════════════════════════
// TOOL SETS POR AGENTE
// ═══════════════════════════════════════

const AGENT_TOOLS = {
  ceo: ['create_task', 'get_tasks', 'read_memory', 'update_memory', 'web_search', 'get_company_info', 'create_plan'],
  code: ['read_memory', 'update_memory', 'query_db', 'create_report', 'get_company_info'],
  research: ['web_search', 'read_memory', 'update_memory', 'create_report', 'query_db', 'get_company_info'],
  marketing: ['read_memory', 'web_search', 'create_report', 'get_company_info'],
  email: ['read_memory', 'send_email', 'query_db', 'get_company_info'],
  twitter: ['read_memory', 'post_tweet', 'get_company_info'],
  data: ['query_db', 'read_memory', 'create_report', 'get_company_info'],
  trends: ['web_search', 'read_memory', 'create_report', 'query_db'],
  browser: ['web_search', 'read_memory', 'create_report']
};

/**
 * Obtener tools para un tipo de agente
 */
function getToolsForAgent(agentType) {
  const toolNames = AGENT_TOOLS[agentType] || ['read_memory', 'get_company_info'];
  return toolNames.map(name => TOOL_DEFS[name]).filter(Boolean);
}

module.exports = {
  TOOL_DEFS,
  AGENT_TOOLS,
  getToolsForAgent,
  createToolHandlers
};
