import React, { useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import * as Tooltip from '@radix-ui/react-tooltip';
import { X } from 'lucide-react';
import {
  WEEKDAYS, WEEKDAY_NAMES, aggregateHeatmapData, buildTooltip, dailyActivity, hourLabel, intensity, type Activity,
} from './heatmap';

/** One hue, light to dark (the sequential rule): none, then four steps of indigo. */
const SHADES = ['bg-slate-100', 'bg-indigo-200', 'bg-indigo-400', 'bg-indigo-600', 'bg-indigo-800'] as const;

interface Detail { title: string; minutes: number; words: number; sessions?: number }

/** A cell: a button (keyboard focus, Enter opens the details), with its value in a tooltip on hover or focus. */
function Cell({ label, minutes, words, shade, onOpen, className = '' }: { label: string; minutes: number; words: number; shade: number; onOpen: () => void; className?: string }) {
  const text = `${label}: ${buildTooltip({ minutesRead: minutes, wordsRead: words })}`;
  return (
    <Tooltip.Root delayDuration={0}>
      <Tooltip.Trigger asChild>
        <button type="button" onClick={onOpen} aria-label={text} data-testid="heatmap-cell" data-minutes={minutes}
          className={`block rounded-[3px] ${SHADES[shade]} ring-inset hover:ring-2 hover:ring-slate-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 cursor-pointer ${className}`} />
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side="top" sideOffset={4} className="z-50 rounded-md bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white shadow" data-testid="heatmap-tooltip">{text}</Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-1 text-[10px] text-slate-500" aria-hidden>
      <span className="mr-0.5">Less</span>
      {SHADES.map((s) => <span key={s} className={`h-2.5 w-2.5 rounded-[2px] ${s}`} />)}
      <span className="ml-0.5">More</span>
    </div>
  );
}

/**
 * The reading heatmap (master build plan M5, specification AN-002): minutes read by day of the week and hour on
 * the reader's own clock, or day by day over the last 12 weeks. Every cell can be hovered, reached with Tab and
 * opened with Enter; a table carries the same numbers for screen readers.
 */
export function ReadingHeatmap({ activity, now = new Date() }: { activity: Activity[]; now?: Date }) {
  const [view, setView] = useState<'hours' | 'weeks'>('hours');
  const [detail, setDetail] = useState<Detail | null>(null);
  const offset = now.getTimezoneOffset();
  const cells = useMemo(() => aggregateHeatmapData(activity, offset), [activity, offset]);
  const days = useMemo(() => dailyActivity(activity, offset, now), [activity, offset]); // eslint-disable-line react-hooks/exhaustive-deps
  const maxCell = Math.max(0, ...cells.map((c) => c.readingMinutes));
  const maxDay = Math.max(0, ...days.map((d) => d.minutes));
  const fmtDay = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  const weeks = Array.from({ length: Math.ceil(days.length / 7) }, (_, w) => days.slice(w * 7, w * 7 + 7));
  return (
    <figure className="rounded-2xl bg-white p-4 ring-1 ring-slate-200" data-testid="reading-heatmap">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <figcaption className="text-sm font-bold text-slate-900">Reading heatmap</figcaption>
        <ToggleGroup.Root type="single" value={view} onValueChange={(v) => v && setView(v as 'hours' | 'weeks')} aria-label="Heatmap view" className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {([['hours', 'Day and hour'], ['weeks', 'Last 12 weeks']] as const).map(([v, l]) => (
            <ToggleGroup.Item key={v} value={v} data-testid={`heatmap-view-${v}`} className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-600 data-[state=on]:bg-white data-[state=on]:text-slate-900 data-[state=on]:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer">{l}</ToggleGroup.Item>
          ))}
        </ToggleGroup.Root>
      </div>
      <Tooltip.Provider>
        {view === 'hours' ? (
          <div className="mt-3">
            <p className="text-[11px] text-slate-500">Minutes read in each hour of each day of the week, over the last 12 weeks, on your clock.</p>
            <div className="mt-2 grid grid-cols-[2.5rem_repeat(7,minmax(0,1fr))] gap-[2px]" role="group" aria-label="Minutes read by day of the week and hour">
              <span />
              {WEEKDAYS.map((d) => <span key={d} className="text-center text-[10px] font-semibold text-slate-500" aria-hidden>{d}</span>)}
              {Array.from({ length: 24 }, (_, h) => (
                <React.Fragment key={h}>
                  <span className="pr-1 text-right text-[9px] leading-[14px] text-slate-400" aria-hidden>{h % 3 === 0 ? hourLabel(h) : ''}</span>
                  {WEEKDAYS.map((_, d) => {
                    const c = cells[d * 24 + h]!;
                    return <Cell key={d} className="h-3.5" label={`${WEEKDAY_NAMES[d]} ${hourLabel(h)}`} minutes={c.readingMinutes} words={c.wordsRead} shade={intensity(c.readingMinutes, maxCell)}
                      onOpen={() => setDetail({ title: `${WEEKDAY_NAMES[d]}s around ${hourLabel(h)}`, minutes: c.readingMinutes, words: c.wordsRead, sessions: c.sessions })} />;
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-[11px] text-slate-500">Each square is a day; each column a week, Monday at the top.</p>
            <div className="mt-2 grid grid-cols-[2rem_1fr] gap-1">
              <div className="grid grid-rows-7 gap-[3px]" aria-hidden>{WEEKDAYS.map((d, i) => <span key={d} className="text-[9px] leading-none text-slate-400 self-center">{i % 2 === 0 ? d : ''}</span>)}</div>
              <div className="grid grid-flow-col grid-rows-7 gap-[3px]" style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }} role="group" aria-label="Minutes read each day, last 12 weeks">
                {weeks.flatMap((w) => w.map((d) => (
                  <Cell key={d.day} className="aspect-square w-full" label={fmtDay(d.day)} minutes={d.minutes} words={d.words} shade={intensity(d.minutes, maxDay)}
                    onOpen={() => setDetail({ title: fmtDay(d.day), minutes: d.minutes, words: d.words })} />
                )))}
              </div>
            </div>
          </div>
        )}
      </Tooltip.Provider>
      <div className="mt-2 flex justify-end"><Legend /></div>
      <table className="sr-only">
        <caption>Minutes read by day of the week and hour</caption>
        <tbody>{cells.filter((c) => c.readingMinutes > 0).map((c) => <tr key={`${c.weekday}-${c.hour}`}><th scope="row">{WEEKDAY_NAMES[c.weekday]} {hourLabel(c.hour)}</th><td>{buildTooltip({ minutesRead: c.readingMinutes, wordsRead: c.wordsRead })}</td></tr>)}</tbody>
      </table>
      <Dialog.Root open={!!detail} onOpenChange={(o) => { if (!o) setDetail(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[60] bg-slate-950/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[61] w-[min(92vw,22rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-xl outline-none" data-testid="heatmap-detail">
            <div className="flex items-start justify-between gap-3">
              <Dialog.Title className="text-base font-extrabold text-slate-900">{detail?.title}</Dialog.Title>
              <Dialog.Close className="grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100 cursor-pointer" aria-label="Close"><X className="h-4 w-4" /></Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">Reading in this cell of the heatmap</Dialog.Description>
            {detail && (
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Minutes</dt><dd className="text-xl font-extrabold tabular-nums text-slate-900">{Math.round(detail.minutes)}</dd></div>
                <div><dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Words</dt><dd className="text-xl font-extrabold tabular-nums text-slate-900">{detail.words.toLocaleString()}</dd></div>
                {detail.sessions !== undefined && <div><dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Sessions</dt><dd className="text-xl font-extrabold tabular-nums text-slate-900">{detail.sessions}</dd></div>}
                {detail.minutes >= 1 && detail.words > 0 && <div><dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Words a minute</dt><dd className="text-xl font-extrabold tabular-nums text-slate-900">{Math.round(detail.words / detail.minutes)}</dd></div>}
              </dl>
            )}
            {detail && !detail.minutes && <p className="mt-2 text-sm text-slate-600">No reading here yet.</p>}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </figure>
  );
}
