import { createHash } from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import { CreateReaderNarrationBody, type ReaderNarration, type ReaderNarrationInput } from '@workspace/api-zod';
import { STUDIO_SPEECH_MODEL, narrationDirection } from '@workspace/bookatlas-catalog/voices';
import { tokenCostUpperBound } from './budget.js';
import { decodeBase64 } from './source.js';
import { decodeStudioWav, inspectWav, wrapPcm16LE } from './audio.js';
import { privateAssetFile } from './storage.js';

const NARRATION_BUDGET_MICROS = 100_000;
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

type RequestState = 'running' | 'completed' | 'failed' | 'unknown';
export interface ReaderNarrationRecord {
  requestId: string; ownerHash: string; fingerprint: string; state: RequestState;
  reservedMicros: number; createdAt: string; durationSeconds?: number;
}
export interface VersionedNarrationRecord { record: ReaderNarrationRecord; generation: string }
export interface ReaderNarrationStore {
  get(ownerHash: string, storageId: string): Promise<VersionedNarrationRecord | null>;
  create(ownerHash: string, storageId: string, record: ReaderNarrationRecord): Promise<boolean>;
  compareAndSwap(ownerHash: string, storageId: string, generation: string, record: ReaderNarrationRecord): Promise<boolean>;
  writeAudio(ownerHash: string, storageId: string, bytes: Buffer): Promise<void>;
  readAudio(ownerHash: string, storageId: string): Promise<Buffer>;
}
export interface ReaderNarrationProvider {
  countTokens(text: string, voiceName: ReaderNarrationInput['voiceName']): Promise<number | undefined>;
  generate(text: string, voiceName: ReaderNarrationInput['voiceName'], maxOutputTokens: number):
    Promise<{ finishReason?: string; audioBase64?: string; mimeType?: string }>;
}
export interface ReaderNarrationServiceOptions { store?: ReaderNarrationStore; provider?: ReaderNarrationProvider | (() => ReaderNarrationProvider); now?: () => number }

export class ReaderNarrationError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

function ownerDigest(ownerId: string) {
  return createHash('sha256').update(ownerId).digest('hex');
}

