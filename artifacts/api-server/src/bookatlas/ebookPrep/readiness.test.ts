import test from 'node:test';
import assert from 'node:assert/strict';
import type { SubmissionIntake } from '@workspace/bookatlas-catalog/publishing';
import { auditChapters, readinessPackage } from './readiness.js';

const intake: SubmissionIntake = {
  title: 'The Revelation Protocol', subtitle: 'The Apocalypse as the Unveiling of the Electric Soul', author: 'Apehgong Edwin Chi',
  language: 'English', description: 'What if the Book of Revelation was never intended to predict the end of the world? '.repeat(4),
  categories: ['Consciousness & Ancient Wisdom', 'Mind Mastery & Quantum Awakening'], keywords: ['revelation', 'apocalypse', 'awakening'],
  copyrightHolder: 'Atlantean Globals Empire', copyrightYear: 2026, price: 9.99, rightsConfirmed: true, aiContent: 'assisted', wantsPrint: false,
};
const repeated = 'This passage is long enough to count as a real paragraph of prose that a reader would notice if it appeared twice in the book.';

test('the chapter audit finds placeholders, doubled words, repeated passages, missing image descriptions and claims', () => {
  const [front, one, two] = auditChapters([
    { title: 'The Revelation Protocol', content: ['Copyright 2026'], figures: [{ at: 0, src: 'img-0001.png', alt: '' }] },
    { title: 'Revelation 1', content: ['As the the architect said, lorem ipsum.', repeated, 'In 1947 studies show 40% of readers agree.'], figures: [{ at: 1, src: 'img-0002.png', alt: 'image 3' }] },
    { title: 'Revelation 2', content: [repeated, 'Had had she known, that that was enough. '.repeat(10)] },
  ]);
  assert.equal(front!.ready, true, 'a short title page with its cover is fine');
  assert.equal(one!.editing, 'fix', 'placeholder text');
  assert.equal(one!.duplication, 'review');
  assert.equal(one!.imagesCheck, 'review', '"image 3" is not a description');
  assert.equal(one!.factCheck, 'manual');
  assert.match(one!.notes.join(' '), /doubled word, for example "the the architect/);
  assert.equal(two!.editing, 'ok', '"had had" and "that that" are correct English');
  assert.equal(two!.duplication, 'review');
});

test('the readiness package follows the KDP and Lulu audit guide', () => {
  const pkg = readinessPackage(intake, null, [{ title: 'Introduction', content: ['A calm opening paragraph with enough words to read. '.repeat(20)] }]);
  assert.ok(pkg.score < 90, 'no preparation report yet');
  assert.ok(pkg.issues.some((i) => /3 of 7 keywords/.test(i.text)));
  assert.deepEqual(pkg.metadata.categories.slice(0, 1), ['Body, Mind & Spirit > Ancient Mysteries & Controversial Knowledge']);
  assert.match(pkg.copyright, /^Copyright © 2026 Atlantean Globals Empire\.[\s\S]*Published by Atlantean Globals Empire\.$/);
  for (const section of ['# Executive Summary', '# Publication Readiness Score', '# Major Issues Requiring Correction', '# Chapter-by-Chapter Audit',
    '# Amazon KDP Upload Checklist — eBook', '# Amazon KDP Upload Checklist — Print', '# Lulu Upload Checklist', '# KDP Metadata Package', '# Amazon Book Description', '# Copyright Page']) {
    assert.ok(pkg.markdown.includes(section), section);
  }
  assert.equal(pkg.kdpPrint[0]!.status, 'n/a', 'print not requested');
  const print = readinessPackage({ ...intake, wantsPrint: true, binding: 'paperback', trimSize: '6x9', paper: 'cream', pageCount: 320 }, null, []);
  assert.match(print.kdpPrint.find((i) => i.label.startsWith('Full-wrap'))!.detail, /spine 0\.8 in/);
});
