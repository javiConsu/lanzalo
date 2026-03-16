/**
 * Seed: 25 ideas de negocio curadas para el mercado hispano
 *
 * Ejecutar en Railway (producción):
 *   railway run node scripts/seed-ideas-production.js
 *
 * O localmente con DATABASE_URL de producción:
 *   DATABASE_URL=postgresql://... node scripts/seed-ideas-production.js
 */

const { pool } = require('../backend/db');

const IDEAS = [
  // SAAS / HERRAMIENTAS IA
  {
    title: 'Facturación Automática con IA para Autónomos',
    problem: 'Los autónomos en España y LATAM pierden horas al mes gestionando facturas. Los programas actuales son caros o difíciles. Las facturas recurrentes se olvidan y el IRPF se complica.',
    target_audience: 'Autónomos, freelancers, pequeños negocios en España y LATAM',
    evidence: '200+ posts en r/autónomos, 80+ hilos en foros fiscales España, demanda masiva en Quora Hispano',
    source: 'reddit', category: 'saas', difficulty: 'medium', potential_revenue: '2.000€-8.000€/mes', score: 91
  },
  {
    title: 'Asistente IA para Atención al Cliente en WhatsApp',
    problem: 'Las PYMEs reciben mensajes de WhatsApp que no pueden gestionar. Contratan personas solo para responder. Las herramientas de chatbot genéricas no entienden el español coloquial.',
    target_audience: 'PYMEs con tiendas físicas, ecommerce pequeño, restaurantes',
    evidence: '150+ menciones en grupos de WhatsApp Business, 60+ posts en LinkedIn de dueños de negocio',
    source: 'twitter', category: 'saas', difficulty: 'medium', potential_revenue: '3.000€-12.000€/mes', score: 89
  },
  {
    title: 'Academia Online de IA para Profesionales Hispanos',
    problem: 'Los profesionales hispanos saben que la IA les va a afectar pero no saben por dónde empezar. Los cursos de IA son técnicos, en inglés o dan título universitario de 2 años. Necesitan algo práctico ya.',
    target_audience: 'Profesionales hispanos 28-45 años, directivos, profesores, periodistas, médicos',
    evidence: 'Enorme demanda en LinkedIn Hispano, 1.000+ búsquedas semanales "curso IA en español para no técnicos"',
    source: 'hackernews', category: 'marketplace', difficulty: 'medium', potential_revenue: '6.000€-20.000€/mes', score: 90
  },
  {
    title: 'Generador de Contratos Legales con IA',
    problem: 'Los emprendedores en LATAM necesitan contratos pero los abogados cobran caro. Se firman acuerdos verbales que luego generan conflictos. Los templates online son en inglés o de otros países.',
    target_audience: 'Emprendedores, freelancers, PYMEs en LATAM',
    evidence: '300+ búsquedas mensuales "contrato para freelancer gratis", múltiples foros de emprendedores hispanos',
    source: 'hackernews', category: 'saas', difficulty: 'easy', potential_revenue: '1.500€-6.000€/mes', score: 85
  },
  {
    title: 'CRM Simplificado para Coaches y Consultores',
    problem: 'Los coaches tienen clientes en WhatsApp, Instagram DMs y email. Pierden seguimiento. Salesforce es demasiado complejo. Notion no tiene automatizaciones de cliente.',
    target_audience: 'Coaches, consultores, terapeutas, mentores hispanohablantes',
    evidence: '120+ coaches quejándose en Instagram, múltiples grupos de Facebook con el problema',
    source: 'twitter', category: 'saas', difficulty: 'medium', potential_revenue: '2.500€-9.000€/mes', score: 83
  },
  {
    title: 'Herramienta de SEO Local para Negocios Hispanos',
    problem: 'Los restaurantes y tiendas locales en ciudades hispanas no aparecen en Google. No saben cómo optimizar su ficha de Google Business. Contratar agencia de SEO es prohibitivo.',
    target_audience: 'Restaurantes, tiendas, servicios locales en ciudades con comunidad hispana (EEUU y LATAM)',
    evidence: '400+ búsquedas "cómo aparecer en Google Maps gratis", foros de dueños de negocios hispanos en EEUU',
    source: 'reddit', category: 'saas', difficulty: 'easy', potential_revenue: '2.000€-7.000€/mes', score: 82
  },
  {
    title: 'Validador de Ideas de Negocio con Research Automático',
    problem: 'Los emprendedores hispanos tienen ideas pero no saben si hay demanda. Hacen encuestas a amigos (sesgo enorme). No tienen acceso a datos de mercado ni saben interpretar Google Trends.',
    target_audience: 'Emprendedores early-stage en LATAM y España, estudiantes de negocios',
    evidence: 'Alta demanda en comunidades como Startup Grind LATAM, 300+ posts "cómo validar mi idea de negocio"',
    source: 'hackernews', category: 'tool', difficulty: 'medium', potential_revenue: '2.500€-8.000€/mes', score: 86
  },
  // MARKETPLACE
  {
    title: 'Marketplace de Talento Tech LATAM para Empresas Europeas',
    problem: 'Empresas europeas buscan developers y diseñadores a costos razonables. El talento LATAM es de calidad pero no sabe cómo acceder al mercado europeo. Los intermediarios cobran el 30%.',
    target_audience: 'Developers, diseñadores y marketers LATAM; Startups y PYMEs europeas',
    evidence: 'Múltiples posts en LinkedIn de recruiters europeos, 200+ developers LATAM buscando trabajo remoto',
    source: 'twitter', category: 'marketplace', difficulty: 'hard', potential_revenue: '8.000€-25.000€/mes', score: 88
  },
  {
    title: 'Plataforma de Cursos en Vídeo Cortos para Emprendedores Hispanos',
    problem: 'Los hispanos quieren aprender marketing digital y ventas pero los cursos son largos, caros y en inglés. TikTok tiene contenido pero disperso. No hay plataforma curada de microaprendizaje.',
    target_audience: 'Emprendedores y dueños de negocio hispanohablantes, 25-45 años',
    evidence: '500+ búsquedas "cursos marketing digital en español gratis", éxito de Platzi confirma demanda',
    source: 'reddit', category: 'marketplace', difficulty: 'hard', potential_revenue: '5.000€-20.000€/mes', score: 80
  },
  {
    title: 'Plataforma de Clases Particulares Online en Español',
    problem: 'Los estudiantes hispanos buscan profes particulares pero la búsqueda es caótica (Instagram, grupos WhatsApp, boca a boca). Los profesores no tienen forma de gestionar agenda ni cobrar fácil.',
    target_audience: 'Estudiantes hispanos 14-25 años y sus padres; profesores particulares hispanohablantes',
    evidence: '800+ búsquedas "clases particulares online en español", mercado comprobado con Superprof aunque con UX deficiente',
    source: 'reddit', category: 'marketplace', difficulty: 'medium', potential_revenue: '4.000€-14.000€/mes', score: 82
  },
  {
    title: 'Mercado de Servicios Digitales para Negocios Locales',
    problem: 'Los negocios locales hispanos necesitan logo, web, posts de Instagram. Los diseñadores freelance no tienen visibilidad. Fiverr es en inglés y el proceso es confuso.',
    target_audience: 'Pequeños negocios hispanos en LATAM y EEUU, freelancers creativos hispanohablantes',
    evidence: '180+ dueños de negocio en grupos de Facebook buscando "diseñador barato", comunidades activas',
    source: 'reddit', category: 'marketplace', difficulty: 'medium', potential_revenue: '3.000€-10.000€/mes', score: 77
  },
  // HERRAMIENTAS / TOOLS
  {
    title: 'Gestor de Redes Sociales con IA para PYMEs',
    problem: 'Las PYMEs saben que deben publicar en Instagram y TikTok pero no tienen tiempo ni ideas. Contratar community manager cuesta 800€/mes. Herramientas como Buffer son en inglés.',
    target_audience: 'PYMEs, restaurantes, tiendas, servicios; dueños que gestionan solos sus redes',
    evidence: '250+ búsquedas "publicar automático instagram gratis", 90+ posts en grupos de PYMEs',
    source: 'twitter', category: 'tool', difficulty: 'medium', potential_revenue: '2.000€-8.000€/mes', score: 87
  },
  {
    title: 'Tracker de Gastos con Voz para Autónomos',
    problem: 'Los autónomos olvidan apuntar gastos deducibles. La app del banco no categoriza correctamente. Hablar con el gestor una vez al año para recordar gastos es una pesadilla.',
    target_audience: 'Autónomos y freelancers en España, especialmente en movilidad',
    evidence: '170+ posts en r/autónomos sobre problemas fiscales, múltiples quejas en foros de gestores',
    source: 'reddit', category: 'tool', difficulty: 'easy', potential_revenue: '1.500€-5.000€/mes', score: 81
  },
  {
    title: 'Generador de Presupuestos Automáticos para Oficios',
    problem: 'Fontaneros, electricistas, pintores pasan tiempo haciendo presupuestos a mano. Algunos ni saben cuánto cobrar. No hay herramienta simple en español para el sector servicios.',
    target_audience: 'Autónomos de oficios: fontaneros, electricistas, carpinteros, pintores en España',
    evidence: '100+ búsquedas "plantilla presupuesto fontanero Word", foros de gremios con el problema recurrente',
    source: 'hackernews', category: 'tool', difficulty: 'easy', potential_revenue: '1.000€-4.000€/mes', score: 79
  },
  {
    title: 'Cumplimiento RGPD/LOPD Automatizado para PYMEs',
    problem: 'Las PYMEs deben cumplir el RGPD pero no saben cómo. Contratar abogado de datos cuesta 2.000€+. Las multas son altas. No hay herramienta asequible sin necesitar abogado.',
    target_audience: 'PYMEs en España y Europa con presencia digital, especialmente ecommerce y servicios online',
    evidence: '200+ búsquedas "como cumplir RGPD PYME sin contratar abogado", foros de ecommerce activos',
    source: 'hackernews', category: 'tool', difficulty: 'medium', potential_revenue: '2.000€-8.000€/mes', score: 83
  },
  // ECOMMERCE / RETAIL
  {
    title: 'Tienda Online en 24h para Artesanos Hispanos',
    problem: 'Los artesanos y productores locales de LATAM venden solo en ferias o Instagram DMs. No saben crear una tienda online. Shopify es en inglés y caro para mercados emergentes.',
    target_audience: 'Artesanos, productores locales, tiendas de barrio en LATAM y España',
    evidence: '400+ búsquedas "cómo vender por internet sin saber programar", grupos de Facebook de artesanos muy activos',
    source: 'twitter', category: 'saas', difficulty: 'medium', potential_revenue: '2.000€-7.000€/mes', score: 78
  },
  {
    title: 'Comparador de Precios para Proveedores de Restaurantes',
    problem: 'Los restaurantes compran a 3-5 proveedores distintos y no comparan precios. Pierden entre 500€-2.000€/mes en sobrecostes. No hay plataforma para comparar precios de mayoristas.',
    target_audience: 'Restaurantes, bares y hoteles en España y ciudades principales de LATAM',
    evidence: '60+ dueños de restaurante mencionando el problema en grupos de hostelería, mercado validado',
    source: 'reddit', category: 'marketplace', difficulty: 'hard', potential_revenue: '5.000€-18.000€/mes', score: 76
  },
  // FINTECH / PAGOS
  {
    title: 'App de Ahorro Automático para Millennials Hispanos',
    problem: 'Los millennials hispanos saben que deben ahorrar pero no lo hacen. Las apps de ahorro son aburridas y genéricas. La educación financiera en español es escasa o condescendiente.',
    target_audience: 'Millennials hispanohablantes, 22-35 años, usuarios de smartphone',
    evidence: '600+ posts en Twitter sobre "no llego a fin de mes", demanda enorme en TikTok financiero en español',
    source: 'twitter', category: 'saas', difficulty: 'hard', potential_revenue: '4.000€-15.000€/mes', score: 74
  },
  {
    title: 'Cobros Fáciles para Profesionales Independientes',
    problem: 'Psicólogos, tutores, asesores cobran por transferencia y persiguen clientes morosos. No quieren montar una empresa solo para cobrar bien. Las plataformas de pago son complicadas.',
    target_audience: 'Psicólogos, tutores, nutricionistas, asesores independientes en España y LATAM',
    evidence: '90+ profesionales quejándose de cobros en grupos de LinkedIn, validado con entrevistas a coaches',
    source: 'hackernews', category: 'saas', difficulty: 'medium', potential_revenue: '2.000€-8.000€/mes', score: 80
  },
  // SALUD / BIENESTAR
  {
    title: 'App de Psicología Preventiva para Emprendedores',
    problem: 'El 70% de los emprendedores reporta ansiedad alta. Los servicios de psicología online son caros o no entienden el mundo del emprendimiento. No hay nada específico para founders en español.',
    target_audience: 'Emprendedores y founders hispanohablantes, especialmente en etapas iniciales',
    evidence: '200+ posts en comunidades de startups sobre burnout, validado en Slack communities de startups hispanas',
    source: 'twitter', category: 'saas', difficulty: 'hard', potential_revenue: '3.000€-12.000€/mes', score: 75
  },
  {
    title: 'Nutrición Personalizada con IA para Hispanos',
    problem: 'Los planes de nutrición genéricos no consideran la gastronomía hispana. Los nutricionistas cobran caro y no dan seguimiento diario. Las apps de conteo de calorías son frustrantes.',
    target_audience: 'Adultos hispanos 25-50 años preocupados por su salud o con necesidades específicas',
    evidence: '500+ búsquedas "dieta para hispanos", comunidades de salud muy activas en Facebook e Instagram',
    source: 'twitter', category: 'saas', difficulty: 'medium', potential_revenue: '3.500€-11.000€/mes', score: 78
  },
  // PRODUCTIVIDAD / AGENCIAS
  {
    title: 'Agencia IA de Marketing para PYMEs a €299/mes',
    problem: 'Las PYMEs no pueden pagar una agencia de marketing (mínimo 1.500€/mes). Hacerlo interno requiere contratar. Las herramientas de IA están en inglés o requieren conocimientos técnicos.',
    target_audience: 'PYMEs con 2-20 empleados en España y LATAM con presupuesto de marketing limitado',
    evidence: 'Alta demanda en LinkedIn de dueños de PYME buscando "marketing digital barato que funcione"',
    source: 'hackernews', category: 'saas', difficulty: 'hard', potential_revenue: '10.000€-30.000€/mes', score: 84
  },
  {
    title: 'Asistente de Onboarding de Empleados para PYMEs',
    problem: 'Las PYMEs contratan personas y el primer día es un caos: documentos dispersos, nadie explica los procesos, el nuevo se pierde. El onboarding estructurado es cosa de grandes empresas.',
    target_audience: 'PYMEs en crecimiento, entre 5 y 50 empleados, en España y LATAM',
    evidence: '70+ posts en foros de RRHH sobre onboarding caótico en PYMEs, mercado infra-servido',
    source: 'reddit', category: 'saas', difficulty: 'medium', potential_revenue: '2.000€-7.000€/mes', score: 73
  },
  // INMOBILIARIO
  {
    title: 'Encuentra Piso Compartido entre Profesionales Hispanos',
    problem: 'Los profesionales hispanos que se mudan a nueva ciudad tienen dificultad para encontrar compañeros compatibles. Idealista y Fotocasa tienen pisos, no comunidades. Facebook es un caos.',
    target_audience: 'Profesionales hispanos 23-35 años que se mudan por trabajo o estudios',
    evidence: '1.000+ búsquedas "busco piso compartido con profesionales", grupos de Facebook masivos pero mal organizados',
    source: 'reddit', category: 'marketplace', difficulty: 'medium', potential_revenue: '3.000€-9.000€/mes', score: 71
  },
  // TURISMO / HOSTELERÍA
  {
    title: 'Gestión de Reservas para Casas Rurales y Pequeños Hoteles',
    problem: 'Las casas rurales y hoteles boutique tienen reservas en Booking, Airbnb, WhatsApp y llamadas. Gestionarlo es un caos y las comisiones de las plataformas son altísimas.',
    target_audience: 'Propietarios de casas rurales, hoteles boutique, apartamentos turísticos en España',
    evidence: '100+ propietarios quejándose de comisiones en grupos de Facebook, demanda real con dinero disponible',
    source: 'hackernews', category: 'saas', difficulty: 'medium', potential_revenue: '2.500€-9.000€/mes', score: 77
  }
];