export function readerNarrationStorageId(ownerId: string, requestId: string) {
  const bytes = createHash('sha256').update('bookatlas-reader-narration-v1\0')
    .update(ownerId).update('\0').update(requestId).digest().subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function readerNarrationFingerprint(input: Pick<ReaderNarrationInput, 'text' | 'voiceName' | 'budgetUsd'>) {
  return createHash('sha256').update(JSON.stringify({
    text: input.text, voiceName: input.voiceName, budgetUsd: input.budgetUsd,
  })).digest('hex');
}

export function readerNarrationOutputTokens(text: string) {
  const words = text.match(/\S+/gu)?.length ?? 0;
  return Math.min(16_000, Math.ceil(words / 1.8 * 25) + 512);
}

export function readerNarrationReservationMicros(inputTokens: number, outputTokens: number) {
  return tokenCostUpperBound(inputTokens, outputTokens, {
    inputMicrosPerMillionTokens: 1_000_000,
    outputMicrosPerMillionTokens: 18_000_000,
    safetyPercent: 50,
  });
}

export function validateReaderNarrationInput(input: ReaderNarrationInput): ReaderNarrationInput {
  const parsed = CreateReaderNarrationBody.strict().safeParse(input);
  if (!parsed.success) throw new ReaderNarrationError('Invalid narration request. Review the text, voice and explicit spending approval.');
  const text = parsed.data.text.trim();
  if (!text) throw new ReaderNarrationError('Narration text must contain non-whitespace characters.');
  return { ...parsed.data, text };
}

function voiceContents(text: string, voiceName: ReaderNarrationInput['voiceName']) {
  return [{
    role: 'user' as const,
    parts: [{ text, speechMetadata: { style: narrationDirection(voiceName) } }],
  }];
}

function makeGoogleProvider(): ReaderNarrationProvider {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new ReaderNarrationError('AI narration is not configured.', 503);
  const ai = new GoogleGenAI({ apiKey: key, httpOptions: { timeout: 90_000 } });
  return {
    async countTokens(text, voiceName) {
      const result = await ai.models.countTokens({
        model: STUDIO_SPEECH_MODEL,
        contents: voiceContents(text, voiceName),
      });
      return result.totalTokens;
    },
    async generate(text, voiceName, maxOutputTokens) {
      const response = await ai.models.generateContent({
        model: STUDIO_SPEECH_MODEL,
        contents: voiceContents(text, voiceName),
        config: {
          responseModalities: ['AUDIO'],
          maxOutputTokens,
          speechConfig: { voiceConfig: { voice: voiceName } },
        },
      });
      const parts = response.candidates?.[0]?.content?.parts?.filter(part => part.inlineData?.data) ?? [];
      return {
        finishReason: response.candidates?.[0]?.finishReason,
        audioBase64: parts.length === 1 ? parts[0]!.inlineData!.data : undefined,
        mimeType: parts.length === 1 ? parts[0]!.inlineData!.mimeType : undefined,
      };
    },
  };
}

function objectMetadata(ownerHash: string, storageId: string, kind: string) {
  return {
    contentType: kind === 'audio' ? 'audio/wav' : 'application/json',
    cacheControl: 'private, no-store',
    metadata: { ownerHash, storageId, visibility: 'private', kind },
  };
}

function notFound(error: unknown) {
  return typeof error === 'object' && error !== null && Number((error as { code?: unknown }).code) === 404;
}
function preconditionFailure(error: unknown) {
  return typeof error === 'object' && error !== null &&
    [409, 412].includes(Number((error as { code?: unknown }).code));
}

export const appStorageReaderNarrationStore: ReaderNarrationStore = {
  async get(ownerHash, storageId) {
    const file = privateAssetFile(storageId, 'request.json');
    let metadata;
    try { [metadata] = await file.getMetadata(); }
    catch (error) {
      if (notFound(error)) return null;
      throw error;
    }
    if (metadata.metadata?.ownerHash !== ownerHash || metadata.metadata?.storageId !== storageId ||
        metadata.metadata?.visibility !== 'private' || metadata.metadata?.kind !== 'record' ||
        !Number.isSafeInteger(Number(metadata.size)) || Number(metadata.size) > 64 * 1024) {
      throw new Error('Private narration request record failed validation.');
    }
    const pinned = file.bucket.file(file.name, { generation: String(metadata.generation) });
    const [bytes] = await pinned.download({ validation: 'crc32c' });
    const record = JSON.parse(bytes.toString('utf8')) as ReaderNarrationRecord;
    if (record.ownerHash !== ownerHash ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(record.requestId) ||
        !/^[0-9a-f]{64}$/.test(record.fingerprint) ||
        !Number.isSafeInteger(record.reservedMicros) || record.reservedMicros < 1 ||
        record.reservedMicros > NARRATION_BUDGET_MICROS ||
        !['running', 'completed', 'failed', 'unknown'].includes(record.state)) {
      throw new Error('Private narration request record failed validation.');
    }
    return { record, generation: String(metadata.generation) };
  },
  async create(ownerHash, storageId, record) {
    try {
      await privateAssetFile(storageId, 'request.json').save(Buffer.from(JSON.stringify(record)), {
        resumable: false,
        validation: 'crc32c',
        preconditionOpts: { ifGenerationMatch: 0 },
        metadata: objectMetadata(ownerHash, storageId, 'record'),
      });
      return true;
    } catch (error) {
      if (preconditionFailure(error)) return false;
      throw error;
    }
  },
  async compareAndSwap(ownerHash, storageId, generation, record) {
    try {
      await privateAssetFile(storageId, 'request.json').save(Buffer.from(JSON.stringify(record)), {
        resumable: false,
        validation: 'crc32c',
        preconditionOpts: { ifGenerationMatch: Number(generation) },
        metadata: objectMetadata(ownerHash, storageId, 'record'),
      });
      return true;
    } catch (error) {
      if (preconditionFailure(error)) return false;
      throw error;
    }
  },
  async writeAudio(ownerHash, storageId, bytes) {
    await privateAssetFile(storageId, 'audio.wav').save(bytes, {
      resumable: false,
      validation: 'crc32c',
      preconditionOpts: { ifGenerationMatch: 0 },
      metadata: objectMetadata(ownerHash, storageId, 'audio'),
    });
  },
  async readAudio(ownerHash, storageId) {
    const file = privateAssetFile(storageId, 'audio.wav');
    const [metadata] = await file.getMetadata();
    if (metadata.metadata?.ownerHash !== ownerHash || metadata.metadata?.storageId !== storageId ||
        metadata.metadata?.visibility !== 'private' || metadata.metadata?.kind !== 'audio' ||
        !Number.isSafeInteger(Number(metadata.size)) || Number(metadata.size) > MAX_AUDIO_BYTES) {
      throw new Error('Private narration audio failed validation.');
    }
    const pinned = file.bucket.file(file.name, { generation: String(metadata.generation) });
    const [bytes] = await pinned.download({ validation: 'crc32c' });
    return bytes;
  },
};

function normalizeAudio(audioBase64: string | undefined, mimeType: string | undefined) {
  if (!audioBase64 || !mimeType) throw new ReaderNarrationError('Provider returned no complete audio output.', 503);
  if (/^audio\/L16;.*(?:rate=24000)/i.test(mimeType) && /codec=pcm/i.test(mimeType)) {
    const pcm = decodeBase64(audioBase64, MAX_AUDIO_BYTES);
    const bytes = wrapPcm16LE(pcm, 24_000);
    if (bytes.length > MAX_AUDIO_BYTES) throw new ReaderNarrationError('Provider audio exceeds the supported clip size.', 503);
    return { bytes, durationSeconds: inspectWav(bytes).durationSeconds };
  }
  const decoded = decodeStudioWav(audioBase64, mimeType);
  if (decoded.sampleRate !== 24_000 || decoded.bytes.length > MAX_AUDIO_BYTES) {
    throw new ReaderNarrationError('Provider WAV output was not supported 24 kHz PCM audio.', 503);
  }
  return { bytes: decoded.bytes, durationSeconds: decoded.durationSeconds };
}

async function updateState(
  store: ReaderNarrationStore, ownerHash: string, storageId: string,
  fingerprint: string, state: RequestState, durationSeconds?: number,
) {
  const current = await store.get(ownerHash, storageId);
  if (!current || current.record.fingerprint !== fingerprint || current.record.state !== 'running') return false;
  const next: ReaderNarrationRecord = {
    ...current.record, state, ...(durationSeconds === undefined ? {} : { durationSeconds }),
  };
  return store.compareAndSwap(ownerHash, storageId, current.generation, next);
}

async function completedResponse(
  store: ReaderNarrationStore, ownerHash: string, storageId: string, record: ReaderNarrationRecord,
  voiceName: ReaderNarrationInput['voiceName'],
): Promise<ReaderNarration> {
  const bytes = await store.readAudio(ownerHash, storageId);
  const wav = inspectWav(bytes);
  if (wav.sampleRate !== 24_000 || record.durationSeconds === undefined ||
      Math.abs(wav.durationSeconds - record.durationSeconds) > 0.001) {
    throw new ReaderNarrationError('Saved narration audio failed integrity validation.', 503);
  }
  return {
    success: true,
    source: STUDIO_SPEECH_MODEL,
    voiceName,
    audioBase64: bytes.toString('base64'),
    mimeType: 'audio/wav',
    durationSeconds: wav.durationSeconds,
    reservedUsd: record.reservedMicros / 1_000_000,
  };
}

export async function renderReaderNarration(
  input: ReaderNarrationInput,
  ownerId: string,
  options: ReaderNarrationServiceOptions = {},
): Promise<ReaderNarration> {
  const request = validateReaderNarrationInput(input);
  if (!ownerId.trim()) throw new ReaderNarrationError('A verified signed-in account is required.', 401);
  const store = options.store ?? appStorageReaderNarrationStore;
  const ownerHash = ownerDigest(ownerId);
  const storageId = readerNarrationStorageId(ownerId, request.requestId);
  const fingerprint = readerNarrationFingerprint(request);

  let prior = await store.get(ownerHash, storageId);
  if (prior) {
    if (prior.record.requestId !== request.requestId || prior.record.fingerprint !== fingerprint) {
      throw new ReaderNarrationError('This request ID already belongs to a different narration payload.', 409);
    }
    if (prior.record.state === 'completed') {
      return completedResponse(store, ownerHash, storageId, prior.record, request.voiceName);
    }
    throw new ReaderNarrationError(
      prior.record.state === 'running'
        ? 'This narration request is already running; automatic retries are disabled.'
        : 'This narration request has a retained failure state; automatic retries are disabled.',
      409,
    );
  }

  const providerOption = options.provider;
  let provider: ReaderNarrationProvider;
  try {
    provider = providerOption
      ? typeof providerOption === 'function' ? providerOption() : providerOption
      : makeGoogleProvider();
  } catch (error) {
    if (error instanceof ReaderNarrationError) throw error;
    throw new ReaderNarrationError('AI narration could not be initialized.', 503);
  }

  const outputTokens = readerNarrationOutputTokens(request.text);
  let tokenCount: number | undefined;
  try { tokenCount = await provider.countTokens(request.text, request.voiceName); }
  catch { throw new ReaderNarrationError('Narration token counting failed; no paid request was started.', 503); }
  if (!Number.isSafeInteger(tokenCount) || tokenCount! < 0) {
    throw new ReaderNarrationError('Narration token count is unavailable; no paid request was started.', 503);
  }
  let reservedMicros: number;
  try {
    reservedMicros = readerNarrationReservationMicros(tokenCount!, outputTokens);
  } catch {
    throw new ReaderNarrationError('Narration cost could not be safely estimated; no paid request was started.', 503);
  }
  if (reservedMicros <= 0 || reservedMicros > NARRATION_BUDGET_MICROS) {
    throw new ReaderNarrationError('The narration exceeds the explicitly approved $0.10 budget; no paid request was started.', 409);
  }

  const record: ReaderNarrationRecord = {
    requestId: request.requestId,
    ownerHash,
    fingerprint,
    state: 'running',
    reservedMicros,
    createdAt: new Date((options.now ?? Date.now)()).toISOString(),
  };
  let created: boolean;
  try { created = await store.create(ownerHash, storageId, record); }
  catch { throw new ReaderNarrationError('Narration reservation could not be durably saved; no paid request was started.', 503); }
  if (!created) {
    prior = await store.get(ownerHash, storageId);
    if (!prior) throw new ReaderNarrationError('Narration reservation conflict could not be confirmed.', 503);
    if (prior.record.fingerprint !== fingerprint) {
      throw new ReaderNarrationError('This request ID already belongs to a different narration payload.', 409);
    }
    if (prior.record.state === 'completed') {
      return completedResponse(store, ownerHash, storageId, prior.record, request.voiceName);
    }
    throw new ReaderNarrationError('This narration request already has a durable reservation; automatic retries are disabled.', 409);
  }

  let generated: Awaited<ReturnType<ReaderNarrationProvider['generate']>>;
  try { generated = await provider.generate(request.text, request.voiceName, outputTokens); }
  catch {
    try { await updateState(store, ownerHash, storageId, fingerprint, 'unknown'); } catch { /* reservation remains durable */ }
    throw new ReaderNarrationError('Narration provider outcome is unknown. Its reservation is retained and it cannot be retried.', 503);
  }

  if (generated.finishReason !== 'STOP') {
    try { await updateState(store, ownerHash, storageId, fingerprint, 'failed'); } catch { /* reservation remains durable */ }
    throw new ReaderNarrationError('Provider did not complete narration (STOP). Its reservation is retained.', 503);
  }

  let output: { bytes: Buffer; durationSeconds: number };
  try { output = normalizeAudio(generated.audioBase64, generated.mimeType); }
  catch (error) {
    try { await updateState(store, ownerHash, storageId, fingerprint, 'failed'); } catch { /* reservation remains durable */ }
    if (error instanceof ReaderNarrationError) throw error;
    throw new ReaderNarrationError('Provider audio was invalid. Its reservation is retained; no audio is claimed.', 503);
  }
  try { await store.writeAudio(ownerHash, storageId, output.bytes); }
  catch {
    try { await updateState(store, ownerHash, storageId, fingerprint, 'unknown'); } catch { /* reservation remains durable */ }
    throw new ReaderNarrationError('Narration audio could not be saved privately. Its reservation is retained.', 503);
  }

  let completed: boolean;
  try {
    completed = await updateState(store, ownerHash, storageId, fingerprint, 'completed', output.durationSeconds);
  } catch {
    throw new ReaderNarrationError('Narration output could not be durably finalized. Its reservation is retained.', 503);
  }
  if (!completed) {
    throw new ReaderNarrationError('Narration output was saved but completion could not be confirmed. Its reservation is retained.', 503);
  }
  const final = await store.get(ownerHash, storageId);
  if (!final || final.record.state !== 'completed') {
    throw new ReaderNarrationError('Narration completion could not be read back safely.', 503);
  }
  return completedResponse(store, ownerHash, storageId, final.record, request.voiceName);
}

export function mountReaderTts(app: import('express').Express) {
  app.post('/api/ai/tts', async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    const identity = req.bookatlasIdentity;
    if (!identity?.id || !['reader', 'admin'].includes(identity.role)) {
      res.status(identity ? 403 : 401).json({ error: 'Sign in with a verified Bookatlas account to request narration.' });
      return;
    }
    const parsed = CreateReaderNarrationBody.strict().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid narration request. Include the complete text, selected voice and explicit spend approval.' });
      return;
    }
    try {
      res.json(await renderReaderNarration(parsed.data, identity.id));
    } catch (error) {
      const status = error instanceof ReaderNarrationError ? error.status : 503;
      const message = error instanceof ReaderNarrationError
        ? error.message
        : 'Narration could not be safely confirmed in private storage or with the provider.';
      res.status(status).json({ error: message });
    }
  });
}
