/**
 * seed-demo.js
 *
 * Pobla la DB con datos demo para la presentación del viernes.
 * Idea: SaaS gestión citas clínicas dentales España
 *
 * Uso:
 *   DATABASE_URL=postgresql://... node scripts/seed-demo.js
 *   node scripts/seed-demo.js  (usa .env si existe)
 *
 * Crea (idempotente — borra y recrea si ya existen):
 *   - Usuario demo (demo@lanzalo.pro / demo1234)
 *   - Empresa demo (DentaFlow)
 *   - Idea descubierta
 *   - Analysis viabilidad completo en companies.metadata
 *   - Plan 14 días completo en companies.metadata
 *   - 12 tareas con estados variados (done, in_progress, todo)
 *   - 15 entradas de activity_log
 *   - 6 mensajes de chat (conversación cofundador)
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/lanzalo';
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('railway') || DATABASE_URL.includes('render') || DATABASE_URL.includes('supabase')
    ? { rejectUnauthorized: false }
    : false
});

// ─────────────────────────────────────────────
// DATOS DEMO
// ─────────────────────────────────────────────

const DEMO_USER = {
  email: 'demo@lanzalo.pro',
  password: 'demo1234',
  name: 'Carlos Martínez',
};

const DEMO_COMPANY = {
  name: 'DentaFlow',
  tagline: 'Gestión de citas dentales sin fricciones',
  description: 'SaaS para clínicas dentales en España que automatiza la gestión de citas, recordatorios y seguimiento de pacientes. Reduce el no-show un 40% con recordatorios inteligentes por WhatsApp y SMS.',
  industry: 'SaaS / HealthTech',
  subdomain: 'dentaflow',
  status: 'building',
};

const VIABILITY_ANALYSIS = {
  verdict: 'go',
  confidenceScore: 78,
  summary: 'DentaFlow ataca un mercado real con dolor claro: el 30% de citas dentales en España son no-shows, costándole a cada clínica €8.000-15.000/año. La solución es técnicamente simple y los fundadores tienen ventaja al conocer el sector. Timing excelente: el mercado dental español se está digitalizando aceleradamente post-COVID.',
  timing: {
    score: 'good',
    reason: 'La digitalización forzada por COVID creó hábito de comunicación digital en pacientes mayores. Más del 60% de las 10.000+ clínicas dentales en España siguen usando hojas Excel o llamadas telefónicas para gestionar citas. Ventana de 18-24 meses antes de que jugadores grandes (Doctolib, Doctoralia) entren con fuerza.'
  },
  customer: {
    segment: 'Clínicas dentales independientes con 2-5 dentistas, España',
    estimatedSize: '7.800 clínicas en el segmento objetivo (excluye grandes cadenas)',
    willingnessToPay: '€49-89/mes por clínica',
    painLevel: 'high'
  },
  competition: {
    directCompetitors: [
      { name: 'Doctoralia Premium', price: '€199/mes', weakness: 'Demasiado caro y genérico, no especializado en dental' },
      { name: 'Gesden', price: '€150/mes', weakness: 'Software legacy, sin mobile, integración WhatsApp inexistente' },
      { name: 'Clinicalia', price: '€79/mes', weakness: 'Sin recordatorios automáticos, interfaz anticuada' }
    ],
    competitiveWindow: 'Ventana clara de 18 meses. Los competidores existentes son legacy software con deuda técnica enorme. Un producto moderno con WhatsApp Business API gana por defecto.',
    moat: 'Carlos tiene 3 años en sector dental tech y conexión directa con asociación de dentistas. Acceso privilegiado a primeros 50 clientes.'
  },
  channels: [
    {
      name: 'Venta directa a asociaciones dentales',
      type: 'direct',
      estimatedCAC: '€120-180',
      priority: 1,
      reason: 'Carlos tiene acceso directo al Colegio de Dentistas de Madrid. Una charla en su congreso anual puede generar 20-30 demos en un día.'
    },
    {
      name: 'Cold outreach por LinkedIn + Email',
      type: 'outbound',
      estimatedCAC: '€80-150',
      priority: 2,
      reason: 'Los gerentes de clínicas dentales son activos en LinkedIn. Tasa de respuesta estimada 8-12% con mensaje personalizado sobre reducción de no-shows.'
    },
    {
      name: 'Contenido SEO (blog dental)',
      type: 'content',
      estimatedCAC: '€40-80',
      priority: 3,
      reason: '"Reducir no-shows clínica dental" tiene 1.200 búsquedas/mes en España. Artículo de guía puede posicionarse en 60-90 días y generar tráfico calificado.'
    }
  ],
  risks: [
    {
      description: 'Integración con software legacy de gestión dental (Gesden, Clinicalia) requiere desarrollo adicional',
      severity: 'medium',
      mitigation: 'Lanzar primero como herramienta standalone de recordatorios. La integración puede venir en v2 si los clientes la piden. El 40% de clínicas objetivo no tienen software de gestión.'
    },
    {
      description: 'Regulación RGPD/LOPD datos médicos puede complicar el producto',
      severity: 'medium',
      mitigation: 'Contratar consultor RGPD por €800 en el mes 2. No almacenar historiales clínicos, solo datos de contacto y citas. Modelo similar a Calendly: mínimo de datos.'
    },
    {
      description: 'Competidor grande (Doctolib) puede lanzar feature similar en 6 meses',
      severity: 'low',
      mitigation: 'Enfocarse en cerrar primeros 50 contratos anuales antes del mes 6. Con 50 clientes pagando, la empresa tiene credibilidad y retención suficiente para resistir la competencia.'
    }
  ]
};

const PLAN_14_DAYS = {
  planId: 'plan_dentaflow_demo',
  totalTasks: 16,
  sprints: [
    {
      id: 1,
      name: 'Validación Rápida',
      days: '1-3',
      objective: 'Hablar con 5 clínicas dentales reales antes de construir nada.',
      tasks: [
        {
          id: 't1',
          day: 1,
          title: 'Prepara guión de entrevista para clínicas',
          description: 'Diseña 5-7 preguntas para validar el dolor del no-show. El agente puede generarlo.',
          estimatedMinutes: 30,
          expectedOutput: 'Guión de entrevista listo en Google Doc',
          category: 'research',
          agentCanHelp: true,
          agentAction: 'generate_interview_script'
        },
        {
          id: 't2',
          day: 1,
          title: 'Identifica 20 clínicas en LinkedIn/Maps',
          description: 'Busca clínicas dentales en Madrid/Barcelona con 2-5 dentistas. Anota nombre del gerente.',
          estimatedMinutes: 60,
          expectedOutput: 'Lista de 20 clínicas con contacto en Notion',
          category: 'research',
          agentCanHelp: false
        },
        {
          id: 't3',
          day: 2,
          title: 'Envía 10 mensajes de primer contacto',
          description: 'LinkedIn DM o email directo. El agente puede personalizar el mensaje de outreach.',
          estimatedMinutes: 45,
          expectedOutput: '10 mensajes enviados, 3+ respuestas objetivo',
          category: 'outreach',
          agentCanHelp: true,
          agentAction: 'generate_outreach_message'
        },
        {
          id: 't4',
          day: 3,
          title: 'Realiza 3 entrevistas de validación',
          description: 'Llamada de 20 min con gerentes de clínica. Objetivo: confirmar problema y disposición a pagar.',
          estimatedMinutes: 90,
          expectedOutput: '3 entrevistas grabadas, notas con insights',
          category: 'research',
          agentCanHelp: false
        }
      ]
    },
    {
      id: 2,
      name: 'MVP Mínimo',
      days: '4-7',
      objective: 'Construir el recordatorio automático más simple posible.',
      tasks: [
        {
          id: 't5',
          day: 4,
          title: 'Configura Twilio para SMS + WhatsApp',
          description: 'Cuenta de Twilio, número virtual, y templates de recordatorio aprobados.',
          estimatedMinutes: 120,
          expectedOutput: 'Twilio configurado, SMS de prueba enviado',
          category: 'development',
          agentCanHelp: true,
          agentAction: 'generate_twilio_setup_guide'
        },
        {
          id: 't6',
          day: 5,
          title: 'Crea formulario de alta para clínicas',
          description: 'Form simple (Tally o HTML): nombre clínica, nº teléfono, horario. Sin backend complejo aún.',
          estimatedMinutes: 90,
          expectedOutput: 'URL del formulario funcionando',
          category: 'development',
          agentCanHelp: false
        },
        {
          id: 't7',
          day: 6,
          title: 'Conecta Google Calendar con recordatorios',
          description: 'Webhook de GCal → script Node.js → envío SMS/WhatsApp 24h y 2h antes.',
          estimatedMinutes: 180,
          expectedOutput: 'Demo funcional: cita en calendar → SMS automático',
          category: 'development',
          agentCanHelp: false
        },
        {
          id: 't8',
          day: 7,
          title: 'Demo interno + landing page',
          description: 'Graba screencast de 2 min. El agente genera copy para la landing.',
          estimatedMinutes: 60,
          expectedOutput: 'Vídeo demo + landing en Framer/Webflow',
          category: 'marketing',
          agentCanHelp: true,
          agentAction: 'generate_landing_copy'
        }
      ]
    },
    {
      id: 3,
      name: 'Primeros Clientes',
      days: '8-11',
      objective: 'Conseguir 3 clínicas pagando (aunque sea €1).',
      tasks: [
        {
          id: 't9',
          day: 8,
          title: 'Contacta las 3 clínicas más interesadas del sprint 1',
          description: 'Envía vídeo demo. Ofrece 30 días gratis a cambio de feedback semanal.',
          estimatedMinutes: 45,
          expectedOutput: '1+ clínica probando el producto',
          category: 'sales',
          agentCanHelp: false
        },
        {
          id: 't10',
          day: 9,
          title: 'Configura pago recurrente con Stripe',
          description: '€49/mes, sin contrato. El agente genera los emails de onboarding.',
          estimatedMinutes: 90,
          expectedOutput: 'Link de pago Stripe activo',
          category: 'development',
          agentCanHelp: true,
          agentAction: 'generate_onboarding_emails'
        },
        {
          id: 't11',
          day: 10,
          title: 'Presenta en Colegio de Dentistas Madrid',
          description: 'Demo de 15 min en su canal Telegram/WhatsApp de miembros.',
          estimatedMinutes: 60,
          expectedOutput: '10+ leads nuevos',
          category: 'sales',
          agentCanHelp: false
        },
        {
          id: 't12',
          day: 11,
          title: 'Cierra primer contrato anual',
          description: 'Propuesta de €490/año (2 meses gratis vs mensual). Objetivo: €490 MRR.',
          estimatedMinutes: 60,
          expectedOutput: '1 contrato firmado (DocuSign)',
          category: 'sales',
          agentCanHelp: true,
          agentAction: 'generate_sales_proposal'
        }
      ]
    },
    {
      id: 4,
      name: 'Feedback Loop',
      days: '12-14',
      objective: 'Aprender qué funciona, decidir si pivotar o acelerar.',
      tasks: [
        {
          id: 't13',
          day: 12,
          title: 'Entrevista de feedback con clientes piloto',
          description: '20 min con cada clínica. ¿Qué falta? ¿Vale €49/mes? ¿Lo recomendarían?',
          estimatedMinutes: 90,
          expectedOutput: 'Notas de feedback + NPS score',
          category: 'research',
          agentCanHelp: false
        },
        {
          id: 't14',
          day: 13,
          title: 'Prioriza backlog basado en feedback',
          description: 'Top 5 features pedidas. El agente ayuda a crear las historias de usuario.',
          estimatedMinutes: 60,
          expectedOutput: 'Backlog v2 priorizado en Notion',
          category: 'planning',
          agentCanHelp: true,
          agentAction: 'generate_user_stories'
        },
        {
          id: 't15',
          day: 14,
          title: 'Retrospectiva y decisión go/no-go mes 2',
          description: '¿Tenemos 3 clientes pagando? → continuar. ¿Menos de 1? → pivotar modelo de pricing.',
          estimatedMinutes: 60,
          expectedOutput: 'Decision doc + plan mes 2',
          category: 'planning',
          agentCanHelp: false
        },
        {
          id: 't16',
          day: 14,
          title: 'Publica caso de éxito en LinkedIn',
          description: '"Cómo redujimos los no-shows de una clínica dental en 40%". El agente lo redacta.',
          estimatedMinutes: 30,
          expectedOutput: 'Post publicado + 100+ impresiones',
          category: 'marketing',
          agentCanHelp: true,
          agentAction: 'generate_linkedin_post'
        }
      ]
    }
  ]
};

const DISCOVERED_IDEA = {
  title: 'SaaS de Gestión de Citas para Clínicas Dentales',
  problem: 'El 30% de las citas dentales en España son no-shows, costándole a cada clínica €8.000-15.000/año. Los sistemas actuales son caros, legacy y sin integración con WhatsApp.',
  target_audience: 'Gerentes y propietarios de clínicas dentales independientes en España (2-5 dentistas)',
  evidence: '500+ posts en grupos de Facebook de dentistas quejándose del problema. €8.000 coste promedio anual por no-shows (estudio COEM 2024). Competidores con NPS bajo 30.',
  source: 'reddit',
  source_url: 'https://www.reddit.com/r/odontologia',
  category: 'saas',
  difficulty: 'easy',
  potential_revenue: '€5K-20K/mes MRR en 12 meses',
  score: 89,
  status: 'new',
  batch_id: '2026-W10'
};

const TASKS_DATA = [
  // Sprint 1 - completadas
  {
    title: 'Prepara guión de entrevista para clínicas',
    description: 'Diseña 5-7 preguntas para validar el dolor del no-show.',
    tag: 'research',
    task_type: 'validation',
    status: 'done',
    priority: 'high',
    estimated_hours: 0.5,
    output: 'Guión creado con 7 preguntas. Insights principales: confirman que el no-show es el mayor dolor, pagarían €40-80/mes por solución automatizada.',
    created_at: new Date(Date.now() - 10 * 24 * 3600 * 1000),
    completed_at: new Date(Date.now() - 10 * 24 * 3600 * 1000 + 1800000)
  },
  {
    title: 'Identifica 20 clínicas potenciales en Madrid',
    description: 'Busca clínicas dentales con 2-5 dentistas en LinkedIn y Google Maps.',
    tag: 'research',
    task_type: 'research',
    status: 'done',
    priority: 'high',
    estimated_hours: 1,
    output: '22 clínicas identificadas en Notion con nombre del gerente, email y LinkedIn. Tasa de respuesta esperada 15%.',
    created_at: new Date(Date.now() - 10 * 24 * 3600 * 1000),
    completed_at: new Date(Date.now() - 10 * 24 * 3600 * 1000 + 3600000)
  },
  {
    title: 'Envía 10 mensajes de primer contacto',
    description: 'LinkedIn DM personalizado a gerentes de clínicas.',
    tag: 'marketing',
    task_type: 'outreach',
    status: 'done',
    priority: 'high',
    estimated_hours: 0.75,
    output: '10 mensajes enviados. 4 respuestas (40% respuesta). 3 interesados en demo.',
    created_at: new Date(Date.now() - 9 * 24 * 3600 * 1000),
    completed_at: new Date(Date.now() - 9 * 24 * 3600 * 1000 + 2700000)
  },
  {
    title: 'Realiza 3 entrevistas de validación',
    description: 'Llamadas de 20 min con gerentes de clínica.',
    tag: 'research',
    task_type: 'validation',
    status: 'done',
    priority: 'critical',
    estimated_hours: 1.5,
    output: '3/3 entrevistas completadas. Los 3 confirman dolor. 2 de 3 pagarían ahora mismo. Precio óptimo: €49-59/mes. Feature más pedida: recordatorio por WhatsApp.',
    created_at: new Date(Date.now() - 8 * 24 * 3600 * 1000),
    completed_at: new Date(Date.now() - 8 * 24 * 3600 * 1000 + 5400000)
  },
  // Sprint 2 - en progreso
  {
    title: 'Configura Twilio para SMS + WhatsApp',
    description: 'Cuenta de Twilio, número virtual, templates de recordatorio.',
    tag: 'code',
    task_type: 'development',
    status: 'done',
    priority: 'high',
    estimated_hours: 2,
    output: 'Twilio configurado. WhatsApp Business API aprobada. 3 templates de recordatorio activos.',
    created_at: new Date(Date.now() - 7 * 24 * 3600 * 1000),
    completed_at: new Date(Date.now() - 7 * 24 * 3600 * 1000 + 7200000)
  },
  {
    title: 'Conecta Google Calendar con recordatorios automáticos',
    description: 'Webhook GCal → Node.js → SMS/WhatsApp 24h y 2h antes de la cita.',
    tag: 'code',
    task_type: 'development',
    status: 'in_progress',
    priority: 'critical',
    estimated_hours: 3,
    output: null,
    created_at: new Date(Date.now() - 6 * 24 * 3600 * 1000),
    started_at: new Date(Date.now() - 6 * 24 * 3600 * 1000 + 3600000)
  },
  {
    title: 'Landing page con demo en vídeo',
    description: 'Framer landing + screencast de 2 min del producto.',
    tag: 'marketing',
    task_type: 'marketing',
    status: 'in_progress',
    priority: 'high',
    estimated_hours: 1.5,
    output: null,
    created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000),
    started_at: new Date(Date.now() - 4 * 24 * 3600 * 1000)
  },
  // Sprint 3 - pendientes
  {
    title: 'Configura Stripe y página de precios',
    description: '€49/mes básico, €89/mes pro. Sin contrato. Pago con tarjeta.',
    tag: 'code',
    task_type: 'development',
    status: 'todo',
    priority: 'high',
    estimated_hours: 1.5,
    output: null,
    created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000)
  },
  {
    title: 'Demo en vivo con 3 clínicas interesadas',
    description: 'Videollamada de 30 min. Objetivo: cerrar 1 contrato de prueba.',
    tag: 'marketing',
    task_type: 'sales',
    status: 'todo',
    priority: 'critical',
    estimated_hours: 2,
    output: null,
    created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000)
  },
  {
    title: 'Email de onboarding automático para nuevas clínicas',
    description: 'Secuencia de 3 emails post-registro. El agente generó el copy.',
    tag: 'marketing',
    task_type: 'marketing',
    status: 'todo',
    priority: 'medium',
    estimated_hours: 1,
    output: null,
    created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000)
  },
  {
    title: 'Presenta en Colegio de Dentistas Madrid',
    description: 'Demo en grupo de WhatsApp/Telegram de la asociación. 200+ miembros.',
    tag: 'marketing',
    task_type: 'sales',
    status: 'todo',
    priority: 'high',
    estimated_hours: 1,
    output: null,
    created_at: new Date(Date.now() - 1 * 24 * 3600 * 1000)
  },
  {
    title: 'Panel de analytics para clínicas (tasa de confirmación)',
    description: 'Dashboard simple: % confirmaciones, no-shows evitados, ROI estimado.',
    tag: 'code',
    task_type: 'development',
    status: 'todo',
    priority: 'low',
    estimated_hours: 3,
    output: null,
    created_at: new Date(Date.now() - 1 * 24 * 3600 * 1000)
  }
];

const ACTIVITY_LOG_DATA = [
  { activity_type: 'task_complete', message: '✅ Guión de entrevista generado y validado. 7 preguntas listas.', created_at: new Date(Date.now() - 10 * 24 * 3600 * 1000 + 1800000) },
  { activity_type: 'task_complete', message: '✅ 22 clínicas identificadas en Madrid. Lista exportada a Notion.', created_at: new Date(Date.now() - 10 * 24 * 3600 * 1000 + 5400000) },
  { activity_type: 'task_complete', message: '✅ 10 mensajes de outreach enviados. 4 respuestas recibidas (40%).', created_at: new Date(Date.now() - 9 * 24 * 3600 * 1000 + 3600000) },
  { activity_type: 'milestone', message: '🎯 VALIDACIÓN CONFIRMADA: 3 entrevistas con gerentes. 2/3 pagarían hoy. Precio óptimo: €49/mes.', created_at: new Date(Date.now() - 8 * 24 * 3600 * 1000 + 7200000) },
  { activity_type: 'task_complete', message: '✅ Twilio configurado. WhatsApp Business API aprobada. Templates de recordatorio listos.', created_at: new Date(Date.now() - 7 * 24 * 3600 * 1000 + 7200000) },
  { activity_type: 'task_start', message: '⚙️ Iniciando integración Google Calendar → recordatorios automáticos.', created_at: new Date(Date.now() - 6 * 24 * 3600 * 1000 + 3600000) },
  { activity_type: 'deploy', message: '🚀 Servidor de recordatorios desplegado en Railway. Endpoint /api/webhook/gcal activo.', created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000 + 1800000) },
  { activity_type: 'task_start', message: '🎨 Iniciando diseño de landing page en Framer.', created_at: new Date(Date.now() - 4 * 24 * 3600 * 1000) },
  { activity_type: 'email_sent', message: '📧 3 emails de seguimiento enviados a clínicas interesadas con vídeo demo.', created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000 + 3600000) },
  { activity_type: 'tweet_posted', message: '🐦 Post en LinkedIn: "El no-show en dentistas cuesta €8.000/año. Aquí cómo lo resolvemos." → 340 impresiones.', created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000 + 5400000) },
  { activity_type: 'milestone', message: '💬 Clínica "Dental Vallecas" solicita demo en vivo para el jueves.', created_at: new Date(Date.now() - 1 * 24 * 3600 * 1000 + 7200000) },
  { activity_type: 'task_complete', message: '✅ Análisis de viabilidad completado. Veredicto: GO (78% confianza).', created_at: new Date(Date.now() - 11 * 24 * 3600 * 1000) },
  { activity_type: 'task_complete', message: '✅ Plan de 14 días generado. 16 tareas en 4 sprints.', created_at: new Date(Date.now() - 11 * 24 * 3600 * 1000 + 3600000) },
  { activity_type: 'deploy', message: '🌐 Landing page dentaflow.lanzalo.app en línea.', created_at: new Date(Date.now() - 4 * 24 * 3600 * 1000 + 7200000) },
  { activity_type: 'milestone', message: '🎯 DÍA 7: 5 entrevistas de validación completadas. 4/5 dispuestos a pagar. ¡MVP listo para demo!', created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000 + 9000000) },
];

const CHAT_MESSAGES = [
  {
    role: 'user',
    content: '¿Cuál es el estado actual del proyecto?',
    action: null,
    created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000)
  },
  {
    role: 'assistant',
    content: `# Estado DentaFlow - Día 7 del plan\n\n## ✅ Completado\n- **Validación**: 5 entrevistas con gerentes de clínicas → 4/5 confirman dolor real\n- **Precio validado**: €49-59/mes es el rango aceptado\n- **Twilio configurado**: SMS + WhatsApp Business API activos\n- **Outreach**: 22 clínicas contactadas, 6 interesadas\n\n## ⚙️ En progreso\n- Integración Google Calendar → recordatorios automáticos (75% listo)\n- Landing page en Framer (diseño base terminado)\n\n## 🎯 Próximos pasos críticos\n1. **Hoy**: Terminar webhook de Google Calendar\n2. **Mañana**: Demo en vivo con Dental Vallecas\n3. **Jueves**: Configurar Stripe y cerrar primer contrato\n\nLa validación es sólida. Tenemos luz verde para construir.`,
    action: 'status_report',
    created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000 + 30000)
  },
  {
    role: 'user',
    content: 'Necesito el guión para la demo con Dental Vallecas mañana',
    action: null,
    created_at: new Date(Date.now() - 1 * 24 * 3600 * 1000)
  },
  {
    role: 'assistant',
    content: `# Guión Demo - Dental Vallecas (30 min)\n\n## Apertura (5 min)\n"Gracias por el tiempo. Sé que el no-show es vuestro mayor dolor de cabeza. Os voy a mostrar cómo DentaFlow lo resuelve en 2 minutos de setup."\n\n## Demo en vivo (15 min)\n1. **Conectar Google Calendar** → 30 segundos\n2. **Primera cita programada** → recordatorio automático por WhatsApp\n3. **Panel de analytics** → "En promedio reducimos no-shows un 38%"\n4. **Mostrar ahorro estimado** → "Con 200 citas/mes, eso es €1.200/mes recuperados"\n\n## Cierre (10 min)\n- Precio: €49/mes o €490/año (2 meses gratis)\n- Prueba gratuita 30 días sin tarjeta\n- **Objetivo**: que salgas con el calendar conectado hoy mismo\n\n## Objeciones frecuentes\n- "¿Y si el paciente no usa WhatsApp?" → También enviamos SMS\n- "¿Seguro con datos médicos?" → Solo gestionamos fechas y teléfonos, sin historial clínico\n- "¿Funciona con nuestro software actual?" → Sí, con cualquier sistema que use Google Calendar`,
    action: 'demo_script',
    created_at: new Date(Date.now() - 1 * 24 * 3600 * 1000 + 45000)
  },
  {
    role: 'user',
    content: 'Genera el email de seguimiento post-demo',
    action: null,
    created_at: new Date(Date.now() - 3600000)
  },
  {
    role: 'assistant',
    content: `# Email Post-Demo - Dental Vallecas\n\n**Asunto:** DentaFlow para Dental Vallecas — prueba gratuita 30 días\n\n---\n\nHola [Nombre],\n\nGracias por el tiempo hoy. Ha sido una conversación muy valiosa.\n\nComo acordamos, aquí tienes el link para activar vuestra **prueba gratuita de 30 días**:\n\n→ **[Activar prueba gratis](https://dentaflow.lanzalo.app/start)**\n\nEn menos de 5 minutos tendréis los recordatorios automáticos funcionando. Si surge alguna duda durante el setup, responde a este email y te ayudo directamente.\n\n**Lo que incluye la prueba:**\n- Recordatorios automáticos por WhatsApp + SMS\n- Panel de analytics en tiempo real\n- Soporte directo (respuesta en <2h)\n\nUn saludo,\nCarlos\nDentaFlow — Reduce los no-shows de tu clínica un 40%`,
    action: 'email_template',
    created_at: new Date(Date.now() - 3600000 + 60000)
  }
];

// ─────────────────────────────────────────────
// FUNCIONES DE INSERCIÓN
// ─────────────────────────────────────────────

async function createOrUpdateUser(client) {
  console.log('👤 Creando usuario demo...');
  const passwordHash = await bcrypt.hash(DEMO_USER.password, 10);
  const trialEnds = new Date();
  trialEnds.setDate(trialEnds.getDate() + 30);

  const founderProfile = {
    motivation: 'startup',
    timeAvailable: '15_30',
    experience: 'some_revenue',
    role: 'technical'
  };

  const existing = await client.query('SELECT id FROM users WHERE email = $1', [DEMO_USER.email]);

  let userId;
  if (existing.rows.length > 0) {
    userId = existing.rows[0].id;
    await client.query(
      `UPDATE users SET
        password_hash = $1, name = $2, role = 'user', plan = 'pro',
        credits = 500, trial_ends_at = $3, onboarding_completed = TRUE,
        survey_data = $4, updated_at = NOW()
      WHERE id = $5`,
      [passwordHash, DEMO_USER.name, trialEnds, JSON.stringify({ founderProfile }), userId]
    );
    console.log(`  ✅ Usuario actualizado: ${DEMO_USER.email} (id: ${userId})`);
  } else {
    const res = await client.query(
      `INSERT INTO users (email, password_hash, name, role, plan, credits, trial_ends_at, onboarding_completed, survey_data)
       VALUES ($1, $2, $3, 'user', 'pro', 500, $4, TRUE, $5)
       RETURNING id`,
      [DEMO_USER.email, passwordHash, DEMO_USER.name, trialEnds, JSON.stringify({ founderProfile })]
    );
    userId = res.rows[0].id;
    console.log(`  ✅ Usuario creado: ${DEMO_USER.email} (id: ${userId})`);
  }
  return userId;
}

async function createOrUpdateCompany(client, userId) {
  console.log('🏢 Creando empresa demo...');

  const ideaData = {
    description: DEMO_COMPANY.description,
    targetCustomer: 'Gerentes de clínicas dentales independientes España',
    problem: 'No-shows cuestan €8.000-15.000/año por clínica. Sin solución automatizada accesible.',
    unfairAdvantage: '3 años de experiencia en sector dental tech + acceso directo a Colegio de Dentistas Madrid'
  };

  const metadata = {
    ideaData,
    viabilityStatus: 'completed',
    viabilityAnalysis: VIABILITY_ANALYSIS,
    plan14DaysStatus: 'completed',
    plan14Days: PLAN_14_DAYS,
    currentDay: 7,
    onboardingStep: 'dashboard',
    demoMode: true
  };

  // Borrar empresa existente (cascade borra tasks, activity_log, chat_messages)
  await client.query('DELETE FROM companies WHERE user_id = $1 AND subdomain = $2', [userId, DEMO_COMPANY.subdomain]);

  const res = await client.query(
    `INSERT INTO companies (user_id, name, tagline, description, industry, subdomain, status, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [userId, DEMO_COMPANY.name, DEMO_COMPANY.tagline, DEMO_COMPANY.description, DEMO_COMPANY.industry, DEMO_COMPANY.subdomain, DEMO_COMPANY.status, JSON.stringify(metadata)]
  );
  const companyId = res.rows[0].id;
  console.log(`  ✅ Empresa creada: ${DEMO_COMPANY.name} (id: ${companyId})`);
  return companyId;
}

async function createTasks(client, companyId) {
  console.log('📋 Creando tareas...');
  const taskIds = [];

  for (const task of TASKS_DATA) {
    const res = await client.query(
      `INSERT INTO tasks (company_id, title, description, tag, task_type, status, priority, estimated_hours, output, created_at, started_at, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      [
        companyId,
        task.title,
        task.description,
        task.tag,
        task.task_type || task.tag,
        task.status,
        task.priority || 'medium',
        task.estimated_hours || null,
        task.output || null,
        task.created_at || new Date(),
        task.started_at || (task.status === 'in_progress' ? task.created_at : null),
        task.completed_at || (task.status === 'done' ? new Date(task.created_at.getTime() + 3600000) : null)
      ]
    );
    taskIds.push(res.rows[0].id);
    console.log(`  ✅ Tarea: [${task.status}] ${task.title}`);
  }

  return taskIds;
}

async function createActivityLog(client, companyId, taskIds) {
  console.log('📊 Creando activity log...');

  for (let i = 0; i < ACTIVITY_LOG_DATA.length; i++) {
    const entry = ACTIVITY_LOG_DATA[i];
    const taskId = taskIds[i % taskIds.length] || null;

    await client.query(
      `INSERT INTO activity_log (company_id, task_id, activity_type, message, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [companyId, taskId, entry.activity_type, entry.message, entry.created_at]
    );
  }
  console.log(`  ✅ ${ACTIVITY_LOG_DATA.length} entradas de activity log creadas`);
}

async function createChatMessages(client, companyId, userId) {
  console.log('💬 Creando mensajes de chat...');

  for (const msg of CHAT_MESSAGES) {
    await client.query(
      `INSERT INTO chat_messages (company_id, user_id, role, content, action, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [companyId, userId, msg.role, msg.content, msg.action, msg.created_at]
    );
  }
  console.log(`  ✅ ${CHAT_MESSAGES.length} mensajes de chat creados`);
}

async function createDiscoveredIdea(client) {
  console.log('💡 Creando idea descubierta...');

  // Verificar si ya existe
  const existing = await client.query(
    'SELECT id FROM discovered_ideas WHERE title = $1',
    [DISCOVERED_IDEA.title]
  );

  if (existing.rows.length > 0) {
    console.log('  ⏭️  Idea ya existe, saltando');
    return existing.rows[0].id;
  }

  const res = await client.query(
    `INSERT INTO discovered_ideas (title, problem, target_audience, evidence, source, source_url, category, difficulty, potential_revenue, score, status, batch_id, discovered_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
     RETURNING id`,
    [
      DISCOVERED_IDEA.title,
      DISCOVERED_IDEA.problem,
      DISCOVERED_IDEA.target_audience,
      DISCOVERED_IDEA.evidence,
      DISCOVERED_IDEA.source,
      DISCOVERED_IDEA.source_url,
      DISCOVERED_IDEA.category,
      DISCOVERED_IDEA.difficulty,
      DISCOVERED_IDEA.potential_revenue,
      DISCOVERED_IDEA.score,
      DISCOVERED_IDEA.status,
      DISCOVERED_IDEA.batch_id
    ]
  );
  console.log(`  ✅ Idea creada (id: ${res.rows[0].id})`);
  return res.rows[0].id;
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────

async function main() {
  console.log('\n🌱 SEED DEMO — Lanzalo MVP Presentación\n');
  console.log(`📌 DB: ${DATABASE_URL.replace(/:[^:@]+@/, ':***@')}\n`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userId = await createOrUpdateUser(client);
    const companyId = await createOrUpdateCompany(client, userId);
    const taskIds = await createTasks(client, companyId);
    await createActivityLog(client, companyId, taskIds);
    await createChatMessages(client, companyId, userId);
    await createDiscoveredIdea(client);

    await client.query('COMMIT');

    console.log('\n✅ SEED COMPLETADO\n');
    console.log('─────────────────────────────────────────');
    console.log('📧 Email:    demo@lanzalo.pro');
    console.log('🔑 Password: demo1234');
    console.log('🏢 Empresa:  DentaFlow (SaaS dental)');
    console.log('📋 Tareas:   12 (5 done, 2 in_progress, 5 todo)');
    console.log('📊 Activity: 15 entradas');
    console.log('💬 Chat:     6 mensajes con artefactos');
    console.log('─────────────────────────────────────────\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ ERROR durante el seed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
