/**
 * Marketing Executor — Genera copy con principios de respuesta directa
 *
 * Cada formato tiene su propio prompt especializado:
 * - LinkedIn post: storytelling + dato concreto + CTA
 * - Twitter/X: dark humor, sin hashtags, <280 chars
 * - Blog post: SEO + apertura de bucle + estructura PAS
 * - Landing page: headline + problema cuantificado + prueba + CTA
 * - Cold email: founder-to-founder, 50-125 palabras, un ask
 * - Newsletter: historia personal + lección + acción
 * - Ads: 3 variantes Meta + Google Ads
 * - Caso de éxito: antes + acción + resultado + tiempo + emoción
 */

const { callLLM } = require('../../backend/llm');
const { getSystemPrompt } = require('../system-prompts');
const { pool } = require('../../backend/db');

// ─── Reglas DRC universales ──────────────────────────────────────────────────
const DRC_RULES = `
REGLAS DE COPYWRITING DE RESPUESTA DIRECTA — OBLIGATORIAS:
1. Escribe como una persona real que encontró algo que funciona. No como un equipo de marketing.
2. Primera frase: corta, directa, crea curiosidad o hace una afirmación audaz. NUNCA "En el mundo actual..." ni "Hoy en día...".
3. Números específicos, no vagos. "47 clientes en 23 días" no "muchos clientes rápidamente".
4. Dolor cuantificado: no "pierdes tiempo" sino "pierdes 3 horas al día que podrías dedicar a vender".
5. Alterna párrafos cortos (impacto) con párrafos medios (contexto). Nunca bloques de texto.
6. Bucket brigades para mantener el flujo: "Y aquí está la clave.", "Pero eso no es todo.", "Resulta que...", "La verdad es que..."
7. Usa "tú" y "yo". Nunca "nosotros en la empresa" ni "nuestras soluciones".
8. CTA: describe el beneficio, no la acción. "Empieza a captar clientes hoy" NO "Regístrate".
9. Incluye una limitación honesta si la hay. Construye más confianza que ocultar imperfecciones.
PROHIBIDO: "soluciones innovadoras", "líder del sector", "de primer nivel", "de calidad", "excelente", "revolucionario", "transformador", "disruptivo", "ecosistema", "sinergias", "valor añadido".
ENTREGA: el contenido completo, listo para copiar y pegar. Sin explicaciones meta. Sin "aquí tienes el copy:".`;

