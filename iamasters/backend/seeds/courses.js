/**
 * Catálogo base de cursos IAmasters.
 * Fuente de verdad para el seed. Cada lección se expande con contenido
 * completo (slides + narración) vía scripts/generate-content.js usando
 * al agente Profesor.
 */

const ventas = {
  department: 'ventas',
  title: 'Prospección y cierre con IA',
  summary: 'Convierte tu equipo comercial en un equipo asistido por IA: prospección, preparación de reuniones, análisis de calls y follow-ups a escala.',
  audience: 'SDR, AE, Sales Ops, Sales Managers',
  lessons: [
    {
      order: 1,
      title: 'Fundamentos: qué puede y qué NO puede hacer la IA en ventas',
      objectives: [
        'Fijar expectativas realistas sobre capacidades actuales',
        'Entender los riesgos de automatizar mal la prospección',
        'Definir principios de uso responsable',
      ],
      keywords: ['fundamentos', 'expectativas', 'riesgos'],
      estimated_minutes: 15,
    },
    {
      order: 2,
      title: 'Prospección con IA: de lista fría a mensaje que abre',
      objectives: [
        'Generar listas de prospectos cualificadas con IA',
        'Escribir cold outbound que convierte sin sonar automatizado',
      ],
      keywords: ['cold outbound', 'ICP', 'personalización'],
      estimated_minutes: 20,
    },
    {
      order: 3,
      title: 'Research pre-call en 2 minutos',
      objectives: [
        'Construir pipeline empresa → señales → ángulo de venta',
        'Detectar triggers comerciales con IA',
      ],
      keywords: ['research', 'discovery', 'account intelligence'],
      estimated_minutes: 18,
    },
    {
      order: 4,
      title: 'Personalización a escala: plantillas con merge inteligente',
      objectives: [
        'Balancear volumen y calidad en outreach',
        'Evitar el efecto plantilla detectable',
      ],
      keywords: ['escala', 'plantillas', 'hiper-personalización'],
      estimated_minutes: 20,
    },
    {
      order: 5,
      title: 'Análisis de calls: transcripción, resumen y coaching',
      objectives: [
        'Extraer insights accionables de calls con IA',
        'Identificar patrones de éxito y mejora individual',
      ],
      keywords: ['call review', 'Gong', 'coaching'],
      estimated_minutes: 22,
    },
    {
      order: 6,
      title: 'Objeciones y negociación asistida por IA',
      objectives: [
        'Construir un playbook dinámico de objeciones',
        'Usar IA en tiempo real sin romper la conversación',
      ],
      keywords: ['objeciones', 'negociación', 'playbook'],
      estimated_minutes: 22,
    },
    {
      order: 7,
      title: 'Forecast y priorización de pipeline',
      objectives: [
        'Scoring de oportunidades con IA',
        'Mejorar la precisión del forecast trimestral',
      ],
      keywords: ['forecast', 'pipeline', 'scoring'],
      estimated_minutes: 20,
    },
    {
      order: 8,
      title: 'Workflow end-to-end: 1 SDR + IA = 3 SDRs',
      objectives: [
        'Diseñar el stack completo',
        'Medir el impacto en actividades y revenue',
      ],
      keywords: ['stack', 'productividad', 'workflow'],
      estimated_minutes: 23,
    },
  ],
};

const finanzas = {
  department: 'finanzas',
  title: 'Análisis y forecasting con IA',
  summary: 'Acelera cierre mensual, variance analysis, forecasting y board decks con IA, manteniendo el rigor y la trazabilidad que exige finanzas.',
  audience: 'Controllers, FP&A, CFOs, analistas financieros',
  lessons: [
    {
      order: 1,
      title: 'IA en finanzas: dónde aporta y dónde es peligrosa',
      objectives: [
        'Mapear casos de uso seguros vs peligrosos',
        'Entender alucinación y trazabilidad',
      ],
      keywords: ['riesgos', 'alucinación', 'auditoría'],
      estimated_minutes: 18,
    },
    {
      order: 2,
      title: 'Automatización del cierre mensual',
      objectives: [
        'Acelerar accruals y conciliaciones con IA',
        'Mantener control y pista de auditoría',
      ],
      keywords: ['cierre', 'accruals', 'conciliación'],
      estimated_minutes: 22,
    },
    {
      order: 3,
      title: 'Variance analysis asistido',
      objectives: [
        'Detectar desviaciones automáticamente',
        'Generar explicaciones plausibles para revisión humana',
      ],
      keywords: ['variance', 'anomalías', 'P&L'],
      estimated_minutes: 20,
    },
    {
      order: 4,
      title: 'Forecasting con IA: time series + judgment override',
      objectives: [
        'Combinar modelos estadísticos y juicio financiero',
        'Saber cuándo rechazar el output del modelo',
      ],
      keywords: ['forecast', 'time series', 'judgment'],
      estimated_minutes: 22,
    },
    {
      order: 5,
      title: 'Análisis de P&L y unit economics con lenguaje natural',
      objectives: [
        'Preguntar al P&L como si hablaras con un analista',
        'Desglosar unit economics bajo demanda',
      ],
      keywords: ['P&L', 'unit economics', 'NLQ'],
      estimated_minutes: 20,
    },
    {
      order: 6,
      title: 'Cash flow y tesorería: alertas inteligentes',
      objectives: [
        'Detectar estrés de caja con antelación',
        'Simular escenarios con IA',
      ],
      keywords: ['cash flow', 'tesorería', 'alertas'],
      estimated_minutes: 20,
    },
    {
      order: 7,
      title: 'Board deck y storytelling financiero con IA',
      objectives: [
        'Pasar de raw data a narrativa ejecutiva',
        'Redactar insights y riesgos de forma clara',
      ],
      keywords: ['board deck', 'storytelling', 'reporting'],
      estimated_minutes: 22,
    },
    {
      order: 8,
      title: 'Gobernanza: auditoría, controles y compliance',
      objectives: [
        'Registrar prompt + output + revisor humano',
        'Diseñar controles SOX-friendly',
      ],
      keywords: ['gobernanza', 'compliance', 'SOX'],
      estimated_minutes: 20,
    },
  ],
};

