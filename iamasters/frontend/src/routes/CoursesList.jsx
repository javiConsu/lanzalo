import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

const DEPT_LABELS = {
  ventas: 'Ventas',
  finanzas: 'Finanzas',
  direccion: 'Dirección',
  management: 'Management',
  productividad: 'Productividad',
};

export default function CoursesList() {
  const [courses, setCourses] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.listCourses().then(setCourses).catch(err => setError(err.message));
  }, []);

  if (error) return <ErrorBox message={error} />;
  if (!courses) return <p className="text-zinc-500">Cargando…</p>;

  if (courses.length === 0) {
    return (
      <div className="card p-8 text-center">
        <h2 className="text-lg font-semibold">Aún no hay cursos</h2>
        <p className="text-zinc-600 mt-2">
          Ejecuta <code className="px-1 py-0.5 bg-zinc-100 rounded">npm run seed</code> en
          el backend para crear los 5 cursos iniciales.
        </p>
      </div>
    );
  }

  const grouped = {};
  for (const c of courses) {
    const k = c.department;
    grouped[k] ??= [];
    grouped[k].push(c);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Catálogo de cursos</h1>
        <p className="text-zinc-600 mt-1">Elige un departamento para empezar.</p>
      </div>
      {Object.entries(grouped).map(([dept, list]) => (
        <section key={dept}>
          <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3">
            {DEPT_LABELS[dept] || dept}
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {list.map(c => (
              <Link key={c.id} to={`/courses/${c.id}`} className="card p-5 hover:shadow-md transition">
                <h3 className="font-semibold leading-snug">{c.title}</h3>
                <p className="text-sm text-zinc-600 mt-2 line-clamp-3">{c.summary}</p>
                {c.source_filename && (
                  <div className="mt-3 text-xs text-brand-700 bg-brand-50 inline-block px-2 py-0.5 rounded truncate max-w-full">
                    📎 {c.source_filename}
                  </div>
                )}
                <div className="text-xs text-zinc-400 mt-4">Abrir curso →</div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ErrorBox({ message }) {
  return (
    <div className="card p-6 border-red-200 bg-red-50">
      <h2 className="font-semibold text-red-800">No se pudo cargar</h2>
      <p className="text-sm text-red-700 mt-1">{message}</p>
      <p className="text-xs text-red-600 mt-3">
        ¿Está el backend corriendo en <code>http://localhost:4100</code>?
      </p>
    </div>
  );
}
