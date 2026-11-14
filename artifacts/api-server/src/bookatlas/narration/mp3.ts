import { Mp3Encoder } from '@breezystack/lamejs';

/** 16-bit little-endian mono PCM (Gemini TTS output) to a 64 kbps mono MP3: about 0.5 MB per minute. */
export function pcm16ToMp3(pcm: Uint8Array, sampleRate = 24_000, kbps = 64): Uint8Array {
  const samples = new Int16Array(pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + (pcm.byteLength - (pcm.byteLength % 2))));
  const encoder = new Mp3Encoder(1, sampleRate, kbps);
  const chunks: Uint8Array[] = [];
  const BLOCK = 1152 * 10;
  for (let i = 0; i < samples.length; i += BLOCK) {
    const out = encoder.encodeBuffer(samples.subarray(i, i + BLOCK));
    if (out.length) chunks.push(new Uint8Array(out));
  }
  const end = encoder.flush();
  if (end.length) chunks.push(new Uint8Array(end));
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const mp3 = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) { mp3.set(c, offset); offset += c.length; }
  return mp3;
}

/** Gemini returns raw L16 PCM (audio/L16;codec=pcm;rate=24000) or a WAV; both become PCM samples. */
export function toPcm16(bytes: Uint8Array, mimeType: string): { pcm: Uint8Array; sampleRate: number } {
  const type = mimeType.toLowerCase();
  if (type.startsWith('audio/l16') || type.includes('codec=pcm')) {
    const rate = Number(/rate=(\d+)/.exec(type)?.[1] ?? 24_000);
    return { pcm: bytes, sampleRate: rate };
  }
  if (/^audio\/(x-)?wav|^audio\/wave/.test(type)) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let offset = 12, sampleRate = 24_000;
    while (offset + 8 <= bytes.length) {
      const id = String.fromCharCode(...bytes.subarray(offset, offset + 4));
      const size = view.getUint32(offset + 4, true);
      if (id === 'fmt ') sampleRate = view.getUint32(offset + 12, true);
      if (id === 'data') return { pcm: bytes.subarray(offset + 8, offset + 8 + size), sampleRate };
      offset += 8 + size + (size % 2);
    }
  }
  throw new Error(`Unsupported narration audio: ${mimeType}`);
}

/** Seconds of 16-bit mono PCM. */
export const pcmSeconds = (pcm: Uint8Array, sampleRate: number) => pcm.byteLength / 2 / sampleRate;
