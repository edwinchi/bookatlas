import React, { useId, type ReactNode } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { ChevronDown, X, type LucideIcon } from 'lucide-react';

export const utilityPill =
  'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-slate-600 ring-1 ring-transparent transition ' +
  'hover:bg-white hover:text-slate-950 hover:ring-slate-200 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer';

/**
 * Dropdown for the account bar, built on Radix Popover: a click or tap outside, Escape, or opening another
 * menu closes it; focus moves into the panel and returns to the button; the panel is portalled so nothing
 * clips it and flips or shifts to stay on screen. Controlled (`open`, `onOpenChange`) so menus load on open.
 */
export function UtilityMenu({ icon: Icon, label, title, open, onOpenChange, badge, children }: {
  icon: LucideIcon;
  label: string;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  badge?: number;
  children: ReactNode;
}) {
  const titleId = `${useId()}-title`;
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <PopoverPrimitive.Trigger
        className={`${utilityPill} data-[state=open]:bg-white data-[state=open]:text-indigo-700 data-[state=open]:ring-indigo-200 data-[state=open]:shadow-sm`}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden />
        <span>{label}</span>
        {!!badge && (
          <span className="grid h-4 min-w-4 place-items-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-none text-white" aria-label={`${badge} waiting`}>
            {badge}
          </span>
        )}
        <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden />
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="end"
          sideOffset={8}
          collisionPadding={12}
          aria-labelledby={titleId}
          // A dialog opened from inside the menu (refund request, confirmation) must not count as a click outside it.
          onInteractOutside={(e) => { if ((e.target as Element | null)?.closest?.('[role="dialog"],[role="alertdialog"]')) e.preventDefault(); }}
          className="z-50 max-h-[var(--radix-popover-content-available-height)] w-[min(24rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border border-slate-200/80 bg-white/95 p-4 text-left text-slate-700 shadow-2xl shadow-indigo-950/10 ring-1 ring-black/5 backdrop-blur-sm outline-none
            origin-[--radix-popover-content-transform-origin] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 motion-reduce:animate-none"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <h2 id={titleId} className="font-serif text-sm font-bold text-slate-950">{title}</h2>
            <PopoverPrimitive.Close aria-label="Close" className="-m-1 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer">
              <X className="h-3.5 w-3.5" aria-hidden />
            </PopoverPrimitive.Close>
          </div>
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
