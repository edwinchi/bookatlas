import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Real pages (owner request 2026-11-17, "book mode" as on the best eBook readers): the chapter flows into CSS
 * columns exactly one screen wide (two side by side on wide screens) and the reader turns them like pages.
 * The page sizes are whole pixels, so page 40 lines up as exactly as page 1.
 */
export function usePagedLayout(enabled: boolean, spread: boolean, resetKey: number, deps: unknown[]) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const flowRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  const toLast = useRef(false);
  const toPara = useRef<number | null>(null);
  const lastKey = useRef(resetKey);
  const pagesRef = useRef(1);
  const cols = enabled && spread && size.w >= 900 ? 2 : 1;
  const gap = cols === 2 ? 72 : 48;
  const stride = size.w + gap;

  // The page size follows the window.
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!enabled || !el) return;
    const read = () => { const r = el.getBoundingClientRect(); setSize({ w: Math.floor(r.width), h: Math.floor(r.height) }); };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [enabled]);

  const pageOf = useCallback((p: number) => {
    const flow = flowRef.current;
    const el = flow?.querySelector<HTMLElement>(`[data-para="${p}"]`);
    if (!flow || !el || !stride) return null;
    const x = el.getBoundingClientRect().left - flow.getBoundingClientRect().left + flow.scrollLeft;
    return Math.max(0, Math.floor((x + 2) / stride));
  }, [stride]);

  const measure = useCallback(() => {
    const flow = flowRef.current;
    if (!enabled || !flow || !size.w) return;
    const n = Math.max(1, Math.round((flow.scrollWidth + gap) / stride));
    setPages(n);
    pagesRef.current = n;
    const newChapter = lastKey.current !== resetKey;
    lastKey.current = resetKey;
    if (toLast.current) { toLast.current = false; setPage(n - 1); return; }
    if (toPara.current !== null) { const at = pageOf(toPara.current); if (at !== null) { toPara.current = null; setPage(Math.min(n - 1, at)); return; } }
    if (newChapter) { setPage(0); return; }
    setPage((x) => Math.min(x, n - 1));
  }, [enabled, size.w, gap, stride, pageOf, resetKey]);

  // Re-measure after every layout change (chapter, font, size, images, fonts loading).
  useLayoutEffect(() => { measure(); }, [measure, size.h, cols, ...deps]);
  useEffect(() => {
    const flow = flowRef.current;
    if (!enabled || !flow) return;
    const onLoad = () => measure();
    flow.addEventListener('load', onLoad, true);
    void document.fonts?.ready.then(onLoad);
    const mo = new MutationObserver(() => requestAnimationFrame(measure));
    mo.observe(flow, { childList: true, subtree: true });
    return () => { flow.removeEventListener('load', onLoad, true); mo.disconnect(); };
  }, [enabled, measure]);

  // Show the page.
  useLayoutEffect(() => {
    const flow = flowRef.current;
    if (enabled && flow) flow.scrollLeft = page * stride;
  }, [enabled, page, stride, pages]);

  // A search, a focused link or selected text can scroll the flow: snap back to a whole page.
  useEffect(() => {
    const flow = flowRef.current;
    if (!enabled || !flow) return;
    let t = 0;
    const onScroll = () => {
      window.clearTimeout(t);
      t = window.setTimeout(() => {
        const at = Math.round(flow.scrollLeft / stride);
        if (Math.abs(flow.scrollLeft - at * stride) > 1) flow.scrollLeft = at * stride;
        setPage(at);
      }, 80);
    };
    flow.addEventListener('scroll', onScroll);
    return () => { flow.removeEventListener('scroll', onScroll); window.clearTimeout(t); };
  }, [enabled, stride]);

  /** The first paragraph on the page shown, to keep the reading place. */
  const firstParagraph = useCallback(() => {
    const flow = flowRef.current;
    if (!flow) return null;
    const left = flow.getBoundingClientRect().left;
    for (const el of flow.querySelectorAll<HTMLElement>('[data-para]')) {
      if (el.getBoundingClientRect().right > left + 1) return Number(el.dataset.para);
    }
    return null;
  }, []);

  return {
    wrapRef, flowRef, page, pages, cols, gap, size,
    setPage: (n: number) => setPage(Math.max(0, Math.min(pagesRef.current - 1, n))),
    /** After the chapter changes: open it on its last page (turning back) or at a paragraph. */
    openAtEnd: () => { toLast.current = true; },
    openAt: (p: number) => { toPara.current = p; },
    goToParagraph: (p: number) => { const at = pageOf(p); if (at !== null) { if (toPara.current === p) toPara.current = null; setPage(Math.min(pagesRef.current - 1, at)); } },
    firstParagraph,
  };
}
