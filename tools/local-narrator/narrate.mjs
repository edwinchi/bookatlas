#!/usr/bin/env node
// BooksAtlas local narrator: records an audiobook on this computer with Kokoro-82M (open source, Apache-2.0),
// so narration costs no tokens and needs no Google account. It takes a narration from booksatlas.app, records
// one part at a time and uploads each MP3; stop it any time (Ctrl+C) and run it again to continue.
//
//   npm install                       once, in this folder
//   npm run list                      the narrations you can take
//   npm run sample -- --voice af_heart     hear a voice (writes sample-af_heart.mp3)
//   npm run narrate -- --narration <id> [--voice af_heart] [--from-start] [--parts 20]
//        [--dialogue-voice bf_emma] [--cast "Kofi=am_michael,Lina=bf_isabella"]   a voice per character (voices.mjs)
//   npm run samples                   a real audio sample for every English book that has none yet
//
// Settings come from ../../.env.local (or the environment): NARRATION_WORKER_TOKEN (required, the same value as
// in Vercel) and BOOKSATLAS_URL (default https://booksatlas.app). The voice model (~90 MB) is downloaded on the
// first run and cached.
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Mp3Encoder } from '@breezystack/lamejs';
import { parseCast, voicedPieces } from './voices.mjs';
import { PIPER_VOICES, speakPieces } from './piper.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const VOICES = {
  af_heart: 'Heart (American, female; the best English voice)', af_bella: 'Bella (American, female)', af_nicole: 'Nicole (American, female, soft)',
  am_michael: 'Michael (American, male)', am_fenrir: 'Fenrir (American, male)', am_puck: 'Puck (American, male)',
  bf_emma: 'Emma (British, female)', bf_isabella: 'Isabella (British, female)', bm_george: 'George (British, male)', bm_fable: 'Fable (British, male)', bm_lewis: 'Lewis (British, male)',
};
const SAMPLE_RATE = 24_000;
/** Kokoro reads at most ~510 phonemes at once; ~350 characters stays well inside that. */
const CHUNK_CHARS = 350;
const PAUSE_SENTENCE = 0.18, PAUSE_PARAGRAPH = 0.55;

// ------------------------------------------------------------------------------------------ settings
function env() {
  const vars = { ...process.env };
  try {
    for (const line of readFileSync(join(here, '..', '..', '.env.local'), 'utf8').split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m && vars[m[1]] === undefined) vars[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  } catch { /* no .env.local: use the environment */ }
  return vars;
}
function args(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) { out._.push(a); continue; }
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[key] = true; else { out[key] = next; i += 1; }
  }
  return out;
}
const opts = args(process.argv.slice(2));
const settings = env();
const base = String(opts.url ?? settings.BOOKSATLAS_URL ?? 'https://booksatlas.app').replace(/\/+$/, '');
const token = settings.NARRATION_WORKER_TOKEN?.trim();
const voice = String(opts.voice ?? 'af_heart');
if (!VOICES[voice]) { console.error(`Unknown voice "${voice}". Choose one of:\n${Object.entries(VOICES).map(([k, v]) => `  ${k.padEnd(12)} ${v}`).join('\n')}`); process.exit(2); }

// A voice per character (Reading Intelligence phase 3): speech in quotes in the speaker's or the dialogue voice.
const dialogueVoice = opts['dialogue-voice'] ? String(opts['dialogue-voice']) : null;
if (dialogueVoice && !VOICES[dialogueVoice]) { console.error(`Unknown dialogue voice "${dialogueVoice}".`); process.exit(2); }
let cast;
try { cast = parseCast(opts.cast ?? '', VOICES); } catch (e) { console.error(e.message); process.exit(2); }
const casting = { narrator: voice, dialogue: dialogueVoice, cast };