const direccion = {
  department: 'direccion',
  title: 'Liderazgo y dirección en tiempos de IA',
  summary: 'Cómo dirigir una empresa cuando los equipos incluyen agentes: estrategia, talento, gobernanza y gestión del cambio para ejecutivos.',
  audience: 'CEOs, directores, founders, comité ejecutivo',
  lessons: [
    {
      order: 1,
      title: 'El nuevo rol del líder: de controlador a orquestador',
      objectives: [
        'Redefinir liderazgo cuando la IA ejecuta tareas clave',
        'Identificar qué añade valor humano insustituible',
      ],
      keywords: ['liderazgo', 'rol', 'orquestación'],
      estimated_minutes: 22,
    },
    {
      order: 2,
      title: 'Decisión ejecutiva con IA: datos, modelos y juicio humano',
      objectives: [
        'Integrar outputs de IA en la decisión ejecutiva',
        'Evitar la delegación ciega en modelos',
      ],
      keywords: ['decisión', 'juicio', 'riesgo'],
      estimated_minutes: 25,
    },
    {
      order: 3,
      title: 'Estrategia IA: del hype al roadmap de 12 meses',
      objectives: [
        'Priorizar casos de uso con impacto real en P&L',
        'Rechazar iniciativas IA de baja señal',
      ],
      keywords: ['estrategia', 'roadmap', 'priorización'],
      estimated_minutes: 28,
    },
    {
      order: 4,
      title: 'Talento: qué roles crear, eliminar y transformar',
      objectives: [
        'Diseñar la plantilla de los próximos 24 meses',
        'Planificar reskilling sin frenar el negocio',
      ],
      keywords: ['talento', 'reskilling', 'organización'],
      estimated_minutes: 25,
    },
    {
      order: 5,
      title: 'Gobernanza, ética y compliance (EU AI Act)',
      objectives: [
        'Establecer política interna de uso de IA',
        'Entender obligaciones legales clave (EU AI Act, GDPR)',
      ],
      keywords: ['gobernanza', 'ética', 'EU AI Act'],
      estimated_minutes: 25,
    },
    {
      order: 6,
      title: 'Comunicación al board y a los empleados',
      objectives: [
        'Construir una narrativa creíble sobre transformación IA',
        'Comunicar tanto oportunidad como riesgo',
      ],
      keywords: ['comunicación', 'board', 'narrativa'],
      estimated_minutes: 22,
    },
    {
      order: 7,
      title: 'Gestión del cambio: de resistencia a adopción',
      objectives: [
        'Diseñar pilotos con quick wins',
        'Gestionar la fatiga del cambio',
      ],
      keywords: ['change management', 'adopción', 'piloto'],
      estimated_minutes: 25,
    },
    {
      order: 8,
      title: 'KPIs de madurez IA: cómo mides si estás ganando',
      objectives: [
        'Definir métricas de adopción, productividad y retorno',
        'Construir un cuadro de mando IA para el comité',
      ],
      keywords: ['KPI', 'madurez IA', 'ROI'],
      estimated_minutes: 22,
    },
  ],
};

