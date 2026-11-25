import React, { useEffect, useState } from 'react';
import * as Switch from '@radix-ui/react-switch';
import { Bell, CalendarCheck, Mail } from 'lucide-react';
import { useEbookApi, type ReadingEmails, type ReadingStats } from '../ebook/ebookApi';

const DEFAULT_GOAL = 15;

/** The last seven days against the daily goal: a full dot when the goal was met, a ring when there was some reading. */
function WeekStrip({ days, goal }: { days: { day: string; minutes: number }[]; goal: number }) {
  const week = days.slice(-7);
  const met = week.filter((d) => d.minutes >= goal).length;
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-bold text-slate-900"><CalendarCheck className="h-4 w-4 text-indigo-600" aria-hidden />This week: goal met on {met} of 7 days</p>
      <ol className="mt-2 grid grid-cols-7 gap-1.5" aria-label={`Goal of ${goal} minutes met on ${met} of the last 7 days`}>
        {week.map((d) => {
          const [y, m, dd] = d.day.split('-').map(Number);
          const name = new Date(Date.UTC(y!, m! - 1, dd!)).toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' });
          const state = d.minutes >= goal ? 'bg-emerald-500 text-white ring-emerald-500' : d.minutes > 0 ? 'bg-white text-indigo-700 ring-indigo-400' : 'bg-slate-50 text-slate-400 ring-slate-200';
          return (
            <li key={d.day} className="flex flex-col items-center gap-1" title={`${name}: ${d.minutes} min`}>
              <span className={`grid h-9 w-9 place-items-center rounded-full text-[11px] font-bold tabular-nums ring-2 ${state}`}>{d.minutes}</span>
              <span className="text-[10px] font-semibold text-slate-500">{name}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function EmailSwitch({ checked, onChange, disabled, icon: Icon, title, note, testId }: { checked: boolean; onChange: (v: boolean) => void; disabled: boolean; icon: typeof Mail; title: string; note: string; testId: string }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200 cursor-pointer">
      <span className="flex items-start gap-2"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" aria-hidden /><span><span className="block text-sm font-semibold text-slate-900">{title}</span><span className="block text-xs text-slate-500">{note}</span></span></span>
      <Switch.Root checked={checked} onCheckedChange={onChange} disabled={disabled} aria-label={title} data-testid={testId}
        className="relative h-6 w-11 shrink-0 rounded-full bg-slate-300 transition-colors data-[state=checked]:bg-indigo-600 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer">
        <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[22px]" />
      </Switch.Root>
    </label>
  );
}

/** Reading goals and reminders (Reading Intelligence phase 5): the week against the goal, and opt-in e-mails. */
export function GoalsPanel({ stats }: { stats: ReadingStats }) {
  const api = useEbookApi();
  const [goal, setGoal] = useState(DEFAULT_GOAL);
  const [emails, setEmails] = useState<ReadingEmails | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api.readerPreferences().then((p) => { const g = Number(p.settings?.dailyGoalMinutes); if (g >= 5) setGoal(g); }).catch(() => undefined);
    api.readingEmails().then(setEmails).catch(() => undefined);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const change = async (body: { weekly?: boolean; streak?: boolean }) => {
    setError('');
    const before = emails;
    if (emails) setEmails({ ...emails, ...body });
    try { setEmails(await api.setReadingEmails(body)); } catch (e) { setEmails(before); setError(e instanceof Error ? e.message : 'That did not save. Please retry.'); }
  };
  return (
    <div className="grid gap-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200 lg:grid-cols-2" data-testid="goals-panel">
      <WeekStrip days={stats.last30} goal={goal} />
      <div className="space-y-2">
        <p className="text-xs font-bold text-slate-900">Reminders by e-mail</p>
        <EmailSwitch checked={!!emails?.weekly} onChange={(v) => void change({ weekly: v })} disabled={!emails} icon={Mail} testId="email-weekly"
          title="Weekly summary" note="Every Sunday: your minutes, goal days, streak and your family’s week." />
        <EmailSwitch checked={!!emails?.streak} onChange={(v) => void change({ streak: v })} disabled={!emails} icon={Bell} testId="email-streak"
          title="Streak reminder" note="An evening e-mail when your streak would end because you have not read yet that day." />
        {emails?.email && (emails.weekly || emails.streak) && <p className="text-[11px] text-slate-500">Sent to {emails.email}. Every e-mail has a link to stop them.</p>}
        {emails && !emails.available && (emails.weekly || emails.streak) && <p className="text-[11px] text-amber-800">E-mail sending is being set up; your choice is saved and they start then.</p>}
        {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
      </div>
    </div>
  );
}