// ─── Prompts por formato ─────────────────────────────────────────────────────
const FORMAT_PROMPTS = {

  linkedin: (company, task, analysis) => `
Genera un post de LinkedIn para ${company.name}.
TAREA: ${task.title}
${task.description ? `CONTEXTO: ${task.description}` : ''}
EMPRESA: ${company.description || 'Sin descripción'}. Sector: ${company.industry || 'General'}. Target: ${company.target_market || 'emprendedores y PYMEs'}.
${analysis ? `DATOS DE MERCADO: ${analysis.substring(0, 800)}` : ''}

ESTRUCTURA OBLIGATORIA:
1. GANCHO (1 línea): dato sorprendente, pregunta incómoda, o afirmación contraria a la intuición. Ej: "Gasté 12.000€ en publicidad. Conseguí 3 clientes. Luego hice esto."
2. HISTORIA (3-5 párrafos cortos): situación real → problema concreto → descubrimiento → resultado con número. Usa saltos de línea entre cada párrafo.
3. LECCIÓN (1-2 líneas): la conclusión accionable que el lector puede aplicar hoy.
4. CTA (1 línea): pregunta que invite a comentar o acción directa.
5. HASHTAGS: 3-5 relevantes al final.

LONGITUD: 150-300 palabras. Párrafos de 1-3 líneas máximo.
${DRC_RULES}`,

  twitter: (company, task, analysis) => `
Genera 5 tweets para ${company.name}.
TAREA: ${task.title}
${task.description ? `CONTEXTO: ${task.description}` : ''}
EMPRESA: ${company.description || 'Sin descripción'}. Sector: ${company.industry || 'General'}.
${analysis ? `DATOS: ${analysis.substring(0, 400)}` : ''}

REGLAS TWITTER:
- Máximo 280 caracteres cada uno (CRÍTICO: el API rechaza los que superan 280)
- Sin hashtags. Sin emojis. Sin exclamaciones.
- Voz: dark humor, directo, un poco cínico pero inteligente
- Cada tweet incluye un dato concreto o una observación contraintuitiva
- Formato: número + tweet. Ej: "1. [tweet]"

EJEMPLOS DE VOZ CORRECTA:
- "Día 47. 23 clientes. Para ramen da. Seguimos."
- "Mi competidor tiene 50 empleados y yo tengo una IA. Los dos facturamos igual. Algo no cuadra."
- "Consejo de negocio que nadie da: no contrates hasta que duela no contratar."

ENTREGA: 5 tweets numerados, listos para publicar.`,

  blog: (company, task, analysis) => `
Genera un artículo de blog para ${company.name}.
TAREA: ${task.title}
${task.description ? `CONTEXTO: ${task.description}` : ''}
EMPRESA: ${company.description || 'Sin descripción'}. Sector: ${company.industry || 'General'}. Target: ${company.target_market || 'emprendedores'}.
${analysis ? `DATOS DE MERCADO: ${analysis.substring(0, 1000)}` : ''}

ESTRUCTURA OBLIGATORIA:
1. TITULAR SEO: incluye número o resultado específico + palabra clave principal. Ej: "Cómo conseguir los primeros 50 clientes sin publicidad (y sin LinkedIn)"
2. META DESCRIPCIÓN (155 chars): promesa concreta + quién es el lector + resultado.
3. INTRODUCCIÓN (100-150 palabras): abre un bucle (pregunta o situación que el lector reconoce) → promete cerrarlo al final.
4. SECCIONES (3-5): cada H2 es una afirmación o pregunta, no un título genérico. Contenido: dato + explicación + ejemplo concreto.
5. CONCLUSIÓN: cierra el bucle de la introducción + lección accionable + CTA.

LONGITUD: 800-1200 palabras.
TONO: experto que comparte lo que aprendió, no profesor que da clase.
${DRC_RULES}`,

  landing: (company, task, analysis) => `
Genera el copy completo de una landing page para ${company.name}.
TAREA: ${task.title}
${task.description ? `CONTEXTO: ${task.description}` : ''}
EMPRESA: ${company.description || 'Sin descripción'}. Sector: ${company.industry || 'General'}. Target: ${company.target_market || 'emprendedores y PYMEs'}. Modelo: ${company.business_model || 'SaaS/servicio'}.
${analysis ? `DATOS DE MERCADO: ${analysis.substring(0, 1000)}` : ''}

ESTRUCTURA OBLIGATORIA:
1. HEADLINE: resultado específico en tiempo concreto. Ej: "Tu primera landing page lista en 20 minutos, sin diseñador, sin código."
2. SUBHEADLINE: quién es para quién y qué problema resuelve. 1 frase.
3. PROBLEMA (cuantificado): 2-3 párrafos. Usa math del dolor: "X horas × Y días = Z horas perdidas al año."
4. SOLUCIÓN: no features, transformación. "Antes: [situación]. Después: [resultado]."
5. CÓMO FUNCIONA: 3 pasos simples con resultado concreto cada uno.
6. PRUEBA SOCIAL: 2-3 testimonios con estructura [antes] + [acción] + [resultado] + [tiempo] + [emoción].
7. QUIÉN ES PARA QUIÉN: sección fit/no-fit. "Es para ti si... No es para ti si..."
8. PRECIO: justificación del valor antes del número.
9. CTA PRINCIPAL: beneficio, no acción. + 3 friction reducers debajo.
10. FAQ: 4-5 preguntas reales que frenan la compra, con respuestas directas.

${DRC_RULES}`,

  email_cold: (company, task, analysis) => `
Genera una secuencia de 3 cold emails para ${company.name}.
TAREA: ${task.title}
${task.description ? `CONTEXTO: ${task.description}` : ''}
EMPRESA: ${company.description || 'Sin descripción'}. Target: ${company.target_market || 'empresas B2B'}.
${analysis ? `DATOS: ${analysis.substring(0, 600)}` : ''}

REGLAS COLD EMAIL:
- Solo texto plano. Sin markdown, sin negritas, sin HTML.
- Longitud: 50-125 palabras por email (CRÍTICO: más largo = menos respuesta)
- Voz: founder-to-founder. Como si lo escribieras tú a mano.
- Un solo ask por email. Claro y específico.
- Asunto: no parece publicidad. Ej: "pregunta rápida" / "idea para [empresa]"

ESTRUCTURA CADA EMAIL:
- Asunto (5-7 palabras, sin mayúsculas innecesarias)
- Apertura: observación específica sobre su empresa o sector (no genérica)
- Propuesta de valor: 1-2 frases. Resultado concreto, no features.
- Ask: una pregunta o petición pequeña y específica.
- Firma: nombre + empresa + 1 línea de contexto

EMAIL 1: Primer contacto (día 1)
EMAIL 2: Follow-up con ángulo diferente (día 3)
EMAIL 3: Cierre (día 7) — honesto, sin presión

${DRC_RULES}`,

  email_newsletter: (company, task, analysis) => `
Genera una newsletter para ${company.name}.
TAREA: ${task.title}
${task.description ? `CONTEXTO: ${task.description}` : ''}
EMPRESA: ${company.description || 'Sin descripción'}. Sector: ${company.industry || 'General'}. Target: ${company.target_market || 'emprendedores'}.
${analysis ? `DATOS: ${analysis.substring(0, 600)}` : ''}

ESTRUCTURA OBLIGATORIA:
1. ASUNTO: promesa específica o pregunta que pica la curiosidad. Ej: "El error que me costó 3.000€ (y cómo evitarlo)"
2. APERTURA: historia personal de 2-3 párrafos. Situación real → problema concreto → qué hice.
3. LECCIÓN: la conclusión práctica de la historia. 1-2 párrafos con el "qué hacer".
4. ACCIÓN: una sola cosa que el lector puede hacer hoy. Concreta, pequeña, accionable.
5. CTA: enlace o invitación a responder con una pregunta.

LONGITUD: 300-500 palabras.
TONO: amigo que comparte lo que aprendió esta semana, no experto dando clase.
${DRC_RULES}`,

  ads: (company, task, analysis) => `
Genera copy de anuncios para ${company.name}.
TAREA: ${task.title}
${task.description ? `CONTEXTO: ${task.description}` : ''}
EMPRESA: ${company.description || 'Sin descripción'}. Sector: ${company.industry || 'General'}. Target: ${company.target_market || 'emprendedores y PYMEs'}.
${analysis ? `DATOS DE MERCADO: ${analysis.substring(0, 600)}` : ''}

ENTREGA 3 VARIANTES de cada formato:

META ADS (Facebook/Instagram):
- Headline (40 chars): resultado específico o pregunta que duele
- Texto principal (125 chars): problema → solución → prueba
- Descripción (30 chars): CTA con beneficio
- Variante A: enfoque en dolor/problema
- Variante B: enfoque en resultado/transformación
- Variante C: enfoque en prueba social/número

GOOGLE ADS:
- Headline 1 (30 chars): keyword principal + beneficio
- Headline 2 (30 chars): diferenciador o resultado
- Headline 3 (30 chars): CTA
- Descripción (90 chars): amplía el beneficio + urgencia o garantía

AUDIENCIAS SUGERIDAS: 3 segmentos con intereses/comportamientos específicos para Meta.

${DRC_RULES}`,

  caso_exito: (company, task, analysis) => `
Genera un caso de éxito para ${company.name}.
TAREA: ${task.title}
${task.description ? `CONTEXTO: ${task.description}` : ''}
EMPRESA: ${company.description || 'Sin descripción'}. Sector: ${company.industry || 'General'}.
${analysis ? `DATOS: ${analysis.substring(0, 600)}` : ''}

ESTRUCTURA OBLIGATORIA (mini caso de estudio):
1. TITULAR: [cliente tipo] + [resultado] + [tiempo]. Ej: "Cómo una agencia de 3 personas pasó de 0 a 15 clientes recurrentes en 6 semanas"
2. EL ANTES: situación inicial con números. Qué problema tenían, cuánto costaba, cuánto tiempo perdían.
3. EL RETO: qué intentaron antes que no funcionó (1-2 frases). Esto da credibilidad.
4. LA SOLUCIÓN: qué hicieron diferente. Pasos concretos, no generalidades.
5. EL RESULTADO: números específicos. Antes/después. Tiempo que tardó.
6. LA CITA: testimonial con estructura [antes] + [acción] + [resultado] + [emoción]. Entre comillas.
7. LECCIÓN: qué puede aplicar el lector de esta historia.

TONO: periodístico, no publicitario. Cuenta la historia, no vendas.
${DRC_RULES}`,
};

