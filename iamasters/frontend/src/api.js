const BASE = import.meta.env.VITE_API_URL || '';

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}: ${body || path}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

export const api = {
  listCourses: () => req('/api/courses'),
  getCourse: (id) => req(`/api/courses/${id}`),
  getLesson: (id) => req(`/api/lessons/${id}`),
  generateLessonContent: (id) =>
    req(`/api/lessons/${id}/generate-content`, { method: 'POST', body: '{}' }),
  buildQuiz: (id, numQuestions = 5) =>
    req(`/api/lessons/${id}/quiz`, { method: 'POST', body: JSON.stringify({ numQuestions }) }),
  grade: (id, question, userAnswer) =>
    req(`/api/lessons/${id}/grade`, {
      method: 'POST',
      body: JSON.stringify({ question, userAnswer }),
    }),
  chat: ({ lessonContext, history, message }) =>
    req('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ lessonContext, history, message }),
    }),
  ttsBlob: async (text) => {
    const res = await fetch(`${BASE}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error(`TTS falló: ${res.status}`);
    return { blob: await res.blob(), hash: res.headers.get('X-Audio-Hash') };
  },
};
