import type { Book } from '@workspace/bookatlas-catalog/types';
import type { Identity } from '../../auth/policy.js';
import { readableContent } from '../ebookPrep/service.js';
import { ReaderError } from './service.js';

/**
 * BooksAtlas Reader Phase 2 (cycle 8, bookatlascode_ebook_reader.md): ask the book, study tools, explain,
 * simplify, translate and define. Answers use only the text this reader may read (the preview, or the whole
 * book once bought), so the AI never leaks the rest of a paid book. Retrieval is keyword-based (BM25) over
 * paragraph windows: no embeddings service, no extra cost.
 */
export type Generate = (opts: { systemInstruction?: string; messages: { role: 'user' | 'model'; text: string }[]; jsonMode?: boolean; temperature?: number }) => Promise<string | null>;
type ReaderChapter = { title: string; content: string[] };

// ------------------------------------------------------------------------------------------- daily limit

/** Each signed-in reader gets this many AI requests a day (owner cost control; Plus will lift it). */
export const DAILY_AI_LIMIT = 40;
const usage = new Map<string, { day: string; count: number }>();
export function useAiQuota(userId: string, now = new Date()) {
  const day = now.toISOString().slice(0, 10);
  const u = usage.get(userId);
  const count = u?.day === day ? u.count : 0;
  if (count >= DAILY_AI_LIMIT) throw new ReaderError(`You have used today's ${DAILY_AI_LIMIT} AI requests. They reset at midnight (UTC).`, 429);
  usage.set(userId, { day, count: count + 1 });
  return DAILY_AI_LIMIT - count - 1;
}
export const resetAiQuota = () => usage.clear();
/** A request that failed does not count. */
export function refundAiQuota(userId: string) { const u = usage.get(userId); if (u && u.count > 0) u.count -= 1; }

// ------------------------------------------------------------------------------------------- the readable text

export async function readableChapters(book: Book, who: Identity): Promise<{ access: 'full' | 'preview'; chapters: ReaderChapter[] }> {
  if (book.hasReaderContent) {
    const r = await readableContent(book.id, who, book.price);
    return { access: r.access, chapters: r.chapters.map((c) => ({ title: c.title, content: c.content })) };
  }
  // Catalogue titles without a prepared file: only their sample chapters exist.
  return { access: 'preview', chapters: (book.sampleChapters ?? []).map((c) => ({ title: c.title, content: c.content })) };
}

// ------------------------------------------------------------------------------------------- retrieval

const STOP = new Set('a an and are as at be but by for from has have he her his i in is it its me my of on or our she so that the their them they this to was we were what when where which who why will with you your about into than then there these those do does did how can could would should not no yes also just only over very more most such been being am'.split(' '));
/** A light stem, so "walks", "walked" and "walking" meet "walk". Short words are left alone. */
export const stem = (w: string) => { const x = w.length > 5 ? w.replace(/(ing|ed)$/, '') : w; return x.length > 3 && !x.endsWith('ss') ? x.replace(/s$/, '') : x; };
const terms = (t: string) => (t.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').match(/[\p{L}\p{N}]{2,}/gu)?.filter((w) => !STOP.has(w)) ?? []).map(stem);

export interface Passage { chapterIndex: number; paragraphIndex: number; text: string; /** 0 when it is only the start of the reader's chapter. */ score: number }

/** Windows of up to 3 paragraphs, ranked by BM25 against the question; ties favour the reader's chapter. */
export function retrieve(chapters: ReaderChapter[], question: string, near?: { chapterIndex: number }, k = 6): Passage[] {
  const windows: (Passage & { words: string[] })[] = [];
  chapters.forEach((c, ci) => {
    for (let p = 0; p < c.content.length; p += 2) {
      const text = c.content.slice(p, p + 3).join('\n');
      if (text.trim()) windows.push({ chapterIndex: ci, paragraphIndex: p, text: text.slice(0, 1800), words: terms(text), score: 0 });
    }
  });
  const q = [...new Set(terms(question))];
  if (!windows.length) return [];
  const avg = windows.reduce((n, w) => n + w.words.length, 0) / windows.length || 1;
  const df = new Map(q.map((t) => [t, windows.filter((w) => w.words.includes(t)).length]));
  const scored = windows.map((w) => {
    let s = 0;
    for (const t of q) {
      const tf = w.words.filter((x) => x === t).length;
      if (!tf) continue;
      const idf = Math.log(1 + (windows.length - df.get(t)! + 0.5) / (df.get(t)! + 0.5));
      s += idf * ((tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * (w.words.length / avg))));
    }
    if (near && w.chapterIndex === near.chapterIndex) s += 0.15;
    return { w, s };
  }).sort((a, b) => b.s - a.s);
  const picked = scored.filter((x) => x.s > 0.15).slice(0, k).map((x) => ({ ...x.w, score: Math.round(x.s * 100) / 100 }));
  // A vague question ("what is this chapter about?") gets the start of the reader's chapter.
  if (!picked.length && near) return windows.filter((w) => w.chapterIndex === near.chapterIndex).slice(0, 3).map(({ words: _w, ...p }) => p);
  return picked.map(({ words: _w, ...p }) => p);
}

