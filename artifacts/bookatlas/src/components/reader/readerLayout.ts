/**
 * Page layout preferences kept on this device (owner request 2026-11-17): pages or scrolling, two pages side by side,
 * alignment, brightness and custom colours. The synced reading settings (font, size, spacing, theme) are separate.
 */
export interface ReaderLayout {
  mode: 'page' | 'scroll';
  /** Two pages side by side on wide screens ("book mode"). */
  spread: boolean;
  align: 'left' | 'justify';
  /** 40..100 (%). */
  brightness: number;
  customBg: string;
  customText: string;
  /** Tap the middle of the page to hide the toolbars. */
  tapToHide: boolean;
  /** Reading aids (Reading Intelligence, 2026-11-25): the start of every word in bold. */
  boldStarts: boolean;
  /** Paragraphs other than the one being read are dimmed. */
  focusParagraph: boolean;
  /** A band that follows the finger or the mouse and shades the lines above and below it. */
  readingGuide: boolean;
  /** Words light up as the device voice reads them. */
  followWords: boolean;
}

const KEY = 'bookatlas:reader-layout:v1';
export const DEFAULT_LAYOUT: ReaderLayout = { mode: 'page', spread: true, align: 'left', brightness: 100, customBg: '#f4ecd8', customText: '#3b2f22', tapToHide: true, boldStarts: false, focusParagraph: false, readingGuide: false, followWords: true };
const HEX = /^#[0-9a-f]{6}$/i;

export function readLayout(): ReaderLayout {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null') as Partial<ReaderLayout> | null;
    if (!v || typeof v !== 'object') return { ...DEFAULT_LAYOUT };
    return {
      mode: v.mode === 'scroll' ? 'scroll' : 'page',
      spread: v.spread !== false,
      align: v.align === 'justify' ? 'justify' : 'left',
      brightness: typeof v.brightness === 'number' && v.brightness >= 40 && v.brightness <= 100 ? Math.round(v.brightness) : 100,
      customBg: typeof v.customBg === 'string' && HEX.test(v.customBg) ? v.customBg : DEFAULT_LAYOUT.customBg,
      customText: typeof v.customText === 'string' && HEX.test(v.customText) ? v.customText : DEFAULT_LAYOUT.customText,
      tapToHide: v.tapToHide !== false,
      boldStarts: v.boldStarts === true,
      focusParagraph: v.focusParagraph === true,
      readingGuide: v.readingGuide === true,
      followWords: v.followWords !== false,
    };
  } catch {
    return { ...DEFAULT_LAYOUT };
  }
}
export function saveLayout(l: ReaderLayout) {
  try { localStorage.setItem(KEY, JSON.stringify(l)); } catch { /* reading works without storage */ }
}

/** True for a dark colour, so the toolbars switch to their dark style. */
export function isDarkColour(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b! < 0.22;
}

export const BACKGROUND_SWATCHES = ['#ffffff', '#f4ecd8', '#fdf6e3', '#eef3f8', '#fbe9ec', '#e9f0e4', '#2b2b2e', '#1d2733', '#121212'];
export const TEXT_SWATCHES = ['#1c1d1f', '#3b2f22', '#23324a', '#3a2430', '#e5e7eb', '#d6c7a8', '#c9d6e3'];
