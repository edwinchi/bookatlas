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
  // 2026-11-26: 29 more at each level (maths, science and bedtime stories).
  { id: 'three-ducks', level: 1, title: 'Three Little Ducks', questions: 3 },
  { id: 'shape-hunt', level: 1, title: 'The Shape Hunt', questions: 3 },
  { id: 'big-small', level: 1, title: 'Big and Small', questions: 3 },
  { id: 'five-apples', level: 1, title: 'Five Red Apples', questions: 3 },
  { id: 'square-cake', level: 1, title: 'The Square Cake', questions: 3 },
  { id: 'long-snake', level: 1, title: 'The Long Snake', questions: 3 },
  { id: 'star-count', level: 1, title: 'Counting Stars', questions: 3 },
  { id: 'round-wheels', level: 1, title: 'Round and Round', questions: 3 },
  { id: 'socks-pairs', level: 1, title: 'Pairs of Socks', questions: 3 },
  { id: 'triangle-tent', level: 1, title: 'The Triangle Tent', questions: 3 },
  { id: 'ice-melts', level: 1, title: 'The Ice Melts', questions: 3 },
  { id: 'seed-grows', level: 1, title: 'A Seed Grows', questions: 3 },
  { id: 'magic-magnet', level: 1, title: 'The Magic Magnet', questions: 3 },
  { id: 'float-sink', level: 1, title: 'Float or Sink?', questions: 3 },
  { id: 'my-shadow', level: 1, title: 'My Shadow', questions: 3 },
  { id: 'five-senses', level: 1, title: 'My Five Senses', questions: 3 },
  { id: 'rain-cloud', level: 1, title: 'The Rain Cloud', questions: 3 },
  { id: 'egg-butterfly', level: 1, title: 'From Egg to Butterfly', questions: 3 },
  { id: 'hot-cold', level: 1, title: 'Hot and Cold', questions: 3 },
  { id: 'busy-bee', level: 1, title: 'The Busy Bee', questions: 3 },
  { id: 'sleepy-bear', level: 1, title: 'The Sleepy Bear', questions: 3 },
  { id: 'hello-moon', level: 1, title: 'Hello, Moon', questions: 3 },
  { id: 'owl-night', level: 1, title: 'The Owl at Night', questions: 3 },
  { id: 'where-teddy', level: 1, title: 'Where Is Teddy?', questions: 3 },
  { id: 'counting-sheep', level: 1, title: 'Counting Sheep', questions: 3 },
  { id: 'quiet-house', level: 1, title: 'The Quiet House', questions: 3 },
  { id: 'little-star', level: 1, title: 'The Little Star', questions: 3 },
  { id: 'warm-milk', level: 1, title: 'Warm Milk', questions: 3 },
  { id: 'firefly', level: 1, title: 'The Firefly', questions: 3 },
  { id: 'shape-town', level: 2, title: 'The Town of Shapes', questions: 3 },
  { id: 'fair-shares', level: 2, title: 'Fair Shares', questions: 3 },
  { id: 'what-time', level: 2, title: 'What Time Is It?', questions: 3 },
  { id: 'bead-pattern', level: 2, title: 'The Bead Pattern', questions: 3 },
  { id: 'tall-bean', level: 2, title: 'How Tall Is the Bean?', questions: 3 },
  { id: 'toy-shop', level: 2, title: 'The Toy Shop', questions: 3 },
  { id: 'mirror-butterfly', level: 2, title: 'The Mirror Butterfly', questions: 3 },
  { id: 'counting-legs', level: 2, title: 'Counting Legs', questions: 3 },
  { id: 'box-shape', level: 2, title: 'The Box Shape', questions: 3 },
  { id: 'pizza-quarters', level: 2, title: 'Halves and Quarters', questions: 3 },
  { id: 'raindrop-journey', level: 2, title: 'The Journey of a Raindrop', questions: 3 },
  { id: 'eight-planets', level: 2, title: 'A Trip Past the Planets', questions: 3 },
  { id: 'heart-drum', level: 2, title: 'The Drum Inside You', questions: 3 },
  { id: 'making-rainbow', level: 2, title: 'Making a Rainbow', questions: 3 },
  { id: 'push-pull', level: 2, title: 'Pushes and Pulls', questions: 3 },
  { id: 'our-teeth', level: 2, title: 'Our Teeth', questions: 3 },
  { id: 'singing-glass', level: 2, title: 'The Singing Glass', questions: 3 },
  { id: 'plants-eat', level: 2, title: 'How Plants Eat', questions: 3 },
  { id: 'dinosaur-bones', level: 2, title: 'The Dinosaur Bones', questions: 3 },
  { id: 'light-bulb', level: 2, title: 'The Light Bulb', questions: 3 },
  { id: 'moon-boat', level: 2, title: 'The Moon Boat', questions: 3 },
  { id: 'dream-jar', level: 2, title: 'The Dream Jar', questions: 3 },
  { id: 'night-garden', level: 2, title: 'The Night Garden', questions: 3 },
  { id: 'lighthouse-keeper', level: 2, title: 'The Lighthouse Keeper', questions: 3 },
  { id: 'yawning-zoo', level: 2, title: 'The Yawning Zoo', questions: 3 },
  { id: 'blanket-fort', level: 2, title: 'The Blanket Fort', questions: 3 },
  { id: 'first-snow', level: 2, title: 'The First Snow', questions: 3 },
  { id: 'whale-lullaby', level: 2, title: 'The Whale’s Lullaby', questions: 3 },
  { id: 'sleepy-train', level: 2, title: 'The Sleepy Train', questions: 3 },
  { id: 'angle-detectives', level: 3, title: 'The Angle Detectives', questions: 3 },
  { id: 'secret-pi', level: 3, title: 'The Secret Number of Circles', questions: 3 },
  { id: 'tiled-floor', level: 3, title: 'The Tiled Floor', questions: 3 },
  { id: 'garden-area', level: 3, title: 'Planning the Garden', questions: 3 },
  { id: 'sunflower-spiral', level: 3, title: 'The Sunflower Spiral', questions: 3 },
  { id: 'rice-doubling', level: 3, title: 'A Reward of Rice', questions: 3 },
  { id: 'treasure-grid', level: 3, title: 'The Treasure Map', questions: 3 },
  { id: 'what-chances', level: 3, title: 'What Are the Chances?', questions: 3 },
  { id: 'below-zero', level: 3, title: 'Below Zero', questions: 3 },
  { id: 'polygon-party', level: 3, title: 'The Polygon Party', questions: 3 },
  { id: 'inside-volcano', level: 3, title: 'Inside a Volcano', questions: 3 },
  { id: 'why-fall', level: 3, title: 'Why Things Fall', questions: 3 },
  { id: 'food-chain', level: 3, title: 'Who Eats Whom?', questions: 3 },
  { id: 'busy-brain', level: 3, title: 'The Busy Brain', questions: 3 },
  { id: 'three-states', level: 3, title: 'Solid, Liquid, Gas', questions: 3 },
  { id: 'bottle-journey', level: 3, title: 'The Journey of a Bottle', questions: 3 },
  { id: 'light-long-ago', level: 3, title: 'Light from Long Ago', questions: 3 },
  { id: 'invisible-world', level: 3, title: 'The Invisible World', questions: 3 },
  { id: 'why-seasons', level: 3, title: 'Why We Have Seasons', questions: 3 },
  { id: 'strongest-shape', level: 3, title: 'The Strongest Shape', questions: 3 },
  { id: 'star-map', level: 3, title: 'Grandpa’s Star Map', questions: 3 },
  { id: 'lighthouse-cat', level: 3, title: 'The Lighthouse Cat', questions: 3 },
  { id: 'owl-library', level: 3, title: 'The Owl’s Library', questions: 3 },
  { id: 'night-sounds', level: 3, title: 'Sounds of the Night', questions: 3 },
  { id: 'wishing-boats', level: 3, title: 'The Wishing Boats', questions: 3 },
  { id: 'clockmaker-dream', level: 3, title: 'The Clockmaker’s Dream', questions: 3 },
  { id: 'changing-moon', level: 3, title: 'The Changing Moon', questions: 3 },
  { id: 'mountain-hut', level: 3, title: 'The Hut on the Mountain', questions: 3 },
  { id: 'dream-painter', level: 3, title: 'The Dream Painter', questions: 3 },
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
