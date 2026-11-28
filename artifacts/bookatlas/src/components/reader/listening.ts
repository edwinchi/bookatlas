/**
 * Listening in the reader (owner request 2026-11-17): speed, voice and language choices, and the helpers the
 * pop-up player uses. The device voice (free, every browser) can read the book in the book's own language or,
 * translated paragraph by paragraph, in another one.
 */

export interface ListenPrefs {
  /** 0.5x to 3x. */
  rate: number;
  /** The chosen device voice (SpeechSynthesisVoice.voiceURI); empty picks the best voice for the language. */
  voiceURI: string;
  /** The language to listen in (a code from LISTEN_LANGUAGES); empty means the book's own language. */
  lang: string;
}

const KEY = 'bookatlas:reader-listen:v1';
export const DEFAULT_LISTEN: ListenPrefs = { rate: 1, voiceURI: '', lang: '' };
export const MIN_RATE = 0.5;
export const MAX_RATE = 3;
/** Average narration speed at 1x, used to show words per minute. */
export const WORDS_PER_MINUTE = 155;

export const clampRate = (r: number) => Math.round(Math.min(MAX_RATE, Math.max(MIN_RATE, r)) * 10) / 10;

export function readListenPrefs(): ListenPrefs {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null') as Partial<ListenPrefs> | null;
    if (!v || typeof v !== 'object') return { ...DEFAULT_LISTEN };
    return {
      rate: typeof v.rate === 'number' && Number.isFinite(v.rate) ? clampRate(v.rate) : 1,
      voiceURI: typeof v.voiceURI === 'string' ? v.voiceURI.slice(0, 200) : '',
      lang: typeof v.lang === 'string' && v.lang in LISTEN_LANGUAGES ? v.lang : '',
    };
  } catch {
    return { ...DEFAULT_LISTEN };
  }
}
export function saveListenPrefs(p: ListenPrefs) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* listening works without storage */ }
}

/** The languages BooksAtlas can translate into (the same list as the reader's translator on the server). */
export const LISTEN_LANGUAGES: Record<string, string> = {
  en: 'English', nl: 'Dutch', fr: 'French', de: 'German', es: 'Spanish', pt: 'Portuguese', it: 'Italian', pl: 'Polish', ro: 'Romanian', sv: 'Swedish',
  da: 'Danish', no: 'Norwegian', fi: 'Finnish', cs: 'Czech', el: 'Greek', hu: 'Hungarian', tr: 'Turkish', ru: 'Russian', uk: 'Ukrainian', ar: 'Arabic',
  he: 'Hebrew', fa: 'Persian', hi: 'Hindi', bn: 'Bengali', ur: 'Urdu', zh: 'Chinese', ja: 'Japanese', ko: 'Korean', vi: 'Vietnamese', th: 'Thai',
  id: 'Indonesian', ms: 'Malay', tl: 'Filipino', sw: 'Swahili', yo: 'Yoruba', ig: 'Igbo', ha: 'Hausa', am: 'Amharic', zu: 'Zulu', af: 'Afrikaans',
};

const BOOK_LANGUAGE_CODES: Record<string, string> = {
  English: 'en', Dutch: 'nl', French: 'fr', German: 'de', Spanish: 'es', Portuguese: 'pt', Italian: 'it', Swahili: 'sw', Yoruba: 'yo',
  Hausa: 'ha', Zulu: 'zu', Amharic: 'am', Arabic: 'ar', Igbo: 'ig', Afrikaans: 'af',
};
export const bookLanguageCode = (language?: string) => BOOK_LANGUAGE_CODES[language ?? ''] ?? 'en';

/** A short line each voice reads when previewed. Other languages say their own name. */
const SAMPLE_LINES: Record<string, string> = {
  en: 'Hello! This is how I sound reading your book.',
  nl: 'Hallo! Zo klink ik als ik je boek voorlees.',
  fr: 'Bonjour ! Voici comment je lis votre livre.',
  de: 'Hallo! So klinge ich, wenn ich dein Buch vorlese.',
  es: '¡Hola! Así sueno al leer tu libro.',
  pt: 'Olá! É assim que eu soo lendo o seu livro.',
  it: 'Ciao! Ecco come suono mentre leggo il tuo libro.',
  pl: 'Cześć! Tak brzmię, czytając twoją książkę.',
  sv: 'Hej! Så här låter jag när jag läser din bok.',
  tr: 'Merhaba! Kitabını okurken sesim böyle.',
  ru: 'Привет! Вот так я звучу, когда читаю вашу книгу.',
  ja: 'こんにちは。これが本を読むときの私の声です。',
  zh: '你好！这是我朗读你的书时的声音。',
  ko: '안녕하세요! 책을 읽어 드릴 때 제 목소리는 이렇습니다.',
  hi: 'नमस्ते! आपकी किताब पढ़ते समय मेरी आवाज़ ऐसी है।',
  ar: 'مرحبًا! هكذا يبدو صوتي وأنا أقرأ كتابك.',
  sw: 'Habari! Hivi ndivyo ninavyosikika nikisoma kitabu chako.',
  id: 'Halo! Beginilah suara saya saat membaca buku Anda.',
};
export function sampleLine(lang: string) {
  if (SAMPLE_LINES[lang]) return SAMPLE_LINES[lang]!;
  try { return new Intl.DisplayNames([lang], { type: 'language' }).of(lang) ?? LISTEN_LANGUAGES[lang] ?? lang; } catch { return LISTEN_LANGUAGES[lang] ?? lang; }
}

