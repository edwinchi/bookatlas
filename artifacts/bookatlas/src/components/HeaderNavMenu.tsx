import React, { useState } from 'react';
import * as NavigationMenu from '@radix-ui/react-navigation-menu';
import * as Accordion from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';

export interface NavMenuItem {
  label: string;
  description?: string;
  icon?: React.ElementType;
  href?: string;
  onSelect?: () => void;
  /** Shown as a planned, not-yet-clickable entry (e.g. "Soon"); with an action (e.g. "New") it is a label. */
  badge?: string;
}

export interface NavMenuGroup {
  heading?: string;
  items: NavMenuItem[];
  /** Wide menus: a grid of short links (categories, book types), or of entries when they have descriptions. */
  columns?: 2 | 3 | 4;
  /** Wide menus: shown as cards in the side column (a guide, what is new). */
  feature?: boolean;
}

export interface SiteMenu {
  label: string;
  groups: NavMenuGroup[];
  /**
   * A wide panel across the menu row (owner request 2026-11-23): groups side by side as columns, feature groups as
   * cards on the right, and `top` (e.g. a search field) above them. The row's container must be positioned.
   */
  mega?: boolean;
  top?: React.ReactNode;
  /** Wide menus: a row of short links under `top` (the shop's sections), shown as chips. */
  quickLinks?: NavMenuItem[];
  /** Narrow menus: which edge the panel lines up with, and its width. */
  align?: 'left' | 'right';
  width?: string;
}

const LINK_GRID: Record<number, string> = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-2 xl:grid-cols-4' };
const ENTRY_GRID: Record<number, string> = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' };
const badgeCls = 'ml-auto shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800';

/** A menu entry as a link or a button; Radix closes the menu when it is chosen. */
function ItemLink({ item, className, children, title }: { item: NavMenuItem; className: string; children: React.ReactNode; title?: string }) {
  return (
    <NavigationMenu.Link asChild>
      {item.href
        ? <a data-nav-item href={item.href} className={className} title={title}>{children}</a>
        : <button data-nav-item type="button" onClick={item.onSelect} className={className} title={title}>{children}</button>}
    </NavigationMenu.Link>
  );
}

