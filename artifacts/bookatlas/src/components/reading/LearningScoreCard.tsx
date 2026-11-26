import React, { useEffect, useState } from 'react';
import { GraduationCap, Lightbulb } from 'lucide-react';
import type { ReadingStats, useEbookApi } from '../ebook/ebookApi';
import { metricsFrom, readQuizPercents, readSessions } from '../reader/adaptiveCoach';
import { consistencyScore, dailyActivity } from './heatmap';
import { PART_TEXT, focusScore, learningScore, scoreBand, type PartId } from './learningScore';

/**
 * "Your learning score" on My progress (specification AN-002/AN-003): one number for how well reading turns into
 * learning, its four parts as bars, and a tip for the weakest one.
 */
export function LearningScoreCard({ api, stats }: { api: ReturnType<typeof useEbookApi>; stats: ReadingStats }) {
  const [checkpoint, setCheckpoint] = useState<number | null | undefined>(undefined);
  const [retention, setRetention] = useState<number | null | undefined>(undefined);
  useEffect(() => {
    api.checkpoints().then((c) => setCheckpoint(c.averageScore)).catch(() => setCheckpoint(null));
    api.flashcardDeck().then((d) => setRetention(d.retention)).catch(() => setRetention(null));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (checkpoint === undefined || retention === undefined) return null;
  const quizzes = readQuizPercents().slice(-5);
  const comprehension = checkpoint ?? (quizzes.length ? Math.round(quizzes.reduce((a, b) => a + b, 0) / quizzes.length) : null);
  const now = new Date();
  const activity = stats.activity ?? [];
  const consistency = activity.length ? consistencyScore(dailyActivity(activity, now.getTimezoneOffset(), now)) : null;
  const focus = focusScore(metricsFrom(readSessions(), []));
  const r = learningScore({ comprehension, retention, consistency, focus });
  return (
    <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-5" aria-labelledby="learning-score-title" data-testid="learning-score">
      <h3 id="learning-score-title" className="flex items-center gap-2 text-sm font-bold text-slate-900"><GraduationCap className="h-4 w-4 text-indigo-600" aria-hidden />Your learning score</h3>
      {r.score === null ? (
        <p className="mt-2 text-sm text-slate-600">Read a little, take a chapter checkpoint or review a few flashcards, and your learning score appears here: how well your reading turns into what you understand and remember.</p>
      ) : (
        <div className="mt-3 grid gap-5 sm:grid-cols-[auto_1fr] sm:items-start">
          <div className="text-center sm:pr-4">
            <p className="text-5xl font-extrabold tabular-nums text-slate-900" data-testid="learning-score-value">{r.score}</p>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">{scoreBand(r.score)}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">out of 100 · {r.measured} of 4 parts measured</p>
          </div>
          <div className="space-y-3">
            <ul className="space-y-2">
              {r.parts.map((p) => (
                <li key={p.id} className="text-xs">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-bold text-slate-800">{PART_TEXT[p.id].name}</span>
                    <span className="tabular-nums font-bold text-slate-900">{p.value === null ? '–' : p.value}</span>
                  </div>
                  <span className="mt-1 block h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden><span className="block h-full rounded-full bg-indigo-600" style={{ width: `${p.value ?? 0}%` }} /></span>
                  <span className="mt-0.5 block text-[11px] text-slate-500">{p.value === null ? 'Not measured yet. ' : ''}{PART_TEXT[p.id].how}</span>
                </li>
              ))}
            </ul>
            {r.weakest && <Tip id={r.weakest} />}
          </div>
        </div>
      )}
    </section>
  );
}

function Tip({ id }: { id: PartId }) {
  return (
    <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-950" data-testid="learning-tip">
      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
      <span><b>To raise it:</b> {PART_TEXT[id].tip}</span>
    </p>
  );
}