/** Splits a paragraph into sentences: browsers cut off long utterances. */
export const sentences = (text: string) =>
  text.match(/[^.!?…。！？]+[.!?…。！？]+["'”’)]*\s*|[^.!?…。！？]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];

/** Android and older browsers name some languages differently (old ISO codes, Mandarin and Cantonese, Bokmål). */
const LANG_ALIASES: Record<string, string> = { in: 'id', iw: 'he', ji: 'yi', cmn: 'zh', yue: 'zh', fil: 'tl', nb: 'no', nn: 'no', zsm: 'ms', swh: 'sw' };
export const baseLang = (tag: string) => {
  const code = (tag ?? '').replaceAll('_', '-').split('-')[0]!.toLowerCase();
  return LANG_ALIASES[code] ?? code;
};

export interface VoiceGroup { locale: string; lang: string; label: string; region: string; voices: SpeechSynthesisVoice[] }

const voiceScore = (v: SpeechSynthesisVoice) =>
  (/natural|neural|premium|enhanced|wavenet/i.test(v.name ?? '') ? 4 : 0) + (/google|microsoft|siri|samantha|daniel/i.test(v.name ?? '') ? 2 : 0) + (v.default ? 1 : 0);

/** The device's voices grouped by locale (French – France, French – Canada…), the book's language first. */
export function groupVoices(voices: SpeechSynthesisVoice[], bookLang: string): VoiceGroup[] {
  const regions = (() => { try { return new Intl.DisplayNames(['en'], { type: 'region' }); } catch { return null; } })();
  // Android lists voices such as "cmn-Hans-CN", "es_419" or "en-US-x-sfg-local". Only a real region subtag (two
  // letters or three digits) is named, and a name the browser refuses falls back to the code: Intl.DisplayNames
  // throws on anything else, which emptied the reader on Android phones (found 2026-11-25).
  const regionName = (code: string) => { try { return regions?.of(code) ?? code; } catch { return code; } };
  const groups = new Map<string, VoiceGroup>();
  for (const v of voices) {
    const locale = (v.lang ?? '').replaceAll('_', '-');
    const lang = baseLang(locale);
    if (!(lang in LISTEN_LANGUAGES)) continue;
    const region = locale.split('-').slice(1).find((s) => /^([a-z]{2}|\d{3})$/i.test(s))?.toUpperCase() ?? '';
    const g = groups.get(locale) ?? { locale, lang, region, label: `${LISTEN_LANGUAGES[lang]}${region ? ` – ${regionName(region)}` : ''}`, voices: [] };
    g.voices.push(v);
    groups.set(locale, g);
  }
  for (const g of groups.values()) g.voices.sort((a, b) => voiceScore(b) - voiceScore(a));
  return [...groups.values()].sort((a, b) => (a.lang === bookLang ? 0 : 1) - (b.lang === bookLang ? 0 : 1) || a.label.localeCompare(b.label));
}

/** The chosen voice when it speaks this language, otherwise the best one the device has for it. */
export function pickVoice(voices: SpeechSynthesisVoice[], lang: string, voiceURI: string) {
  const chosen = voices.find((v) => v.voiceURI === voiceURI);
  if (chosen && baseLang(chosen.lang) === lang) return chosen;
  return voices.filter((v) => baseLang(v.lang) === lang).sort((a, b) => voiceScore(b) - voiceScore(a))[0] ?? null;
}

/** A short, readable name for a device voice ("Microsoft Aria Online (Natural) - English (United States)" → "Aria (Natural)"). */
export function voiceName(v: SpeechSynthesisVoice | null | undefined) {
  if (!v?.name) return 'Device voice';
  const name = v.name.replace(/^(Microsoft|Google|Apple)\s+/i, '').replace(/\s+-\s+.*$/, '').replace(/\s+Online/i, '').trim();
  return name || v.name;
}

type TranslatorApi = {
  availability: (o: { sourceLanguage: string; targetLanguage: string }) => Promise<string>;
  create: (o: { sourceLanguage: string; targetLanguage: string }) => Promise<{ translate: (t: string) => Promise<string> }>;
};
const translators = new Map<string, Promise<{ translate: (t: string) => Promise<string> } | null>>();
/** A promise that gives `fallback` if it has not settled in `ms` (the device translator can wait on a download). */
export function within<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(fallback), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, () => { clearTimeout(t); resolve(fallback); });
  });
}
/**
 * Free, private translation on the reader's own device (Chrome on computers has a built-in translator).
 * Returns null where the browser has none, so the caller can use BooksAtlas's translator instead. The device
 * translator is only used once it is ready: a language it still has to download is fetched in the background for
 * next time, and a check or translation that takes too long falls back too (it waited for ever, 2026-11-28).
 */
export async function translateOnDevice(text: string, from: string, to: string): Promise<string | null> {
  const api = (globalThis as unknown as { Translator?: TranslatorApi }).Translator;
  if (!api?.availability || !api.create) return null;
  const key = `${from}>${to}`;
  if (!translators.has(key)) {
    const made = (async () => {
      const a = await within(api.availability({ sourceLanguage: from, targetLanguage: to }).catch(() => 'unavailable'), 3000, 'unavailable');
      if (a !== 'available' && a !== 'readily') {
        if (a === 'downloadable' || a === 'downloading' || a === 'after-download') void api.create({ sourceLanguage: from, targetLanguage: to }).catch(() => undefined);
        setTimeout(() => translators.delete(key), 60_000); // look again later: the download may be done
        return null;
      }
      return within(api.create({ sourceLanguage: from, targetLanguage: to }).catch(() => null), 5000, null);
    })();
    translators.set(key, made);
  }
  const t = await translators.get(key)!;
  if (!t) return null;
  return within(t.translate(text).catch(() => null), 15000, null);
}

export const formatClock = (s: number) => {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
};
