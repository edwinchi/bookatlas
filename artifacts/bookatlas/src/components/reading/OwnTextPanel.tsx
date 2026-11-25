import React, { useMemo, useRef, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Switch from '@radix-ui/react-switch';
import { ClipboardPaste, FileUp, Loader2, Lock, RotateCcw } from 'lucide-react';
import { FastReadPlayer, SpeedCheck, passageFrom, useSpeedTests } from '../reader/FastReadPanel';
import { BoldStarts } from '../reader/readingAids';
import { capWords, countWords, paragraphsFromText, readOwnFile } from './ownText';

const tab = 'rounded-lg px-3 py-2 text-xs font-bold text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer';

/**
 * Your own text (Reading Intelligence phase 2): paste or open a document, then Fast Read it, check your speed on it,
 * or read it with bold word starts. Everything stays in the browser.
 */
export function OwnText() {
  const [doc, setDoc] = useState<{ title: string; paragraphs: string[]; cut: boolean } | null>(null);
  const [paste, setPaste] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [bold, setBold] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const speed = useSpeedTests();
  const words = useMemo(() => (doc ? countWords(doc.paragraphs) : 0), [doc]);

  const open = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true); setError('');
    try { setDoc(await readOwnFile(file)); } catch (e) { setError(e instanceof Error ? e.message : 'This file could not be read.'); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  };
  const usePaste = () => {
    const paras = paragraphsFromText(paste);
    if (!paras.length) { setError('Paste some text first.'); return; }
    setError('');
    setDoc({ title: 'Pasted text', ...capWords(paras) });
  };

  if (!doc) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
          <p className="flex items-center gap-2 text-sm font-bold text-slate-900"><ClipboardPaste className="h-4 w-4 text-indigo-600" aria-hidden />Paste a text</p>
          <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={7} placeholder="An article, a report, your notes, a chapter you are writing…" data-testid="own-text-paste"
            className="block w-full resize-y rounded-xl border border-slate-300 p-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
          <button type="button" onClick={usePaste} data-testid="own-text-use" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-500 cursor-pointer">Read this text</button>
        </div>
        <div className="flex flex-col justify-between gap-3 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-slate-900"><FileUp className="h-4 w-4 text-indigo-600" aria-hidden />Open a file</p>
            <p className="mt-1.5 text-sm text-slate-600">EPUB, Word (.docx), PDF, a saved web page (.html), or a text or Markdown file, up to 40 MB.</p>
          </div>
          <input ref={fileRef} type="file" accept=".epub,.docx,.pdf,.html,.htm,.xhtml,.txt,.md,text/plain" className="sr-only" id="own-text-file" onChange={(e) => void open(e.target.files?.[0])} data-testid="own-text-file" />
          <label htmlFor="own-text-file" className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-800 cursor-pointer focus-within:ring-2 focus-within:ring-indigo-500">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <FileUp className="h-4 w-4" aria-hidden />}{busy ? 'Reading the file…' : 'Choose a file'}
          </label>
          <p className="flex items-center gap-1.5 text-xs text-slate-500"><Lock className="h-3.5 w-3.5" aria-hidden />Read on your device. Nothing is uploaded or kept.</p>
        </div>
        {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800 lg:col-span-2">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="own-text-doc">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-700"><strong className="text-slate-900">{doc.title}</strong> · {words.toLocaleString()} words{doc.cut ? ' (the first 120,000)' : ''}</p>
        <button type="button" onClick={() => { setDoc(null); setPaste(''); }} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-slate-100 px-3 text-xs font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"><RotateCcw className="h-3.5 w-3.5" aria-hidden />Another text</button>
      </div>
      <Tabs.Root defaultValue="fast" className="space-y-4">
        <Tabs.List aria-label="Read your text" className="inline-flex gap-1 rounded-xl bg-slate-200/70 p-1">
          <Tabs.Trigger value="fast" className={tab}>Fast Read</Tabs.Trigger>
          <Tabs.Trigger value="read" className={tab}>Read</Tabs.Trigger>
          <Tabs.Trigger value="check" className={tab}>Check my speed</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="fast" className="focus-visible:outline-none"><div className="max-w-2xl"><FastReadPlayer paragraphs={doc.paragraphs} /></div></Tabs.Content>
        <Tabs.Content value="read" className="focus-visible:outline-none">
          <label className="mb-3 flex w-fit items-center gap-3 text-sm font-semibold text-slate-700">Bold word starts
            <Switch.Root checked={bold} onCheckedChange={setBold} className="relative h-6 w-11 rounded-full bg-slate-300 transition-colors data-[state=checked]:bg-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer">
              <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[22px]" />
            </Switch.Root>
          </label>
          <div className="max-h-[70dvh] space-y-4 overflow-y-auto rounded-2xl bg-white p-6 font-serif-book text-[18px] leading-relaxed text-slate-900 ring-1 ring-slate-200">
            {doc.paragraphs.slice(0, 400).map((p, i) => <p key={i}>{bold ? <BoldStarts text={p} /> : p}</p>)}
            {doc.paragraphs.length > 400 && <p className="text-sm text-slate-500">The first 400 paragraphs are shown here; Fast Read has the whole text.</p>}
          </div>
        </Tabs.Content>
        <Tabs.Content value="check" className="focus-visible:outline-none"><div className="max-w-2xl"><SpeedCheck text={passageFrom(doc.paragraphs, 0)} source="sample" onResult={speed.add} /></div></Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
