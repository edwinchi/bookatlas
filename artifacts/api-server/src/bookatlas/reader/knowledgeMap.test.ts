import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_NODES, cleanKnowledgeMap } from './knowledgeMap.js';
import { accessFor } from '../../auth/policy.js';

test('knowledge map: nodes and links are cleaned', () => {
  const map = cleanKnowledgeMap({
    title: 'The first calendars',
    nodes: [
      { id: 'sirius', label: 'Sirius', kind: 'term', summary: 'The star whose rising marked the flood.', paragraph: 2 },
      { id: 'flood', label: 'The Nile flood', kind: 'event', summary: 'The yearly flood.', paragraph: 1 },
      { id: 'priests', label: 'Priests', kind: 'person', summary: 'They kept the records.', paragraph: 99 },
      { id: 'sirius2', label: 'sirius', kind: 'term', summary: 'A repeat of Sirius.' },
      { id: 'odd', label: 'Calendar', kind: 'weird', summary: 'Unknown kind becomes idea.', paragraph: 0 },
      { id: 'empty', label: '' },
      null,
    ],
    edges: [
      { from: 'sirius', to: 'flood', label: 'announces' },
      { from: 'flood', to: 'sirius', label: 'the same pair again' },
      { from: 'priests', to: 'odd', label: '' },
      { from: 'sirius2', to: 'priests', label: 'watched by' },
      { from: 'sirius', to: 'sirius', label: 'loop' },
      { from: 'ghost', to: 'flood', label: 'unknown node' },
    ],
  }, 5);
  assert.equal(map.title, 'The first calendars');
  assert.deepEqual(map.nodes.map((n) => n.id), ['sirius', 'the-nile-flood', 'priests', 'calendar']);
  assert.deepEqual(map.nodes.map((n) => n.paragraph), [1, 0, null, null], 'paragraphs counted from 0, out of range dropped');
  assert.equal(map.nodes[3]!.kind, 'idea');
  assert.deepEqual(map.edges, [
    { from: 'sirius', to: 'the-nile-flood', label: 'announces' },
    { from: 'priests', to: 'calendar', label: 'linked to' },
    { from: 'sirius', to: 'priests', label: 'watched by' },
  ]);
  const many = cleanKnowledgeMap({ nodes: Array.from({ length: 30 }, (_, i) => ({ id: `n${i}`, label: `Idea ${i}` })), edges: [] }, 10);
  assert.equal(many.nodes.length, MAX_NODES);
  assert.deepEqual(cleanKnowledgeMap('rubbish', 3), { title: '', nodes: [], edges: [] });
});

test('knowledge map: only signed-in readers', () => {
  assert.equal(accessFor('POST', '/api/reader/ai/map'), 'reader');
  assert.equal(accessFor('GET', '/api/reader/ai/map'), 'admin');
});
