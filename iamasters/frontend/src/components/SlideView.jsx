import AudioPlayer from './AudioPlayer.jsx';

export default function SlideView({ slide, index, total }) {
  if (!slide) return null;
  return (
    <article className="card p-8">
      <div className="text-xs text-zinc-400 mb-2">Slide {index + 1} / {total}</div>
      <h2 className="text-xl font-semibold tracking-tight">{slide.heading}</h2>
      {slide.bullets?.length > 0 && (
        <ul className="mt-4 space-y-2">
          {slide.bullets.map((b, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-brand-600 shrink-0">•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
      {slide.example && (
        <div className="mt-6 rounded-lg bg-brand-50 border border-brand-100 p-4">
          <div className="text-xs font-medium text-brand-700 mb-1">Ejemplo</div>
          <p className="text-sm text-brand-900">{slide.example}</p>
        </div>
      )}
      {slide.narration && (
        <div className="mt-6">
          <AudioPlayer text={slide.narration} />
        </div>
      )}
    </article>
  );
}