/** An entry with an icon and a description. */
function Entry({ item }: { item: NavMenuItem }) {
  const Icon = item.icon;
  const body = (
    <>
      {Icon && (
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition-colors group-hover/item:bg-indigo-600 group-hover/item:text-white group-focus-visible/item:bg-indigo-600 group-focus-visible/item:text-white">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      )}
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-900">{item.label}</span>
        {item.description && <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{item.description}</span>}
      </span>
    </>
  );
  // A badge without an action is a coming-soon placeholder.
  if (item.badge && !item.onSelect && !item.href) {
    return <li className="flex items-start gap-3 rounded-xl px-2 py-2.5 opacity-70">{body}<span className={badgeCls}>{item.badge}</span></li>;
  }
  return (
    <li>
      <ItemLink item={item} className="group/item flex w-full items-start gap-3 rounded-xl px-2 py-2.5 text-left outline-none transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer">
        {body}{item.badge && <span className={badgeCls}>{item.badge}</span>}
      </ItemLink>
    </li>
  );
}

function FeatureCard({ item }: { item: NavMenuItem }) {
  const Icon = item.icon;
  return (
    <ItemLink item={item} className="group/card block w-full rounded-2xl p-2 text-left outline-none transition-colors hover:bg-white focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer">
      <span className="flex h-24 items-center justify-center rounded-xl bg-[radial-gradient(ellipse_at_30%_20%,rgba(251,191,36,0.35),transparent_60%),linear-gradient(135deg,#232272,#4338ca)] text-amber-200 shadow-inner">
        {Icon && <Icon className="h-9 w-9 transition-transform duration-200 group-hover/card:scale-110 motion-reduce:transition-none" aria-hidden />}
      </span>
      {/* The title comes first for screen readers; the small label shows above it. */}
      <span className="flex flex-col">
        <span className="mt-0.5 block text-sm font-semibold leading-snug text-slate-900">{item.label}</span>
        {item.badge && <span className="order-first mt-2 block text-[10px] font-bold uppercase tracking-widest text-indigo-700">{item.badge}</span>}
        {item.description && <span className="mt-0.5 block text-xs leading-snug text-slate-500">{item.description}</span>}
      </span>
    </ItemLink>
  );
}

function MegaPanel({ menu }: { menu: SiteMenu }) {
  const features = menu.groups.filter((g) => g.feature).flatMap((g) => g.items);
  return (
    <div className="flex">
      <div className="min-w-0 flex-1 p-6">
        {menu.top}
        {menu.quickLinks && (
          <ul className="-mt-1 mb-6 flex flex-wrap gap-2" aria-label="Shop">
            {menu.quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.label}>
                  <ItemLink item={item} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-800 focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer">
                    {Icon && <Icon className="h-3.5 w-3.5 text-indigo-600" aria-hidden />}{item.label}
                  </ItemLink>
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex gap-8">
          {menu.groups.filter((g) => !g.feature).map((group, g) => {
            const entries = group.items.some((i) => i.description);
            // Plain names (categories, book types): short links, in a grid or a column.
            const links = !entries && !group.items.some((i) => i.icon);
            return (
              <div key={group.heading ?? g} className={group.columns ? 'min-w-0 flex-[2]' : 'min-w-0 flex-1'}>
                {group.heading && <p className="mb-2 border-b border-slate-100 pb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">{group.heading}</p>}
                <ul className={group.columns ? `grid gap-x-4 ${entries ? ENTRY_GRID[group.columns] : LINK_GRID[group.columns]}` : ''}>
                  {group.items.map((item) => (links
                    ? (
                      <li key={item.label}>
                        <ItemLink item={item} title={item.label} className="block w-full rounded-lg px-2 py-1 text-left text-sm font-medium leading-snug text-slate-700 outline-none transition-colors hover:bg-indigo-50 hover:text-indigo-800 focus-visible:bg-indigo-50 focus-visible:text-indigo-800 focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer">{item.label}</ItemLink>
                      </li>
                    )
                    : <Entry key={item.label} item={item} />))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
      {features.length > 0 && (
        <aside className="w-64 shrink-0 space-y-3 rounded-br-3xl border-l border-slate-100 bg-slate-50 p-5">
          {features.map((item) => <FeatureCard key={item.label} item={item} />)}
        </aside>
      )}
    </div>
  );
}

function NarrowPanel({ menu }: { menu: SiteMenu }) {
  return (
    <>
      {menu.groups.map((group, g) => (
        <div key={group.heading ?? g} className={g ? 'mt-1 border-t border-slate-100 pt-1' : ''}>
          {group.heading && <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">{group.heading}</p>}
          <ul>{group.items.map((item) => <Entry key={item.label} item={item} />)}</ul>
        </div>
      ))}
    </>
  );
}

/** Up and Down move between the entries of an open panel (Radix moves between menus with Left and Right). */
const onPanelKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
  const list = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[data-nav-item]'));
  if (!list.length) return;
  e.preventDefault();
  const at = list.indexOf(document.activeElement as HTMLElement);
  const next = e.key === 'Home' ? 0 : e.key === 'End' ? list.length - 1 : (at + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length;
  list[next]?.focus();
};

/**
 * The header's menu row (Radix Navigation Menu): opens on hover or click, Left and Right move between menus, Down
 * enters the open panel, Escape closes it and returns to its button. Wide menus span the row; narrow ones drop down.
 */
export function SiteNavMenu({ menus, label = 'Site' }: { menus: SiteMenu[]; label?: string }) {
  const [value, setValue] = useState('');
  const enter = (e: React.KeyboardEvent<HTMLButtonElement>, id: string) => {
    if (e.key !== 'ArrowDown') return;
    e.preventDefault();
    setValue(id);
    // Radix names the panel (aria-controls) once it is open, so look it up after it has opened.
    const trigger = e.currentTarget;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const content = trigger.getAttribute('aria-controls');
      (content ? document.getElementById(content) : null)?.querySelector<HTMLElement>('[data-nav-item]')?.focus();
    }));
  };
  return (
    <NavigationMenu.Root aria-label={label} value={value} onValueChange={setValue} delayDuration={80} skipDelayDuration={400} className={menus.some((m) => m.mega) ? 'static [&>div]:!static' : 'relative'}>
      <NavigationMenu.List className="flex items-center gap-0.5">
        {menus.map((menu) => (
          <NavigationMenu.Item key={menu.label} value={menu.label} className={menu.mega ? 'static' : 'relative'}>
            <NavigationMenu.Trigger
              onKeyDown={(e) => enter(e, menu.label)}
              className="group flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-2 text-sm font-semibold text-slate-800 outline-none transition-colors hover:text-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500 data-[state=open]:text-indigo-700 cursor-pointer xl:px-3"
            >
              {menu.label}
              <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180 motion-reduce:transition-none" aria-hidden />
            </NavigationMenu.Trigger>
            <NavigationMenu.Content
              onKeyDown={onPanelKeyDown}
              className={menu.mega
                ? 'absolute inset-x-4 top-full z-50 max-h-[calc(100dvh-7rem)] overflow-y-auto overscroll-contain rounded-b-3xl border border-t-0 border-slate-200 bg-white shadow-2xl shadow-slate-900/15 data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:slide-in-from-top-1 data-[state=open]:duration-150 xl:inset-x-6'
                : `absolute top-full z-50 mt-1 ${menu.width ?? 'w-80'} ${menu.align === 'right' ? 'right-0' : 'left-0'} rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/10 data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:slide-in-from-top-1 data-[state=open]:duration-150`}
            >
              {menu.mega ? <MegaPanel menu={menu} /> : <NarrowPanel menu={menu} />}
            </NavigationMenu.Content>
          </NavigationMenu.Item>
        ))}
      </NavigationMenu.List>
    </NavigationMenu.Root>
  );
}

/**
 * The phone menu's sections (Radix Accordion): each opens the same entries as the matching menu on large screens.
 * `onDone` closes the phone menu after a choice.
 */
export function MobileNavSections({ menus, onDone }: { menus: SiteMenu[]; onDone: () => void }) {
  return (
    <Accordion.Root type="single" collapsible>
      {menus.map((menu) => (
        <Accordion.Item key={menu.label} value={menu.label}>
          <Accordion.Header>
            <Accordion.Trigger className="group flex min-h-12 w-full items-center justify-between px-1 text-left text-base font-semibold text-slate-900 data-[state=open]:text-indigo-700">
              {menu.label}
              <ChevronDown className="h-5 w-5 transition-transform duration-200 group-data-[state=open]:rotate-180 motion-reduce:transition-none" aria-hidden />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="pb-2">
            {[...(menu.quickLinks ? [{ heading: 'Shop', items: menu.quickLinks }] : []), ...menu.groups].map((group: NavMenuGroup, g) => (
              <div key={group.heading ?? g} className={g ? 'mt-1 border-t border-slate-100 pt-1' : ''}>
                {group.heading && <p className="px-2 pb-1 pt-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">{group.heading}</p>}
                <ul className={!group.items.some((i) => i.description || i.icon) ? 'grid grid-cols-2 gap-x-2' : ''}>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const body = (
                      <>
                        {Icon && (
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                            <Icon className="h-4 w-4" aria-hidden />
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-slate-900">{item.label}</span>
                          {item.description && <span className="block text-xs leading-snug text-slate-500">{item.description}</span>}
                        </span>
                        {item.badge && <span className={badgeCls}>{item.badge}</span>}
                      </>
                    );
                    const cls = 'flex min-h-12 w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-slate-50 focus-visible:bg-slate-50';
                    if (item.badge && !item.onSelect && !item.href) return <li key={item.label} className={`${cls} opacity-70`}>{body}</li>;
                    return (
                      <li key={item.label}>
                        {item.href
                          ? <a href={item.href} onClick={onDone} className={cls}>{body}</a>
                          : <button type="button" onClick={() => { onDone(); item.onSelect?.(); }} className={cls}>{body}</button>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
