import { Routes, Route, Link, Outlet } from 'react-router-dom';
import CoursesList from './routes/CoursesList.jsx';
import CourseDetail from './routes/CourseDetail.jsx';
import LessonPlayer from './routes/LessonPlayer.jsx';
import IngestDocs from './routes/IngestDocs.jsx';

function Shell() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-lg font-semibold tracking-tight">IAmasters</span>
            <span className="text-xs text-zinc-500 font-normal">Academia de IA en español</span>
          </Link>
          <nav className="text-sm text-zinc-600 flex gap-5">
            <Link to="/" className="hover:text-zinc-900">Cursos</Link>
            <Link to="/ingest" className="hover:text-zinc-900">Documentos</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-zinc-200 text-xs text-zinc-500 py-4 text-center">
        Construido con agentes IA. © 2026 IAmasters.
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<CoursesList />} />
        <Route path="/courses/:id" element={<CourseDetail />} />
        <Route path="/lessons/:id" element={<LessonPlayer />} />
        <Route path="/ingest" element={<IngestDocs />} />
      </Route>
    </Routes>
  );
}
