import { createHmac, timingSafeEqual } from 'node:crypto';
import { derivedKey } from '../../lib/serverSecret.js';

/** How long a listening key works; the reader fetches a new one when it opens the book or a part is refused. */
export const AUDIO_KEY_SECONDS = 12 * 60 * 60;

const sign = (bookId: string, exp: number) =>
  createHmac('sha256', derivedKey('bookatlas-narration-audio-v1')).update(`${bookId}|${exp}`).digest('base64url');

/**
 * A key that plays every part of one book's narration until it expires (found 2026-11-23: phones only play the
 * audio from its address, and an audio element cannot send the sign-in header). It is issued only to a reader with
 * the whole audiobook, names no account, and works for no other book.
 */
export function audioKey(bookId: string, now = Date.now()): string {
  const exp = Math.floor(now / 1000) + AUDIO_KEY_SECONDS;
  return `${exp}.${sign(bookId, exp)}`;
}

export function validAudioKey(bookId: string, key: unknown, now = Date.now()): boolean {
  if (typeof key !== 'string' || key.length > 80) return false;
  const m = /^(\d{10})\.([\w-]{43})$/.exec(key);
  if (!m) return false;
  const exp = Number(m[1]);
  if (exp * 1000 <= now || exp * 1000 > now + (AUDIO_KEY_SECONDS + 60) * 1000) return false;
  const given = Buffer.from(m[2]!);
  const wanted = Buffer.from(sign(bookId, exp));
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}
