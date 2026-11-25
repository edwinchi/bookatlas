// Piper (MIT, Open Home Foundation) for the young readers' pages in French, Spanish, Portuguese and Dutch
// (Reading Intelligence phase 6, owner choice 2026-11-25). Kokoro speaks English only; Piper reads these languages
// on this computer, from the program and voices in ./piper (downloaded once, not committed).
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const PIPER_DIR = join(here, 'piper');
/** One natural voice per language: the clearest of Piper's voices for children's reading. */
export const PIPER_VOICES = { fr: 'fr_FR-siwis-medium', es: 'es_ES-davefx-medium', pt: 'pt_PT-tugao-medium', nl: 'nl_BE-nathalie-medium' };

export function piperReady(voice) {
  const exe = join(PIPER_DIR, 'piper', 'piper.exe');
  const model = join(PIPER_DIR, 'voices', `${voice}.onnx`);
  const missing = [exe, model, `${model}.json`].filter((f) => !existsSync(f));
  return { exe, model, missing };
}

/** 16-bit mono PCM and its sample rate from a WAV file. */
export function readWav(buf) {
  const rate = buf.readUInt32LE(24);
  let o = 12;
  while (o + 8 <= buf.length) {
    const id = buf.toString('ascii', o, o + 4), size = buf.readUInt32LE(o + 4);
    if (id === 'data') return { rate, pcm: new Int16Array(buf.buffer.slice(buf.byteOffset + o + 8, buf.byteOffset + o + 8 + size)) };
    o += 8 + size + (size % 2);
  }
  throw new Error('No audio in the WAV file');
}

/**
 * Reads every piece in one Piper run (the model loads once) and returns the PCM of each piece, in order. Piper
 * writes one WAV file per input line into a folder and prints each file's path as it goes.
 */
export function speakPieces(voice, pieces, { lengthScale = 1.1 } = {}) {
  const { exe, model, missing } = piperReady(voice);
  if (missing.length) throw new Error(`Piper is not set up: missing ${missing.join(', ')}. See the narrator README.`);
  const out = mkdtempSync(join(tmpdir(), 'ba-piper-'));
  try {
    const input = pieces.map((text) => JSON.stringify({ text })).join('\n') + '\n';
    const r = spawnSync(exe, ['--model', model, '--json-input', '--output_dir', out, '--length_scale', String(lengthScale), '--sentence_silence', '0'], { input, cwd: dirname(exe), maxBuffer: 256 * 1024 * 1024 });
    const files = r.stdout.toString().split(/\r?\n/).map((l) => l.trim()).filter((l) => l.toLowerCase().endsWith('.wav'));
    if (files.length !== pieces.length) throw new Error(`Piper made ${files.length} of ${pieces.length} pieces: ${r.stderr.toString().split('\n').filter((l) => /error/i.test(l)).slice(0, 3).join(' ')}`);
    return files.map((f) => readWav(readFileSync(f)));
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}
