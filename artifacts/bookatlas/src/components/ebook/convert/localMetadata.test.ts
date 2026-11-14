import test from 'node:test';
import assert from 'node:assert/strict';
import { localDetails } from './localMetadata.js';

const CATS = ['Mind Mastery & Quantum Awakening', 'Consciousness & Ancient Wisdom', 'Thriller & Crime', 'Business & Leadership'];
const INTRO = 'This book is for you whatever you believe. Consciousness shapes the world you see, and the mind can be trained to notice it. ' +
  'Each chapter offers practices for awareness, attention and quantum thinking that readers can use every day. Take what rings true and leave the rest.';

test('without AI, the title page, copyright page and introduction fill the form', () => {
  const excerpt = ['THE QUIET FIELD', 'Notes on Awareness and Attention', 'by', 'Ada Writer', 'Copyright © 2025 Ada Writer', 'All rights reserved.',
    '## Dedication', 'For my mother.', '## A Note to the Reader', INTRO, '## The First Practice', `${'Consciousness and the mind and quantum awareness. '.repeat(6)}`].join('\n');
  const d = localDetails({ excerpt, headings: ['Dedication', 'A Note to the Reader', 'The First Practice'], known: {} }, CATS);
  assert.equal(d.title, 'THE QUIET FIELD');
  assert.equal(d.subtitle, 'Notes on Awareness and Attention');
  assert.equal(d.author, 'Ada Writer');
  assert.deepEqual([d.copyrightYear, d.copyrightHolder], [2025, 'Ada Writer']);
  assert.equal(d.language, 'English');
  assert.ok(d.description!.startsWith('This book is for you') && d.description!.length >= 150 && d.description!.length <= 1200, 'the description comes from the introduction');
  assert.ok(d.description!.endsWith('.'), 'and ends on a whole sentence');
  assert.equal(d.categories?.[0], 'Mind Mastery & Quantum Awakening', 'categories match the book\'s own words');
  assert.ok(!d.categories!.includes('Thriller & Crime'));
  assert.ok(d.keywords!.includes('the first practice') || d.keywords!.includes('first practice'));
  assert.ok(!d.keywords!.some((k) => /dedication|note to the reader/.test(k)), 'front-matter headings are not keywords');
});

test('details in the EPUB package win; the language is detected from the text', () => {
  const dutch = 'De wereld is niet wat je denkt. Het is een veld van aandacht en je kunt leren om het te zien met een open hart en een rustige geest. '.repeat(4);
  const d = localDetails({ excerpt: `## Inleiding\n${dutch}`, headings: ['Inleiding'], known: { title: 'Het Stille Veld', author: 'Ada Schrijver' } }, CATS);
  assert.equal(d.title, 'Het Stille Veld');
  assert.equal(d.author, 'Ada Schrijver');
  assert.equal(d.language, 'Dutch');
});
