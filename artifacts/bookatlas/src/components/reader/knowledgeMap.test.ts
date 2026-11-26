import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutMap, relationsOf, wrapLabel, type MapEdge, type MapNode } from './knowledgeMap';

const node = (id: string, label = id): MapNode => ({ id, label, kind: 'idea', summary: '', paragraph: null });
const nodes = ['flood', 'sirius', 'priests', 'calendar', 'farmers', 'stone circle'].map((n) => node(n.replace(' ', '-'), n));
const edges: MapEdge[] = [
  { from: 'sirius', to: 'flood', label: 'announces' },
  { from: 'priests', to: 'sirius', label: 'watch' },
  { from: 'sirius', to: 'calendar', label: 'sets' },
  { from: 'farmers', to: 'flood', label: 'wait for' },
];

test('knowledge map layout: the most linked idea in the middle, its links around it, the rest outside', () => {
  const placed = layoutMap(nodes, edges);
  assert.equal(placed.length, 6);
  const hub = placed.find((p) => p.hub)!;
  assert.equal(hub.id, 'sirius');
  assert.deepEqual([hub.x, hub.y], [50, 50]);
  const dist = (id: string) => { const p = placed.find((x) => x.id === id)!; return Math.round(Math.hypot(p.x - 50, p.y - 50)); };
  assert.equal(dist('flood'), 28, 'linked to the hub: inner ring');
  assert.equal(dist('farmers'), 47, 'not linked to the hub: outer ring');
  assert.ok(placed.every((p) => p.x >= 0 && p.x <= 100 && p.y >= 0 && p.y <= 100));
  assert.deepEqual(layoutMap(nodes, edges), placed, 'the same map always looks the same');
  assert.deepEqual(layoutMap([], []), []);
});

test('knowledge map: labels wrap to two lines, links read as sentences', () => {
  assert.deepEqual(wrapLabel('The Nile flood'), ['The Nile flood']);
  assert.deepEqual(wrapLabel('Stone calendar circle at Nabta'), ['Stone calendar', 'circle at Nab…']);
  assert.deepEqual(relationsOf('flood', nodes, edges).map((r) => r.text), ['sirius announces flood', 'farmers wait for flood']);
});
