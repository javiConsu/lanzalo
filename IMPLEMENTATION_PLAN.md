# Implementation Plan - Lanzalo MVP

Plan completo de implementación para MVP funcional de Lanzalo.

---

## 🎯 Objetivo

Sistema end-to-end completo:
- Registration sin tarjeta
- Trial 14 días
- Onboarding con validación de idea
- Generación automática de negocio
- Free vs Pro plans
- Drip emails
- Cancellation con feedback
- Analytics de churn

---

## 📋 Fase 1: Backend Core (Semana 1)

### 1.1 Authentication & Registration

**Archivos**:
- `backend/routes/auth.js`
- `database/migrations/009_add_trials.sql`

**Features**:
- POST /api/auth/register (email + password, NO tarjeta)
- POST /api/auth/login (JWT)
- GET /api/auth/me (current user)
- Trial 14 días automático
- User roles (admin, user)

**Schema updates**:
```sql
ALTER TABLE users ADD COLUMN trial_started_at TIMESTAMP;
ALTER TABLE users ADD COLUMN trial_ends_at TIMESTAMP;
ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'trial'; -- trial, free, pro
ALTER TABLE users ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;
```

**Endpoints**:
```javascript
POST /api/auth/register
{
  email: string,
  password: string
}
Response: { token, user, redirect: "/onboarding/survey" }

POST /api/auth/login
{
  email: string,
  password: string
}
Response: { token, user, redirect: "/dashboard" or "/onboarding/survey" }

GET /api/auth/me
Headers: Authorization: Bearer <token>
Response: { user }
```

---

### 1.2 Plans & Quotas

**Archivos**:
- `backend/middleware/plan-enforcement.js`
- `backend/utils/quotas.js`

**Plan Limits**:
```javascript
const PLAN_LIMITS = {
  free: {
    companies: 1,
    metaAds: false,
    emailAutomation: false,
    twitterAutomation: false,
    analytics: 'basic',
    support: 'community'
  },
  pro: {
    companies: Infinity,
    metaAds: true,
    emailAutomation: true,
    twitterAutomation: true,
    analytics: 'full',
    support: 'priority'
  }
};
```

**Middleware**:
```javascript
async function requirePro(req, res, next) {
  if (req.user.plan === 'free') {
    return res.status(403).json({
      error: 'This feature requires Pro plan',
      upgrade: '/upgrade'
    });
  }
  next();
}
```

---

### 1.3 Company Management

**Endpoints**:
```javascript
POST /api/companies
{
  name: string,
  description: string,
  audience: string
}
Response: {
  companyId,
  subdomain,
  status: 'validating', // New step!
  validationTaskId
}

GET /api/companies
Response: { companies: [...] }

GET /api/companies/:id
Response: { company, tasks, progress }
```

**Flow actualizado**:
```
1. User describe idea
2. Create company (status: 'validating')
3. Create validation task (Research Agent)
4. Wait for validation (30-60s)
5. Show validation report
6. If user continues:
   - Update status to 'building'
   - Create tasks (analysis, landing, etc.)
7. CEO Agent orchestrates
```

---

### 1.4 Idea Validation System

**Archivos**:
- `agents/executors/research-executor.js` (updated)
- `backend/routes/validation.js`

**New task type**: `validation`

**Endpoints**:
```javascript
GET /api/companies/:id/validation
Response: {
  report: "markdown content",
  score: 8,
  verdict: "green", // green, yellow, red
  alternatives: [...]  // If yellow/red
}

POST /api/companies/:id/validation/proceed
{
  decision: "continue" | "pivot" | "cancel",
  adjustments: "..." // If pivot
}
```

