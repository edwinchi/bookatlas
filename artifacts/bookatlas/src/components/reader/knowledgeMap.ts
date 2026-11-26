/**
 * Knowledge map layout (master build plan M10): the most connected idea in the middle, the ideas linked to it on
 * an inner ring, the rest on an outer ring. Deterministic (the same map always looks the same). Positions are in
 * a 100 × 100 box. Pure, tested in knowledgeMap.test.ts.
 */
export type NodeKind = 'idea' | 'person' | 'place' | 'event' | 'term';
export interface MapNode { id: string; label: string; kind: NodeKind; summary: string; paragraph: number | null }
export interface MapEdge { from: string; to: string; label: string }
export interface Placed extends MapNode { x: number; y: number; hub: boolean; degree: number }

export function layoutMap(nodes: MapNode[], edges: MapEdge[]): Placed[] {
  if (!nodes.length) return [];
  const degree = new Map(nodes.map((n) => [n.id, 0]));
  for (const e of edges) { degree.set(e.from, (degree.get(e.from) ?? 0) + 1); degree.set(e.to, (degree.get(e.to) ?? 0) + 1); }
  // The hub: most links; on a tie, the one listed first (the AI lists the most important first).
  const hub = nodes.reduce((best, n) => ((degree.get(n.id) ?? 0) > (degree.get(best.id) ?? 0) ? n : best), nodes[0]!);
  const near = new Set(edges.flatMap((e) => (e.from === hub.id ? [e.to] : e.to === hub.id ? [e.from] : [])));
  const inner = nodes.filter((n) => n.id !== hub.id && near.has(n.id));
  const outer = nodes.filter((n) => n.id !== hub.id && !near.has(n.id));
  const ring = (list: MapNode[], r: number, offset: number) => list.map((n, i) => {
    const a = -Math.PI / 2 + offset + (i / list.length) * Math.PI * 2;
    return { n, x: Math.round((50 + r * Math.cos(a)) * 10) / 10, y: Math.round((50 + r * Math.sin(a)) * 10) / 10 };
  });
  const r1 = outer.length ? 28 : 38;
  const placed = [
    { n: hub, x: 50, y: 50 },
    // Half a step round, so no link from the middle runs straight down through a label.
    ...ring(inner, r1, inner.length > 1 ? Math.PI / inner.length : Math.PI / 4),
    ...ring(outer, 47, 0),
  ];
  return placed.map(({ n, x, y }) => ({ ...n, x, y, hub: n.id === hub.id, degree: degree.get(n.id) ?? 0 }));
}

/** A label on at most two lines of about 14 characters. */
export function wrapLabel(label: string, width = 14): string[] {
  const words = label.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  for (const w of words) {
    const last = lines[lines.length - 1];
    if (last !== undefined && (last + ' ' + w).length <= width) lines[lines.length - 1] = `${last} ${w}`;
    else lines.push(w);
  }
  if (lines.length <= 2) return lines;
  return [lines[0]!, `${lines.slice(1).join(' ').slice(0, width - 1)}…`];
}

/** The links of one idea, as sentences: "Sirius announces The Nile flood". */
export function relationsOf(id: string, nodes: MapNode[], edges: MapEdge[]) {
  const name = new Map(nodes.map((n) => [n.id, n.label]));
  return edges.filter((e) => e.from === id || e.to === id).map((e) => ({ other: e.from === id ? e.to : e.from, text: `${name.get(e.from)} ${e.label} ${name.get(e.to)}` }));
}
