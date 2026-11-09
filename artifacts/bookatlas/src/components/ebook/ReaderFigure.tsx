import React, { useEffect, useRef, useState } from 'react';
import { useEbookApi } from './ebookApi';

/** A book image for signed-in readers. Fetched with the account token once it nears the viewport. */
export const ReaderFigure: React.FC<{ bookId: string; src: string; alt: string }> = ({ bookId, src, alt }) => {
  const api = useEbookApi();
  const ref = useRef<HTMLElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    const load = () => api.readerImage(bookId, src)
      .then((u) => { if (cancelled) URL.revokeObjectURL(u); else { objectUrl = u; setUrl(u); } })
      .catch(() => { if (!cancelled) setFailed(true); });
    if (typeof IntersectionObserver === 'undefined') { void load(); }
    else {
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) { observer.disconnect(); void load(); }
      }, { rootMargin: '600px 0px' });
      observer.observe(el);
      return () => { cancelled = true; observer.disconnect(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [bookId, src]);

  return (
    <figure ref={ref} className="my-6 flex justify-center">
      {url ? <img src={url} alt={alt} className="max-h-[70vh] max-w-full rounded-lg" />
        : <div className="flex h-48 w-full max-w-md items-center justify-center rounded-lg bg-current/5 text-xs opacity-60">{failed ? 'Image unavailable' : 'Loading image…'}</div>}
    </figure>
  );
};
