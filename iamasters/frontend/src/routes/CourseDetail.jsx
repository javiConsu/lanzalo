import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';

export default function CourseDetail() {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setCourse(null);
    api.getCourse(id).then(setCourse).catch(err => setError(err.message));
  }, [id]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!course) return <p className="text-zinc-500">Cargando…</p>;

  return (
    <div>
      <Link to="/" className="text-sm text-zinc-500 hover:text-zinc-900">← Volver al catálogo</Link>
      <h1 className="text-2xl font-semibold tracking-tight mt-3">{course.title}</h1>
      <p className="text-zinc-600 mt-2 max-w-3xl">{course.summary}</p>
      {course.audience && (
        <p className="text-sm text-zinc-500 mt-2">
          <span className="font-medium">Audiencia:</span> {course.audience}
        </p>
      )}

      <ol className="mt-8 space-y-2">
        {(course.lessons || []).map(l => (
          <li key={l.id}>
            <Link
              to={`/lessons/${l.id}`}
              className="card p-4 flex items-center justify-between hover:shadow-md transition"
            >
              <div>
                <div className="text-xs text-zinc-400">Lección {l.order}</div>
                <div className="font-medium">{l.title}</div>
                {l.objectives?.length > 0 && (
                  <div className="text-xs text-zinc-500 mt-1 line-clamp-1">
                    {l.objectives.join(' · ')}
                  </div>
                )}
              </div>
              <div className="text-xs text-zinc-400 shrink-0 ml-4">
                {l.estimated_minutes ?? 20} min →
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