// --------------------------------------------------------------------------------------------- API
async function api(path, init = {}, tries = 4) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const res = await fetch(base + path, { ...init, headers: { authorization: `Bearer ${token}`, ...(init.headers ?? {}) }, signal: AbortSignal.timeout(120_000) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { const e = new Error(body.error ?? `${res.status} ${res.statusText}`); e.status = res.status; throw e; }
      return body;
    } catch (e) {
      // Network trouble and server errors are retried; refusals (4xx) are not.
      if ((e.status && e.status < 500) || attempt >= tries) throw e;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

// ----------------------------------------------------------------------------------------- the voice
let tts;
async function voiceModel() {
  if (tts) return tts;
  process.stdout.write('Loading the Kokoro voice (downloaded once, ~90 MB)… ');
  const { KokoroTTS } = await import('kokoro-js');
  tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: String(opts.dtype ?? 'q8'), device: 'cpu' });
  console.log('ready.');
  return tts;
}

/** Sentences grouped into chunks Kokoro can read in one go; a very long sentence is split at commas. */
export function chunks(paragraph) {
  const sentences = paragraph.match(/[^.!?…]+(?:[.!?…]+["'”’)\]]*|$)\s*/g)?.map((s) => s.trim()).filter(Boolean) ?? [paragraph];
  const pieces = sentences.flatMap((s) => (s.length <= CHUNK_CHARS ? [s] : s.split(/(?<=[,;:—–])\s+/).reduce((acc, part) => {
    if (acc.length && (acc[acc.length - 1] + ' ' + part).length <= CHUNK_CHARS) acc[acc.length - 1] += ' ' + part; else acc.push(part);
    return acc;
  }, [])));
  const out = [];
  for (const p of pieces) {
    if (out.length && (out[out.length - 1] + ' ' + p).length <= CHUNK_CHARS) out[out.length - 1] += ' ' + p; else out.push(p);
  }
  return out;
}

/** One part (paragraphs separated by blank lines) as 16-bit PCM at 24 kHz. */
async function speak(text) {
  const model = await voiceModel();
  const parts = [];
  let voiced = 0;
  const silence = (s) => new Float32Array(Math.round(s * SAMPLE_RATE));
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
  for (const [pi, paragraph] of paragraphs.entries()) {
    for (const chunk of chunks(paragraph)) {
      // One voice, or a piece per speaker with a breath between them; the pause after the chunk stays the same.
      const pieces = voicedPieces(chunk, casting);
      for (const [i, piece] of pieces.entries()) {
        const audio = await model.generate(piece.text, { voice: piece.voice });
        voiced += audio.audio.length / SAMPLE_RATE;
        parts.push(audio.audio);
        if (i < pieces.length - 1) parts.push(silence(0.08));
      }
      parts.push(silence(PAUSE_SENTENCE));
    }
    if (pi < paragraphs.length - 1) parts.push(silence(PAUSE_PARAGRAPH));
  }
  // A part with (almost) no words, such as a scene break "* * *", would be too short for the server (at least
  // 0.3 s); it becomes a one-second pause.
  const spoken = parts.reduce((n, p) => n + p.length, 0);
  const words = (text.match(/\p{L}{2,}/gu) ?? []).length;
  // Words that came out silent would make a silent audiobook: stop and show them instead of uploading.
  if (words >= 3 && voiced < words * 0.1) throw new Error(`the voice made no sound for this text (${words} words): ${JSON.stringify(text.slice(0, 300))}`);
  if (spoken < SAMPLE_RATE) parts.push(new Float32Array(SAMPLE_RATE - spoken));
  const total = parts.reduce((n, p) => n + p.length, 0);
  const pcm = new Int16Array(total);
  let o = 0;
  for (const p of parts) for (let i = 0; i < p.length; i += 1) pcm[o++] = Math.max(-32768, Math.min(32767, Math.round(p[i] * 32767)));
  return pcm;
}

function toMp3(pcm, kbps = 64, rate = SAMPLE_RATE) {
  const encoder = new Mp3Encoder(1, rate, kbps);
  const out = [];
  for (let i = 0; i < pcm.length; i += 11_520) { const b = encoder.encodeBuffer(pcm.subarray(i, i + 11_520)); if (b.length) out.push(Buffer.from(b)); }
  const end = encoder.flush();
  if (end.length) out.push(Buffer.from(end));
  return Buffer.concat(out);
}

/**
 * A short children's text with its timings: for each piece Kokoro reads, the first character and when the voice
 * starts and stops, so the site can light up each word as it is said.
 */
async function speakTimed(text, speed) {
  const model = await voiceModel();
  const parts = [];
  const timing = [];
  let at = 0;
  let from = 0;
  const pieces = chunks(text);
  for (const [i, piece] of pieces.entries()) {
    const start = Math.max(0, text.indexOf(piece, from));
    from = start + piece.length;
    const audio = await model.generate(piece, { voice, speed });
    const t0 = at;
    parts.push(audio.audio); at += audio.audio.length / SAMPLE_RATE;
    timing.push([start, Math.round(t0 * 1000) / 1000, Math.round(at * 1000) / 1000]);
    if (i < pieces.length - 1) { const pause = new Float32Array(Math.round(PAUSE_SENTENCE * SAMPLE_RATE)); parts.push(pause); at += pause.length / SAMPLE_RATE; }
  }
  const total = parts.reduce((n, p) => n + p.length, 0);
  const pcm = new Int16Array(total);
  let o = 0;
  for (const p of parts) for (let i = 0; i < p.length; i += 1) pcm[o++] = Math.max(-32768, Math.min(32767, Math.round(p[i] * 32767)));
  return { pcm, timing, seconds: total / SAMPLE_RATE };
}

const minutes = (s) => (s >= 3600 ? `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min` : `${Math.max(1, Math.round(s / 60))} min`);

// ------------------------------------------------------------------------------------------ commands
async function sample() {
  const text = String(opts.text ?? 'Welcome to BooksAtlas. This is how your audiobook sounds in the free Kokoro voice, recorded on your own computer.');
  const started = Date.now();
  const pcm = await speak(text);
  const file = join(here, `sample-${voice}.mp3`);
  writeFileSync(file, toMp3(pcm));
  console.log(`Wrote ${file} (${(pcm.length / SAMPLE_RATE).toFixed(1)} s of audio in ${((Date.now() - started) / 1000).toFixed(1)} s).`);
}

/** A real audio sample for every book in the store that lacks one (owner request 2026-11-16). */
async function samples() {
  const { missing } = await api('/api/internal/narration/local/samples');
  const english = missing.filter((m) => /^english$/i.test(m.language));
  if (missing.length > english.length) console.log(`${missing.length - english.length} non-English books are left to the cloud voice (Kokoro reads English only).`);
  if (!english.length) { console.log('Every English book has an audio sample.'); return; }
  console.log(`Recording ${english.length} audio samples with ${VOICES[voice]}…`);
  for (const m of english) {
    const pcm = await speak(m.text);
    await api(`/api/internal/narration/local/samples/${encodeURIComponent(m.bookId)}`, {
      method: 'PUT', body: toMp3(pcm), headers: { 'content-type': 'audio/mpeg', 'x-sample-key': m.key },
    });
    console.log(`  ${m.title}: ${(pcm.length / SAMPLE_RATE).toFixed(0)} s`);
  }
  console.log('Done.');
}

/**
 * Natural voice for young readers: records every text the children's pages say (stories, picture books, words,
 * letter sounds) into artifacts/bookatlas/public/audio/young, with clips.json for the word timings. Only new or
 * changed texts are recorded; clips for texts that no longer exist are removed. Commit the folder and deploy.
 */
async function young() {
  const root = join(here, '..', '..');
  const tsx = createRequire(join(root, 'artifacts', 'api-server', 'package.json')).resolve('tsx/esm/api');
  const { tsImport } = await import(pathToFileURL(tsx).href);
  const reading = join(root, 'artifacts', 'bookatlas', 'src', 'components', 'reading');
  const yv = await tsImport(pathToFileURL(join(reading, 'youngVoice.ts')).href, import.meta.url);
  // English with Kokoro (phase 4); French, Spanish, Portuguese and Dutch with Piper (phase 6).
  const lang = String(opts.lang ?? 'en');
  if (lang !== 'en' && !PIPER_VOICES[lang]) throw new Error(`Unknown language "${lang}". Use en, ${Object.keys(PIPER_VOICES).join(', ')}.`);
  const piper = lang !== 'en';
  const content = piper ? await (await tsImport(pathToFileURL(join(reading, 'youngLang.ts')).href, import.meta.url)).loadYoung(lang) : undefined;
  const engineVoice = piper ? String(opts.voice ?? PIPER_VOICES[lang]) : voice;
  const dir = join(root, 'artifacts', 'bookatlas', 'public', ...yv.youngAudioDir(lang).split('/'));
  mkdirSync(dir, { recursive: true });
  const file = join(dir, 'clips.json');
  const speed = Number(opts.speed ?? (piper ? 1.1 : 0.9));
  let manifest = { voice: engineVoice, speed, clips: {} };
  try { const m = JSON.parse(readFileSync(file, 'utf8')); if (m.voice === engineVoice && m.speed === speed && m.clips) manifest = m; } catch { /* a first run */ }
  const texts = yv.youngClipTexts(content);
  const keys = new Map(texts.map((t) => [yv.clipKey(t), t]));
  for (const k of Object.keys(manifest.clips)) if (!keys.has(k)) delete manifest.clips[k];
  for (const f of readdirSync(dir)) if (f.endsWith('.mp3') && !(f.slice(0, -4) in manifest.clips) && !keys.has(f.slice(0, -4))) rmSync(join(dir, f));
  const todo = [...keys].filter(([k]) => !manifest.clips[k] || !existsSync(join(dir, `${k}.mp3`)));
  console.log(`${texts.length} children's texts in ${lang}: ${texts.length - todo.length} recorded, ${todo.length} to record in the ${engineVoice} voice.`);
  const started = Date.now();
  let audio = 0;
  const save = (key, pcm, timing, seconds, rate) => {
    writeFileSync(join(dir, `${key}.mp3`), toMp3(pcm, 48, rate));
    manifest.clips[key] = { d: Math.round(seconds * 1000) / 1000, t: timing };
    audio += seconds;
  };
  if (!piper) {
    for (const [n, [key, text]] of todo.entries()) {
      const { pcm, timing, seconds } = await speakTimed(text, speed);
      save(key, pcm, timing, seconds, SAMPLE_RATE);
      // Saved after every clip, so stopping and running again carries on.
      writeFileSync(file, JSON.stringify(manifest));
      if ((n + 1) % 25 === 0 || n + 1 === todo.length) console.log(`  ${n + 1}/${todo.length} · ${Math.round(audio)} s of audio in ${Math.round((Date.now() - started) / 1000)} s`);
    }
  } else {
    // Piper reads a batch of texts in one run, sentence by sentence; the sentences are joined with a short pause and
    // their start and end times kept for the word lighting, as with Kokoro.
    for (let b = 0; b < todo.length; b += 100) {
      const batch = todo.slice(b, b + 100).map(([key, text]) => {
        const pieces = chunks(text);
        let from = 0;
        const starts = pieces.map((p) => { const at = Math.max(0, text.indexOf(p, from)); from = at + p.length; return at; });
        return { key, pieces, starts };
      });
      const all = speakPieces(engineVoice, batch.flatMap((x) => x.pieces), { lengthScale: speed });
      let i = 0;
      for (const x of batch) {
        const parts = all.slice(i, i + x.pieces.length); i += x.pieces.length;
        const rate = parts[0].rate;
        const pause = new Int16Array(Math.round(PAUSE_SENTENCE * rate));
        const timing = [];
        let at = 0;
        const out = [];
        for (const [k, p] of parts.entries()) {
          timing.push([x.starts[k], Math.round((at / rate) * 1000) / 1000, Math.round(((at + p.pcm.length) / rate) * 1000) / 1000]);
          out.push(p.pcm); at += p.pcm.length;
          if (k < parts.length - 1) { out.push(pause); at += pause.length; }
        }
        const pcm = new Int16Array(at);
        let o = 0;
        for (const p of out) { pcm.set(p, o); o += p.length; }
        save(x.key, pcm, timing, at / rate, rate);
      }
      writeFileSync(file, JSON.stringify(manifest));
      console.log(`  ${Math.min(b + 100, todo.length)}/${todo.length} · ${Math.round(audio)} s of audio in ${Math.round((Date.now() - started) / 1000)} s`);
    }
  }
  writeFileSync(file, JSON.stringify(manifest));
  console.log(`Done: ${Object.keys(manifest.clips).length} clips in ${dir}. Commit the folder and deploy.`);
}

async function list() {
  const { narrations } = await api('/api/internal/narration/local');
  if (!narrations.length) { console.log('No open narrations. Order one for your book in Publish → Natural audiobook first.'); return; }
  for (const n of narrations) {
    console.log(`${n.id}  ${n.title}\n    ${n.status}, ${n.done} of ${n.total} parts recorded (${n.localParts} with Kokoro, ${n.otherParts} with another voice), ${n.language}`);
  }
  console.log('\nThen: npm run narrate -- --narration <id> --voice af_heart' + (narrations.some((n) => n.otherParts) ? ' --from-start   (one voice for the whole book)' : ''));
}

async function narrate() {
  const id = String(opts.narration ?? opts._[0] ?? '');
  if (!/^[0-9a-f-]{36}$/.test(id)) { console.error('Give the narration: --narration <id> (see npm run list).'); process.exit(2); }
  const limit = opts.parts ? Number(opts.parts) : Infinity;
  await voiceModel();
  const claim = await api(`/api/internal/narration/local/${id}/claim`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ voice, fromStart: opts['from-start'] === true }) });
  let lease = claim.leaseToken;
  let next = claim.next;
  console.log(`Narrating with ${VOICES[voice]}: ${claim.total} parts${next ? `, starting at part ${next.n + 1}` : ''}. Ctrl+C stops after the current part.`);
  let stopping = false;
  process.on('SIGINT', () => { if (stopping) process.exit(130); stopping = true; console.log('\nStopping after this part… (Ctrl+C again to quit at once)'); });
  const started = Date.now();
  let audioSeconds = 0, recorded = 0;
  while (next && !stopping && recorded < limit) {
    if (!next.text.trim()) throw new Error(`part ${next.n + 1} has no text: the book changed since this narration was planned. Run again with --from-start.`);
    const t0 = Date.now();
    const pcm = await speak(next.text);
    const seconds = pcm.length / SAMPLE_RATE;
    const mp3 = toMp3(pcm);
    const r = await api(`/api/internal/narration/local/${id}/parts/${next.n}`, {
      method: 'PUT', body: mp3,
      headers: { 'content-type': 'audio/mpeg', 'x-lease-token': lease, 'x-voice': voice, 'x-seconds': String(seconds) },
    });
    recorded += 1; audioSeconds += seconds;
    const speed = audioSeconds / ((Date.now() - started) / 1000);
    const left = (r.total - r.done) * (seconds / Math.max(0.01, speed));
    console.log(`Part ${r.done}/${r.total}: ${seconds.toFixed(0)} s of audio in ${((Date.now() - t0) / 1000).toFixed(0)} s · about ${minutes(left)} left at this speed`);
    if (seconds <= 1.05) console.log(`   (almost no words, recorded as a short pause: ${JSON.stringify(next.text.slice(0, 80))})`);
    next = r.next;
  }
  if (!next) { console.log(`Done: the audiobook is live on BooksAtlas (${minutes(audioSeconds)} recorded this run).`); return; }
  await api(`/api/internal/narration/local/${id}/release`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ leaseToken: lease }) }).catch(() => undefined);
  console.log(`Paused after part ${next.n} of ${claim.total}. Run the same command again to continue.`);
}

const command = opts.sample ? sample : opts.young ? young : opts.list ? list : opts.samples ? samples : narrate;
if (command !== sample && command !== young && !token) { console.error('NARRATION_WORKER_TOKEN is missing: add it to .env.local (the same value as in Vercel).'); process.exit(2); }
command().catch((e) => { console.error(`Stopped: ${e.message}`); process.exit(1); });
