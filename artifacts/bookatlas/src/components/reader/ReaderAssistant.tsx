import React, { useEffect, useRef, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { BookOpenCheck, Check, GraduationCap, Languages, Loader2, MessageCircleQuestion, RotateCcw, Send, Sparkles, Volume2, X } from 'lucide-react';
import type { Chapter } from '../../types';
import type { AskResult, Definition, StudyKind, StudyResult, useEbookApi } from '../ebook/ebookApi';

import { SelectBox } from '../ui/select-box';
type Api = ReturnType<typeof useEbookApi>;
export type AssistantTab = 'ask' | 'study' | 'words';
/** What the selection toolbar asked for; the Words tab runs it. */
export type WordsRequest = { id: number; action: 'explain' | 'simplify' | 'translate' | 'define'; text: string; context: string };

const LAST_LANG = 'bookatlas:reader-translate-to';
const storedLang = () => { try { return localStorage.getItem(LAST_LANG) || 'nl'; } catch { return 'nl'; } };

/**
 * BooksAtlas Reader Phase 2 (cycle 8): ask the book (answers cite the passages they use), study the chapter
 * (summary, key concepts, flashcards, quiz), and explain, simplify, translate or define a selection.
 * Signed-in readers; a daily limit applies. Answers come only from the text the reader may read.
 */
export function ReaderAssistant(props: {
  api: Api; signedIn: boolean; onSignIn: () => void; bookId: string; chapters: Chapter[]; chapterIndex: number;
  inPreview: boolean; tab: AssistantTab; onTab: (t: AssistantTab) => void; request: WordsRequest | null;
  onJump: (chapterIndex: number, paragraphIndex: number) => void; onClose: () => void;
}) {
  const { api, signedIn, bookId, chapters, chapterIndex } = props;
  const [remaining, setRemaining] = useState<number | null>(null);
  const [languages, setLanguages] = useState<Record<string, string>>({});
  useEffect(() => { api.readerAiConfig().then((c) => setLanguages(c.languages)).catch(() => undefined); }, []);
  const tabCls = 'flex flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-full px-2 py-1.5 text-[11px] font-bold text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm cursor-pointer';

  return (
    <aside aria-label="Reading assistant" className="absolute top-16 right-2 z-50 flex max-h-[85vh] w-[440px] max-w-[94vw] flex-col overflow-hidden rounded-3xl border border-indigo-200 bg-white text-slate-900 shadow-2xl sm:right-6">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 p-4">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-600 text-white"><Sparkles className="h-4 w-4 text-amber-300" aria-hidden /></span>
          <div>
            <h3 className="text-sm font-bold leading-tight">Reading assistant</h3>
            <p className="text-[11px] text-slate-500">{props.inPreview ? 'Answers from the free preview only' : 'Answers from this book only'}{remaining !== null ? ` · ${remaining} AI requests left today` : ''}</p>
          </div>
        </div>
        <button type="button" onClick={props.onClose} aria-label="Close reading assistant" className="rounded-lg p-1 text-slate-400 hover:bg-slate-200/50 hover:text-slate-700 cursor-pointer"><X className="h-4 w-4" /></button>
      </div>
      {!signedIn ? (
        <div className="space-y-3 p-6 text-center text-sm text-slate-600">
          <p>Sign in to ask questions about this book, study its chapters and translate or look up any word.</p>
          <button type="button" onClick={props.onSignIn} className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 cursor-pointer">Sign in</button>
        </div>
      ) : (
        <Tabs.Root value={props.tab} onValueChange={(v) => props.onTab(v as AssistantTab)} className="flex min-h-0 flex-1 flex-col">
          <Tabs.List aria-label="Assistant tools" className="mx-4 mt-3 flex gap-1 rounded-full bg-slate-100 p-1">
            <Tabs.Trigger value="ask" className={tabCls}><MessageCircleQuestion className="h-3.5 w-3.5" aria-hidden />Ask the book</Tabs.Trigger>
            <Tabs.Trigger value="study" className={tabCls}><GraduationCap className="h-3.5 w-3.5" aria-hidden />Study</Tabs.Trigger>
            <Tabs.Trigger value="words" className={tabCls}><Languages className="h-3.5 w-3.5" aria-hidden />Words</Tabs.Trigger>
          </Tabs.List>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <Tabs.Content value="ask" forceMount hidden={props.tab !== 'ask'}><AskTab {...{ api, bookId, chapterIndex, onRemaining: setRemaining, onJump: props.onJump }} /></Tabs.Content>
            <Tabs.Content value="study" hidden={props.tab !== 'study'}><StudyTab {...{ api, bookId, chapters, chapterIndex, onRemaining: setRemaining }} /></Tabs.Content>
            <Tabs.Content value="words" forceMount hidden={props.tab !== 'words'}><WordsTab {...{ api, bookId, languages, request: props.request, onRemaining: setRemaining }} /></Tabs.Content>
          </div>
        </Tabs.Root>
      )}
    </aside>
  );
}

function useRun(onRemaining: (n: number) => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async <T extends { remaining?: number }>(fn: () => Promise<T>) => {
    setBusy(true); setError('');
    try { const r = await fn(); if (typeof r.remaining === 'number') onRemaining(r.remaining); return r; }
    catch (e) { setError(e instanceof Error ? e.message : 'Please try again.'); return null; }
    finally { setBusy(false); }
  };
  return { busy, error, run, setError };
}
const Spinner = ({ label }: { label: string }) => <p className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />{label}</p>;
const Err = ({ text }: { text: string }) => (text ? <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">{text}</p> : null);

/** Renders "[2]" in an answer as a link to that source. */
function withCitations(text: string, sources: AskResult['sources'], onJump: (c: number, p: number) => void) {
  return text.split(/(\[\d{1,2}\])/g).map((part, i) => {
    const m = /^\[(\d{1,2})\]$/.exec(part);
    const src = m && sources.find((s) => s.n === Number(m[1]));
    return src
      ? <button key={i} type="button" onClick={() => onJump(src.chapterIndex, src.paragraphIndex)} title={`${src.chapterTitle}: ${src.excerpt}`} className="mx-0.5 rounded bg-indigo-100 px-1 text-[10px] font-bold text-indigo-700 hover:bg-indigo-200 cursor-pointer">{part}</button>
      : <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

function AskTab({ api, bookId, chapterIndex, onRemaining, onJump }: { api: Api; bookId: string; chapterIndex: number; onRemaining: (n: number) => void; onJump: (c: number, p: number) => void }) {
  const [question, setQuestion] = useState('');
  const [thread, setThread] = useState<{ q: string; a?: AskResult }[]>([]);
  const { busy, error, run } = useRun(onRemaining);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [thread.length, busy]);
  const send = async (q: string) => {
    const text = q.trim();
    if (text.length < 3 || busy) return;
    setQuestion('');
    const history = thread.flatMap((t) => [{ role: 'user' as const, text: t.q }, ...(t.a ? [{ role: 'assistant' as const, text: t.a.answer }] : [])]).slice(-6);
    setThread((t) => [...t, { q: text }]);
    const r = await run(() => api.askBook({ bookId, question: text, chapterIndex, history }));
    setThread((t) => (r ? t.map((x, i) => (i === t.length - 1 ? { ...x, a: r } : x)) : t.slice(0, -1)));
    if (!r) setQuestion(text);
  };
  const suggestions = ['What is this chapter about?', 'Explain the main idea in simple words', 'Who are the key people mentioned so far?'];
  return (
    <div className="space-y-3">
      {!thread.length && (
        <div className="space-y-2">
          <p className="text-xs text-slate-600">Ask anything about the book. Answers quote the passages they use; tap a number to go there.</p>
          <div className="flex flex-wrap gap-1.5">{suggestions.map((s) => <button key={s} type="button" onClick={() => void send(s)} className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-indigo-800 hover:bg-indigo-100 cursor-pointer">{s}</button>)}</div>
        </div>
      )}
      <ul className="space-y-3">
        {thread.map((t, i) => (
          <li key={i} className="space-y-2">
            <p className="ml-8 rounded-2xl rounded-br-sm bg-indigo-600 px-3 py-2 text-xs text-white">{t.q}</p>
            {t.a ? (
              <div className="mr-4 space-y-2 rounded-2xl rounded-bl-sm bg-slate-100 px-3 py-2 text-xs leading-relaxed text-slate-800">
                <p className="whitespace-pre-line">{withCitations(t.a.answer, t.a.sources, onJump)}</p>
                {t.a.sources.some((s) => s.cited) && (
                  <details className="text-[11px] text-slate-600">
                    <summary className="cursor-pointer font-semibold">Sources</summary>
                    <ul className="mt-1 space-y-1">{t.a.sources.filter((s) => s.cited).map((s) => (
                      <li key={s.n}><button type="button" onClick={() => onJump(s.chapterIndex, s.paragraphIndex)} className="text-left hover:underline cursor-pointer"><b>[{s.n}]</b> {s.chapterTitle}: “{s.excerpt}…”</button></li>
                    ))}</ul>
                  </details>
                )}
              </div>
            ) : busy && i === thread.length - 1 ? <Spinner label="Reading the book…" /> : null}
          </li>
        ))}
      </ul>
      <Err text={error} />
      <div ref={end} />
      <form onSubmit={(e) => { e.preventDefault(); void send(question); }} className="sticky bottom-0 flex items-end gap-2 bg-white pt-1">
        <label htmlFor="ask-book" className="sr-only">Your question about the book</label>
        <textarea id="ask-book" value={question} onChange={(e) => setQuestion(e.target.value)} rows={2} maxLength={600} placeholder="Ask about this book…"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(question); } }}
          className="flex-1 resize-none rounded-xl border border-slate-200 p-2 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500" />
        <button type="submit" disabled={busy || question.trim().length < 3} aria-label="Ask" className="grid h-9 w-9 place-items-center rounded-full bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 cursor-pointer"><Send className="h-4 w-4" /></button>
      </form>
    </div>
  );
}

function StudyTab({ api, bookId, chapters, chapterIndex, onRemaining }: { api: Api; bookId: string; chapters: Chapter[]; chapterIndex: number; onRemaining: (n: number) => void }) {
  const [kind, setKind] = useState<StudyKind>('summary');
  const [ci, setCi] = useState(chapterIndex);
  const [result, setResult] = useState<StudyResult | null>(null);
  const { busy, error, run } = useRun(onRemaining);
  useEffect(() => { setCi(chapterIndex); }, [chapterIndex]);
  useEffect(() => { setResult(null); }, [ci, kind]);
  const make = async () => { const r = await run(() => api.studyChapter({ bookId, chapterIndex: ci, kind })); if (r) setResult(r); };
  const kinds: [StudyKind, string][] = [['summary', 'Summary'], ['key_concepts', 'Key concepts'], ['flashcards', 'Flashcards'], ['quiz', 'Quiz']];
  return (
    <div className="space-y-3">
      <label className="block text-[11px] font-bold text-slate-700">
        Chapter
        <SelectBox value={ci} onChange={(e) => setCi(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-normal">
          {chapters.map((c, i) => <option key={i} value={i}>{i + 1}. {c.title}</option>)}
        </SelectBox>
      </label>
      <div role="radiogroup" aria-label="Study tool" className="grid grid-cols-4 gap-1.5">
        {kinds.map(([k, label]) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}
            className={`rounded-xl border px-1 py-2 text-[11px] font-bold cursor-pointer ${kind === k ? 'border-indigo-500 bg-indigo-50 text-indigo-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{label}</button>
        ))}
      </div>
      {!result && <button type="button" onClick={() => void make()} disabled={busy} className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50 cursor-pointer">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <BookOpenCheck className="h-3.5 w-3.5" aria-hidden />}Make {kinds.find(([k]) => k === kind)![1].toLowerCase()}
      </button>}
      <Err text={error} />
      {result?.summary !== undefined && (
        <div className="space-y-2 text-xs leading-relaxed text-slate-800">
          <p>{result.summary}</p>
          {!!result.points?.length && <ul className="list-disc space-y-1 pl-4">{result.points.map((p) => <li key={p}>{p}</li>)}</ul>}
        </div>
      )}
      {result?.concepts && <dl className="space-y-2 text-xs">{result.concepts.map((c) => <div key={c.term} className="rounded-xl bg-slate-50 p-2.5"><dt className="font-bold text-slate-900">{c.term}</dt><dd className="mt-0.5 text-slate-700">{c.explanation}</dd></div>)}</dl>}
      {result?.cards && <Flashcards cards={result.cards} />}
      {result?.questions && <Quiz questions={result.questions} />}
      {result && <p className="text-[10px] text-slate-400">Made by AI from the chapter text; check anything important in the book.</p>}
    </div>
  );
}

function Flashcards({ cards }: { cards: { front: string; back: string }[] }) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());
  const card = cards[i]!;
  const go = (d: number) => { setFlipped(false); setI((x) => (x + d + cards.length) % cards.length); };
  return (
    <div className="space-y-2">
      <button type="button" onClick={() => setFlipped((f) => !f)} aria-label={flipped ? 'Show the question' : 'Show the answer'}
        className={`flex min-h-36 w-full items-center justify-center rounded-2xl border p-4 text-center text-sm font-semibold transition-colors cursor-pointer ${flipped ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-indigo-200 bg-indigo-50 text-indigo-950'}`}>
        <span aria-live="polite">{flipped ? card.back : card.front}</span>
      </button>
      <div className="flex items-center justify-between text-[11px] text-slate-600">
        <button type="button" onClick={() => go(-1)} className="rounded-full px-3 py-1 font-semibold hover:bg-slate-100 cursor-pointer">Previous</button>
        <span>{i + 1} / {cards.length} · {known.size} known</span>
        <button type="button" onClick={() => { setKnown((k) => new Set(k).add(i)); go(1); }} className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 font-bold text-white hover:bg-emerald-500 cursor-pointer"><Check className="h-3 w-3" aria-hidden />I know it</button>
        <button type="button" onClick={() => go(1)} className="rounded-full px-3 py-1 font-semibold hover:bg-slate-100 cursor-pointer">Next</button>
      </div>
    </div>
  );
}

function Quiz({ questions }: { questions: { question: string; options: string[]; answer: number; explanation: string }[] }) {
  const [picked, setPicked] = useState<Record<number, number>>({});
  const done = Object.keys(picked).length;
  const score = questions.filter((q, i) => picked[i] === q.answer).length;
  return (
    <div className="space-y-3">
      {questions.map((q, qi) => (
        <fieldset key={qi} className="space-y-1.5 rounded-xl border border-slate-200 p-3">
          <legend className="px-1 text-xs font-bold text-slate-900">{qi + 1}. {q.question}</legend>
          {q.options.map((o, oi) => {
            const chosen = picked[qi] === oi, answered = picked[qi] !== undefined, right = oi === q.answer;
            return (
              <button key={oi} type="button" disabled={answered} onClick={() => setPicked((p) => ({ ...p, [qi]: oi }))}
                className={`block w-full rounded-lg border px-2.5 py-1.5 text-left text-xs cursor-pointer disabled:cursor-default ${answered && right ? 'border-emerald-400 bg-emerald-50 text-emerald-900' : chosen ? 'border-rose-300 bg-rose-50 text-rose-900' : 'border-slate-200 hover:bg-slate-50'}`}>
                {o}{answered && right ? ' ✓' : chosen ? ' ✗' : ''}
              </button>
            );
          })}
          {picked[qi] !== undefined && q.explanation && <p className="text-[11px] text-slate-600">{q.explanation}</p>}
        </fieldset>
      ))}
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold" aria-live="polite">{done === questions.length ? `Score: ${score} of ${questions.length}` : `${done} of ${questions.length} answered`}</span>
        {done > 0 && <button type="button" onClick={() => setPicked({})} className="inline-flex items-center gap-1 font-semibold text-indigo-700 cursor-pointer"><RotateCcw className="h-3 w-3" aria-hidden />Try again</button>}
      </div>
    </div>
  );
}

function WordsTab({ api, bookId, languages, request, onRemaining }: { api: Api; bookId: string; languages: Record<string, string>; request: WordsRequest | null; onRemaining: (n: number) => void }) {
  const [target, setTarget] = useState(storedLang);
  const [out, setOut] = useState<{ kind: 'text'; title: string; text: string } | { kind: 'def'; def: Definition } | null>(null);
  const { busy, error, run } = useRun(onRemaining);
  const go = async (req: WordsRequest, lang = target) => {
    setOut(null);
    if (req.action === 'define') { const d = await run(() => api.defineWord({ bookId, word: req.text, context: req.context })); if (d) setOut({ kind: 'def', def: d }); return; }
    if (req.action === 'translate') { const t = await run(() => api.translatePassage({ bookId, text: req.text, target: lang })); if (t) setOut({ kind: 'text', title: `In ${t.language}`, text: t.translation }); return; }
    const e = await run(() => api.explainPassage({ bookId, text: req.text, mode: req.action as 'explain' | 'simplify' }));
    if (e) setOut({ kind: 'text', title: req.action === 'simplify' ? 'In simple words' : 'Explained', text: e.answer });
  };
  useEffect(() => { if (request) void go(request); }, [request?.id]);
  const speak = (t: string) => { try { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(t)); } catch { /* no voice */ } };
  return (
    <div className="space-y-3">
      {!request ? <p className="text-xs text-slate-600">Select a word or passage in the book, then choose Define, Explain, Simplify or Translate.</p>
        : <blockquote className="rounded-xl border-l-4 border-indigo-300 bg-slate-50 px-3 py-2 text-xs italic text-slate-700 line-clamp-4">“{request.text}”</blockquote>}
      {request?.action === 'translate' && (
        <label className="flex items-center gap-2 text-[11px] font-bold text-slate-700">
          Translate into
          <SelectBox value={target} onChange={(e) => { setTarget(e.target.value); try { localStorage.setItem(LAST_LANG, e.target.value); } catch { /* ignore */ } void go(request, e.target.value); }}
            className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-normal">
            {Object.entries(languages).sort((a, b) => a[1].localeCompare(b[1])).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </SelectBox>
        </label>
      )}
      {busy && <Spinner label="Working…" />}
      <Err text={error} />
      {out?.kind === 'text' && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-700">{out.title}</p>
          <p className="whitespace-pre-line text-xs leading-relaxed text-slate-800">{out.text}</p>
        </div>
      )}
      {out?.kind === 'def' && (
        <div className="space-y-2 text-xs text-slate-800">
          <p className="flex flex-wrap items-baseline gap-2">
            <span className="font-serif text-lg font-bold text-slate-950">{out.def.word}</span>
            {out.def.pronunciation && <span className="text-slate-500">{out.def.pronunciation}</span>}
            {out.def.partOfSpeech && <span className="italic text-slate-500">{out.def.partOfSpeech}</span>}
            <button type="button" onClick={() => speak(out.def.word)} aria-label={`Pronounce ${out.def.word}`} className="rounded-full p-1 text-indigo-600 hover:bg-indigo-50 cursor-pointer"><Volume2 className="h-3.5 w-3.5" /></button>
          </p>
          <ol className="list-decimal space-y-1 pl-4">{out.def.definitions.map((d) => <li key={d}>{d}</li>)}</ol>
          {out.def.example && <p className="italic text-slate-600">“{out.def.example}”</p>}
          {!!out.def.synonyms.length && <p><span className="font-bold">Synonyms:</span> {out.def.synonyms.join(', ')}</p>}
          {out.def.origin && <p className="text-[11px] text-slate-500">Origin: {out.def.origin}</p>}
        </div>
      )}
      {out && <p className="text-[10px] text-slate-400">Made by AI; it can make mistakes.</p>}
    </div>
  );
}
