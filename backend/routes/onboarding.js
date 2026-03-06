/**
 * Onboarding Routes
 * 
 * Flow:
 * 1. User registers (email + password)
 * 2. Survey (optional, 6 questions)
 * 3. Describe idea OR choose validated idea
 * 4. CEO Agent creates company + initial tasks
 * 5. Redirect to chat
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../db');
const { authenticate } = require('../middleware/auth');
const { sendWelcomeEmail } = require('../services/email-service');

/**
 * POST /api/onboarding/register
 * Register new user with 14-day trial
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    
    // Check if user exists
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (existing.rows && existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Calculate trial dates
    const trialStartedAt = new Date();
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days
    
    // Create user
    const userId = crypto.randomUUID();
    
    await pool.query(
      `INSERT INTO users 
       (id, email, password_hash, name, plan, trial_started_at, trial_ends_at, 
        onboarding_completed, created_at)
       VALUES ($1, $2, $3, $4, 'trial', $5, $6, FALSE, NOW())`,
      [userId, email.toLowerCase(), passwordHash, name || email.split('@')[0], 
       trialStartedAt, trialEndsAt]
    );
    
    // Generate JWT
    const token = jwt.sign(
      { userId, email: email.toLowerCase(), plan: 'trial' },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '30d' }
    );
    
    console.log(`[Onboarding] New user registered: ${email}`);
    
    // Send welcome email (async, don't block response)
    const newUser = {
      email: email.toLowerCase(),
      name: name || email.split('@')[0],
      trial_ends_at: trialEndsAt.toISOString()
    };
    
    sendWelcomeEmail(newUser).catch(err => {
      console.error('[Onboarding] Failed to send welcome email:', err);
    });
    
    // Return user + token
    res.json({
      success: true,
      token,
      user: {
        id: userId,
        email: email.toLowerCase(),
        name: name || email.split('@')[0],
        plan: 'trial',
        trialEndsAt: trialEndsAt.toISOString(),
        onboardingCompleted: false
      },
      redirect: '/onboarding/survey'
    });
    
  } catch (error) {
    console.error('[Onboarding] Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * POST /api/onboarding/survey
 * Save survey responses (optional but rewarded with 3 ideas)
 */
router.post('/survey', authenticate, async (req, res) => {
  try {
    const { answers } = req.body;
    // answers: { name, role, location, experience, businessType, goal, source }
    
    // Save to user profile or separate table
    await pool.query(
      `UPDATE users 
       SET survey_data = $1, survey_completed_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(answers), req.user.userId]
    );
    
    // Reward: Get 3 top validated ideas
    const topIdeas = await pool.query(
      `SELECT * FROM discovered_ideas 
       WHERE score >= 85 AND is_active = TRUE
       ORDER BY score DESC 
       LIMIT 3`
    );
    
    res.json({
      success: true,
      reward: {
        ideas: topIdeas.rows || [],
        message: 'Gracias por completar la encuesta. Aquí tienes 3 ideas validadas.'
      },
      redirect: '/onboarding/idea'
    });
    
    // TODO: Send reward email with ideas
    
  } catch (error) {
    console.error('[Onboarding] Survey error:', error);
    res.status(500).json({ error: 'Failed to save survey' });
  }
});

/**
 * POST /api/onboarding/create-company
 * Create company from user's idea OR from validated idea
 */
router.post('/create-company', authenticate, async (req, res) => {
  try {
    const { source, ideaId, name, description, audience } = req.body;
    
    let companyData = {};
    
    if (source === 'validated' && ideaId) {
      // Launch from validated idea
      const idea = await pool.query(
        'SELECT * FROM discovered_ideas WHERE id = $1',
        [ideaId]
      );
      
      if (!idea.rows || idea.rows.length === 0) {
        return res.status(404).json({ error: 'Idea not found' });
      }
      
      const validatedIdea = idea.rows[0];
      
      companyData = {
        name: validatedIdea.title,
        description: validatedIdea.problem,
        audience: validatedIdea.target_audience,
        source: 'validated_idea',
        sourceId: ideaId
      };
      
      // Increment times_launched
      await pool.query(
        'UPDATE discovered_ideas SET times_launched = times_launched + 1 WHERE id = $1',
        [ideaId]
      );
      
    } else {
      // User's own idea
      if (!name || !description) {
        return res.status(400).json({ error: 'Name and description required' });
      }
      
      companyData = {
        name,
        description,
        audience: audience || 'General',
        source: 'user_idea',
        sourceId: null
      };
    }
    
    // Create company
    const companyId = crypto.randomUUID();
    const subdomain = companyData.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 30);
    
    await pool.query(
      `INSERT INTO companies 
       (id, user_id, name, description, subdomain, industry, status, 
        daily_sync_enabled, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'planning', TRUE, NOW())`,
      [companyId, req.user.userId, companyData.name, companyData.description,
       subdomain, companyData.audience]
    );
    
    console.log(`[Onboarding] Company created: ${companyData.name} (${companyId})`);
    
    // Create initial task: Validate idea (Research Agent)
    const taskId = crypto.randomUUID();
    
    await pool.query(
      `INSERT INTO tasks 
       (id, company_id, title, description, tag, priority, status, auto_created)
       VALUES ($1, $2, $3, $4, 'research', 'high', 'todo', TRUE)`,
      [
        taskId,
        companyId,
        'Validar idea de negocio',
        `Analiza esta idea de negocio:

Nombre: ${companyData.name}
Descripción: ${companyData.description}
Audiencia: ${companyData.audience}

Investiga:
1. Demanda de mercado (búsquedas, trends)
2. Competencia (saturación, jugadores)
3. Revenue potential
4. Riesgos principales
5. Dificultad de ejecución

Genera reporte completo con veredicto: Verde/Amarillo/Rojo.`
      ]
    );
    
    // Mark onboarding as completed
    await pool.query(
      'UPDATE users SET onboarding_completed = TRUE WHERE id = $1',
      [req.user.userId]
    );
    
    res.json({
      success: true,
      company: {
        id: companyId,
        name: companyData.name,
        subdomain,
        status: 'planning'
      },
      validationTaskId: taskId,
      message: 'Empresa creada. Research Agent validando tu idea...',
      redirect: `/chat/${companyId}`
    });
    
  } catch (error) {
    console.error('[Onboarding] Company creation error:', error);
    res.status(500).json({ error: 'Failed to create company' });
  }
});

/**
 * GET /api/onboarding/status
 * Check onboarding status for current user
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const user = await pool.query(
      `SELECT onboarding_completed, survey_data, plan, trial_ends_at 
       FROM users WHERE id = $1`,
      [req.user.userId]
    );
    
    if (!user.rows || user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = user.rows[0];
    
    // Check if user has companies
    const companies = await pool.query(
      'SELECT id, name, subdomain FROM companies WHERE user_id = $1',
      [req.user.userId]
    );
    
    res.json({
      onboardingCompleted: userData.onboarding_completed,
      surveyCompleted: !!userData.survey_data,
      hasCompanies: companies.rows && companies.rows.length > 0,
      plan: userData.plan,
      trialEndsAt: userData.trial_ends_at,
      companies: companies.rows || []
    });
    
  } catch (error) {
    console.error('[Onboarding] Status check error:', error);
    res.status(500).json({ error: 'Failed to get onboarding status' });
  }
});

module.exports = router;
