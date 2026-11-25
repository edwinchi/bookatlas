import { ReaderError, getPreferences, readerMemory, saveSettingsKey } from './service.js';
import { bookatlasDb } from '../db/supabaseClient.js';

/**
 * Young readers in classes (Reading Intelligence phase 8, owner request 2026-11-25). A teacher can put the Young
 * readers stories on a class reading list next to books; they are stored there as "ya.<story id>". When a
 * signed-in reader answers a story's questions, the best score is kept in their reader settings, so the teacher
 * sees it. The list must match the stories in artifacts/bookatlas/src/components/reading/youngReaders.ts (a test
 * checks this).
 */
export const YOUNG_PREFIX = 'ya.';
export const YOUNG_STORIES: { id: string; level: 1 | 2 | 3; title: string; questions: number }[] = [
  { id: 'red-hat', level: 1, title: 'The Red Hat', questions: 3 },
  { id: 'big-pot', level: 1, title: 'Mum and the Big Pot', questions: 3 },
  { id: 'little-boat', level: 1, title: 'The Little Boat', questions: 3 },
  { id: 'market-day', level: 1, title: 'Market Day', questions: 3 },
  { id: 'lost-kite', level: 2, title: 'The Lost Kite', questions: 3 },
  { id: 'garden-surprise', level: 2, title: 'A Garden Surprise', questions: 3 },
  { id: 'brave-hen', level: 2, title: 'The Brave Little Hen', questions: 3 },
  { id: 'rainy-picnic', level: 2, title: 'The Rainy Picnic', questions: 3 },
  { id: 'quiet-library', level: 3, title: 'The Quiet Library', questions: 3 },
  { id: 'storm-night', level: 3, title: 'The Night of the Storm', questions: 3 },
  { id: 'new-girl', level: 3, title: 'The New Girl', questions: 3 },
  { id: 'old-clock', level: 3, title: 'Grandma’s Old Clock', questions: 3 },
];
const byId = new Map(YOUNG_STORIES.map((s) => [s.id, s]));
export const isYoung = (bookId: string) => bookId.startsWith(YOUNG_PREFIX);
export const youngStory = (bookId: string) => (isYoung(bookId) ? byId.get(bookId.slice(YOUNG_PREFIX.length)) ?? null : null);
/** The title a reading list shows for a story ("Young readers · The Red Hat"). */
export const youngTitle = (bookId: string) => { const s = youngStory(bookId); return s ? `Young readers · ${s.title}` : null; };

export const YOUNG_KEY = 'youngStories';
export interface StoryResult { right: number; total: number; at: string }

export function readYoungResults(raw: unknown): Record<string, StoryResult> {
  const out: Record<string, StoryResult> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    const r = v as Record<string, unknown> | null;
    if (!byId.has(id) || !r) continue;
    const right = Number(r.right), total = Number(r.total);
    if (Number.isInteger(right) && Number.isInteger(total) && total > 0 && right >= 0 && right <= total && typeof r.at === 'string') out[id] = { right, total, at: r.at };
  }
  return out;
}

/** A signed-in reader answered a story's questions; the best score is kept. */
export async function recordYoungStory(userId: string, body: Record<string, unknown>, now = new Date()) {
  const id = typeof body.storyId === 'string' ? body.storyId : '';
  const story = byId.get(id);
  if (!story) throw new ReaderError('Unknown story.', 404);
  const right = Number(body.right);
  if (!Number.isInteger(right) || right < 0 || right > story.questions) throw new ReaderError('Send the number of right answers.');
  const all = readYoungResults((await getPreferences(userId))?.settings?.[YOUNG_KEY]);
  if (!all[id] || right > all[id]!.right) {
    all[id] = { right, total: story.questions, at: now.toISOString() };
    await saveSettingsKey(userId, YOUNG_KEY, all);
  }
  return { storyId: id, best: all[id]! };
}

/** The story results of several readers (for a teacher's class view). */
export async function youngResultsOf(userIds: string[]): Promise<Map<string, Record<string, StoryResult>>> {
  const out = new Map<string, Record<string, StoryResult>>();
  if (!userIds.length) return out;
  if (!bookatlasDb) {
    for (const id of userIds) out.set(id, readYoungResults(readerMemory().prefs.get(id)?.settings?.[YOUNG_KEY]));
    return out;
  }
  const r = await bookatlasDb.from('reader_preferences').select('user_id,settings').in('user_id', userIds).limit(1000);
  if (r.error) throw new ReaderError('Schools and teams are not available right now. Please try again later.', 503);
  for (const row of r.data as { user_id: string; settings: Record<string, unknown> }[]) out.set(row.user_id, readYoungResults(row.settings?.[YOUNG_KEY]));
  return out;
}
