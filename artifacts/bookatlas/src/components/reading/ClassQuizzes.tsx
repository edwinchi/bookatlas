import React, { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import * as Checkbox from '@radix-ui/react-checkbox';
import * as RadioGroup from '@radix-ui/react-radio-group';
import { Check, CheckCircle2, ClipboardCheck, Loader2, Plus, Sparkles, Trash2, X, XCircle } from 'lucide-react';
import { SelectBox } from '../ui/select-box';
import { useEbookApi, type ClassDetail, type ClassQuiz, type ClassQuizQuestion, type ClassQuizScore } from '../ebook/ebookApi';
import { DUE_STYLES, dueLabel, dueState, today } from './classDates';

const btn = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-60 cursor-pointer';
const field = 'mt-1.5 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base font-normal focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30';
const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);
const panel = 'fixed inset-x-0 bottom-0 z-[60] max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl outline-none sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[88dvh] sm:w-[min(40rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl';

/** A due date, coloured by how close it is. */
export function DueBadge({ date, finished }: { date: string; finished: boolean }) {
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${DUE_STYLES[dueState(date, finished)]}`}>{dueLabel(date, finished)}</span>;
}

/** The teacher picks a book and a chapter, the AI writes questions, the teacher keeps the good ones and sets a date. */
function QuizMaker({ classId, books, open, onOpenChange, onDone }: { classId: string; books: { id: string; title: string }[]; open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const api = useEbookApi();
  const [bookId, setBookId] = useState(books[0]?.id ?? '');
  const [chapters, setChapters] = useState<string[] | null>(null);
  const [chapter, setChapter] = useState('0');
  const [questions, setQuestions] = useState<(Required<ClassQuizQuestion> & { keep: boolean })[]>([]);
  const [due, setDue] = useState('');
  const [busy, setBusy] = useState<'' | 'chapters' | 'make' | 'publish'>('');
  const [error, setError] = useState('');
  useEffect(() => { if (open && !books.some((b) => b.id === bookId)) setBookId(books[0]?.id ?? ''); }, [open, books, bookId]);
  useEffect(() => {
    if (!open || !bookId) return;
    let live = true;
    setChapters(null); setChapter('0'); setQuestions([]); setBusy('chapters'); setError('');
    api.readerContent(bookId).then((r) => { if (live) setChapters(r.chapters.map((c, i) => c.title || `Chapter ${i + 1}`)); })
      .catch((e) => { if (live) setError(errText(e, 'The chapters could not be loaded.')); })
      .finally(() => { if (live) setBusy(''); });
    return () => { live = false; };
  }, [open, bookId]); // eslint-disable-line react-hooks/exhaustive-deps
  const make = async () => {
    setBusy('make'); setError('');
    try {
      const r = await api.studyChapter({ bookId, chapterIndex: Number(chapter), kind: 'quiz' });
      setQuestions((r.questions ?? []).map((q) => ({ ...q, explanation: q.explanation ?? '', keep: true })));
      if (!r.questions?.length) setError('No questions came back. Try again or choose another chapter.');
    } catch (e) { setError(errText(e, 'The questions could not be made.')); }
    finally { setBusy(''); }
  };
  const kept = questions.filter((q) => q.keep);
  const publish = async () => {
    setBusy('publish'); setError('');
    try {
      await api.publishClassQuiz(classId, { bookId, chapterIndex: Number(chapter), chapterTitle: chapters?.[Number(chapter)] ?? '', questions: kept.map(({ keep: _k, ...q }) => q), due: due || null });
      setQuestions([]); setDue(''); onOpenChange(false); onDone();
    } catch (e) { setError(errText(e, 'The quiz could not be set.')); }
    finally { setBusy(''); }
  };
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-slate-950/40" />
        <Dialog.Content className={panel} data-testid="quiz-maker">
          <div className="flex items-center justify-between"><Dialog.Title className="text-lg font-bold text-slate-900">Set a quiz</Dialog.Title><Dialog.Close aria-label="Close" className="grid h-10 w-10 place-items-center rounded-full text-slate-500 hover:bg-slate-100 cursor-pointer"><X className="h-5 w-5" /></Dialog.Close></div>
          <Dialog.Description className="mt-1 text-sm text-slate-500">The AI reading assistant writes questions from the chapter. Keep the ones you want, then set a date. Each member answers once.</Dialog.Description>
          {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold text-slate-800">Book
              <SelectBox value={bookId} onChange={(e) => setBookId(e.target.value)} className={field} aria-label="Book">{books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}</SelectBox>
            </label>
            <label className="block text-sm font-bold text-slate-800">Chapter
              {chapters ? (
                <SelectBox value={chapter} onChange={(e) => { setChapter(e.target.value); setQuestions([]); }} className={field} aria-label="Chapter">{chapters.map((t, i) => <option key={i} value={String(i)}>{`${i + 1}. ${t}`}</option>)}</SelectBox>
              ) : <span className={`${field} flex items-center gap-2 text-slate-500`}><Loader2 className="h-4 w-4 animate-spin" aria-hidden />Loading chapters…</span>}
            </label>
          </div>
          <button type="button" onClick={() => void make()} disabled={!chapters?.length || !!busy} className={`${btn} mt-4 w-full bg-indigo-600 text-white hover:bg-indigo-500`} data-testid="make-questions">
            {busy === 'make' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}{questions.length ? 'Make new questions' : 'Make questions'}
          </button>
          {questions.length > 0 && (
            <>
              <ol className="mt-5 space-y-3">
                {questions.map((q, i) => (
                  <li key={i} className={`rounded-2xl p-4 ring-1 ${q.keep ? 'bg-white ring-slate-200' : 'bg-slate-50 ring-slate-100 opacity-60'}`}>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <Checkbox.Root checked={q.keep} onCheckedChange={(v) => setQuestions((all) => all.map((x, j) => (j === i ? { ...x, keep: v === true } : x)))} aria-label={`Keep question ${i + 1}`}
                        className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border border-slate-300 bg-white data-[state=checked]:border-indigo-600 data-[state=checked]:bg-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                        <Checkbox.Indicator><Check className="h-3.5 w-3.5 text-white" /></Checkbox.Indicator>
                      </Checkbox.Root>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-900">{i + 1}. {q.question}</span>
                        <span className="mt-1 block space-y-0.5">{q.options.map((o, k) => <span key={k} className={`block text-xs ${k === q.answer ? 'font-bold text-emerald-700' : 'text-slate-600'}`}>{k === q.answer ? '✓ ' : '· '}{o}</span>)}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ol>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="block flex-1 text-sm font-bold text-slate-800">Due date <span className="font-normal text-slate-500">(optional)</span>
                  <input type="date" value={due} min={today()} onChange={(e) => setDue(e.target.value)} className={field} data-testid="quiz-due" />
                </label>
                <button type="button" onClick={() => void publish()} disabled={!kept.length || !!busy} className={`${btn} bg-slate-900 text-white hover:bg-slate-800`} data-testid="publish-quiz">
                  {busy === 'publish' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ClipboardCheck className="h-4 w-4" aria-hidden />}Set the quiz ({kept.length} question{kept.length === 1 ? '' : 's'})
                </button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** One question with the right answer and the reader's own answer shown. */
function Result({ q, i, given }: { q: ClassQuizQuestion; i: number; given: number }) {
  const right = given === q.answer;
  return (
    <li className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <p className="flex items-start gap-2 text-sm font-semibold text-slate-900">{right ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-label="Right" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-label="Not right" />}{i + 1}. {q.question}</p>
      <ul className="mt-2 space-y-1 pl-6">
        {q.options.map((o, k) => (
          <li key={k} className={`rounded-lg px-2 py-1 text-sm ${k === q.answer ? 'bg-emerald-50 font-bold text-emerald-800' : k === given ? 'bg-rose-50 text-rose-800 line-through' : 'text-slate-600'}`}>{o}</li>
        ))}
      </ul>
      {q.explanation && <p className="mt-2 pl-6 text-xs text-slate-500">{q.explanation}</p>}
    </li>
  );
}

/** A member answers each question, then sees the score and the right answers. The teacher can try it too. */
function QuizTaker({ classId, quiz, teacher, onClose, onDone }: { classId: string; quiz: ClassQuiz; teacher: boolean; onClose: () => void; onDone: () => void }) {
  const api = useEbookApi();
  const [answers, setAnswers] = useState<(number | null)[]>(() => quiz.questions.map(() => null));
  const [result, setResult] = useState<{ score: ClassQuizScore; quiz: ClassQuiz } | null>(quiz.score ? { score: quiz.score, quiz } : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    setBusy(true); setError('');
    try { const r = await api.answerClassQuiz(classId, quiz.id, answers.map((a) => a ?? -1)); setResult(r); onDone(); }
    catch (e) { setError(errText(e, 'Your answers could not be sent. Please retry.')); }
    finally { setBusy(false); }
  };
  const done = answers.every((a) => a !== null);
  return (
    <Dialog.Root open onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-slate-950/40" />
        <Dialog.Content className={`${panel} bg-slate-50`} data-testid="quiz-taker">
          <div className="flex items-center justify-between gap-3"><Dialog.Title className="text-lg font-bold text-slate-900">{quiz.chapterTitle}</Dialog.Title><Dialog.Close aria-label="Close" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-200 cursor-pointer"><X className="h-5 w-5" /></Dialog.Close></div>
          <Dialog.Description className="mt-1 text-sm text-slate-500">{result ? 'Your answers, with the right ones marked.' : teacher ? 'Try your own quiz. Your answers are not kept.' : 'Choose one answer for each question. You can answer once.'}</Dialog.Description>
          {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
          {result ? (
            <>
              <p className="mt-5 rounded-2xl bg-indigo-600 p-4 text-center text-white" data-testid="quiz-score"><span className="block text-3xl font-extrabold tabular-nums">{result.score.right} / {result.score.total}</span><span className="text-sm text-indigo-100">{result.score.right === result.score.total ? 'Every answer right!' : 'Read the chapter again for the ones you missed.'}</span></p>
              <ol className="mt-4 space-y-3">{result.quiz.questions.map((q, i) => <Result key={i} q={q} i={i} given={result.score.answers[i] ?? -1} />)}</ol>
            </>
          ) : (
            <>
              <ol className="mt-5 space-y-3">
                {quiz.questions.map((q, i) => (
                  <li key={i} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                    <p id={`q-${quiz.id}-${i}`} className="text-sm font-semibold text-slate-900">{i + 1}. {q.question}</p>
                    <RadioGroup.Root value={answers[i] === null ? '' : String(answers[i])} onValueChange={(v) => setAnswers((a) => a.map((x, j) => (j === i ? Number(v) : x)))} aria-labelledby={`q-${quiz.id}-${i}`} className="mt-2 space-y-1.5">
                      {q.options.map((o, k) => (
                        <RadioGroup.Item key={k} value={String(k)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 ring-1 ring-slate-200 hover:bg-indigo-50 data-[state=checked]:bg-indigo-50 data-[state=checked]:font-semibold data-[state=checked]:text-indigo-900 data-[state=checked]:ring-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer">
                          <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full border border-slate-400 bg-white"><RadioGroup.Indicator className="h-2 w-2 rounded-full bg-indigo-600" /></span>{o}
                        </RadioGroup.Item>
                      ))}
                    </RadioGroup.Root>
                  </li>
                ))}
              </ol>
              <button type="button" onClick={() => void submit()} disabled={!done || busy} className={`${btn} mt-5 w-full bg-indigo-600 text-white hover:bg-indigo-500`} data-testid="submit-quiz">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}{done ? 'Send my answers' : `Answer every question (${answers.filter((a) => a !== null).length}/${quiz.questions.length})`}
              </button>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Class quizzes (Reading Intelligence phase 4): set by the teacher from a chapter, answered once by each member. */
export function ClassQuizzes({ d, onChanged }: { d: ClassDetail; onChanged: () => void }) {
  const api = useEbookApi();
  const teacher = d.role === 'teacher';
  const [making, setMaking] = useState(false);
  const [taking, setTaking] = useState<ClassQuiz | null>(null);
  const [removing, setRemoving] = useState<ClassQuiz | null>(null);
  const [error, setError] = useState('');
  const title = (bookId: string) => d.books.find((b) => b.id === bookId)?.title ?? '';
  const remove = async () => {
    const q = removing; setRemoving(null);
    if (!q) return;
    try { await api.removeClassQuiz(d.id, q.id); onChanged(); } catch (e) { setError(errText(e, 'The quiz could not be removed.')); }
  };
  if (!teacher && !d.quizzes.length) return null;
  return (
    <section aria-labelledby="class-quizzes" className="space-y-2" data-testid="class-quizzes">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 id="class-quizzes" className="text-sm font-bold text-slate-900">Quizzes</h4>
        {teacher && <button type="button" onClick={() => setMaking(true)} disabled={!d.books.some((b) => !b.id.startsWith('ya.'))} className={`${btn} bg-slate-900 text-white hover:bg-slate-800`} data-testid="new-quiz"><Plus className="h-4 w-4" aria-hidden />Set a quiz</button>}
      </div>
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {!d.quizzes.length ? <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{d.books.length ? 'Set a quiz on a chapter of a book on the list. The AI writes the questions; you choose which to keep.' : 'Add a book to the reading list first.'}</p> : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {d.quizzes.map((q) => {
            const scores = d.rows.map((r) => r.quizzes[q.id]).filter((v): v is number => typeof v === 'number');
            const answered = !!q.score;
            return (
              <li key={q.id} className="flex flex-col gap-2 rounded-xl bg-white p-3 ring-1 ring-slate-200">
                <div className="flex items-start gap-2">
                  <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{q.chapterTitle}</p>
                    <p className="truncate text-xs text-slate-500">{title(q.bookId)} · {q.questions.length} question{q.questions.length === 1 ? '' : 's'}</p>
                  </div>
                  {q.due && <DueBadge date={q.due} finished={teacher ? false : answered} />}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {teacher ? (
                    <>
                      <span className="text-xs text-slate-600">{scores.length} of {d.rows.length} answered{scores.length ? ` · average ${Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)}%` : ''}</span>
                      <button type="button" onClick={() => setTaking(q)} className="ml-auto rounded-lg px-2 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50 cursor-pointer">Try it</button>
                      <button type="button" onClick={() => setRemoving(q)} aria-label={`Remove the quiz on ${q.chapterTitle}`} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"><Trash2 className="h-4 w-4" /></button>
                    </>
                  ) : (
                    <>
                      {answered && <span className="text-xs font-bold text-slate-700">{q.score!.right} / {q.score!.total} right</span>}
                      <button type="button" onClick={() => setTaking(q)} className={`${btn} ml-auto min-h-9 px-3 ${answered ? 'text-indigo-700 hover:bg-indigo-50' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`} data-testid="take-quiz">{answered ? 'See your answers' : 'Take the quiz'}</button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {teacher && <QuizMaker classId={d.id} books={d.books.filter((b) => !b.id.startsWith('ya.'))} open={making} onOpenChange={setMaking} onDone={onChanged} />}
      {taking && <QuizTaker classId={d.id} quiz={taking} teacher={teacher} onClose={() => setTaking(null)} onDone={onChanged} />}
      <AlertDialog.Root open={!!removing} onOpenChange={(o) => { if (!o) setRemoving(null); }}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-[60] bg-slate-950/40" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[60] w-[min(26rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-6 shadow-2xl">
            <AlertDialog.Title className="text-lg font-bold text-slate-900">Remove this quiz?</AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm text-slate-600">The quiz and everyone’s scores on it are deleted.</AlertDialog.Description>
            <div className="mt-5 flex justify-end gap-2">
              <AlertDialog.Cancel className={`${btn} text-slate-700 hover:bg-slate-100`}>Cancel</AlertDialog.Cancel>
              <AlertDialog.Action onClick={() => void remove()} className={`${btn} bg-rose-600 text-white hover:bg-rose-500`}>Remove</AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </section>
  );
}
