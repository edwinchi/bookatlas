import test from 'node:test';
import assert from 'node:assert/strict';
import { YOUNG_STORIES } from '../../artifacts/api-server/src/bookatlas/reader/youngStories.ts';
import { STORIES } from '../../artifacts/bookatlas/src/components/reading/youngReaders.ts';

test('the server knows every Young readers story, with the same level, title and number of questions', () => {
  assert.deepEqual(
    YOUNG_STORIES.map((s) => ({ ...s })).sort((a, b) => a.id.localeCompare(b.id)),
    STORIES.map((s) => ({ id: s.id, level: s.level, title: s.title, questions: s.questions.length })).sort((a, b) => a.id.localeCompare(b.id)),
  );
});