**Research Agent updates**:
```javascript
// New method
async validateIdea(companyId) {
  const company = await getCompany(companyId);
  
  const prompt = `[Brutal validation prompt from earlier]`;
  
  const analysis = await callLLM(prompt, {
    temperature: 0.3,
    taskType: 'research'
  });
  
  // Parse score and verdict
  const score = extractScore(analysis.content);
  const verdict = score >= 7 ? 'green' 
                : score >= 4 ? 'yellow' 
                : 'red';
  
  // Save to DB
  await pool.query(
    `UPDATE companies 
     SET validation_report = ?,
         validation_score = ?,
         validation_verdict = ?
     WHERE id = ?`,
    [analysis.content, score, verdict, companyId]
  );
  
  // Complete task
  await completeTask(taskId, {
    output: analysis.content,
    metadata: { score, verdict }
  });
  
  return { report: analysis.content, score, verdict };
}
```

---

### 1.5 Upgrade System (Free → Pro)

**Archivos**:
- `backend/routes/billing.js`
- `backend/integrations/stripe.js`

**Stripe setup**:
```bash
npm install stripe
```

**Endpoints**:
```javascript
POST /api/billing/create-checkout
{
  plan: "pro"
}
Response: {
  checkoutUrl: "https://checkout.stripe.com/..."
}

POST /api/webhooks/stripe
// Handle:
// - checkout.session.completed
// - invoice.payment_succeeded
// - customer.subscription.deleted

GET /api/billing/portal
Response: {
  portalUrl: "https://billing.stripe.com/..."
}
```

**Webhook handler**:
```javascript
router.post('/webhooks/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const event = stripe.webhooks.constructEvent(
    req.body, sig, process.env.STRIPE_WEBHOOK_SECRET
  );
  
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      await pool.query(
        `UPDATE users 
         SET plan = 'pro',
             stripe_customer_id = ?,
             stripe_subscription_id = ?
         WHERE email = ?`,
        [session.customer, session.subscription, session.customer_email]
      );
      
      await sendEmail({
        template: 'upgrade_success',
        to: session.customer_email
      });
      break;
      
    case 'customer.subscription.deleted':
      await pool.query(
        `UPDATE users 
         SET plan = 'free'
         WHERE stripe_subscription_id = ?`,
        [event.data.object.id]
      );
      break;
  }
  
  res.json({ received: true });
});
```

---

### 1.6 Cancellation Feedback

**Schema**:
```sql
-- Already designed, just implement
CREATE TABLE cancellation_feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT,
  reason TEXT NOT NULL,
  reason_category TEXT NOT NULL,
  severity TEXT NOT NULL,
  additional_comments TEXT,
  user_plan TEXT,
  days_active INTEGER,
  revenue_generated REAL,
  tasks_completed INTEGER,
  last_login TIMESTAMP,
  cancelled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  contacted BOOLEAN DEFAULT FALSE,
  resolved BOOLEAN DEFAULT FALSE,
  notes TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Endpoints**:
```javascript
POST /api/user/cancel
{
  reason: "too_expensive",
  additionalComments: "..."
}
Response: {
  success: true,
  dataDeletedIn: 7 // days
}

