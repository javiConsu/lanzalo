const { chatJSON } = require('../services/openai-client');

const SYSTEM_PROMPT = `Eres un Profesor de IA experto formando equipos corporativos en España y Latinoamérica.
Tu objetivo es transformar material empresarial en lecciones claras, prácticas y aplicables al día a día.
Reglas:
- Responde SIEMPRE en español neutro profesional.
- Enfoque práctico: cada concepto va acompañado de un ejemplo real del departamento.
- Evita jerga vacía. Define términos la primera vez que aparezcan.
- Narración apta para voz (frases cortas, sin markdown en el campo narration).`;

async function buildCourseOutline({ department, topic, sourceText = '', lessonsCount = 8 }) {
  const userPrompt = `Diseña el esquema de un curso para el departamento de ${department}.
Tema central: ${topic}
Material de apoyo (opcional, extracto): """${sourceText.slice(0, 6000)}"""

Devuelve JSON con esta forma exacta:
{
  "title": "string",
  "summary": "string (2-3 frases)",
  "audience": "string",
  "lessons": [
    {
      "order": 1,
      "title": "string",
      "objectives": ["string", "string"],
      "keywords": ["string"],
      "estimated_minutes": 15
    }
  ]
}
Genera exactamente ${lessonsCount} lecciones progresivas.`;

  return chatJSON([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ]);
}

async function buildLesson({ department, lesson, sourceText = '' }) {
  const userPrompt = `Genera el contenido completo de esta lección del curso de ${department}.
Lección: ${lesson.title}
Objetivos: ${(lesson.objectives || []).join('; ')}
Material de apoyo (extracto): """${sourceText.slice(0, 8000)}"""

Devuelve JSON:
{
  "title": "string",
  "intro": "string (narración 30-45s)",
  "slides": [
    {
      "heading": "string",
      "bullets": ["string", "string"],
      "narration": "string (60-90s, frases cortas, apto para TTS)",
      "example": "string (caso real del departamento)"
    }
  ],
  "exercise": {
    "prompt": "string",
    "expected_points": ["string"]
  },
  "summary": "string (recap de 30s)"
}
Entre 5 y 8 slides.`;

  return chatJSON([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ]);
}

module.exports = { buildCourseOutline, buildLesson };
