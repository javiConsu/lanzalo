import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import SlideView from '../components/SlideView.jsx';
import TutorChat from '../components/TutorChat.jsx';
import QuizPanel from '../components/QuizPanel.jsx';

export default function LessonPlayer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState(null);
  const [error, setError] = useState(null);
  const [slideIdx, setSlideIdx] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    setLesson(null);
    setSlideIdx(0);
    setShowQuiz(false);
    api.getLesson(id).then(setLesson).catch(err => setError(err.message));
  }, [id]);

  const lessonContext = useMemo(() => {
    if (!lesson?.content) return '';
    const c = lesson.content;
    const slidesText = (c.slides || [])
      .map(s => `## ${s.heading}\n${(s.bullets || []).join('\n')}`)
      .join('\n\n');
    return [lesson.title, c.intro, slidesText, c.summary].filter(Boolean).join('\n\n');
  }, [lesson]);

  async function generateContent() {
    setGenerating(true);
    try {
      const { content } = await api.generateLessonContent(id);
      setLesson(prev => ({ ...prev, content }));
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  if (error) return <p className="text-red-600">{error}</p>;
  if (!lesson) return <p className="text-zinc-500">Cargando…</p>;

  const content = lesson.content;

  return (
    <div>
      <button onClick={() => navigate(-1)} className="text-sm text-zinc-500 hover:text-zinc-900">
        ← Volver
      </button>
      <div className="mt-3 flex items-baseline justify-between gap-4">
        <div>
          <div className="text-xs text-zinc-400">Lección {lesson.order}</div>
          <h1 className="text-2xl font-semibold tracking-tight">{lesson.title}</h1>
        </div>
      </div>

      {!content && (
        <div className="card p-8 mt-6 text-center">
          <h2 className="font-semibold">Esta lección aún no tiene contenido generado</h2>
          <p className="text-zinc-600 mt-2 text-sm">
            Puedes generarla ahora con el agente Profesor (~$0.04 en OpenAI) o ejecutar
            <code className="mx-1 px-1 py-0.5 bg-zinc-100 rounded">npm run generate:content</code>
            en el backend para hacerlas todas a la vez.
          </p>
          <button className="btn-primary mt-4" onClick={generateContent} disabled={generating}>
            {generating ? 'Generando con IA…' : 'Generar ahora'}
          </button>
        </div>
      )}

      {content && !showQuiz && (
        <div className="grid lg:grid-cols-[1fr_360px] gap-6 mt-6">
          <div className="space-y-4">
            {slideIdx === 0 && content.intro && (
              <div className="card p-6 bg-brand-50 border-brand-100">
                <h2 className="font-semibold text-brand-900">Introducción</h2>
                <p className="text-brand-900/90 mt-2">{content.intro}</p>
              </div>
            )}
            <SlideView
              slide={content.slides?.[slideIdx]}
              index={slideIdx}
              total={content.slides?.length || 0}
            />
            <div className="flex items-center justify-between">
              <button
                className="btn-ghost"
                onClick={() => setSlideIdx(i => Math.max(0, i - 1))}
                disabled={slideIdx === 0}
              >
                ← Anterior
              </button>
              <div className="text-xs text-zinc-500">
                {slideIdx + 1} / {content.slides?.length || 0}
              </div>
              {slideIdx < (content.slides?.length || 0) - 1 ? (
                <button
                  className="btn-primary"
                  onClick={() => setSlideIdx(i => i + 1)}
                >
                  Siguiente →
                </button>
              ) : (
                <button className="btn-primary" onClick={() => setShowQuiz(true)}>
                  Hacer quiz →
                </button>
              )}
            </div>
            {slideIdx === (content.slides?.length || 0) - 1 && content.summary && (
              <div className="card p-6">
                <h2 className="font-semibold">Resumen</h2>
                <p className="text-zinc-700 mt-2">{content.summary}</p>
              </div>
            )}
          </div>
          <aside>
            <TutorChat lessonContext={lessonContext} />
          </aside>
        </div>
      )}

      {content && showQuiz && (
        <div className="mt-6 space-y-4">
          <QuizPanel lessonId={lesson.id} />
          <button className="btn-ghost" onClick={() => setShowQuiz(false)}>
            ← Volver a las slides
          </button>
        </div>
      )}
    </div>
  );
}
