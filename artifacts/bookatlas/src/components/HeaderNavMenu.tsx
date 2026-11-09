import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface NavMenuItem {
  label: string;
  description?: string;
  icon?: React.ElementType;
  href?: string;
  onSelect?: () => void;
  /** Shown as a planned, not-yet-clickable entry (e.g. "Soon"). */
  badge?: string;
}

export interface NavMenuGroup {
  heading?: string;
  items: NavMenuItem[];
}

interface HeaderNavMenuProps {
  label: string;
  groups: NavMenuGroup[];
  align?: 'left' | 'right';
  width?: string;
}

/**
 * Disclosure-style dropdown for the header menu row. Opens on click or hover, closes on Escape,
 * outside click or when focus leaves; arrow keys move between items.
 */
export const HeaderNavMenu: React.FC<HeaderNavMenuProps> = ({ label, groups, align = 'left', width = 'w-80' }) => {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number>(undefined);
  const hoverOpened = useRef(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); button.current?.focus(); } };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('pointerdown', onPointerDown); document.removeEventListener('keydown', onKeyDown); };
  }, [open]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);
  useEffect(() => { if (!open) hoverOpened.current = false; }, [open]);

  const items = () => Array.from(root.current?.querySelectorAll<HTMLElement>('[data-nav-item]') ?? []);
  const focusItem = (index: number) => {
    const list = items();
    list[(index + list.length) % list.length]?.focus();
  };

  const onButtonKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      requestAnimationFrame(() => focusItem(0));
    }
  };

  const onPanelKeyDown = (e: React.KeyboardEvent) => {
    const current = items().indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); focusItem(current + 1); }
    if (e.key === 'ArrowUp') { e.preventDefault(); focusItem(current - 1); }
    if (e.key === 'Home') { e.preventDefault(); focusItem(0); }
    if (e.key === 'End') { e.preventDefault(); focusItem(-1); }
  };

  // Hover only for mouse pointers, with a short grace period so the panel can be reached.
  // A click that follows a hover-open keeps the menu open instead of toggling it shut.
  const onPointerEnter = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    window.clearTimeout(closeTimer.current);
    if (!open) hoverOpened.current = true;
    setOpen(true);
  };
  const onPointerLeave = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    closeTimer.current = window.setTimeout(() => { hoverOpened.current = false; setOpen(false); }, 150);
  };
  const onButtonClick = () => {
    if (hoverOpened.current) { hoverOpened.current = false; setOpen(true); return; }
    setOpen((o) => !o);
  };

  const select = (item: NavMenuItem) => {
    setOpen(false);
    item.onSelect?.();
  };

  return (
    <div
      ref={root}
      className="relative"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onBlur={(e) => { if (!root.current?.contains(e.relatedTarget as Node)) setOpen(false); }}
    >
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onButtonClick}
        onKeyDown={onButtonKeyDown}
        className={`flex items-center gap-1 rounded-md px-3 py-2 text-sm font-semibold transition-colors cursor-pointer ${open ? 'text-indigo-700' : 'text-slate-800 hover:text-indigo-700'}`}
      >
        {label}
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      <div
        id={panelId}
        hidden={!open}
        onKeyDown={onPanelKeyDown}
        className={`absolute top-full z-50 mt-1 ${width} ${align === 'right' ? 'right-0' : 'left-0'} rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/10 animate-in fade-in slide-in-from-top-1 duration-150`}
      >
        {groups.map((group, g) => (
          <div key={group.heading ?? g} className={g ? 'mt-1 border-t border-slate-100 pt-1' : ''}>
            {group.heading && <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">{group.heading}</p>}
            <ul>
              {group.items.map((item) => {
                const Icon = item.icon;
                const body = (
                  <>
                    {Icon && (
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition-colors group-hover/item:bg-indigo-600 group-hover/item:text-white group-focus-visible/item:bg-indigo-600 group-focus-visible/item:text-white">
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-900">{item.label}</span>
                      {item.description && <span className="mt-0.5 block text-xs leading-snug text-slate-500">{item.description}</span>}
                    </span>
                  </>
                );
                const cls = 'group/item flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 cursor-pointer';
                if (item.badge) {
                  return (
                    <li key={item.label} className="flex items-start gap-3 rounded-xl px-3 py-2 opacity-70">
                      {body}
                      <span className="ml-auto shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">{item.badge}</span>
                    </li>
                  );
                }
                return (
                  <li key={item.label}>
                    {item.href
                      ? <a data-nav-item href={item.href} onClick={() => setOpen(false)} className={cls}>{body}</a>
                      : <button data-nav-item type="button" onClick={() => select(item)} className={cls}>{body}</button>}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};
