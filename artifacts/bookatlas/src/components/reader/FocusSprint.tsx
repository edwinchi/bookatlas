import React, { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Timer, Wind, X } from 'lucide-react';
import { SPRINT_MINUTES, suggestSprint, young } from '../reading/focusGym';
import { useFocusProgress } from '../reading/FocusGymPanel';

export interface Sprint { minutes: number; startedAt: number; away: number; zen: boolean }

/**
 * Focus sprints in the reader (owner request 2026-11-26: train readers to keep their attention). Pick 5 to 25
 * minutes; zen hides everything but the text; leaving the page is counted, gently. Finished sprints count for the
 * focus streak, and the next suggested length grows after clean sprints.
 */
export function useFocusSprint(onZen: (on: boolean) => void) {
  const { p, save, reader } = useFocusProgress();
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [now, setNow] = useState(Date.now());
  const [note, setNote] = useState('');
  const away = useRef(0);
  useEffect(() => {
    if (!sprint) return;
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    const vis = () => { if (document.visibilityState === 'hidden') away.current += 1; };
    document.addEventListener('visibilitychange', vis);
    return () => { window.clearInterval(tick); document.removeEventListener('visibilitychange', vis); };
  }, [sprint]);
  const end = (finished: boolean) => {
    if (!sprint) return;
    const record = { at: new Date().toISOString(), minutes: sprint.minutes, away: away.current, finished };
    const next = { ...p, sprints: [...p.sprints, record].slice(-200) };
    save(next);
    if (sprint.zen) onZen(false);
    const suggestion = suggestSprint(next, reader.kind);
    setNote(finished
      ? `Focus sprint done: ${sprint.minutes} minutes${record.away ? `, you left the page ${record.away} time${record.away === 1 ? '' : 's'}` : ' without leaving the page'}. ${suggestion > sprint.minutes ? `Next time, try ${suggestion} minutes.` : 'Well done.'}`
      : `Sprint stopped after ${((m) => `${m} minute${m === 1 ? '' : 's'}`)(Math.max(1, Math.round((Date.now() - sprint.startedAt) / 60_000)))}. Shorter sprints build up just as well: try ${suggestion} minutes next time.`);
    setSprint(null);
  };
  const left = sprint ? Math.max(0, sprint.minutes * 60 - Math.floor((now - sprint.startedAt) / 1000)) : 0;
  useEffect(() => { if (sprint && left === 0) end(true); }, [left]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!note) return; const t = window.setTimeout(() => setNote(''), 9000); return () => window.clearTimeout(t); }, [note]);
  const start = (minutes: number, zen: boolean) => { away.current = 0; setNow(Date.now()); setSprint({ minutes, startedAt: Date.now(), away: 0, zen }); if (zen) onZen(true); };
  return { sprint, left, start, end, note, setNote, suggested: suggestSprint(p, reader.kind), kid: young(reader.kind) };
}

export function FocusSprintPicker({ open, onOpenChange, suggested, kid, onStart, container }: { open: boolean; onOpenChange: (o: boolean) => void; suggested: number; kid: boolean; onStart: (minutes: number, zen: boolean) => void; container?: HTMLElement | null }) {
  const [zen, setZen] = useState(true);
  const options = kid ? [5, 10, 15] : [...SPRINT_MINUTES];
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal container={container ?? undefined}>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-slate-950/40" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-[91] mx-auto w-full max-w-sm rounded-t-3xl bg-white p-5 text-slate-900 shadow-2xl outline-none sm:inset-y-0 sm:my-auto sm:h-fit sm:rounded-3xl" data-testid="sprint-picker">
          <div className="flex items-start justify-between gap-3">
            <Dialog.Title className="flex items-center gap-2 text-lg font-extrabold"><Timer className="h-5 w-5 text-indigo-600" aria-hidden />Focus sprint</Dialog.Title>
            <Dialog.Close className="grid h-10 w-10 place-items-center rounded-full text-slate-500 hover:bg-slate-100 cursor-pointer" aria-label="Close"><X className="h-5 w-5" /></Dialog.Close>
          </div>
          <Dialog.Description className="mt-1 text-sm text-slate-600">Read for a set time with nothing else on screen. Attention grows when you practise it, a little longer each time.</Dialog.Description>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {options.map((m) => (
              <button key={m} type="button" onClick={() => { onStart(m, zen); onOpenChange(false); }} data-testid={`sprint-${m}`}
                className={`flex min-h-16 flex-col items-center justify-center rounded-2xl text-sm font-bold ring-1 cursor-pointer ${m === suggested ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-white text-slate-800 ring-slate-200 hover:bg-slate-50'}`}>
                <span className="text-xl tabular-nums">{m}</span><span className="text-[10px] font-semibold opacity-80">{m === suggested ? 'suggested' : 'min'}</span>
              </button>
            ))}
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={zen} onChange={(e) => setZen(e.target.checked)} className="h-4 w-4 accent-indigo-600" />Zen: only the text while the sprint runs</label>
          <a href={`${import.meta.env.BASE_URL}reading-intelligence#focus`} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:underline"><Wind className="h-3.5 w-3.5" aria-hidden />Breathe for a minute first (Focus gym)</a>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** The sprint's small countdown ring: tap it to stop early. */
export function FocusSprintRing({ sprint, left, onStop }: { sprint: Sprint; left: number; onStop: () => void }) {
  const total = sprint.minutes * 60;
  const done = 1 - left / total;
  const r = 18, c = 2 * Math.PI * r;
  return (
    <button type="button" onClick={onStop} data-testid="sprint-ring" aria-label={`Focus sprint: ${Math.ceil(left / 60)} minutes left. Tap to stop.`} title="Focus sprint: tap to stop"
      className="fixed bottom-20 right-4 z-[60] grid h-14 w-14 place-items-center rounded-full bg-white/90 shadow-lg ring-1 ring-slate-200 backdrop-blur cursor-pointer sm:bottom-6">
      <svg viewBox="0 0 44 44" className="absolute inset-0 h-14 w-14 -rotate-90" aria-hidden>
        <circle cx="22" cy="22" r={r} fill="none" stroke="#e2e8f0" strokeWidth="4" />
        <circle cx="22" cy="22" r={r} fill="none" stroke="#4f46e5" strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - done)} />
      </svg>
      <span className="relative text-[11px] font-extrabold tabular-nums text-slate-900">{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</span>
    </button>
  );
}
