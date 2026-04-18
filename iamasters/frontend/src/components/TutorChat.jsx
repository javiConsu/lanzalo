import { useRef, useState, useEffect } from 'react';
import { api } from '../api.js';

export default function TutorChat({ lessonContext }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  async function send(e) {
    e?.preventDefault();
    const msg = input.trim();
    if (!msg || loading) return;
    setInput('');
    const nextHistory = [...messages, { role: 'user', content: msg }];
    setMessages(nextHistory);
    setLoading(true);
    try {
      const { reply } = await api.chat({
        lessonContext,
        history: messages,
        message: msg,
      });
      setMessages([...nextHistory, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages([
        ...nextHistory,
        { role: 'assistant', content: `⚠️ Error: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card flex flex-col h-[600px]">
      <div className="px-4 py-3 border-b border-zinc-200">
        <h3 className="font-semibold text-sm">Tutor IA</h3>
        <p className="text-xs text-zinc-500">Pregunta lo que no entiendas de la lección.</p>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-zinc-400 italic">
            Empieza la conversación. Por ejemplo: «¿Me das un ejemplo aplicado a mi sector?»
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === 'user'
                ? 'ml-auto max-w-[85%] bg-brand-600 text-white rounded-lg px-3 py-2 text-sm'
                : 'mr-auto max-w-[85%] bg-zinc-100 text-zinc-900 rounded-lg px-3 py-2 text-sm whitespace-pre-wrap'
            }
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="mr-auto bg-zinc-100 rounded-lg px-3 py-2 text-sm text-zinc-500">
            Pensando…
          </div>
        )}
      </div>
      <form onSubmit={send} className="p-3 border-t border-zinc-200 flex gap-2">
        <input
          className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="Escribe tu duda…"
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={loading}
        />
        <button type="submit" className="btn-primary" disabled={loading || !input.trim()}>
          Enviar
        </button>
      </form>
    </div>
  );
}
