/**
 * Reading level from a book's own text (2026-11-28, Curriculum Intelligence Layer: reading levels on every book).
 * A published readability formula for the language of the text (Flesch for English, Flesch-Douma for Dutch,
 * Kandel-Moles for French, Amstad for German, Fernández Huerta for Spanish), turned into a band and an age. It is an
 * estimate from sentence and word length, not an official level such as AVI or CLIB (those come from tested
 * assessments); the book page says so. Tested in readingLevel.test.ts.
 */
export type LevelLang = 'en' | 'nl' | 'fr' | 'de' | 'es';

const COMMON: Record<LevelLang, string[]> = {
  en: ['the', 'and', 'of', 'to', 'is', 'was', 'that', 'he', 'she', 'it', 'with', 'for', 'you', 'they', 'his', 'her'],
  nl: ['de', 'het', 'een', 'en', 'van', 'is', 'dat', 'niet', 'op', 'ik', 'je', 'zijn', 'met', 'voor', 'hij', 'ze', 'er', 'maar'],
  fr: ['le', 'la', 'les', 'et', 'de', 'des', 'un', 'une', 'est', 'il', 'elle', 'que', 'pas', 'dans', 'pour', 'qui'],
  de: ['der', 'die', 'das', 'und', 'ist', 'nicht', 'ein', 'eine', 'ich', 'sie', 'mit', 'auf', 'den', 'zu', 'es', 'sich'],
  es: ['el', 'la', 'los', 'las', 'y', 'de', 'que', 'en', 'un', 'una', 'es', 'por', 'con', 'no', 'se', 'su'],
};

const wordsOf = (text: string): string[] => text.toLowerCase().match(/[\p{L}]+(?:['’][\p{L}]+)?/gu) ?? [];

/** The language of the text, from its most common words; null when it is none of the five. */
export function detectLang(text: string): LevelLang | null {
  const words = wordsOf(text.slice(0, 20_000));
  if (words.length < 30) return null;
  let best: LevelLang | null = null, top = 0;
  for (const [lang, list] of Object.entries(COMMON) as [LevelLang, string[]][]) {
    const set = new Set(list);
    const hits = words.filter((w) => set.has(w)).length / words.length;
    if (hits > top) { top = hits; best = lang; }
  }
  return top >= 0.08 ? best : null;
}

/** Syllables, counted as groups of vowels (a silent final "e" in English and French does not count). */
export function syllables(word: string, lang: LevelLang): number {
  let w = word.toLowerCase().replace(/['’]/g, '');
  if ((lang === 'en' || lang === 'fr') && w.length > 3) w = w.replace(/e[sd]?$/, '');
  const groups = w.match(/[aeiouyàáâäæèéêëìíîïòóôöœùúûü]+/g)?.length ?? 0;
  return Math.max(1, groups);
}

/** Reading ease, 0 (very hard) to 100 (very easy), by the language's own formula. */
export function readingEase(wordsPerSentence: number, syllablesPerWord: number, lang: LevelLang): number {
  const ease = {
    en: 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord,
    nl: 206.84 - 0.93 * wordsPerSentence - 77 * syllablesPerWord,
    fr: 207 - 1.015 * wordsPerSentence - 73.6 * syllablesPerWord,
    de: 180 - wordsPerSentence - 58.5 * syllablesPerWord,
    es: 206.84 - 1.02 * wordsPerSentence - 60 * syllablesPerWord,
  }[lang];
  return Math.max(0, Math.min(100, Math.round(ease)));
}

const BANDS: { min: number; label: string; ages: string; groep?: string }[] = [
  { min: 90, label: 'Very easy', ages: '6–8', groep: 'groep 3–4' },
  { min: 80, label: 'Easy', ages: '8–10', groep: 'groep 5–6' },
  { min: 70, label: 'Fairly easy', ages: '10–12', groep: 'groep 7–8' },
  { min: 60, label: 'Standard', ages: '12–15', groep: 'first years of secondary school' },
  { min: 50, label: 'Fairly hard', ages: '15–18' },
  { min: 30, label: 'Hard', ages: 'adult readers' },
  { min: 0, label: 'Very hard', ages: 'specialist readers' },
];

export interface ReadingLevel { lang: LevelLang; ease: number; label: string; /** "6–8", or who it suits ("adult readers"). */ ages: string; /** For whom, ready to show: "readers aged 6–8" or "adult readers". */ who: string; groep?: string; words: number }

/** The reading level of some paragraphs, or null when there is too little text or the language is not known. */
export function readingLevel(paragraphs: string[], hint?: string): ReadingLevel | null {
  const text = paragraphs.join('\n').slice(0, 60_000);
  const words = wordsOf(text);
  if (words.length < 150) return null;
  const lang = detectLang(text) ?? hintLang(hint);
  if (!lang) return null;
  const sentences = text.split(/[.!?…]+(?=\s|$)|\n+/).filter((s) => wordsOf(s).length > 0).length || 1;
  const syl = words.reduce((n, w) => n + syllables(w, lang), 0);
  const ease = readingEase(words.length / sentences, syl / words.length, lang);
  const band = BANDS.find((b) => ease >= b.min)!;
  return { lang, ease, label: band.label, ages: band.ages, who: /^\d/.test(band.ages) ? `readers aged ${band.ages}` : band.ages, groep: lang === 'nl' ? band.groep : undefined, words: words.length };
}

function hintLang(hint?: string): LevelLang | null {
  const h = (hint ?? '').toLowerCase();
  if (/dutch|nederlands/.test(h)) return 'nl';
  if (/english/.test(h)) return 'en';
  if (/french|fran[cç]ais/.test(h)) return 'fr';
  if (/german|deutsch/.test(h)) return 'de';
  if (/spanish|espa[nñ]ol/.test(h)) return 'es';
  return null;
}
