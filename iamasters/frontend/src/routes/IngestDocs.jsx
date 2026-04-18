import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

const DEPARTMENTS = [
  { value: '',               label: 'Sin departamento' },
  { value: 'ventas',         label: 'Ventas' },
  { value: 'finanzas',       label: 'Finanzas' },
  { value: 'direccion',      label: 'Dirección' },
  { value: 'management',     label: 'Management' },
  { value: 'productividad',  label: 'Productividad' },
];

export default function IngestDocs() {
  const [docs, setDocs] = useState(null);
  const [error, setError] = useState(null);

  async function reload() {
    try {
      setDocs(await api.listDocuments());
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { reload(); }, []);

  async function onDelete(id) {
    if (!confirm('¿Eliminar este documento? Los cursos ya creados a partir de él se mantendrán pero perderán la referencia.')) return;
    await api.deleteDocument(id);
    reload();
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Documentos de la empresa</h1>
        <p className="text-zinc-600 mt-1 max-w-2xl">
          Sube los manuales, playbooks y políticas internas de tu empresa. IAmasters
          generará cursos anclados en <em>vuestro</em> material, no en un curso genérico.
        </p>
      </header>

      <UploadForm onUploaded={reload} />

      {error && (
        <div className="card p-4 border-red-200 bg-red-50 text-sm text-red-700">{error}</div>
      )}

      <section>
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3">
          Documentos subidos
        </h2>
        {!docs && <p className="text-zinc-500">Cargando…</p>}
        {docs && docs.length === 0 && (
          <div className="card p-6 text-sm text-zinc-600">
            Aún no hay documentos. Sube un PDF arriba para empezar.
          </div>
        )}
        <div className="space-y-3">
          {docs?.map(d => (
            <DocRow key={d.id} doc={d} onDeleted={reload} onDelete={onDelete} />
          ))}
        </div>
      </section>
    </div>
  );
}

function UploadForm({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('idle'); // idle|uploading|done|error
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    if (!file) return;
    setStatus('uploading');
    setError(null);
    try {
      await api.uploadPdf(file, department);
      setStatus('done');
      setFile(null);
      setDepartment('');
      e.target.reset();
      onUploaded?.();
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  return (
    <form onSubmit={submit} className="card p-5 space-y-4">
      <h2 className="font-semibold">Subir un PDF</h2>
      <div className="grid md:grid-cols-[1fr_220px_auto] gap-3 items-end">
        <label className="block">
          <span className="text-xs font-medium text-zinc-500">Archivo PDF</span>
          <input
            type="file"
            accept="application/pdf"
            onChange={e => setFile(e.target.files?.[0] || null)}
            className="mt-1 block w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
            required
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-zinc-500">Departamento (opcional)</span>
          <select
            value={department}
            onChange={e => setDepartment(e.target.value)}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          >
            {DEPARTMENTS.map(d => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </label>
        <button className="btn-primary" disabled={!file || status === 'uploading'}>
          {status === 'uploading' ? 'Subiendo…' : 'Subir'}
        </button>
      </div>
      {status === 'done' && (
        <p className="text-sm text-green-700">✓ Documento subido y texto extraído.</p>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
      <p className="text-xs text-zinc-500">
        Máximo 25 MB. Solo PDF con texto extraíble (los escaneos necesitan OCR previo).
      </p>
    </form>
  );
}

function DocRow({ doc, onDelete }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-medium truncate">{doc.filename}</h3>
          <div className="text-xs text-zinc-500 mt-1 flex flex-wrap gap-2">
            {doc.department && (
              <span className="bg-brand-50 text-brand-700 px-2 py-0.5 rounded">
                {doc.department}
              </span>
            )}
            <span>{doc.pages} páginas</span>
            <span>·</span>
            <span>{Number(doc.chars).toLocaleString('es-ES')} caracteres</span>
            <span>·</span>
            <span>{new Date(doc.created_at).toLocaleDateString('es-ES')}</span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            className="btn-ghost text-xs"
            onClick={() => setOpen(o => !o)}
          >
            {open ? 'Cerrar' : 'Generar curso'}
          </button>
          <button
            className="btn-ghost text-xs text-red-600"
            onClick={() => onDelete(doc.id)}
          >
            Eliminar
          </button>
        </div>
      </div>
      {open && <GenerateCourseForm doc={doc} onCreated={() => setOpen(false)} />}
    </div>
  );
}

function GenerateCourseForm({ doc, onCreated }) {
  const [topic, setTopic] = useState('');
  const [department, setDepartment] = useState(doc.department || 'ventas');
  const [lessonsCount, setLessonsCount] = useState(8);
  const [status, setStatus] = useState('idle');
  const [created, setCreated] = useState(null);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    if (!topic.trim()) return;
    setStatus('generating');
    setError(null);
    try {
      const result = await api.createCourse({
        department,
        topic: topic.trim(),
        documentId: doc.id,
        lessonsCount: Number(lessonsCount) || 8,
      });
      setCreated(result.course);
      setStatus('done');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  if (created) {
    return (
      <div className="mt-4 rounded-md bg-green-50 border border-green-200 p-4 text-sm">
        <p className="text-green-800 font-medium">✓ Curso creado: {created.title}</p>
        <p className="text-green-700 mt-1">
          Con {lessonsCount} lecciones ancladas en este documento. Aún necesita
          generar el contenido de cada lección (slides + narración).
        </p>
        <div className="mt-3 flex gap-2">
          <Link to={`/courses/${created.id}`} className="btn-primary text-xs">
            Abrir curso →
          </Link>
          <button className="btn-ghost text-xs" onClick={onCreated}>Cerrar</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4 grid md:grid-cols-[1fr_180px_100px_auto] gap-3 items-end border-t border-zinc-100 pt-4">
      <label className="block md:col-span-1">
        <span className="text-xs font-medium text-zinc-500">Tema del curso</span>
        <input
          type="text"
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder="Ej: Aplicar nuestro playbook de ventas con IA"
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          required
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-zinc-500">Departamento</span>
        <select
          value={department}
          onChange={e => setDepartment(e.target.value)}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        >
          {DEPARTMENTS.filter(d => d.value).map(d => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-medium text-zinc-500">Lecciones</span>
        <input
          type="number"
          min={3}
          max={15}
          value={lessonsCount}
          onChange={e => setLessonsCount(e.target.value)}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
      </label>
      <button className="btn-primary" disabled={!topic.trim() || status === 'generating'}>
        {status === 'generating' ? 'Generando…' : 'Generar outline'}
      </button>
      {error && <p className="md:col-span-4 text-sm text-red-700">{error}</p>}
    </form>
  );
}
