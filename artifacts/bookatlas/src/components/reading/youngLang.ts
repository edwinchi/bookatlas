import { createContext, useContext } from 'react';
import { FIRST_WORDS, PICTURE_BOOKS, type PictureBook, type WordGroup } from './firstWords';
import { STORIES, WORDS, type Level, type PictureWord, type Story } from './youngReaders';
import { findPhrase, rightPhrase, tryAgainPhrase } from './youngVoice';

/**
 * Young readers in more languages (Reading Intelligence phase 5, owner request 2026-11-25). The stories, picture
 * books, first words and game words in each language, with the same pictures. English plays the recorded natural
 * voice; the other languages are read by the device's own voice in that language. Letter sounds stay English phonics.
 */
export type YoungLangId = 'en' | 'fr' | 'es' | 'pt' | 'nl';
export const YOUNG_LANGS: { id: YoungLangId; name: string }[] = [
  { id: 'en', name: 'English' }, { id: 'fr', name: 'Français' }, { id: 'es', name: 'Español' }, { id: 'pt', name: 'Português' }, { id: 'nl', name: 'Nederlands' },
];

export interface YoungContent {
  id: YoungLangId;
  /** The device voice language (BCP 47). */
  voice: string;
  stories: Story[];
  words: Record<Level, PictureWord[]>;
  firstWords: WordGroup[];
  pictureBooks: PictureBook[];
  find: (word: string) => string;
  right: (word: string) => string;
  tryAgain: (word: string) => string;
}

/** A translation: the texts only, in the same order as the English, so the pictures and ids are shared. */
export interface YoungTranslation {
  voice: string;
  stories: Record<string, { title: string; paragraphs: string[]; questions: { question: string; options: string[] }[] }>;
  levelWords: Record<Level, string[]>;
  groups: Record<string, { name: string; words: string[] }>;
  books: Record<string, { title: string; pages: string[] }>;
  find: (word: string) => string;
  right: (word: string) => string;
  tryAgain: (word: string) => string;
}

export const ENGLISH: YoungContent = {
  id: 'en', voice: 'en-GB', stories: STORIES, words: WORDS, firstWords: FIRST_WORDS, pictureBooks: PICTURE_BOOKS,
  find: findPhrase, right: rightPhrase, tryAgain: tryAgainPhrase,
};

/** The English content with the translated texts put in; anything missing stays English. */
export function buildContent(id: YoungLangId, t: YoungTranslation): YoungContent {
  return {
    id, voice: t.voice, find: t.find, right: t.right, tryAgain: t.tryAgain,
    stories: STORIES.map((s) => {
      const x = t.stories[s.id];
      if (!x) return s;
      return { ...s, title: x.title, paragraphs: x.paragraphs, questions: s.questions.map((q, i) => ({ ...q, question: x.questions[i]?.question ?? q.question, options: x.questions[i]?.options ?? q.options })) };
    }),
    words: Object.fromEntries(Object.entries(WORDS).map(([lvl, list]) => [lvl, list.map((w, i) => ({ ...w, word: t.levelWords[Number(lvl) as Level]?.[i] ?? w.word }))])) as Record<Level, PictureWord[]>,
    firstWords: FIRST_WORDS.map((g) => ({ ...g, name: t.groups[g.id]?.name ?? g.name, words: g.words.map((w, i) => ({ ...w, word: t.groups[g.id]?.words[i] ?? w.word })) })),
    pictureBooks: PICTURE_BOOKS.map((b) => ({ ...b, title: t.books[b.id]?.title ?? b.title, pages: b.pages.map((p, i) => ({ ...p, text: t.books[b.id]?.pages[i] ?? p.text })) })),
  };
}

/** First letter upper case ("le chien" → "Le chien"), for the start of a sentence. */
export const cap = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1);

const loaders: Record<Exclude<YoungLangId, 'en'>, () => Promise<{ default: YoungTranslation }>> = {
  fr: () => import('./young/fr'), es: () => import('./young/es'), pt: () => import('./young/pt'), nl: () => import('./young/nl'),
};
export async function loadYoung(id: YoungLangId): Promise<YoungContent> {
  if (id === 'en') return ENGLISH;
  return buildContent(id, (await loaders[id]()).default);
}

/** The language from a saved choice, else the device language when we have it, else English. */
export function startLang(saved: string | null, device: string | undefined): YoungLangId {
  const ids = YOUNG_LANGS.map((l) => l.id) as string[];
  if (saved && ids.includes(saved)) return saved as YoungLangId;
  const d = (device ?? '').slice(0, 2).toLowerCase();
  return ids.includes(d) ? d as YoungLangId : 'en';
}

export const YoungContext = createContext<YoungContent>(ENGLISH);
export const useYoung = () => useContext(YoungContext);