async function ensureColumns() {
  await pool.query(`
    ALTER TABLE discovered_ideas ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
    ALTER TABLE discovered_ideas ADD COLUMN IF NOT EXISTS analysis_generated BOOLEAN DEFAULT false;
    ALTER TABLE discovered_ideas ADD COLUMN IF NOT EXISTS times_launched INTEGER DEFAULT 0;
    ALTER TABLE discovered_ideas ADD COLUMN IF NOT EXISTS batch_id VARCHAR(10);
  `);
}

async function seedIdeas() {
  console.log('🌱 Iniciando seed de ideas...\n');

  await ensureColumns();
  console.log('✅ Columnas verificadas\n');

  let inserted = 0;
  let skipped = 0;

  for (const idea of IDEAS) {
    try {
      // Evitar duplicados por título
      const existing = await pool.query(
        'SELECT id FROM discovered_ideas WHERE LOWER(title) = LOWER($1) LIMIT 1',
        [idea.title]
      );

      if (existing.rows.length > 0) {
        console.log(`⏭️  Ya existe: ${idea.title}`);
        skipped++;
        continue;
      }

      await pool.query(
        `INSERT INTO discovered_ideas (
          title, problem, target_audience, evidence,
          source, category, difficulty, potential_revenue, score,
          status, is_active, discovered_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'new', true, NOW(), NOW())`,
        [
          idea.title, idea.problem, idea.target_audience, idea.evidence,
          idea.source, idea.category, idea.difficulty, idea.potential_revenue, idea.score
        ]
      );

      console.log(`✅ [${idea.score}] ${idea.title}`);
      inserted++;
    } catch (error) {
      console.error(`❌ Error en "${idea.title}":`, error.message);
    }
  }

  const total = await pool.query('SELECT COUNT(*) FROM discovered_ideas WHERE is_active = true');
  console.log(`\n📊 Resumen:`);
  console.log(`   Insertadas: ${inserted}`);
  console.log(`   Ya existían: ${skipped}`);
  console.log(`   Total activas en DB: ${total.rows[0].count}`);

  await pool.end();
}

seedIdeas().catch(err => {
  console.error('💥 Error fatal:', err.message);
  process.exit(1);
});
