import React, { useId, useMemo, useState } from 'react';
import { ChevronDown, Compass, Globe, Layers, Search, Sparkles, X } from 'lucide-react';
import { AFRICAN_LITERATURE_GENRES, CONSCIOUSNESS_COMMUNITY_GENRES, GENERAL_GENRES } from '../data/booksData';

type Tone = 'amber' | 'emerald' | 'slate' | 'indigo';
const TONES: Record<Tone, { icon: string; active: string; bar: string; badge: string }> = {
  amber: { icon: 'text-amber-700 bg-amber-50', active: 'bg-amber-50 text-amber-950', bar: 'bg-amber-500', badge: 'bg-amber-100 text-amber-900' },
  emerald: { icon: 'text-emerald-700 bg-emerald-50', active: 'bg-emerald-50 text-emerald-950', bar: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-900' },
  slate: { icon: 'text-slate-700 bg-slate-100', active: 'bg-[#bf0000]/[0.07] text-[#8f0000]', bar: 'bg-[#bf0000]', badge: 'bg-[#bf0000]/10 text-[#8f0000]' },
  indigo: { icon: 'text-indigo-700 bg-indigo-50', active: 'bg-indigo-50 text-indigo-950', bar: 'bg-indigo-500', badge: 'bg-indigo-100 text-indigo-900' },
};

interface Group { id: string; label: string; icon: React.ElementType; tone: Tone; categories: string[] }

const formatCount = (n: number) => (n >= 10_000 ? `${Math.round(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

/**
 * The category section of the store filters: grouped, searchable, with live title counts from the
 * catalogue (TASK-0005). Categories without titles yet fold away under "Show more".
 */
export const CategoryBrowser: React.FC<{
  value: string;
  onChange: (category: string) => void;
  counts: Record<string, number> | null;
  total: number | null;
}> = ({ value, onChange, counts, total }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({ african: true, consciousness: true, general: true, more: true });
  const [showEmpty, setShowEmpty] = useState<Record<string, boolean>>({});
  const searchId = useId();

  const groups = useMemo<Group[]>(() => {
    const known = new Set<string>([...AFRICAN_LITERATURE_GENRES, ...CONSCIOUSNESS_COMMUNITY_GENRES, ...GENERAL_GENRES]);
    const newer = Object.keys(counts ?? {}).filter((c) => !known.has(c)).sort();
    return [
      { id: 'african', label: 'African Literature & Diaspora', icon: Globe, tone: 'amber', categories: [...AFRICAN_LITERATURE_GENRES] },
      { id: 'consciousness', label: 'Consciousness & Sacred Sciences', icon: Compass, tone: 'emerald', categories: [...CONSCIOUSNESS_COMMUNITY_GENRES] },
      { id: 'general', label: 'General & Classics', icon: Layers, tone: 'slate', categories: [...GENERAL_GENRES] },
      ...(newer.length ? [{ id: 'more', label: 'New on BookAtlas', icon: Sparkles, tone: 'indigo' as Tone, categories: newer }] : []),
    ];
  }, [counts]);

  const needle = query.trim().toLowerCase();
  const countOf = (c: string) => counts?.[c] ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Categories & Genres</h3>
        {value !== 'All Genres' && (
          <button onClick={() => onChange('All Genres')} className="text-[11px] text-[#bf0000] hover:underline font-semibold cursor-pointer">Reset</button>
        )}
      </div>

      <label htmlFor={searchId} className="relative block">
        <span className="sr-only">Find a category</span>
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          id={searchId} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a category"
          className="w-full rounded-lg border border-slate-200 bg-slate-50/80 py-2 pl-8 pr-8 text-xs text-slate-900 placeholder:text-slate-400 transition focus:border-indigo-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label="Clear category search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </label>

      <div className="space-y-1.5 text-sm">
        <button
          onClick={() => onChange('All Genres')}
          aria-pressed={value === 'All Genres'}
          className={`group relative flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500/40 ${
            value === 'All Genres' ? 'bg-[#bf0000]/[0.07] font-bold text-[#8f0000]' : 'font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-950'
          }`}
        >
          {value === 'All Genres' && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-[#bf0000]" aria-hidden />}
          <span className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-amber-500" aria-hidden />All Categories</span>
          {total !== null && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold tabular-nums text-slate-600">{formatCount(total)}</span>}
        </button>

        {groups.map((group) => {
          const tone = TONES[group.tone];
          const matching = group.categories.filter((c) => !needle || c.toLowerCase().includes(needle));
          if (!matching.length) return null;
          const withTitles = matching.filter((c) => countOf(c) > 0 || c === value).sort((a, b) => countOf(b) - countOf(a));
          const empty = matching.filter((c) => !withTitles.includes(c));
          const expanded = needle ? true : open[group.id] !== false;
          const visible = counts === null || needle || showEmpty[group.id] ? matching : withTitles;
          const Icon = group.icon;
          return (
            <section key={group.id} className="rounded-xl border border-slate-100 bg-white">
              <button
                type="button" aria-expanded={expanded} aria-controls={`cat-${group.id}`}
                onClick={() => setOpen((o) => ({ ...o, [group.id]: !expanded }))}
                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left cursor-pointer hover:bg-slate-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500/40"
              >
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md ${tone.icon}`}><Icon className="h-3.5 w-3.5" aria-hidden /></span>
                <span className="flex-1 truncate text-[11px] font-bold uppercase tracking-wide text-slate-700">{group.label}</span>
                <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} aria-hidden />
              </button>
              <div id={`cat-${group.id}`} className={`grid transition-[grid-template-rows] duration-300 ease-out ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                  <ul className="space-y-0.5 px-1.5 pb-1.5">
                    {visible.map((c) => {
                      const active = value === c;
                      const n = countOf(c);
                      return (
                        <li key={c}>
                          <button
                            onClick={() => onChange(c)} aria-pressed={active}
                            className={`relative flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500/40 ${
                              active ? `${tone.active} font-bold` : n || counts === null ? 'text-gray-700 hover:bg-slate-50 hover:text-gray-950' : 'text-gray-400 hover:bg-slate-50 hover:text-gray-600'
                            }`}
                          >
                            {active && <span className={`absolute inset-y-1 left-0 w-[3px] rounded-full ${tone.bar}`} aria-hidden />}
                            <span className="truncate" title={c}>{c}</span>
                            {counts && n > 0 && (
                              <span className={`shrink-0 rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums ${active ? tone.badge : 'bg-slate-100 text-slate-500'}`}>{formatCount(n)}</span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {counts && !needle && empty.length > 0 && (
                    <button
                      type="button" onClick={() => setShowEmpty((s) => ({ ...s, [group.id]: !s[group.id] }))}
                      className="mx-1.5 mb-2 rounded-md px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50 cursor-pointer"
                    >
                      {showEmpty[group.id] ? 'Show fewer' : `Show ${empty.length} more without titles yet`}
                    </button>
                  )}
                </div>
              </div>
            </section>
          );
        })}
        {needle && groups.every((g) => !g.categories.some((c) => c.toLowerCase().includes(needle))) && (
          <p className="px-2 py-3 text-center text-xs text-slate-500">No category matches “{query}”.</p>
        )}
      </div>
    </div>
  );
};
