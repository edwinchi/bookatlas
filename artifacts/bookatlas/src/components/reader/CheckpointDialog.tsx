import React, { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Brain, CheckCircle2, Loader2, RotateCcw, X, XCircle } from 'lucide-react';
import type { useEbookApi } from '../ebook/ebookApi';
import { recordQuizPercent } from './adaptiveCoach';
import { BANDS, TYPE_LABELS, checkpointAdvice, scoreCheckpoint, type CheckpointQuestion, type CheckpointReason } from './checkpoints';

type Api = ReturnType<typeof useEbookApi>;
export interface CheckpointRequest { id: number; chapterIndex: number; from?: number; to?: number; reason: CheckpointReason }

const REASON_TEXT: Record<CheckpointReason, string> = {
  chapter: 'You finished a chapter.', words: 'You read another 1,000 words.', time: 'You have been reading for 10 minutes.', manual: 'A quick check of what you read.',
};

/**
 * A comprehension checkpoint (master build plan M4, specification SR-005): four questions on what was just read
 * (choose the answer, true or false, fill the blank, key idea), then the score, its band and what it means for
 * reading speed. The score goes to the speed coach on this device and is kept with the reader's account.
 */
export function CheckpointDialog({ api, bookId, chapterTitle, request, onClose, onRemaining }: {
  api: Api; bookId: string; chapterTitle: string; request: CheckpointRequest | null; onClose: () => void; onRemaining?: (n: number) => void;
}) {
  const [questions, setQuestions] = useState<CheckpointQuestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);
  const saved = useRef(false);

  useEffect(() => {
    if (!request) return;
    let live = true;
    setQuestions(null); setError(null); setPicked({}); setChecked(false); saved.current = false;
    api.checkpointQuestions({ bookId, chapterIndex: request.chapterIndex, from: request.from, to: request.to })
      .then((r) => { if (!live) return; setQuestions(r.questions); onRemaining?.(r.remaining); })
      .catch((e: unknown) => { if (live) setError(e instanceof Error ? e.message : 'The checkpoint could not be made. Please try again.'); });
    return () => { live = false; };
  }, [request?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = questions?.length ?? 0;
  const right = questions ? questions.filter((q, i) => picked[i] === q.answer).length : 0;
  const score = total ? Math.round((right / total) * 100) : 0;
  const band = BANDS[scoreCheckpoint(score)];
  const advice = checkpointAdvice(score);

  const check = () => {
    setChecked(true);
    if (saved.current || !request || !total) return;
    saved.current = true;
    recordQuizPercent(right, total);
    void api.saveCheckpoint({ bookId, chapterIndex: request.chapterIndex, right, total, reason: request.reason }).catch(() => undefined);
  };

  return (
    <Dialog.Root open={!!request} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-slate-950/50 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-[81] mx-auto flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-2xl outline-none sm:inset-y-0 sm:my-auto sm:h-fit sm:rounded-3xl" data-testid="checkpoint-dialog">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <Dialog.Title className="flex items-center gap-2 text-lg font-extrabold text-slate-900"><Brain className="h-5 w-5 text-indigo-600" aria-hidden />Quick checkpoint</Dialog.Title>
              <Dialog.Description className="text-xs text-slate-500">{request ? REASON_TEXT[request.reason] : ''} {chapterTitle}</Dialog.Description>
            </div>
            <Dialog.Close className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer" aria-label="Close"><X className="h-5 w-5" /></Dialog.Close>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {!questions && !error && <p className="flex items-center gap-2 py-8 text-sm text-slate-600" role="status"><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />Writing four questions about what you just read…</p>}
            {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900" role="alert">{error}</p>}
            {questions?.map((q, qi) => (
              <fieldset key={qi} className="space-y-1.5 rounded-2xl border border-slate-200 p-3" data-testid={`checkpoint-q-${q.type}`}>
                <legend className="px-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wide text-indigo-600">{TYPE_LABELS[q.type]}</span>
                  <span className="block text-sm font-bold text-slate-900">{qi + 1}. {q.question}</span>
                </legend>
                <div className={q.type === 'true_false' ? 'grid grid-cols-2 gap-1.5' : 'space-y-1.5'}>
                  {q.options.map((o, oi) => {
                    const chosen = picked[qi] === oi, isRight = oi === q.answer;
                    const tone = checked ? (isRight ? 'border-emerald-400 bg-emerald-50 text-emerald-900' : chosen ? 'border-rose-300 bg-rose-50 text-rose-900' : 'border-slate-200 text-slate-500')
                      : chosen ? 'border-indigo-500 bg-indigo-50 text-indigo-900' : 'border-slate-200 hover:bg-slate-50';
                    return (
                      <button key={oi} type="button" disabled={checked} aria-pressed={chosen} onClick={() => setPicked((p) => ({ ...p, [qi]: oi }))}
                        className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm cursor-pointer disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${tone}`}>
                        <span>{o}</span>
                        {checked && isRight && <CheckCircle2 className="h-4 w-4 shrink-0" aria-label="Right answer" />}
                        {checked && chosen && !isRight && <XCircle className="h-4 w-4 shrink-0" aria-label="Your answer" />}
                      </button>
                    );
                  })}
                </div>
                {checked && q.explanation && <p className="text-xs text-slate-600">{q.explanation}</p>}
              </fieldset>
            ))}
            {checked && questions && (
              <div className="space-y-2 rounded-2xl bg-slate-50 p-4" role="status" data-testid="checkpoint-result">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-2xl font-extrabold tabular-nums text-slate-900">{score}%</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${band.className}`} data-testid="checkpoint-band">{band.label}</span>
                  <span className="text-xs text-slate-500">{right} of {total} right</span>
                </div>
                <p className="text-sm text-slate-700">{advice.text}</p>
                <p className="text-[11px] text-slate-500">Your speed coach in Fast Read uses this score.</p>
              </div>
            )}
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
            {checked
              ? <>
                  <button type="button" onClick={() => { setPicked({}); setChecked(false); }} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 cursor-pointer"><RotateCcw className="h-4 w-4" aria-hidden />Try again</button>
                  <Dialog.Close className="min-h-11 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-500 cursor-pointer">Back to reading</Dialog.Close>
                </>
              : <>
                  <Dialog.Close className="min-h-11 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer">Not now</Dialog.Close>
                  <button type="button" disabled={!questions || Object.keys(picked).length < total} onClick={check} data-testid="checkpoint-check"
                    className="min-h-11 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-50 cursor-pointer">Check my answers</button>
                </>}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** The gentle offer that comes first, so a checkpoint never interrupts reading. */
export function CheckpointOffer({ reason, onStart, onDismiss }: { reason: CheckpointReason; onStart: () => void; onDismiss: () => void }) {
  return (
    <div role="status" data-testid="checkpoint-offer" className="fixed inset-x-3 bottom-20 z-[70] mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-xl sm:bottom-6">
      <Brain className="h-5 w-5 shrink-0 text-amber-300" aria-hidden />
      <p className="min-w-0 flex-1 text-sm"><span className="font-bold">Quick checkpoint?</span> <span className="text-white/75">{REASON_TEXT[reason]} Four questions.</span></p>
      <button type="button" onClick={onDismiss} className="min-h-10 rounded-lg px-2 text-xs font-semibold text-white/75 hover:bg-white/10 cursor-pointer">Not now</button>
      <button type="button" onClick={onStart} data-testid="checkpoint-start" className="min-h-10 rounded-lg bg-amber-400 px-3 text-xs font-bold text-slate-950 hover:bg-amber-300 cursor-pointer">Start</button>
    </div>
  );
}
