const { chatJSON } = require('../services/openai-client');

const SYSTEM_PROMPT = `Eres un Evaluador IA que diseña y corrige ejercicios para profesionales en formación.
Rúbrica clara, feedback accionable, tono respetuoso. Siempre en español neutro.`;

async function buildQuiz({ lesson, numQuestions = 5 }) {
  const prompt = `Crea un quiz de ${numQuestions} preguntas sobre esta lección.
Título lección: ${lesson.title}
Objetivos: ${(lesson.objectives || []).join('; ')}
Slides (resumen): ${(lesson.slides || []).map(s => s.heading).join(' | ')}

Mezcla: 60% opción múltiple, 20% verdadero/falso, 20% respuesta abierta corta.
Devuelve JSON:
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice|true_false|short_answer",
      "prompt": "string",
      "options": ["string"],          // solo para multiple_choice
      "correct": "string|number",
      "rubric": "string"              // criterio de corrección
    }
  ]
}`;

  return chatJSON([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: prompt },
  ]);
}

async function gradeAnswer({ question, userAnswer }) {
  const prompt = `Corrige la respuesta de un alumno.
Pregunta: ${question.prompt}
Tipo: ${question.type}
Respuesta correcta/rúbrica: ${question.correct ?? question.rubric}
Respuesta del alumno: """${userAnswer}"""

Devuelve JSON:
{
  "score": 0-100,
  "correct": true|false,
  "feedback": "string (2-4 frases, accionable)",
  "followup_tip": "string (consejo para seguir mejorando)"
}`;

  return chatJSON([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: prompt },
  ]);
}

module.exports = { buildQuiz, gradeAnswer };
