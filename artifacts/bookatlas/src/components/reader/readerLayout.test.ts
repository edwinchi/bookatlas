import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FOCUS_MODES, focusModeOf, paragraphFocusClass, withFocusMode, zenLayout } from './readerLayout';

// Master build plan M3 (specification SR-004 Focus Reader and its "Focus Reader tests").
test('focus reader: the paragraph being read stays clear, the others dim (and blur in spotlight)', () => {
  assert.match(paragraphFocusClass('spotlight', true), /opacity-100/, 'highlights the current paragraph');
  assert.match(paragraphFocusClass('spotlight', false), /opacity-30/, 'dims the others');
  assert.match(paragraphFocusClass('spotlight', false), /blur/);
  assert.match(paragraphFocusClass('spotlight', false), /motion-reduce:blur-0/, 'no blur for readers who reduce motion');
  assert.match(paragraphFocusClass('paragraph', false), /opacity-35/);
  assert.doesNotMatch(paragraphFocusClass('paragraph', false), /blur/);
  assert.equal(paragraphFocusClass('off', false), '');
  assert.equal(paragraphFocusClass('line', false), '', 'line focus is the guide band, not dimming');
});

test('focus reader: one mode at a time, and switching modes', () => {
  for (const m of FOCUS_MODES) assert.equal(focusModeOf(withFocusMode(m)), m);
  assert.deepEqual(withFocusMode('spotlight'), { readingGuide: false, focusParagraph: false, spotlight: true });
  assert.equal(focusModeOf({ readingGuide: false, focusParagraph: true, spotlight: false }), 'paragraph', 'earlier settings keep working');
  assert.equal(focusModeOf({ readingGuide: true, focusParagraph: true, spotlight: false }), 'line');
});

test('focus reader: zen hides the toolbars and the community markers', () => {
  assert.deepEqual(zenLayout(true), { toolbars: false, community: false });
  assert.deepEqual(zenLayout(false), { toolbars: true, community: true });
});

test('quick set-ups for dyslexia, attention and low vision: one tap, and the set-up in use is shown', async () => {
  const { AID_PRESETS, activePreset, DEFAULT_LAYOUT } = await import('./readerLayout');
  const { DEFAULT_READER_SETTINGS, sanitizeReaderSettings } = await import('../../utils/readerSettings');
  const layout = { ...DEFAULT_LAYOUT };
  assert.equal(activePreset(DEFAULT_READER_SETTINGS, layout), null);
  for (const p of AID_PRESETS) {
    const settings = sanitizeReaderSettings({ ...DEFAULT_READER_SETTINGS, ...p.settings });
    assert.deepEqual(settings, { ...DEFAULT_READER_SETTINGS, ...p.settings }, `${p.id}: every value is a valid setting`);
    assert.equal(activePreset(settings, { ...layout, ...p.layout }), p.id);
  }
  const attention = AID_PRESETS.find((p) => p.id === 'attention')!;
  assert.equal(attention.layout.focusParagraph, true);
  assert.equal(attention.layout.readingGuide, false, 'one focus mode at a time');
});