GET /api/admin/cancellations/analytics
Response: {
  summary: { totalCancellations, churnRate },
  breakdown: { byCategory, byReason, bySeverity },
  topIssues: [...]
}
```

---

## 📋 Fase 2: Onboarding Flow (Semana 2)

### 2.1 Survey Page

**Frontend**:
- `frontend/src/pages/Survey.jsx`

**Backend**:
- `backend/routes/onboarding.js`

**Endpoint**:
```javascript
POST /api/onboarding/survey
{
  name: string,
  role: string,
  location: string,
  experience: string,
  businessType: string[],
  goal: string,
  source: string
}
Response: {
  success: true,
  reward: {
    ideas: [3 top ideas score >85],
    emailSent: true
  }
}
```

**Reward logic**:
```javascript
if (surveyCompleted) {
  const topIdeas = await pool.query(
    `SELECT * FROM discovered_ideas 
     WHERE score >= 85 AND is_active = 1
     ORDER BY score DESC 
     LIMIT 3`
  );
  
  await sendEmail({
    to: user.email,
    template: 'survey_reward_ideas',
    data: { ideas: topIdeas.rows }
  });
}
```

---

### 2.2 Idea Description Page

**Frontend**:
- `frontend/src/pages/DescribeIdea.jsx`

**Features**:
- 3 campos (nombre, descripción, audiencia)
- Validación client-side
- Auto-save draft
- Link a "Ver ideas validadas"

---

### 2.3 Validation UI

**Frontend**:
- `frontend/src/pages/Validation.jsx`
- `frontend/src/components/ValidationReport.jsx`

**Features**:
- Loading spinner (30-60s)
- Progress bar
- Report display con color-coding
- Actions: Continue / Adjust / Cancel
- Alternative ideas (si red/yellow)

**WebSocket**:
```javascript
ws.on('task.completed', (data) => {
  if (data.tag === 'validation') {
    fetchValidationReport(companyId);
    showValidationUI();
  }
});
```

---

### 2.4 Timeline Component

**Frontend**:
- `frontend/src/components/Timeline.jsx`

**Features**:
- 4 steps visualization
- Real-time updates via WebSocket
- Progress bars per step
- ETA estimates
- Confetti when complete 🎉

**Steps**:
1. Validación de idea (30-60s)
2. Análisis de mercado (1-2 min)
3. Landing page (2-3 min)
4. Setup marketing (1 min)

---

### 2.5 Business Hub

**Frontend**:
- `frontend/src/pages/Dashboard.jsx` (updated)

**Features**:
- Grid de negocios
- Status de cada uno (validating, building, live, paused)
- Progress bars
- Revenue + clientes
- Quick actions
- "+ Crear nuevo negocio"

---

## 📋 Fase 3: Email System (Semana 3)

### 3.1 Email Templates (Resend)

**Templates** (usando React Email):

```
/emails/
├── TrialStarted.tsx
├── TrialReminder3Days.tsx
├── TrialReminder2Days.tsx
├── TrialReminder1Day.tsx
├── DowngradedToFree.tsx
├── UpgradeSuccess.tsx
├── MilestoneCompleted.tsx
├── ValidationComplete.tsx
├── SurveyRewardIdeas.tsx
├── CancellationConfirmed.tsx
└── ... (Drip campaign 1-5)
```

**Usando Resend**:
```bash
npm install resend react-email
```

**Send function**:
```javascript
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail({ to, template, data }) {
  const EmailTemplate = require(`./emails/${template}`);
  
  await resend.emails.send({
    from: 'Lanzalo <noreply@lanzalo.pro>',
    to,
    subject: getSubject(template, data),
    react: EmailTemplate(data)
  });
}
```

---

### 3.2 Scheduled Emails

**Tabla**:
```sql
CREATE TABLE scheduled_emails (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  template TEXT NOT NULL,
  data TEXT, -- JSON
  send_at TIMESTAMP NOT NULL,
  sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP,
  error TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Cron job** (cada minuto):
```javascript
cron.schedule('* * * * *', async () => {
  const pending = await pool.query(
    `SELECT * FROM scheduled_emails
     WHERE sent = FALSE 
       AND send_at <= datetime('now')
     LIMIT 10`
  );
  
  for (const email of pending.rows) {
    try {
      await sendEmail({
        to: email.user_email,
        template: email.template,
        data: JSON.parse(email.data)
      });
      
      await pool.query(
        `UPDATE scheduled_emails 
         SET sent = TRUE, sent_at = datetime('now')
         WHERE id = ?`,
        [email.id]
      );
    } catch (error) {
      await pool.query(
        `UPDATE scheduled_emails 
         SET error = ?
         WHERE id = ?`,
        [error.message, email.id]
      );
    }
  }
});
```

---

### 3.3 Drip Campaign Setup

**On registration**:
```javascript
async function scheduleTrialDrip(userId, email) {
  const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  
  const schedule = [
    { day: 1, template: 'drip_day_1_welcome' },
    { day: 2, template: 'drip_day_2_progress' },
    { day: 3, template: 'drip_day_3_tips' },
    { day: 4, template: 'drip_day_4_cases' },
    { day: 5, template: 'drip_day_5_features' },
    { day: 12, template: 'trial_reminder_3days' },
    { day: 13, template: 'trial_reminder_2days' },
    { day: 14, template: 'trial_reminder_1day' }
  ];
  
  for (const { day, template } of schedule) {
    const sendAt = new Date(Date.now() + day * 24 * 60 * 60 * 1000);
    
    await pool.query(
      `INSERT INTO scheduled_emails 
       (id, user_id, template, send_at)
       VALUES (?, ?, ?, ?)`,
      [crypto.randomUUID(), userId, template, sendAt.toISOString()]
    );
  }
}
```

---

## 📋 Fase 4: Analytics & Optimization (Semana 4)

### 4.1 Churn Analytics Dashboard

**Frontend**:
- `frontend/src/pages/admin/ChurnAnalytics.jsx`

**Features**:
- Breakdown por categoría
- Breakdown por reason específica
- Breakdown por severity
- Churn rate
- Top issues
- Actionable items

---

### 4.2 Financial Agent - Daily Churn Analysis

**Cron job**:
```javascript
cron.schedule('0 9 * * *', async () => {
  await financialAgent.analyzeCancellations();
});
```

**Implementation** (ya diseñado anteriormente)

---

### 4.3 Conversion Funnel Tracking

**Events to track**:
```javascript
const EVENTS = {
  SIGNUP: 'signup',
  SURVEY_COMPLETED: 'survey_completed',
  IDEA_DESCRIBED: 'idea_described',
  VALIDATION_VIEWED: 'validation_viewed',
  COMPANY_CREATED: 'company_created',
  FIRST_LOGIN: 'first_login',
  TRIAL_ENDED: 'trial_ended',
  UPGRADED_TO_PRO: 'upgraded_to_pro',
  DOWNGRADED_TO_FREE: 'downgraded_to_free',
  CANCELLED: 'cancelled'
};
```

**Tabla**:
```sql
CREATE TABLE user_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  event TEXT NOT NULL,
  metadata TEXT, -- JSON
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 🗓️ Timeline Estimado

### Semana 1: Backend Core
- Días 1-2: Auth + Registration + Trials
- Días 3-4: Plans + Quotas + Company Management
- Día 5: Validation System
- Días 6-7: Billing (Stripe) + Cancellation

### Semana 2: Onboarding Flow
- Días 1-2: Survey + Idea Description (frontend)
- Día 3: Validation UI
- Día 4: Timeline Component
- Días 5-6: Business Hub
- Día 7: Integration testing

### Semana 3: Email System
- Días 1-3: Templates (React Email + Resend)
- Día 4: Scheduled emails infrastructure
- Días 5-6: Drip campaign setup
- Día 7: Email testing

### Semana 4: Analytics & Polish
- Días 1-2: Churn analytics
- Día 3: Financial Agent updates
- Día 4: Conversion tracking
- Días 5-7: Testing, bug fixes, optimization

---

## ✅ Definition of Done

MVP está completo cuando:

1. ✅ Usuario puede registrarse sin tarjeta
2. ✅ Trial 14 días funciona
3. ✅ Onboarding completo (survey → idea → validación → construcción)
4. ✅ Validación de idea con Research Agent
5. ✅ Generación automática de negocio
6. ✅ Hub de negocios funcional
7. ✅ Free vs Pro enforcement
8. ✅ Upgrade a Pro con Stripe
9. ✅ Drip emails (8 emails mínimo)
10. ✅ Cancelación con feedback
11. ✅ Analytics básico de churn
12. ✅ Financial Agent analiza churn diario

---

## 🚀 Deploy Strategy

### Development
```
Local: SQLite + localhost:3001
Frontend: localhost:3000
```

### Staging
```
Backend: Railway (staging)
Frontend: Vercel (preview)
DB: Railway PostgreSQL
```

### Production
```
Backend: Railway
Frontend: Vercel (lanzalo.pro)
DB: Railway PostgreSQL
Emails: Resend
Payments: Stripe
```

---

## 📊 Success Metrics (First Month)

- 50+ signups
- 40+ active trials (80%)
- 8+ Pro conversions (20%)
- <30% churn rate
- 4+ validation reports sent
- 90%+ email deliverability

---

**READY TO BUILD** 🔨

Next: Start with Phase 1.1 (Auth & Registration)
