import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { SlidersHorizontal, X } from 'lucide-react';

/**
 * Phones and tablets (owner request 2026-11-17): the filter sidebar filled three screens before the books. It now
 * opens from a "Filters" button as a bottom sheet (Radix Dialog), with the result count to close it.
 */
export function MobileFilters({ total, children }: { total: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button type="button"
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-2xs transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 active:bg-slate-100 lg:hidden cursor-pointer">
          <span className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-indigo-600" aria-hidden />Filters &amp; categories</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium tabular-nums text-slate-600">{total.toLocaleString()} titles</span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-slate-950/50 backdrop-blur-[2px] data-[state=open]:animate-fade-in lg:hidden" />
        <Dialog.Content aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-[71] flex max-h-[88dvh] flex-col rounded-t-3xl bg-slate-50 shadow-2xl outline-none data-[state=open]:animate-sheet-up motion-reduce:animate-none lg:hidden">
          <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-slate-300" aria-hidden />
          <div className="flex shrink-0 items-center justify-between px-4 pb-2 pt-3">
            <Dialog.Title className="text-base font-bold text-slate-900">Filters &amp; categories</Dialog.Title>
            <Dialog.Close className="grid h-10 w-10 place-items-center rounded-full text-slate-500 hover:bg-slate-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer" aria-label="Close filters">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3">{children}</div>
          <div className="shrink-0 border-t border-slate-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Dialog.Close className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 cursor-pointer">
              Show {total.toLocaleString()} titles
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
