import type { Request, Response } from 'express';

/**
 * Sends an MP3 the way phones expect (found 2026-11-23: the player closed on iPhones). Safari asks media servers for
 * byte ranges ("Range: bytes=0-1" first) and refuses audio from a server that ignores them, so a range gets a 206
 * with just those bytes; a request without one gets the whole file.
 */
export function sendAudio(req: Request, res: Response, bytes: Uint8Array, cacheControl: string) {
  const size = bytes.byteLength;
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Cache-Control', cacheControl);
  res.setHeader('Accept-Ranges', 'bytes');
  const range = byteRange(req.get('range'), size);
  if (range === 'invalid') {
    res.setHeader('Content-Range', `bytes */${size}`);
    res.status(416).end();
    return;
  }
  if (range) {
    res.status(206);
    res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${size}`);
    res.setHeader('Content-Length', String(range.end - range.start + 1));
    res.end(Buffer.from(bytes.buffer, bytes.byteOffset + range.start, range.end - range.start + 1));
    return;
  }
  res.setHeader('Content-Length', String(size));
  res.end(Buffer.from(bytes.buffer, bytes.byteOffset, size));
}

/** One "bytes=a-b", "bytes=a-" or "bytes=-n" range; several ranges are answered with the whole file. */
export function byteRange(header: string | undefined, size: number): { start: number; end: number } | 'invalid' | null {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (m[1] === '' && m[2] === '')) return null;
  let start: number; let end: number;
  if (m[1] === '') {
    const suffix = Number(m[2]);
    if (suffix === 0) return 'invalid';
    start = Math.max(0, size - suffix); end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || start > end) return 'invalid';
  return { start, end };
}