// ------------------------------------------------------------------------------------------- prompts

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max) : '');
const fence = (t: string) => t.replace(/"""/g, '"');
const persona = (book: Book) => `You are the BooksAtlas reading assistant inside the reader of "${book.title}" by ${book.author}. Write in the language of the reader's question. Be accurate, clear and concise. Never invent facts about the book; if the excerpts do not answer, say so.`;

async function ask(generate: Generate, opts: Parameters<Generate>[0]) {
  const text = await generate({ temperature: 0.3, ...opts });
  if (!text?.trim()) throw new ReaderError('The AI assistant is not available right now. Please try again in a minute.', 503);
  return text.trim();
}
function parseJson<T>(raw: string): T {
  const m = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  try { return JSON.parse(m ? m[0] : raw) as T; } catch { throw new ReaderError('The AI assistant returned an unreadable answer. Please try again.', 502); }
}

/** The question as search words in the language of the book (names, synonyms), for the keyword search. */
async function searchWords(generate: Generate, chapters: ReaderChapter[], question: string) {
  const sample = chapters.flatMap((c) => c.content).join(' ').replace(/\s+/g, ' ').slice(0, 400);
  const raw = await generate({
    temperature: 0, systemInstruction: 'You help a keyword search inside one book. Reply with 4 to 12 search words only, separated by spaces: the important words of the question translated into the language of the book sample, plus close synonyms and any names. No sentences, no punctuation.',
    messages: [{ role: 'user', text: `Book sample:\n"""${fence(sample)}"""\n\nQuestion: ${question}` }],
  });
  return clean(raw, 300).replace(/[^\p{L}\p{N}\s'-]/gu, ' ');
}

export async function askBook(generate: Generate, book: Book, who: Identity, body: Record<string, unknown>) {
  const question = clean(body.question, 600);
  if (question.length < 3) throw new ReaderError('Ask a question about the book.');
  const { access, chapters } = await readableChapters(book, who);
  const chapterIndex = Math.min(Math.max(0, Number(body.chapterIndex) || 0), Math.max(0, chapters.length - 1));
  const history = Array.isArray(body.history) ? body.history.slice(-6).map((h) => ({ role: (h as { role?: string }).role === 'assistant' ? 'model' as const : 'user' as const, text: clean((h as { text?: unknown }).text, 1200) })).filter((h) => h.text) : [];
  let passages = retrieve(chapters, question, { chapterIndex });
  // Nothing matched word for word (a question in another language, other words for the same thing, or a
  // follow-up like "and then?"): the AI turns it into search words in the book's own language, once.
  if (!passages.some((p) => p.score > 0)) {
    const before = history.filter((h) => h.role === 'user').slice(-1).map((h) => h.text).join(' ');
    const words = await searchWords(generate, chapters, `${before} ${question}`.trim()).catch(() => '');
    if (words) { const again = retrieve(chapters, `${words} ${before}`, { chapterIndex }); if (again.some((p) => p.score > 0)) passages = again; }
  }
  if (!passages.length) throw new ReaderError('This book has no readable text to answer from yet.', 409);
  const excerpts = passages.map((p, i) => `[${i + 1}] ${chapters[p.chapterIndex]!.title} (chapter ${p.chapterIndex + 1}):\n"""${fence(p.text)}"""`).join('\n\n');
  const answer = await ask(generate, {
    systemInstruction: `${persona(book)}\nAnswer ONLY from the numbered excerpts below and cite them like [1] or [2]. ${access === 'preview' ? 'The reader has only the free preview; if the answer is probably later in the book, say it is beyond the preview without guessing.' : ''}\nThe reader is in chapter ${chapterIndex + 1}: "${chapters[chapterIndex]?.title ?? ''}". Avoid spoilers beyond that chapter unless asked.\n\nExcerpts:\n${excerpts}`,
    messages: [...history, { role: 'user', text: question }],
  });
  const cited = new Set([...answer.matchAll(/\[(\d{1,2})\]/g)].map((m) => Number(m[1]) - 1));
  return {
    answer, access,
    sources: passages.map((p, i) => ({ n: i + 1, chapterIndex: p.chapterIndex, paragraphIndex: p.paragraphIndex, chapterTitle: chapters[p.chapterIndex]!.title, excerpt: p.text.slice(0, 220), cited: cited.has(i) })),
  };
}

// Study material is the same for every reader of a chapter: cache it (per book, chapter, kind, access).
const studyCache = new Map<string, unknown>();
/** Summaries in three lengths (Reading Intelligence 2026-11-25): one minute, five minutes (the original) and complete. */
export type StudyKind = 'summary_short' | 'summary' | 'summary_full' | 'key_concepts' | 'flashcards' | 'quiz';
export const STUDY_KINDS: readonly StudyKind[] = ['summary_short', 'summary', 'summary_full', 'key_concepts', 'flashcards', 'quiz'];

export async function studyChapter(generate: Generate, book: Book, who: Identity, body: Record<string, unknown>) {
  const kind = String(body.kind) as StudyKind;
  if (!STUDY_KINDS.includes(kind)) throw new ReaderError('Choose a summary, key concepts, flashcards or quiz.');
  const { access, chapters } = await readableChapters(book, who);
  const ci = Number(body.chapterIndex);
  const chapter = Number.isInteger(ci) ? chapters[ci] : undefined;
  if (!chapter) throw new ReaderError(access === 'preview' ? 'This chapter is not in the free preview. Buy the book to study it.' : 'Unknown chapter.', access === 'preview' ? 403 : 404);
  const text = chapter.content.join('\n').slice(0, 24_000);
  if (text.replace(/\s+/g, ' ').length < 200) throw new ReaderError('This chapter is too short to study.', 409);
  const key = `${book.id}|${ci}|${kind}|${access}`;
  if (studyCache.has(key)) return { kind, chapterIndex: ci, cached: true, ...(studyCache.get(key) as object) };
  const spec: Record<StudyKind, string> = {
    summary_short: '{"summary": "2 sentences a reader takes in within a minute", "points": ["the 3 most important takeaways, one short line each"]}',
    summary: '{"summary": "3 to 5 sentences", "points": ["4 to 6 key takeaways"]}',
    summary_full: '{"summary": "a complete summary in 3 to 5 short paragraphs separated by a blank line, following the chapter from start to end (names, events, arguments, conclusions)", "points": ["8 to 10 key takeaways"]}',
    key_concepts: '{"concepts": [{"term": "a key idea, name or term", "explanation": "1 to 2 sentences"}]} with 5 to 8 concepts',
    flashcards: '{"cards": [{"front": "a question or term", "back": "the answer, 1 to 2 sentences"}]} with 8 to 12 cards',
    quiz: '{"questions": [{"question": "...", "options": ["4 options"], "answer": 0, "explanation": "why, 1 sentence"}]} with 5 multiple-choice questions; "answer" is the index of the correct option',
  };
  const raw = await ask(generate, {
    jsonMode: true, temperature: 0.2,
    systemInstruction: `${persona(book)}\nUse only the chapter text. Write in the language of the chapter. Reply with JSON only, exactly this shape: ${spec[kind]}`,
    messages: [{ role: 'user', text: `Chapter ${ci + 1}: "${chapter.title}"\n"""${fence(text)}"""` }],
  });
  const data = parseJson<Record<string, unknown>>(raw);
  const s = (v: unknown, max = 600) => clean(v, max);
  let result: object;
  if (kind === 'summary' || kind === 'summary_short' || kind === 'summary_full') result = { summary: s(data.summary, kind === 'summary_full' ? 5000 : 1500), points: (Array.isArray(data.points) ? data.points : []).map((p) => s(p, 300)).filter(Boolean).slice(0, kind === 'summary_full' ? 12 : 8) };
  else if (kind === 'key_concepts') result = { concepts: (Array.isArray(data.concepts) ? data.concepts : []).map((c: { term?: unknown; explanation?: unknown }) => ({ term: s(c.term, 120), explanation: s(c.explanation, 400) })).filter((c) => c.term && c.explanation).slice(0, 10) };
  else if (kind === 'flashcards') result = { cards: (Array.isArray(data.cards) ? data.cards : []).map((c: { front?: unknown; back?: unknown }) => ({ front: s(c.front, 300), back: s(c.back, 500) })).filter((c) => c.front && c.back).slice(0, 15) };
  else result = {
    questions: (Array.isArray(data.questions) ? data.questions : []).map((q: { question?: unknown; options?: unknown; answer?: unknown; explanation?: unknown }) => {
      const options = (Array.isArray(q.options) ? q.options : []).map((o) => s(o, 200)).filter(Boolean).slice(0, 5);
      const answer = Number(q.answer);
      return { question: s(q.question, 400), options, answer, explanation: s(q.explanation, 400) };
    }).filter((q) => q.question && q.options.length >= 2 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length).slice(0, 8),
  };
  const empty = Object.values(result).every((v) => (Array.isArray(v) ? !v.length : !v));
  if (empty) throw new ReaderError('The AI assistant could not build this from the chapter. Please try again.', 502);
  studyCache.set(key, result);
  return { kind, chapterIndex: ci, cached: false, ...result };
}

/** The passage must come from text the reader can read: checked against the readable chapters. */
async function readablePassage(book: Book, who: Identity, raw: unknown) {
  const text = clean(raw, 2000);
  if (text.length < 1) throw new ReaderError('Select some text first.');
  const { chapters } = await readableChapters(book, who);
  // The first paragraph is the probe: a page sent to the translator joins several (2026-11-28).
  const probe = (text.split(/\n\s*\n/)[0] ?? text).replace(/\s+/g, ' ').trim().slice(0, 80).toLowerCase();
  const found = chapters.some((c) => c.content.some((p) => p.replace(/\s+/g, ' ').toLowerCase().includes(probe)));
  if (!found) throw new ReaderError('Select text from the book you are reading.', 400);
  return text;
}

/**
 * Explain a passage at four levels (master build plan M7, specification AI-002): for a child (the former
 * "simplify"), a student (the former "explain"), a professional and an expert. The old names still work.
 */
export const EXPLAIN_LEVELS = {
  child: 'Explain the passage to a 10-year-old: plain words, short sentences, one everyday example if it helps. Keep the meaning. End with one line: "In short: ...". At most 120 words.',
  student: 'Explain the passage for a student: what it says, what it means in the book, and any hard words, names or references, with one example. Use short paragraphs or bullets; at most 180 words.',
  professional: 'Explain the passage for a capable professional from outside this field: the main point in precise but plain terms, why it matters, how it could be applied or used at work, and one concrete example. Define any specialist term you use. Use short paragraphs or bullets; at most 220 words.',
  expert: 'Explain the passage for a specialist in its field: the argument, method or technique at work; its assumptions and their limits; the context, sources and traditions it relies on; where it agrees or disagrees with established views or other positions; and how it connects to the rest of the book. Use the field’s exact terms without defining the basics. Use short paragraphs or bullets; at most 280 words.',
} as const;
export type ExplainLevel = keyof typeof EXPLAIN_LEVELS;
export const explainLevel = (mode: unknown): ExplainLevel =>
  mode === 'child' || mode === 'simplify' ? 'child' : mode === 'professional' || mode === 'expert' ? mode : 'student';

/** The prompt (the specification's ExplainPromptBuilder): the level's instructions, and the surrounding text as context only. */
export function explainPrompt(level: ExplainLevel, passage: string, context?: string) {
  return {
    instruction: `${EXPLAIN_LEVELS[level]} Keep the meaning of the passage; explain the difficult ideas.${context ? ' The text around the passage is given for context only; explain the passage itself.' : ''}`,
    message: `${context ? `Around the passage (context only):
"""${fence(context)}"""

` : ''}Passage:
"""${fence(passage)}"""`,
  };
}

// The same passage at the same level is explained once per book (the specification's ExplainCache), at most 500 kept.
const explainCache = new Map<string, string>();
export async function explainPassage(generate: Generate, book: Book, who: Identity, body: Record<string, unknown>) {
  const level = explainLevel(body.mode);
  const mode = level === 'child' ? 'simplify' : level === 'student' ? 'explain' : level;
  const text = await readablePassage(book, who, body.text);
  // Context (the sentences around a selection) is used only when it is from the book too.
  const rawContext = clean(body.context, 1500);
  const context = rawContext && rawContext !== text ? await readablePassage(book, who, rawContext).catch(() => '') : '';
  const key = `${book.id}|${level}|${text}|${context}`;
  const known = explainCache.get(key);
  if (known) return { mode, level, answer: known, cached: true };
  const p = explainPrompt(level, text, context);
  const answer = await ask(generate, { systemInstruction: `${persona(book)}
${p.instruction}`, messages: [{ role: 'user', text: p.message }] });
  if (explainCache.size >= 500) explainCache.delete(explainCache.keys().next().value!);
  explainCache.set(key, answer);
  return { mode, level, answer, cached: false };
}

export const LANGUAGES: Record<string, string> = {
  en: 'English', nl: 'Dutch', fr: 'French', de: 'German', es: 'Spanish', pt: 'Portuguese', it: 'Italian', pl: 'Polish', ro: 'Romanian', sv: 'Swedish',
  da: 'Danish', no: 'Norwegian', fi: 'Finnish', cs: 'Czech', el: 'Greek', hu: 'Hungarian', tr: 'Turkish', ru: 'Russian', uk: 'Ukrainian', ar: 'Arabic',
  he: 'Hebrew', fa: 'Persian', hi: 'Hindi', bn: 'Bengali', ur: 'Urdu', zh: 'Chinese (Simplified)', ja: 'Japanese', ko: 'Korean', vi: 'Vietnamese', th: 'Thai',
  id: 'Indonesian', ms: 'Malay', tl: 'Filipino', sw: 'Swahili', yo: 'Yoruba', ig: 'Igbo', ha: 'Hausa', am: 'Amharic', zu: 'Zulu', af: 'Afrikaans', pcm: 'Nigerian Pidgin',
};

export async function translatePassage(generate: Generate, book: Book, who: Identity, body: Record<string, unknown>) {
  const target = String(body.target ?? '');
  if (!LANGUAGES[target]) throw new ReaderError('Choose a language to translate into.');
  const text = await readablePassage(book, who, body.text);
  const translation = await ask(generate, {
    temperature: 0.1,
    systemInstruction: `Translate the text into ${LANGUAGES[target]}. Keep the meaning, tone and paragraph breaks. Reply with the translation only.`,
    messages: [{ role: 'user', text }],
  });
  return { target, language: LANGUAGES[target], translation };
}

export async function defineWord(generate: Generate, book: Book, who: Identity, body: Record<string, unknown>) {
  const word = clean(body.word, 60);
  if (!/^[\p{L}\p{M}'’-]{1,40}( [\p{L}\p{M}'’-]{1,40}){0,2}$/u.test(word)) throw new ReaderError('Select a single word (or a short phrase) to look up.');
  const context = clean(body.context, 600);
  const raw = await ask(generate, {
    jsonMode: true, temperature: 0.1,
    systemInstruction: `You are a dictionary. Define the word as it is used in the sentence from "${book.title}". Use the language of the word. Reply with JSON only: {"word": "...", "pronunciation": "IPA, e.g. /ˈwɜːd/", "partOfSpeech": "...", "definitions": ["1 to 3 short definitions, the sense used here first"], "synonyms": ["up to 5"], "example": "a short example sentence", "origin": "one short line of etymology, or empty"}`,
    messages: [{ role: 'user', text: `Word: ${word}\nSentence: """${fence(context)}"""` }],
  });
  const d = parseJson<Record<string, unknown>>(raw);
  const list = (v: unknown, n: number) => (Array.isArray(v) ? v : []).map((x) => clean(x, 300)).filter(Boolean).slice(0, n);
  const definitions = list(d.definitions, 3);
  if (!definitions.length) throw new ReaderError('No definition found. Please try again.', 502);
  return { word: clean(d.word, 60) || word, pronunciation: clean(d.pronunciation, 60), partOfSpeech: clean(d.partOfSpeech, 40), definitions, synonyms: list(d.synonyms, 5), example: clean(d.example, 300), origin: clean(d.origin, 200) };
}
