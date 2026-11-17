import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import * as Slider from '@radix-ui/react-slider';
import * as Switch from '@radix-ui/react-switch';
import { AlignJustify, AlignLeft, BookOpen, Columns2, Palette, ScrollText, Sun, Type, X, RotateCcw, Hand } from 'lucide-react';
import type { ReaderFont, ReaderSettings, ReaderTheme } from '../../types';
import { BACKGROUND_SWATCHES, TEXT_SWATCHES, type ReaderLayout } from './readerLayout';

const THEMES: { id: ReaderTheme; name: string; bg: string; fg: string }[] = [
  { id: 'day', name: 'Day', bg: '#ffffff', fg: '#1c1d1f' },
  { id: 'sepia', name: 'Sepia', bg: '#fbf0d9', fg: '#3e2723' },
  { id: 'mint', name: 'Mint', bg: '#e8f4ec', fg: '#1e3a29' },
  { id: 'night', name: 'Night', bg: '#18191c', fg: '#d1d5db' },
  { id: 'black', name: 'OLED', bg: '#000000', fg: '#e5e7eb' },
];
const FONTS: { id: ReaderFont; label: string; sample: string }[] = [
  { id: 'literata', label: 'Book serif', sample: 'font-serif-book' },
  { id: 'sans', label: 'Sans', sample: 'font-reader-sans' },
  { id: 'mono', label: 'Easy read', sample: 'font-reader-mono' },
];

const tab = 'flex-1 rounded-lg px-2 py-2 text-xs font-bold text-slate-600 transition-colors data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer';
const item = 'flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-white data-[state=on]:bg-slate-900 data-[state=on]:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer';
const group = 'flex gap-1 rounded-xl bg-slate-100 p-1';
const label = 'text-[11px] font-bold uppercase tracking-wider text-slate-500';

function Range({ value, min, max, step, onChange, aria }: { value: number; min: number; max: number; step: number; onChange: (v: number) => void; aria: string }) {
  return (
    <Slider.Root value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v ?? value)}
      className="relative flex h-6 w-full touch-none select-none items-center cursor-pointer">
      <Slider.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-slate-200"><Slider.Range className="absolute h-full rounded-full bg-indigo-600" /></Slider.Track>
      <Slider.Thumb aria-label={aria} className="block h-5 w-5 rounded-full bg-white shadow ring-2 ring-indigo-600 focus-visible:outline-none focus-visible:ring-4" />
    </Slider.Root>
  );
}

function Swatches({ colours, value, onPick, name }: { colours: string[]; value: string; onPick: (c: string) => void; name: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {colours.map((c) => (
        <button key={c} type="button" onClick={() => onPick(c)} aria-label={`${name} ${c}`} aria-pressed={value.toLowerCase() === c}
          className={`h-8 w-8 rounded-full ring-1 ring-slate-300 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer ${value.toLowerCase() === c ? 'ring-2 ring-indigo-600 ring-offset-2' : ''}`}
          style={{ background: c }} />
      ))}
      <label className="relative grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-[conic-gradient(red,yellow,lime,cyan,blue,magenta,red)] ring-1 ring-slate-300 cursor-pointer" title={`Any ${name.toLowerCase()}`}>
        <input type="color" value={value} onChange={(e) => onPick(e.target.value)} aria-label={`Any ${name.toLowerCase()}`} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
      </label>
    </div>
  );
}

/**
 * The reader's preferences window (owner request 2026-11-17, after the best eBook readers): text, page and
 * colours, each change visible at once behind the window.
 */