// ─── Detectar formato de la tarea ────────────────────────────────────────────
function detectFormat(task) {
  const text = `${task.title} ${task.description || ''}`.toLowerCase();
  if (text.includes('linkedin') || text.includes('post linkedin')) return 'linkedin';
  if (text.includes('twitter') || text.includes('tweet') || text.includes('x.com')) return 'twitter';
  if (text.includes('blog') || text.includes('artículo') || text.includes('seo')) return 'blog';
  if (text.includes('landing') || text.includes('página de ventas') || text.includes('web')) return 'landing';
  if (text.includes('cold email') || text.includes('email frío') || text.includes('prospección')) return 'email_cold';
  if (text.includes('newsletter') || text.includes('email marketing') || text.includes('lista')) return 'email_newsletter';
  if (text.includes('ads') || text.includes('anuncio') || text.includes('publicidad') || text.includes('meta ads') || text.includes('google ads')) return 'ads';
  if (text.includes('caso de éxito') || text.includes('caso exito') || text.includes('testimonial') || text.includes('success story')) return 'caso_exito';
  // Default: LinkedIn post (el más común)
  return 'linkedin';
}

class MarketingExecutor {
  constructor() {
    this.name = 'Marketing Agent';
  }

  async execute(task) {
    console.log(`📢 Marketing Agent procesando: ${task.title}`);

    const company = await this.getCompany(task.company_id);
    if (!company) throw new Error('Company not found');

    const analysis = await this.getMarketAnalysis(task.company_id);

    const format = detectFormat(task);
    const promptFn = FORMAT_PROMPTS[format] || FORMAT_PROMPTS.linkedin;
    const prompt = promptFn(company, task, analysis);

    console.log(`📢 Marketing Agent — formato detectado: ${format}`);

    const systemPrompt = getSystemPrompt('marketing', company.name);

    const result = await callLLM(prompt, {
      companyId: task.company_id,
      taskType: 'marketing',
      systemPrompt,
      temperature: 0.72,
      maxTokens: 4000,
    });

    const output = result.content || 'Contenido de marketing generado';

    return {
      output,
      summary: `${format.toUpperCase()}: ${task.title}`,
    };
  }

  async getMarketAnalysis(companyId) {
    try {
      const result = await pool.query(
        `SELECT output FROM tasks 
         WHERE company_id = $1 
         AND tag = 'research' 
         AND status = 'completed'
         AND output IS NOT NULL
         ORDER BY completed_at DESC
         LIMIT 1`,
        [companyId]
      );
      return result.rows[0]?.output || null;
    } catch (e) {
      return null;
    }
  }

  async getCompany(companyId) {
    const result = await pool.query(
      'SELECT * FROM companies WHERE id = $1', [companyId]
    );
    return result.rows[0];
  }
}

module.exports = MarketingExecutor;
