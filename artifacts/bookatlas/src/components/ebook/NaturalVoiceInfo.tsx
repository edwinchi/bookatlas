import React from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Accessibility, Check, HelpCircle, Smartphone, Volume2, X } from 'lucide-react';

/**
 * Why readers may want to pay for the natural audiobook when the device voice is free. Every reason here is
 * something the reader can check for themselves; the device voice stays free on every book they can read.
 */
const REASONS: { icon: React.ComponentType<{ className?: string }>; title: string; text: string }[] = [
  { icon: Smartphone, title: 'Keeps playing with your screen off', text: 'It is a real audio track, with play, pause and chapter skip on your lock screen and headphones. Most phones stop the device voice when the screen locks.' },
  { icon: Volume2, title: 'The same voice on every device', text: 'The author chose this voice. The device voice depends on your phone or computer, and on many it sounds robotic.' },
  { icon: Check, title: 'Hear it before you pay', text: 'The narrated preview plays in the same voice, so you know what you get.' },
];

export function NaturalVoiceInfo({ tone = 'store' }: { tone?: 'store' | 'reader' }) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button type="button"
          className={tone === 'reader'
            ? 'px-2.5 py-1 rounded-full font-semibold inline-flex items-center gap-1 cursor-pointer opacity-80 hover:opacity-100 underline-offset-2 hover:underline'
            : 'inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:underline cursor-pointer'}>
          <HelpCircle className="w-3.5 h-3.5" aria-hidden />Why the natural voice?
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content side="bottom" align="center" sideOffset={6} collisionPadding={16}
          className="z-[200] w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-3.5 text-left text-slate-700 shadow-xl">
          <div className="mb-2 flex items-start justify-between gap-2">
            <p className="text-xs font-bold text-slate-900">Why the natural audiobook?</p>
            <Popover.Close aria-label="Close" className="rounded p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="h-3.5 w-3.5" /></Popover.Close>
          </div>
          <ul className="space-y-2.5">
            {REASONS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-2">
                <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-600" aria-hidden />
                <span><span className="block text-[11px] font-bold text-slate-900">{title}</span><span className="block text-[11px] leading-snug text-slate-600">{text}</span></span>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex gap-2 rounded-lg bg-slate-50 p-2 text-[11px] leading-snug text-slate-600">
            <Accessibility className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
            <span>Reading along with your device’s voice stays free on every book you can read. It is there for readers with low vision or dyslexia too.</span>
          </p>
          <p className="mt-2 text-[10px] text-slate-500">The author keeps 67% of every audiobook sale (after VAT).</p>
          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
