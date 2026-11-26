import React, { useMemo, useState } from 'react';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { CornerDownRight, Network, List } from 'lucide-react';
import { layoutMap, relationsOf, wrapLabel, type MapEdge, type MapNode } from './knowledgeMap';

const KIND_LABEL: Record<MapNode['kind'], string> = { idea: 'idea', person: 'person', place: 'place', event: 'event', term: 'term' };

/**
 * A chapter's knowledge map (master build plan M10): ideas as dots, links as lines, the most linked idea in the
 * middle. One colour; the kind of each idea is written under it, so nothing depends on telling colours apart.
 * Choose an idea (tap, or Tab and Enter) to see its links and jump to where it matters; or read it as a list.
 */
export function KnowledgeMapView({ title, nodes, edges, onJump }: { title: string; nodes: MapNode[]; edges: MapEdge[]; onJump?: (paragraph: number) => void }) {
  const placed = useMemo(() => layoutMap(nodes, edges), [nodes, edges]);
  const at = new Map(placed.map((p) => [p.id, p]));
  const [view, setView] = useState<'map' | 'list'>('map');
  const [selected, setSelected] = useState<string | null>(null);
  const sel = selected ? placed.find((p) => p.id === selected) ?? null : null;
  const linked = new Set(sel ? edges.flatMap((e) => (e.from === sel.id ? [e.to] : e.to === sel.id ? [e.from] : [])) : []);
  const pick = (id: string) => setSelected((s) => (s === id ? null : id));
  return (
    <div className="space-y-3" data-testid="knowledge-map">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-slate-900">{title}</p>
        <ToggleGroup.Root type="single" value={view} onValueChange={(v) => v && setView(v as 'map' | 'list')} aria-label="Show as" className="flex gap-1 rounded-lg bg-slate-100 p-0.5">
          <ToggleGroup.Item value="map" aria-label="Map" className="grid h-8 w-8 place-items-center rounded-md text-slate-600 data-[state=on]:bg-white data-[state=on]:text-slate-900 data-[state=on]:shadow-sm cursor-pointer"><Network className="h-4 w-4" /></ToggleGroup.Item>
          <ToggleGroup.Item value="list" aria-label="List" data-testid="map-view-list" className="grid h-8 w-8 place-items-center rounded-md text-slate-600 data-[state=on]:bg-white data-[state=on]:text-slate-900 data-[state=on]:shadow-sm cursor-pointer"><List className="h-4 w-4" /></ToggleGroup.Item>
        </ToggleGroup.Root>
      </div>
      {view === 'map' ? (
        <svg viewBox="-10 -6 120 116" className="w-full rounded-2xl bg-slate-50 ring-1 ring-slate-200" role="group" aria-label={`Knowledge map: ${title}. Choose an idea to see how it is linked.`}>
          {edges.map((e) => {
            const a = at.get(e.from), b = at.get(e.to);
            if (!a || !b) return null;
            const on = sel && (e.from === sel.id || e.to === sel.id);
            return (
              <g key={`${e.from}-${e.to}`} aria-hidden>
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={on ? '#4338ca' : '#cbd5e1'} strokeWidth={on ? 0.9 : 0.5} />
                {on && (() => {
                  // The label beside the line at its middle, not on it.
                  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
                  const nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len;
                  const flip = ny < 0 ? -1 : 1;
                  return <text x={(a.x + b.x) / 2 + nx * 2.4 * flip} y={(a.y + b.y) / 2 + ny * 2.4 * flip + 1} textAnchor="middle" fontSize="3" fontWeight="700" fill="#312e81" stroke="#f8fafc" strokeWidth="0.8" paintOrder="stroke">{e.label}</text>;
                })()}
              </g>
            );
          })}
          {placed.map((p) => {
            const dim = sel && sel.id !== p.id && !linked.has(p.id);
            const lines = wrapLabel(p.label);
            return (
              <g key={p.id} role="button" tabIndex={0} aria-pressed={sel?.id === p.id} aria-label={`${p.label}, ${KIND_LABEL[p.kind]}, ${p.degree} link${p.degree === 1 ? '' : 's'}`}
                data-testid={`map-node-${p.id}`} onClick={() => pick(p.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(p.id); } }}
                className="cursor-pointer outline-none [&:focus-visible>circle]:stroke-indigo-500" opacity={dim ? 0.3 : 1}>
                <circle cx={p.x} cy={p.y} r="7" fill="transparent" />
                <circle cx={p.x} cy={p.y} r={p.hub ? 4.2 : 3} fill={p.hub ? '#312e81' : '#4f46e5'} stroke={sel?.id === p.id ? '#f59e0b' : '#ffffff'} strokeWidth={sel?.id === p.id ? 1.2 : 0.8} />
                <text x={p.x} y={p.y + (p.hub ? 8 : 6.8)} textAnchor="middle" fontSize={p.hub ? 4 : 3.5} fontWeight={p.hub ? 800 : 700} fill="#0f172a" stroke="#f8fafc" strokeWidth="0.7" paintOrder="stroke">
                  {lines.map((l, i) => <tspan key={i} x={p.x} dy={i ? 3.8 : 0}>{l}</tspan>)}
                </text>
                <text x={p.x} y={p.y + (p.hub ? 8 : 6.8) + lines.length * 3.8 - 0.6} textAnchor="middle" fontSize="2.8" fill="#64748b">{KIND_LABEL[p.kind]}</text>
              </g>
            );
          })}
        </svg>
      ) : (
        <ul className="space-y-2" data-testid="map-list">
          {placed.map((p) => (
            <li key={p.id} className="rounded-xl bg-slate-50 p-2.5 text-xs">
              <p className="font-bold text-slate-900">{p.label} <span className="font-normal text-slate-500">· {KIND_LABEL[p.kind]}</span></p>
              {p.summary && <p className="mt-0.5 text-slate-700">{p.summary}</p>}
              <ul className="mt-1 space-y-0.5 text-slate-600">{relationsOf(p.id, nodes, edges).map((r) => <li key={r.text} className="flex gap-1"><CornerDownRight className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />{r.text}</li>)}</ul>
            </li>
          ))}
        </ul>
      )}
      {view === 'map' && (sel ? (
        <div className="space-y-1.5 rounded-xl bg-indigo-50 p-3 text-xs ring-1 ring-indigo-100" role="status" data-testid="map-detail">
          <p className="font-bold text-indigo-950">{sel.label} <span className="font-normal text-indigo-800/80">· {KIND_LABEL[sel.kind]}</span></p>
          {sel.summary && <p className="text-indigo-950">{sel.summary}</p>}
          <ul className="space-y-0.5 text-indigo-900">{relationsOf(sel.id, nodes, edges).map((r) => <li key={r.text} className="flex gap-1"><CornerDownRight className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />{r.text}</li>)}</ul>
          {onJump && sel.paragraph !== null && (
            <button type="button" onClick={() => onJump(sel.paragraph!)} data-testid="map-jump" className="mt-1 min-h-9 rounded-lg bg-indigo-600 px-3 font-bold text-white hover:bg-indigo-500 cursor-pointer">Show it in the book</button>
          )}
        </div>
      ) : <p className="text-[11px] text-slate-500">Tap an idea to see how it is linked and where it is in the chapter.</p>)}
    </div>
  );
}
