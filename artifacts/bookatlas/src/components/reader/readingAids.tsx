import React, { useEffect, useState } from 'react';
import type { ReaderFont } from '../../types';
import { boldStartPieces } from './fastRead';

/**
 * Reading aids (Reading Intelligence, owner request 2026-11-25): the clear and dyslexia-friendly fonts, bold word
 * starts, the read-along highlight and the reading guide.
 */

const FONT_URLS: Partial<Record<ReaderFont, string>> = {
  clear: 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&display=swap',
  dyslexia: 'https://fonts.googleapis.com/css2?family=Lexend:wght@300..700&display=swap',
};
/** Loads a reading-aid font the first time a reader picks it (the other pages never download it). */
export function loadReaderFont(font: ReaderFont) {
  const href = FONT_URLS[font];
  if (!href || typeof document === 'undefined' || document.querySelector(`link[data-reader-font="${font}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.dataset.readerFont = font;
  document.head.appendChild(link);
}

export const readerFontClass = (font: ReaderFont) =>
  font === 'sans' ? 'font-reader-sans' : font === 'mono' ? 'font-reader-mono' : font === 'clear' ? 'font-reader-clear' : font === 'dyslexia' ? 'font-reader-dyslexia' : 'font-serif-book';

/** A paragraph with the start of each word in bold, at the reader's strength. The text itself is unchanged. */
export function BoldStarts({ text, strength }: { text: string; strength?: number }) {
  return <>{boldStartPieces(text, strength).map((p, i) => (p.bold ? <b key={i} className="font-bold">{p.text}</b> : <React.Fragment key={i}>{p.text}</React.Fragment>))}</>;
}

type HighlightRegistry = { set: (name: string, h: unknown) => void; delete: (name: string) => void };
const registry = (): HighlightRegistry | null => {
  const css = (globalThis as unknown as { CSS?: { highlights?: HighlightRegistry } }).CSS;
  return css?.highlights && typeof (globalThis as { Highlight?: unknown }).Highlight === 'function' ? css.highlights : null;
};
export const canFollowWords = () => !!registry();

/** A DOM range over characters `start` to `end` of an element's text (all its text nodes, in order). */
function rangeIn(el: Element, start: number, end: number) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let at = 0, node: Node | null, range: Range | null = null;
  while ((node = walker.nextNode())) {
    const len = node.textContent?.length ?? 0;
    if (!range && start < at + len) { range = document.createRange(); range.setStart(node, Math.max(0, start - at)); }
    if (range && end <= at + len) { range.setEnd(node, Math.max(0, end - at)); return range; }
    at += len;
  }
  if (range && node === null) { range.setEndAfter(el.lastChild ?? el); return range; }
  return null;
}

/**
 * Marks the sentence and the word the device voice is reading in a paragraph, without changing the page
 * (browsers without the highlight API simply show the paragraph marker the reader already has).
 */
export function showSpoken(el: Element | null, sentence: [number, number] | null, word: [number, number] | null) {
  const reg = registry();
  if (!reg) return;
  const H = (globalThis as unknown as { Highlight: new (...r: Range[]) => unknown }).Highlight;
  try {
    const s = el && sentence ? rangeIn(el, sentence[0], sentence[1]) : null;
    if (s) reg.set('ba-spoken-sentence', new H(s)); else reg.delete('ba-spoken-sentence');
    const w = el && word ? rangeIn(el, word[0], word[1]) : null;
    if (w) reg.set('ba-spoken-word', new H(w)); else reg.delete('ba-spoken-word');
  } catch { /* the highlight is a help, never a reason to stop reading */ }
}
export const clearSpoken = () => showSpoken(null, null, null);

/**
 * The reading guide: a clear band at the height of the finger or mouse; the lines above and below are shaded so
 * the eye keeps its line. It ignores taps, so pages still turn and text can still be selected.
 */
export function ReadingGuide({ dark }: { dark: boolean }) {
  const [y, setY] = useState<number | null>(null);
  useEffect(() => {
    const move = (e: PointerEvent) => setY(e.clientY);
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', move, { passive: true });
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerdown', move); };
  }, []);
  const shade = dark ? 'rgba(0,0,0,0.55)' : 'rgba(15,23,42,0.28)';
  const top = y ?? (typeof window !== 'undefined' ? window.innerHeight * 0.4 : 300);
  const band = 72;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[5]" data-testid="reading-guide">
      <div className="absolute inset-x-0 top-0" style={{ height: Math.max(0, top - band / 2), background: shade }} />
      <div className="absolute inset-x-0 bottom-0" style={{ top: top + band / 2, background: shade }} />
      <div className="absolute inset-x-0 border-y-2 border-amber-400/70" style={{ top: top - band / 2, height: band }} />
    </div>
  );
}
