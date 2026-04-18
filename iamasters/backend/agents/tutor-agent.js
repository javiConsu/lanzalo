const { chat } = require('../services/openai-client');

const SYSTEM_PROMPT = `Eres un Tutor IA que acompaña a profesionales de empresa mientras estudian una lección.
Estilo: socrático, cercano, español neutro. No das la respuesta directa si el alumno puede llegar con una pista.
Cuando el alumno acierta, refuerza con un caso aplicado a su departamento.
Cuando falla, replantea con analogía o pregunta guía.
Máximo 4 frases por respuesta salvo que el alumno pida detalle.`;

async function answer({ lessonContext = '', history = [], userMessage }) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...(lessonContext
      ? [{ role: 'system', content: `Contexto de la lección actual:\n${lessonContext.slice(0, 6000)}` }]
      : []),
    ...history,
    { role: 'user', content: userMessage },
  ];
  return chat(messages, { temperature: 0.5 });
}

module.exports = { answer };
