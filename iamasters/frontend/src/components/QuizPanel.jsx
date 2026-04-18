import { useState } from 'react';
import { api } from '../api.js';

export default function QuizPanel({ lessonId }) {
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function startQuiz() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.buildQuiz(lessonId, 5);
      setQuiz(data);
      setAnswers({});
      setResults({});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function submit(q) {
    const userAnswer = answers[q.id];
    if (userAnswer == null || userAnswer === '') return;
    setResults(prev => ({ ...prev, [q.id]: { loading: true } }));
    try {
      const result = await api.grade(lessonId, q, userAnswer);
      setResults(prev => ({ ...prev, [q.id]: result }));
    } catch (err) {
      setResults(prev => ({ ...prev, [q.id]: { error: err.message } }));
    }
  }

  if (!quiz) {
    return (
      <div className="card p-6 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Ponte a prueba</h3>
          <p className="text-sm text-zinc-600">Un quiz corto generado por el Evaluador.</p>
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
        <button onClick={startQuiz} className="btn-primary" disabled={loading}>
          {loading ? 'Generando…' : 'Hacer quiz'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Quiz</h3>
        <button onClick={() => setQuiz(null)} className="btn-ghost text-xs">Cerrar</button>
      </div>
      {quiz.questions.map(q => {
        const r = results[q.id];
        return (
          <div key={q.id} className="card p-5">
            <p className="font-medium">{q.id}. {q.prompt}</p>
            {q.type === 'multiple_choice' && (
              <div className="mt-3 space-y-2">
                {(q.options || []).map((opt, i) => (
                  <label key={i} className="flex gap-2 items-start text-sm cursor-pointer">
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={opt}
                      checked={answers[q.id] === opt}
                      onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                      className="mt-1"
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            )}
            {q.type === 'true_false' && (
              <div className="mt-3 flex gap-4 text-sm">
                {['Verdadero', 'Falso'].map(opt => (
                  <label key={opt} className="flex gap-2 items-center cursor-pointer">
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={opt}
                      checked={answers[q.id] === opt}
                      onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}
            {q.type === 'short_answer' && (
              <textarea
                className="mt-3 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                rows={3}
                value={answers[q.id] || ''}
                onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                placeholder="Tu respuesta…"
              />
            )}
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={() => submit(q)}
                className="btn-primary text-xs"
                disabled={!answers[q.id] || r?.loading}
              >
                {r?.loading ? 'Corrigiendo…' : 'Comprobar'}
              </button>
              {r && !r.loading && !r.error && (
                <div className={r.correct ? 'text-sm text-green-700' : 'text-sm text-amber-700'}>
                  {r.correct ? '✓ Correcto' : '✗ Revisa'} · {r.score}/100
                </div>
              )}
            </div>
            {r && !r.loading && r.feedback && (
              <div className="mt-3 rounded-md bg-zinc-50 border border-zinc-200 p-3 text-sm text-zinc-700">
                <div className="font-medium text-zinc-900 mb-1">Feedback</div>
                <p>{r.feedback}</p>
                {r.followup_tip && (
                  <p className="mt-2 text-xs text-zinc-500 italic">💡 {r.followup_tip}</p>
                )}
              </div>
            )}
            {r?.error && <p className="text-xs text-red-600 mt-2">{r.error}</p>}
          </div>
        );
      })}
    </div>
  );
}
