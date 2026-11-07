import type { ReaderSettings, ReaderTheme, ReaderFont } from '../types';

export const READER_DISPLAY_PREFERENCES_KEY = 'bookatlas:reader-display:v1';

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  fontSize: 18,
  lineHeight: 1.7,
  fontFamily: 'literata',
  theme: 'sepia',
  marginWidth: 'normal',
};

export const READER_FONT_FAMILIES: readonly ReaderFont[] = ['literata', 'sans', 'mono'];
export const READER_THEMES: readonly ReaderTheme[] = ['day', 'sepia', 'night', 'mint', 'black'];
export const READER_MARGIN_WIDTHS: readonly ReaderSettings['marginWidth'][] = ['narrow', 'normal', 'wide'];

export function isValidReaderFontSize(size: unknown): size is number {
  return typeof size === 'number' && Number.isFinite(size) && size >= 14 && size <= 26;
}

export function isValidReaderLineHeight(height: unknown): height is number {
  return typeof height === 'number' && Number.isFinite(height) && height >= 1.4 && height <= 2.2;
}

export function isValidReaderTheme(theme: unknown): theme is ReaderTheme {
  return typeof theme === 'string' && READER_THEMES.includes(theme as ReaderTheme);
}

export function toggleChapterBookmark(bookmarks: readonly number[], chapterIndex: number): number[] {
  const set = new Set(bookmarks);
  if (set.has(chapterIndex)) {
    set.delete(chapterIndex);
  } else {
    set.add(chapterIndex);
  }
  return Array.from(set).sort((a, b) => a - b);
}

export function sanitizeReaderSettings(raw: unknown): ReaderSettings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_READER_SETTINGS };
  }
  const v = raw as Record<string, unknown>;
  return {
    fontSize: isValidReaderFontSize(v.fontSize) ? v.fontSize : DEFAULT_READER_SETTINGS.fontSize,
    lineHeight: isValidReaderLineHeight(v.lineHeight) ? v.lineHeight : DEFAULT_READER_SETTINGS.lineHeight,
    fontFamily: (READER_FONT_FAMILIES as readonly unknown[]).includes(v.fontFamily)
      ? (v.fontFamily as ReaderFont)
      : DEFAULT_READER_SETTINGS.fontFamily,
    theme: isValidReaderTheme(v.theme) ? v.theme : DEFAULT_READER_SETTINGS.theme,
    marginWidth: (READER_MARGIN_WIDTHS as readonly unknown[]).includes(v.marginWidth)
      ? (v.marginWidth as ReaderSettings['marginWidth'])
      : DEFAULT_READER_SETTINGS.marginWidth,
  };
}

export function readSavedReaderSettings(): ReaderSettings {
  try {
    const raw = typeof localStorage !== 'undefined'
      ? JSON.parse(localStorage.getItem(READER_DISPLAY_PREFERENCES_KEY) || 'null')
      : null;
    return sanitizeReaderSettings(raw);
  } catch {
    return { ...DEFAULT_READER_SETTINGS };
  }
}
