import type { Book } from '@workspace/bookatlas-catalog/types';
import type { Identity } from '../../auth/policy.js';
import { readableChapters, type Generate } from './ai.js';
import { ReaderError } from './service.js';

/**
 * Knowledge maps (master build plan M10, specification AI-005: concept graphs, topic relationships, visual
 * learning maps). For one chapter, the AI names its main people, ideas, places, events and terms, how they are
 * linked ("causes", "teaches", "part of"…) and the paragraph where each one matters, so the reader can jump there.
 * Only the chapter text is used; the map is the same for every reader of a chapter, so it is cached.
 */
export const NODE_KINDS = ['idea', 'person', 'place', 'event', 'term'] as const;
export type NodeKind = (typeof NODE_KINDS)[number];
export interface MapNode { id: string; label: string; kind: NodeKind; summary: string; paragraph: number | null }
export interface MapEdge { from: string; to: string; label: string }
export interface KnowledgeMap { title: string; nodes: MapNode[]; edges: MapEdge[] }

export const MAX_NODES = 14;
const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '');
const slug = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 40);

/** What the AI sent, made safe: unique nodes (at most 14), links only between known nodes, no loops or repeats. */
export function cleanKnowledgeMap(data: unknown, paragraphs: number): KnowledgeMap {
  const d = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const nodes: MapNode[] = [];
  const byKey = new Map<string, string>();
  for (const raw of Array.isArray(d.nodes) ? d.nodes : []) {
    const n = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const label = clean(n.label, 60);
    const id = slug(label);
    const alias = typeof n.id === 'string' ? slug(n.id) : '';
    if (!id) continue;
    // The same idea twice: its id points at the first one.
    if (nodes.some((x) => x.id === id)) { if (alias && !byKey.has(alias)) byKey.set(alias, id); continue; }
    if (nodes.length >= MAX_NODES) continue;
    byKey.set(id, id);
    if (alias && !byKey.has(alias)) byKey.set(alias, id);
    const p = Number(n.paragraph);
    nodes.push({
      id, label, kind: NODE_KINDS.includes(n.kind as NodeKind) ? n.kind as NodeKind : 'idea', summary: clean(n.summary, 240),
      // The prompt numbers paragraphs from 1; the reader counts from 0.
      paragraph: Number.isInteger(p) && p >= 1 && p <= paragraphs ? p - 1 : null,
    });
  }
  const edges: MapEdge[] = [];
  const seen = new Set<string>();
  for (const raw of Array.isArray(d.edges) ? d.edges : []) {
    const e = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const from = byKey.get(slug(String(e.from ?? ''))), to = byKey.get(slug(String(e.to ?? '')));
    if (!from || !to || from === to) continue;
    const k = [from, to].sort().join('|');
    if (seen.has(k)) continue;
    seen.add(k);
    edges.push({ from, to, label: clean(e.label, 40) || 'linked to' });
  }
  return { title: clean(d.title, 80), nodes, edges: edges.slice(0, 30) };
}

const cache = new Map<string, KnowledgeMap>();
export async function knowledgeMap(generate: Generate, book: Book, who: Identity, body: Record<string, unknown>) {
  const { access, chapters } = await readableChapters(book, who);
  const ci = Number(body.chapterIndex);
  const chapter = Number.isInteger(ci) ? chapters[ci] : undefined;
  if (!chapter) throw new ReaderError(access === 'preview' ? 'This chapter is not in the free preview. Buy the book to map it.' : 'Unknown chapter.', access === 'preview' ? 403 : 404);
  // Numbered paragraphs, so each idea can point at where it matters.
  let total = 0;
  const numbered: string[] = [];
  for (const [i, p] of chapter.content.entries()) {
    if (total > 20_000) break;
    const line = `[${i + 1}] ${p.replace(/"""/g, '"')}`;
    numbered.push(line); total += line.length;
  }
  if (chapter.content.join(' ').replace(/\s+/g, ' ').length < 200) throw new ReaderError('This chapter is too short to map.', 409);
  const key = `${book.id}|${ci}|${access}`;
  const known = cache.get(key);
  if (known) return { chapterIndex: ci, cached: true, ...known };
  const raw = await generate({
    jsonMode: true, temperature: 0.2,
    systemInstruction: `You draw a knowledge map of one chapter of "${book.title}" by ${book.author} for a reader who wants to see how its ideas connect. Use only the chapter text; write in its language. Reply with JSON only: {"title": "the chapter's main topic in a few words", "nodes": [{"id": "short-id", "label": "2 to 4 words", "kind": "idea" | "person" | "place" | "event" | "term", "summary": "one sentence on its role in the chapter", "paragraph": the number in [brackets] of the paragraph where it matters most}], "edges": [{"from": "id", "to": "id", "label": "1 to 3 words, e.g. causes, teaches, part of, leads to"}]}. 6 to 12 nodes, the most important first; 6 to 16 edges, only between nodes you listed. No spoilers beyond this chapter.`,
    messages: [{ role: 'user', text: `Chapter ${ci + 1}: "${chapter.title}"\n"""${numbered.join('\n')}"""` }],
  });
  let parsed: unknown;
  try { const m = (raw ?? '').match(/\{[\s\S]*\}/); parsed = JSON.parse(m ? m[0] : raw ?? ''); } catch { throw new ReaderError('The AI assistant returned an unreadable map. Please try again.', 502); }
  const map = cleanKnowledgeMap(parsed, chapter.content.length);
  if (map.nodes.length < 3 || !map.edges.length) throw new ReaderError('The AI assistant could not map this chapter. Please try again.', 502);
  if (!map.title) map.title = chapter.title;
  cache.set(key, map);
  return { chapterIndex: ci, cached: false, ...map };
}