const management = {
  department: 'management',
  title: 'Coordinación de equipos con IA',
  summary: 'Convierte a tus mandos intermedios en team leads asistidos por IA: OKRs, reuniones, 1:1s, priorización y conflictos mejorados con copilotos.',
  audience: 'Team leads, project managers, jefes de área',
  lessons: [
    {
      order: 1,
      title: 'Cómo cambia el trabajo del team lead en la era IA',
      objectives: [
        'Identificar tareas que desaparecen del día a día',
        'Reconocer responsabilidades nuevas',
      ],
      keywords: ['team lead', 'rol', 'transformación'],
      estimated_minutes: 18,
    },
    {
      order: 2,
      title: 'OKRs y objetivos con asistencia IA',
      objectives: [
        'Pasar de objetivos borrosos a KRs medibles',
        'Detectar OKRs mal diseñados con IA',
      ],
      keywords: ['OKRs', 'objetivos', 'KR'],
      estimated_minutes: 20,
    },
    {
      order: 3,
      title: 'Reuniones útiles: preparación, minuta y acciones',
      objectives: [
        'Eliminar reuniones zombie',
        'Aprovechar al máximo las reuniones necesarias',
      ],
      keywords: ['reuniones', 'minutas', 'acciones'],
      estimated_minutes: 20,
    },
    {
      order: 4,
      title: '1:1 y feedback continuo asistido por IA',
      objectives: [
        'Estructurar preparación y seguimiento de 1:1s',
        'Dar feedback difícil con mayor claridad',
      ],
      keywords: ['1:1', 'feedback', 'coaching'],
      estimated_minutes: 22,
    },
    {
      order: 5,
      title: 'Priorización y backlog con copilotos',
      objectives: [
        'Automatizar ICE/RICE/impact-effort',
        'Detectar tareas de bajo valor',
      ],
      keywords: ['priorización', 'backlog', 'ICE'],
      estimated_minutes: 20,
    },
    {
      order: 6,
      title: 'Gestión del tiempo propio y del equipo',
      objectives: [
        'Construir bloques de focus time sostenibles',
        'Delegar mejor con ayuda de IA',
      ],
      keywords: ['time management', 'focus', 'delegación'],
      estimated_minutes: 18,
    },
    {
      order: 7,
      title: 'Conflictos, mediación y comunicación difícil',
      objectives: [
        'Preparar conversaciones complejas con IA',
        'Estructurar mediación entre partes',
      ],
      keywords: ['conflictos', 'mediación', 'comunicación'],
      estimated_minutes: 20,
    },
    {
      order: 8,
      title: 'Métricas de equipo sin convertirlo en vigilancia',
      objectives: [
        'Medir productividad y bienestar sin espiar',
        'Evitar el efecto Goodhart',
      ],
      keywords: ['métricas', 'productividad', 'confianza'],
      estimated_minutes: 20,
    },
  ],
};

const productividad = {
  department: 'productividad',
  title: 'Asistentes virtuales con IA',
  summary: 'Kit transversal para cualquier profesional: elige el asistente adecuado, escribe prompts que rinden, crea tu asistente personal y automatiza tu trabajo con seguridad.',
  audience: 'Cualquier rol profesional',
  lessons: [
    {
      order: 1,
      title: 'Taxonomía: qué es (y qué no) un asistente virtual IA',
      objectives: [
        'Distinguir chatbot, copiloto y agente',
        'Mapear casos de uso por tipo',
      ],
      keywords: ['asistentes', 'taxonomía', 'agentes'],
      estimated_minutes: 15,
    },
    {
      order: 2,
      title: 'Prompting efectivo: fundamentos que sí mueven la aguja',
      objectives: [
        'Dominar rol, contexto, restricciones y formato',
        'Aplicar few-shot cuando procede',
      ],
      keywords: ['prompting', 'few-shot', 'contexto'],
      estimated_minutes: 20,
    },
    {
      order: 3,
      title: 'ChatGPT, Claude, Gemini, Copilot: cuándo cada uno',
      objectives: [
        'Elegir el modelo adecuado por tarea',
        'Controlar coste y privacidad',
      ],
      keywords: ['comparativa', 'modelos', 'coste'],
      estimated_minutes: 18,
    },
    {
      order: 4,
      title: 'Crea tu asistente personal: GPTs, Projects, Gems',
      objectives: [
        'Configurar un asistente especializado en tu rol',
        'Mantenerlo actualizado sin esfuerzo',
      ],
      keywords: ['GPTs', 'Projects', 'personalización'],
      estimated_minutes: 20,
    },
    {
      order: 5,
      title: 'Conecta tus datos: archivos, email y calendario',
      objectives: [
        'Usar conectores nativos y RAG básico',
        'Controlar qué datos salen y cuáles no',
      ],
      keywords: ['RAG', 'conectores', 'datos'],
      estimated_minutes: 20,
    },
    {
      order: 6,
      title: 'Automatizaciones: IA + Zapier/Make/n8n',
      objectives: [
        'Convertir chat en workflow que corre solo',
        'Diseñar automatizaciones auditables',
      ],
      keywords: ['automatización', 'Zapier', 'workflow'],
      estimated_minutes: 20,
    },
    {
      order: 7,
      title: 'Plantillas por rol: ventas, finanzas, RRHH, legal',
      objectives: [
        'Aplicar kits preconfigurados',
        'Adaptar plantillas a tu empresa',
      ],
      keywords: ['plantillas', 'roles', 'kits'],
      estimated_minutes: 18,
    },
    {
      order: 8,
      title: 'Seguridad, privacidad y política de empresa',
      objectives: [
        'Saber qué NO pegar en un prompt',
        'Entender data retention y DPAs',
      ],
      keywords: ['seguridad', 'privacidad', 'DPA'],
      estimated_minutes: 18,
    },
  ],
};

module.exports = [ventas, finanzas, direccion, management, productividad];
