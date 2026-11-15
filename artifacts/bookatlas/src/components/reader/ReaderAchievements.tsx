import React, { useEffect, useState } from 'react';
import { BookOpen, Clock, FileText, Flame, Highlighter, Library, Loader2, Lock, Share2, StickyNote, Target, Trophy, Users } from 'lucide-react';
import type { AchievementsView, useEbookApi } from '../ebook/ebookApi';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'book-open': BookOpen, flame: Flame, 'file-text': FileText, library: Library, clock: Clock, trophy: Trophy,
  highlighter: Highlighter, 'sticky-note': StickyNote, share: Share2, users: Users,
};
const GOALS = [10, 15, 20, 30, 45, 60];

/** Reader Phase 3 (cycle 10): the daily reading goal and achievements, worked out from the reader's own reading. */
export function ReaderAchievements({ api }: { api: ReturnType<typeof useEbookApi> }) {
  const [view, setView] = useState<AchievementsView | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const load = () => api.achievements().then(setView).catch((e) => setError(e instanceof Error ? e.message : 'Achievements could not be loaded.'));
  useEffect(() => { void load(); }, []);

  const setGoal = async (minutes: number) => {
    setSaving(true);
    try { await api.saveReaderPreferences({ dailyGoalMinutes: minutes }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'The goal could not be saved.'); }
    finally { setSaving(false); }
  };

  if (error) return <p role="alert" className="rounded-lg bg-rose-50 p-2 text-[11px] text-rose-700">{error}</p>;
  if (!view) return <p className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />Loading achievements…</p>;
  const pct = Math.min(100, Math.round((view.goal.today / Math.max(1, view.goal.minutes)) * 100));

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-3" aria-label="Daily reading goal">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs font-bold text-slate-900"><Target className="h-4 w-4 text-indigo-600" aria-hidden />Today’s goal</p>
          <p className={`text-xs font-bold ${view.goal.met ? 'text-emerald-700' : 'text-slate-700'}`}>{view.goal.today} / {view.goal.minutes} min{view.goal.met ? ' ✓' : ''}</p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress towards today’s goal">
          <div className={`h-full rounded-full ${view.goal.met ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5" role="group" aria-label="Minutes a day">
          <span className="text-[11px] text-slate-500">Minutes a day:</span>
          {GOALS.map((g) => (
            <button key={g} type="button" disabled={saving} onClick={() => void setGoal(g)} aria-pressed={view.goal.minutes === g}
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold cursor-pointer disabled:opacity-60 ${view.goal.minutes === g ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>{g}</button>
          ))}
        </div>
      </section>

      <section aria-label="Achievements">
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-xs font-bold text-slate-900">Achievements</h3>
          <p className="text-[11px] text-slate-500">{view.unlocked} of {view.achievements.length} · <b className="text-slate-800">{view.points}</b> points</p>
        </div>
        <ul className="grid grid-cols-2 gap-2">
          {view.achievements.map((a) => {
            const Icon = ICONS[a.icon] ?? Trophy;
            return (
              <li key={a.id} className={`rounded-xl border p-2.5 ${a.unlocked ? 'border-amber-200 bg-amber-50/70' : 'border-slate-200 bg-white'}`}>
                <div className="flex items-start gap-2">
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${a.unlocked ? 'bg-amber-400 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {a.unlocked ? <Icon className="h-3.5 w-3.5" /> : <Lock className="h-3 w-3" />}
                  </span>
                  <div className="min-w-0">
                    <p className={`text-[11px] font-bold ${a.unlocked ? 'text-slate-900' : 'text-slate-600'}`}>{a.title}</p>
                    <p className="text-[10px] leading-snug text-slate-500">{a.description}</p>
                    {!a.unlocked && a.target > 1 && <p className="mt-1 text-[10px] font-semibold text-slate-600">{a.current.toLocaleString('en-GB')} / {a.target.toLocaleString('en-GB')}</p>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
