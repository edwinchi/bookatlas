import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { ReaderNarrationInput } from '@workspace/api-zod';
import { wrapPcm16LE } from './audio.js';
import {
  ReaderNarrationError, renderReaderNarration, readerNarrationFingerprint,
  readerNarrationOutputTokens, readerNarrationReservationMicros, readerNarrationStorageId,
  validateReaderNarrationInput, type ReaderNarrationProvider, type ReaderNarrationRecord,
  type ReaderNarrationStore, type VersionedNarrationRecord,
} from './readerTts.js';

class MemoryStore implements ReaderNarrationStore {
  private records = new Map<string, VersionedNarrationRecord>();
  private audio = new Map<string, Buffer>();
  private version = 0;
  private key(owner: string, id: string) { return `${owner}:${id}`; }
  snapshot() { return [...this.records.values()].map(value => value.record); }
  async get(owner: string, id: string) { return this.records.get(this.key(owner, id)) ?? null; }
  async create(owner: string, id: string, record: ReaderNarrationRecord) {
    const key = this.key(owner, id);
    if (this.records.has(key)) return false;
    this.records.set(key, { record, generation: String(++this.version) });
    return true;
  }
  async compareAndSwap(owner: string, id: string, generation: string, record: ReaderNarrationRecord) {
    const key = this.key(owner, id);
    const current = this.records.get(key);
    if (!current || current.generation !== generation) return false;
    this.records.set(key, { record, generation: String(++this.version) });
    return true;
  }
  async writeAudio(owner: string, id: string, bytes: Buffer) {
    this.audio.set(this.key(owner, id), Buffer.from(bytes));
  }
  async readAudio(owner: string, id: string) {
    const bytes = this.audio.get(this.key(owner, id));
    if (!bytes) throw new Error('missing test audio');
    return Buffer.from(bytes);
  }
}

const input = (overrides: Partial<ReaderNarrationInput> = {}): ReaderNarrationInput => ({
  requestId: 'fe95f709-e4e8-420b-a2c9-8e8f2c9ac918',
  text: 'A short supplied passage for a reader narration test.',
  voiceName: 'Sulafat',
  approveSpend: true,
  budgetUsd: 0.1,
  ...overrides,
});

function provider(overrides: Partial<ReaderNarrationProvider> = {}): ReaderNarrationProvider {
  const wav = wrapPcm16LE(Buffer.alloc(4_800), 24_000);
  return {
    countTokens: async () => 100,
    generate: async () => ({
      finishReason: 'STOP', audioBase64: wav.toString('base64'), mimeType: 'audio/wav',
    }),
    ...overrides,
  };
}

test('narration validation, token cap and conservative speech reservation are pure', () => {
  assert.equal(validateReaderNarrationInput(input({ text: '  Script.  ' })).text, 'Script.');
  assert.throws(() => validateReaderNarrationInput(input({ text: ' \n ' })), ReaderNarrationError);
  assert.throws(() => validateReaderNarrationInput({ ...input(), extra: true } as ReaderNarrationInput), ReaderNarrationError);
  assert.equal(readerNarrationOutputTokens('one two three'), 554);
  assert.equal(readerNarrationReservationMicros(0, 1_000), 27_000);
  assert.ok(readerNarrationReservationMicros(1_000_000, 1_000) > 100_000);
  assert.equal(readerNarrationStorageId('owner-a', input().requestId), readerNarrationStorageId('owner-a', input().requestId));
  assert.notEqual(readerNarrationStorageId('owner-a', input().requestId), readerNarrationStorageId('owner-b', input().requestId));
  assert.notEqual(readerNarrationFingerprint(input()), readerNarrationFingerprint(input({ voiceName: 'Charon' })));
});

test('completed request is idempotent, returns saved WAV and rejects a changed payload', async () => {
  const store = new MemoryStore();
  let calls = 0;
  const mock = provider({ generate: async () => {
    calls++;
    return provider().generate('', 'Sulafat', 600);
  } });
  const first = await renderReaderNarration(input(), 'owner-a', { store, provider: mock });
  const repeated = await renderReaderNarration(input(), 'owner-a', { store, provider: mock });
  assert.equal(calls, 1);
  assert.equal(first.audioBase64, repeated.audioBase64);
  assert.equal(repeated.mimeType, 'audio/wav');
  await assert.rejects(
    renderReaderNarration(input({ text: 'A changed passage with same request ID.' }), 'owner-a', { store, provider: mock }),
    /different narration payload/,
  );
});

test('budget guard creates no reservation or paid request when estimate exceeds $0.10', async () => {
  const store = new MemoryStore();
  let paidCalls = 0;
  const mock = provider({
    countTokens: async () => 1_000_000,
    generate: async () => { paidCalls++; return {}; },
  });
  await assert.rejects(renderReaderNarration(input(), 'owner-b', { store, provider: mock }), /exceeds the explicitly approved/);
  assert.equal(paidCalls, 0);
  assert.equal(store.snapshot().length, 0);
  assert.equal(await store.get(
    'owner-b', readerNarrationStorageId('owner-b', input().requestId),
  ), null);
});

test('two concurrent submissions share one durable reservation and provider call', async () => {
  const store = new MemoryStore();
  let release!: () => void;
  let entered!: () => void;
  const providerStarted = new Promise<void>(resolve => { entered = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  let paidCalls = 0;
  const mock = provider({ generate: async () => {
    paidCalls++;
    entered();
    await gate;
    return provider().generate('', 'Sulafat', 600);
  } });
  const first = renderReaderNarration(input(), 'owner-c', { store, provider: mock });
  await providerStarted;
  await assert.rejects(
    renderReaderNarration(input(), 'owner-c', { store, provider: mock }),
    /already running|durable reservation/,
  );
  release();
  await first;
  assert.equal(paidCalls, 1);
});

test('ambiguous or invalid provider results retain their reservation and cannot be billed again', async () => {
  for (const mode of ['timeout', 'incomplete', 'invalid-audio'] as const) {
    const store = new MemoryStore();
    let calls = 0;
    const mock = provider({ generate: async () => {
      calls++;
      if (mode === 'timeout') throw new Error('Synthetic network timeout with private provider detail');
      if (mode === 'incomplete') return { finishReason: 'MAX_TOKENS' };
      return { finishReason: 'STOP', audioBase64: 'not-a-valid-wav', mimeType: 'audio/wav' };
    } });
    await assert.rejects(renderReaderNarration(input(), 'synthetic-owner', { store, provider: mock }), /reservation is retained/);
    const retained = store.snapshot()[0]!;
    assert.ok(retained.reservedMicros > 0 && retained.reservedMicros <= 100_000);
    assert.equal(retained.state, mode === 'timeout' ? 'unknown' : 'failed');
    await assert.rejects(
      renderReaderNarration(input(), 'synthetic-owner', { store, provider: mock }),
      /retained failure state/,
    );
    assert.equal(calls, 1);
    assert.equal(store.snapshot()[0]!.reservedMicros, retained.reservedMicros);
  }
});

test('private reservation storage must succeed before any paid model call', async () => {
  const store = new MemoryStore();
  store.create = async () => { throw new Error('Synthetic storage failure'); };
  let calls = 0;
  const mock = provider({ generate: async () => { calls++; return {}; } });
  await assert.rejects(
    renderReaderNarration(input(), 'synthetic-owner', { store, provider: mock }),
    /no paid request was started/,
  );
  assert.equal(calls, 0);
});
