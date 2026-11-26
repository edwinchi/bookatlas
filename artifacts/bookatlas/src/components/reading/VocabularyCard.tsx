import React, { useEffect, useState } from 'react';
import { BookA, Layers, X } from 'lucide-react';
import type { VocabularySummary, useEbookApi } from '../ebook/ebookApi';

/**
 * "My words" on My progress (specification "Track learning: vocabulary growth"): the words looked up with Define,
 * how many this week and over eight weeks, and one tap to practise them as flashcards.
 */
export function VocabularyCard({ api }: { api: ReturnType<typeof useEbookApi> }) {
  const [v, setV] = useState<VocabularySummary | null>(null);
  const [note, setNote] = useState('');
  useEffect(() => { api.vocabulary().then(setV).catch(() => setV(null)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!v) return null;
  const max = Math.max(1, ...v.weeks.map((w) => w.words));
  const practise = async () => {
    setNote('');
    const byBook = new Map<string, { question: string; answer: string }[]>();
    for (const w of v.recent) {
      const list = byBook.get(w.bookId) ?? [];
      list.push({ question: `What does “${w.word}” mean?`, answer: w.definition });
      byBook.set(w.bookId, list);
    }
    let added = 0;
    try {
      for (const [bookId, cards] of byBook) added += (await api.saveFlashcards({ bookId, cards })).added;
      setNote(added ? `${added} word${added === 1 ? '' : 's'} added to your flashcards. Review them under Flashcard review.` : 'These words are already in your flashcards.');
    } catch (e) { setNote(e instanceof Error ? e.message : 'The words could not be added.'); }
  };
  const forget = async (word: string) => { try { setV(await api.forgetWord(word)); } catch { /* keep the list */ } };
  return (
    <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-5" aria-labelledby="vocab-title" data-testid="vocabulary-card">
      <h3 id="vocab-title" className="flex items-center gap-2 text-sm font-bold text-slate-900"><BookA className="h-4 w-4 text-indigo-600" aria-hidden />My words</h3>
      {!v.total ? (
        <p className="mt-2 text-sm text-slate-600">Tap a word while reading and choose Define: its meaning is saved here, so you can see your vocabulary grow and practise the words later.</p>
      ) : (
        <>
          <div className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-2">
            <p><span className="text-3xl font-extrabold tabular-nums text-slate-900" data-testid="vocab-total">{v.total}</span> <span className="text-sm text-slate-600">word{v.total === 1 ? '' : 's'} looked up</span></p>
            <p className="text-sm text-slate-600"><b className="tabular-nums text-slate-900">+{v.thisWeek}</b> this week</p>
            <div className="ml-auto flex h-10 items-end gap-1" aria-label="New words in each of the last eight weeks" role="img">
              {v.weeks.map((w) => <span key={w.week} title={`Week of ${w.week}: ${w.words}`} className={`w-3 rounded-t-[3px] ${w.words ? 'bg-indigo-600' : 'bg-slate-200'}`} style={{ height: `${w.words ? Math.max(12, (w.words / max) * 100) : 8}%` }} />)}
            </div>
          </div>
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Latest words">
            {v.recent.slice(0, 12).map((w) => (
              <li key={w.word} className="group inline-flex items-center gap-1 rounded-full bg-indigo-50 py-1 pl-3 pr-1 text-xs text-indigo-950 ring-1 ring-indigo-100" title={w.definition}>
                <span className="font-semibold">{w.word}</span>
                <button type="button" onClick={() => void forget(w.word)} aria-label={`Forget ${w.word}`} className="grid h-6 w-6 place-items-center rounded-full text-indigo-400 hover:bg-indigo-100 hover:text-indigo-700 cursor-pointer"><X className="h-3 w-3" /></button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => void practise()} data-testid="vocab-practise" className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-indigo-600 px-3 text-xs font-bold text-white hover:bg-indigo-500 cursor-pointer"><Layers className="h-4 w-4" aria-hidden />Practise as flashcards</button>
            {note && <p className="text-xs text-slate-600" role="status">{note}</p>}
          </div>
        </>
      )}
    </section>
  );
}
