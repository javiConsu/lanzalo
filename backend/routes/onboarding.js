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
const { initCredits } = require('../middleware/credits');

/**
 * POST /api/onboarding/register
 * Register new user with 14-day trial
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, aboutMe, lookingFor } = req.body;
    
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
    
    // Build registration intake data
    const intakeData = {};
    if (aboutMe) intakeData.aboutMe = aboutMe;
    if (lookingFor) intakeData.lookingFor = lookingFor;
    const hasIntake = Object.keys(intakeData).length > 0;

    await pool.query(
      `INSERT INTO users 
       (id, email, password_hash, name, plan, trial_started_at, trial_ends_at, 
        onboarding_completed, survey_data, created_at)
       VALUES ($1, $2, $3, $4, 'trial', $5, $6, FALSE, $7, NOW())`,
      [userId, email.toLowerCase(), passwordHash, name || email.split('@')[0], 
       trialStartedAt, trialEndsAt, hasIntake ? JSON.stringify(intakeData) : null]
    );
    
    // Generate JWT (use 'id' to match auth middleware)
    const token = jwt.sign(
      { id: userId, email: email.toLowerCase(), plan: 'trial' },
      process.env.JWT_SECRET || 'change-this-in-production',
      { expiresIn: '30d' }
    );
    
    console.log(`[Onboarding] New user registered: ${email}`);
    
    // Inicializar créditos (5 para trial)
    await initCredits(userId, 'trial').catch(err => {
      console.error('[Onboarding] Failed to init credits:', err);
    });
    
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
    
    // Merge survey answers with existing intake data (aboutMe, lookingFor from registration)
    try {
      const existing = await pool.query(
        'SELECT survey_data FROM users WHERE id = $1',
        [req.user.id]
      );
      const existingData = existing.rows[0]?.survey_data || {};
      const merged = { ...existingData, surveyAnswers: answers };
      
      await pool.query(
        `UPDATE users 
         SET survey_data = $1, survey_completed_at = NOW()
         WHERE id = $2`,
        [JSON.stringify(merged), req.user.id]
      );
    } catch (dbErr) {
      console.log('[Onboarding] Survey save skipped:', dbErr.message);
    }
    
    // Try to get validated ideas as reward
    let topIdeas = [];
    try {
      const result = await pool.query(
        `SELECT * FROM discovered_ideas 
         WHERE score >= 85 AND is_active = TRUE
         ORDER BY score DESC 
         LIMIT 3`
      );
      topIdeas = result.rows || [];
    } catch (dbErr) {
      // Table might not exist yet
      console.log('[Onboarding] discovered_ideas not available:', dbErr.message);
    }
    
    res.json({
      success: true,
      reward: {
        ideas: topIdeas,
        message: 'Gracias por completar la encuesta.'
      },
      redirect: '/onboarding/choose-path'
    });
    
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
      if (!description) {
        return res.status(400).json({ error: 'Description required' });
      }
      
      // Auto-generate placeholder name from description (first 3-4 meaningful words)
      const placeholderName = name || description
        .replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2)
        .slice(0, 3)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ') || 'Mi Proyecto';
      
      companyData = {
        name: placeholderName,
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
       (id, user_id, name, description, subdomain, industry, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'planning', NOW())`,
      [companyId, req.user.id, companyData.name, companyData.description,
       subdomain, companyData.audience]
    );
    
    console.log(`[Onboarding] Company created: ${companyData.name} (${companyId})`);
    
    // Get user intake data for richer analysis
    let intakeContext = '';
    try {
      const userData = await pool.query(
        'SELECT survey_data, name FROM users WHERE id = $1',
        [req.user.id]
      );
      const surveyData = userData.rows[0]?.survey_data || {};
      if (surveyData.aboutMe) intakeContext += `\nSOBRE EL FUNDADOR: ${surveyData.aboutMe}`;
      if (surveyData.lookingFor) intakeContext += `\nQUÉ BUSCA: ${surveyData.lookingFor}`;
      if (surveyData.surveyAnswers) {
        const a = surveyData.surveyAnswers;
        if (a.experience_level) intakeContext += `\nEXPERIENCIA: ${a.experience_level}`;
        if (a.primary_motivation) intakeContext += `\nMOTIVACIÓN: ${a.primary_motivation}`;
        if (a.timeline) intakeContext += `\nTIMELINE: ${a.timeline}`;
        if (a.biggest_challenge) intakeContext += `\nMAYOR RETO: ${a.biggest_challenge}`;
      }
    } catch(e) {}

    // Create initial task: Full market analysis + business plan + idea rating
    // Status 'todo' so TaskExecutor picks it up automatically
    const taskId = crypto.randomUUID();
    
    await pool.query(
      `INSERT INTO tasks 
       (id, company_id, tag, title, description, status, priority, created_at)
       VALUES ($1, $2, 'research', $3, $4, 'todo', 'critical', NOW())`,
      [
        taskId,
        companyId,
        'Análisis de mercado y plan de negocio',
        `ANÁLISIS COMPLETO DE IDEA DE NEGOCIO

=== DATOS DEL PROYECTO ===
Nombre: ${companyData.name}
Descripción: ${companyData.description}
Audiencia objetivo: ${companyData.audience}
${intakeContext}

=== TU MISIÓN ===
Eres el Co-Founder analítico de esta startup. Tu socio acaba de contarte su idea.
Tienes que hacer un análisis EXHAUSTIVO y HONESTO — no eres un coach motivacional,
eres un socio que pone su dinero y su tiempo. Sé directo.

GENERA UN DOCUMENTO COMPLETO EN MARKDOWN CON ESTAS SECCIONES:

# 📊 Análisis de Mercado y Plan de Negocio: ${companyData.name}

## 1. VALORACIÓN DE LA IDEA
- Puntuación general (1-10) con justificación
- Veredicto: 🟢 ADELANTE / 🟡 CON RESERVAS / 🔴 REPLANTEAR
- Qué es lo mejor de la idea (sin humo)
- Qué es lo peor de la idea (sin suavizar)

## 2. ANÁLISIS DE MERCADO
- Tamaño del mercado (TAM/SAM/SOM estimados)
- Tendencias del sector
- Demanda real vs percibida
- ¿Existe gente buscando/pagando por esto ya?

## 3. COMPETENCIA
- Competidores directos (mínimo 3 si existen)
- Competidores indirectos
- Qué hacen bien / qué hacen mal
- Diferenciación posible

## 4. MODELO DE NEGOCIO PROPUESTO
- Revenue model (cómo cobrar)
- Pricing sugerido
- Canales de adquisición
- Unit economics estimados (CAC, LTV)

## 5. PLAN DE ACCIÓN (primeros 30 días)
- 5 pasos concretos priorizados
- Qué validar primero
- MVP mínimo viable
- Métricas clave a trackear

## 6. RIESGOS Y MITIGACIÓN
- Top 3 riesgos
- Cómo mitigar cada uno
- Señales de que hay que pivotar

IMPORTANTE:
- Escribe en español
- Sé ESPECÍFICO (números, nombres de competidores reales, datos concretos)
- No uses lenguaje corporativo vacío
- Si la idea es mala, dilo claramente pero propón alternativas
- El documento debe ser útil para tomar una DECISIÓN real`
      ]
    );
    
    // Mark onboarding as completed
    await pool.query(
      'UPDATE users SET onboarding_completed = TRUE WHERE id = $1',
      [req.user.id]
    );

    // Send personalized Co-Founder email (async, don't block response)
    const { sendCoFounderFirstEmail } = require('../services/email-service');
    const userRow = (await pool.query('SELECT name, email FROM users WHERE id = $1', [req.user.id])).rows[0];
    sendCoFounderFirstEmail(
      { name: userRow?.name, email: userRow?.email || req.user.email },
      { name: companyData.name, description: companyData.description, audience: companyData.audience },
      intakeContext
    ).catch(err => {
      console.error('[Onboarding] Failed to send Co-Founder email:', err.message);
    });
    
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
      [req.user.id]
    );
    
    if (!user.rows || user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = user.rows[0];
    
    // Check if user has companies
    const companies = await pool.query(
      'SELECT id, name, subdomain FROM companies WHERE user_id = $1',
      [req.user.id]
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
