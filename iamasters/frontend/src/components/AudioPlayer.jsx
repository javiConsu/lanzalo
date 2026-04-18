import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function AudioPlayer({ text, autoPlay = false }) {
  const [url, setUrl] = useState(null);
  const [status, setStatus] = useState('idle'); // idle|loading|ready|error
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!text) return;
    let revoked = false;
    let currentUrl;
    setStatus('loading');
    setError(null);
    setUrl(null);

    api.ttsBlob(text)
      .then(({ blob }) => {
        if (revoked) return;
        currentUrl = URL.createObjectURL(blob);
        setUrl(currentUrl);
        setStatus('ready');
      })
      .catch(err => {
        if (!revoked) {
          setError(err.message);
          setStatus('error');
        }
      });

    return () => {
      revoked = true;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [text]);

  if (status === 'loading') {
    return <div className="text-xs text-zinc-500">Cargando narración…</div>;
  }
  if (status === 'error') {
    return <div className="text-xs text-red-600">Audio no disponible: {error}</div>;
  }
  if (!url) return null;
  return <audio controls autoPlay={autoPlay} src={url} className="w-full" />;
}