export function ReaderPreferences({ open, onOpenChange, container, settings, setSettings, layout, setLayout, onReset, wide }: {
  open: boolean; onOpenChange: (o: boolean) => void; container: HTMLElement | null;
  settings: ReaderSettings; setSettings: React.Dispatch<React.SetStateAction<ReaderSettings>>;
  layout: ReaderLayout; setLayout: (l: ReaderLayout) => void; onReset: () => void; wide: boolean;
}) {
  const set = (p: Partial<ReaderSettings>) => setSettings((s) => ({ ...s, ...p }));
  const lay = (p: Partial<ReaderLayout>) => setLayout({ ...layout, ...p });
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal container={container ?? undefined}>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-slate-950/20 data-[state=open]:animate-fade-in" />
        <Dialog.Content
          className="fixed inset-x-0 bottom-0 z-[71] flex max-h-[78dvh] flex-col rounded-t-3xl bg-slate-50 text-slate-900 shadow-2xl outline-none data-[state=open]:animate-sheet-up motion-reduce:animate-none sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-20 sm:max-h-[calc(100dvh-7rem)] sm:w-[23rem] sm:rounded-3xl">
          <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-slate-300 sm:hidden" aria-hidden />
          <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-3">
            <Dialog.Title className="flex items-center gap-2 text-base font-bold"><Type className="h-4 w-4 text-indigo-600" />Reading preferences</Dialog.Title>
            <Dialog.Description className="sr-only">Text, page layout and colours. Changes show at once.</Dialog.Description>
            <Dialog.Close aria-label="Close reading settings" className="grid h-10 w-10 place-items-center rounded-full text-slate-500 hover:bg-slate-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"><X className="h-5 w-5" /></Dialog.Close>
          </div>

          <Tabs.Root defaultValue="text" className="flex min-h-0 flex-1 flex-col">
            <Tabs.List aria-label="Preferences" className="mx-5 flex shrink-0 gap-1 rounded-xl bg-slate-200/70 p-1">
              <Tabs.Trigger value="text" className={tab}>Text</Tabs.Trigger>
              <Tabs.Trigger value="page" className={tab}>Page</Tabs.Trigger>
              <Tabs.Trigger value="colours" className={tab}>Colours</Tabs.Trigger>
            </Tabs.List>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-4">
              <Tabs.Content value="text" className="space-y-5 focus-visible:outline-none">
                <div className="space-y-2">
                  <p className={label}>Font</p>
                  <ToggleGroup.Root type="single" value={settings.fontFamily} onValueChange={(v) => v && set({ fontFamily: v as ReaderFont })} aria-label="Font" className={group}>
                    {FONTS.map((f) => <ToggleGroup.Item key={f.id} value={f.id} className={`${item} ${f.sample}`}>{f.label}</ToggleGroup.Item>)}
                  </ToggleGroup.Root>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between"><p className={label}>Text size</p><span className="text-xs font-extrabold tabular-nums">{settings.fontSize}px</span></div>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => set({ fontSize: Math.max(14, settings.fontSize - 1) })} aria-label="Smaller text" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white font-serif text-sm font-bold ring-1 ring-slate-200 hover:bg-slate-100 cursor-pointer">A</button>
                    <Range value={settings.fontSize} min={14} max={26} step={1} onChange={(v) => set({ fontSize: v })} aria="Text size" />
                    <button type="button" onClick={() => set({ fontSize: Math.min(26, settings.fontSize + 1) })} aria-label="Larger text" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white font-serif text-xl font-bold ring-1 ring-slate-200 hover:bg-slate-100 cursor-pointer">A</button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between"><p className={label}>Line spacing</p><span className="text-xs font-extrabold tabular-nums">{settings.lineHeight.toFixed(1)}</span></div>
                  <Range value={settings.lineHeight} min={1.4} max={2.2} step={0.1} onChange={(v) => set({ lineHeight: Math.round(v * 10) / 10 })} aria="Line spacing" />
                </div>
                <div className="space-y-2">
                  <p className={label}>Margins</p>
                  <ToggleGroup.Root type="single" value={settings.marginWidth} onValueChange={(v) => v && set({ marginWidth: v as ReaderSettings['marginWidth'] })} aria-label="Margins" className={group}>
                    {(['narrow', 'normal', 'wide'] as const).map((m) => <ToggleGroup.Item key={m} value={m} className={`${item} capitalize`}>{m}</ToggleGroup.Item>)}
                  </ToggleGroup.Root>
                </div>
                <div className="space-y-2">
                  <p className={label}>Alignment</p>
                  <ToggleGroup.Root type="single" value={layout.align} onValueChange={(v) => v && lay({ align: v as ReaderLayout['align'] })} aria-label="Alignment" className={group}>
                    <ToggleGroup.Item value="left" className={item}><AlignLeft className="h-4 w-4" />Left</ToggleGroup.Item>
                    <ToggleGroup.Item value="justify" className={item}><AlignJustify className="h-4 w-4" />Justified</ToggleGroup.Item>
                  </ToggleGroup.Root>
                </div>
              </Tabs.Content>

              <Tabs.Content value="page" className="space-y-5 focus-visible:outline-none">
                <div className="space-y-2">
                  <p className={label}>Reading mode</p>
                  <ToggleGroup.Root type="single" value={layout.mode} onValueChange={(v) => v && lay({ mode: v as ReaderLayout['mode'] })} aria-label="Reading mode" className={group}>
                    <ToggleGroup.Item value="page" className={item}><BookOpen className="h-4 w-4" />Pages</ToggleGroup.Item>
                    <ToggleGroup.Item value="scroll" className={item}><ScrollText className="h-4 w-4" />Scroll</ToggleGroup.Item>
                  </ToggleGroup.Root>
                  <p className="text-[11px] text-slate-500">{layout.mode === 'page' ? 'Turn pages with a swipe, a tap at the side, or the arrow keys.' : 'One long page per chapter.'}</p>
                </div>
                <label className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 ring-1 ring-slate-200">
                  <span className="flex items-center gap-2 text-sm font-semibold"><Columns2 className="h-4 w-4 text-indigo-600" />Two pages side by side
                    <span className="text-[11px] font-normal text-slate-500">{wide ? '' : '(wide screens)'}</span></span>
                  <Switch.Root checked={layout.spread} onCheckedChange={(v) => lay({ spread: v })} disabled={layout.mode !== 'page'} aria-label="Two pages side by side"
                    className="relative h-6 w-11 shrink-0 rounded-full bg-slate-300 transition-colors data-[state=checked]:bg-indigo-600 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer">
                    <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[22px]" />
                  </Switch.Root>
                </label>
                <label className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 ring-1 ring-slate-200">
                  <span className="flex items-center gap-2 text-sm font-semibold"><Hand className="h-4 w-4 text-indigo-600" />Tap the middle to hide the toolbars</span>
                  <Switch.Root checked={layout.tapToHide} onCheckedChange={(v) => lay({ tapToHide: v })} disabled={layout.mode !== 'page'} aria-label="Tap the middle to hide the toolbars"
                    className="relative h-6 w-11 shrink-0 rounded-full bg-slate-300 transition-colors data-[state=checked]:bg-indigo-600 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer">
                    <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[22px]" />
                  </Switch.Root>
                </label>
                <div className="space-y-2">
                  <div className="flex justify-between"><p className={`${label} flex items-center gap-1`}><Sun className="h-3.5 w-3.5" />Brightness</p><span className="text-xs font-extrabold tabular-nums">{layout.brightness}%</span></div>
                  <Range value={layout.brightness} min={40} max={100} step={5} onChange={(v) => lay({ brightness: v })} aria="Brightness" />
                </div>
              </Tabs.Content>

              <Tabs.Content value="colours" className="space-y-5 focus-visible:outline-none">
                <div className="space-y-2">
                  <p className={label}>Theme</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[...THEMES, { id: 'custom' as ReaderTheme, name: 'Custom', bg: layout.customBg, fg: layout.customText }].map((t) => (
                      <button key={t.id} type="button" onClick={() => set({ theme: t.id })} aria-pressed={settings.theme === t.id}
                        className={`flex h-16 flex-col items-center justify-center rounded-xl text-[11px] font-bold ring-1 ring-black/10 transition-all hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer ${settings.theme === t.id ? 'ring-2 ring-indigo-600 ring-offset-2' : ''}`}
                        style={{ background: t.bg, color: t.fg }}>
                        <span className="font-serif text-lg leading-none">Aa</span>{t.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className={`${label} flex items-center gap-1`}><Palette className="h-3.5 w-3.5" />Custom background</p>
                  <Swatches colours={BACKGROUND_SWATCHES} value={layout.customBg} name="Background" onPick={(c) => { lay({ customBg: c }); set({ theme: 'custom' }); }} />
                </div>
                <div className="space-y-2">
                  <p className={label}>Custom text colour</p>
                  <Swatches colours={TEXT_SWATCHES} value={layout.customText} name="Text colour" onPick={(c) => { lay({ customText: c }); set({ theme: 'custom' }); }} />
                </div>
                <div className="rounded-xl p-4 font-serif text-sm leading-relaxed ring-1 ring-black/10" style={{ background: layout.customBg, color: layout.customText }}>
                  “Curiouser and curiouser!” A preview of your custom colours.
                </div>
              </Tabs.Content>
            </div>
          </Tabs.Root>

          <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button type="button" onClick={onReset}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer">
              <RotateCcw className="h-4 w-4" />Reset to defaults
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
