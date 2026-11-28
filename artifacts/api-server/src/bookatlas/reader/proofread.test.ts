import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanIssues } from './proofread';

const chapter = 'Teh river ran thru the valley.\n\nAmara said, "We should of left earlier."';

test('proofreader: only suggestions that quote the chapter and change something are kept', () => {
  const raw = JSON.stringify({ issues: [
    { original: 'Teh river', suggestion: 'The river', kind: 'typo', reason: 'Letters swapped.' },
    { original: 'should of', suggestion: 'should have', kind: 'grammar', reason: '"Of" is not a verb.' },
    { original: 'an invented sentence', suggestion: 'something', kind: 'spelling' },
    { original: 'ran thru', suggestion: 'ran thru', kind: 'spelling' },
    { original: 'Teh river', suggestion: 'The river', kind: 'typo' },
    { original: 'the valley.', suggestion: 'the valley!', kind: 'shouting' },
  ] });
  const issues = cleanIssues(raw, chapter);
  assert.deepEqual(issues.map((i) => i.original), ['Teh river', 'should of', 'the valley.']);
  assert.equal(issues[2]!.kind, 'grammar', 'an unknown kind becomes grammar');
  assert.deepEqual(cleanIssues('not json', chapter), []);
  assert.deepEqual(cleanIssues('```json\n{"issues": []}\n```', chapter), []);
});
