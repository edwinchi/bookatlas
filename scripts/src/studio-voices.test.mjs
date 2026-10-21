import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  STUDIO_VOICES, DEFAULT_FEMALE_VOICE, DEFAULT_MALE_VOICE,
  STUDIO_SPEECH_MODEL, studioVoice, narrationDirection,
} from '../../lib/bookatlas-catalog/src/voices.ts';
import { CreatePublishingJobBody, CreateReaderNarrationBody } from '../../lib/api-zod/src/generated/api.ts';
import { narrationRequestId } from '../../artifacts/bookatlas/src/components/voice/requestIdentity.ts';

test('male and female recommendations are real distinct provider voices, not pitch approximations', () => {
  assert.equal(DEFAULT_FEMALE_VOICE, 'Sulafat');
  assert.equal(DEFAULT_MALE_VOICE, 'Charon');
  assert.equal(studioVoice(DEFAULT_FEMALE_VOICE)?.gender, 'Female');
  assert.equal(studioVoice(DEFAULT_MALE_VOICE)?.gender, 'Male');
  assert.equal(STUDIO_VOICES.filter(voice => voice.recommended).length, 2);
  assert.equal(STUDIO_SPEECH_MODEL, 'gemini-3.8-flash-tts');
});

test('publishing and reader clip contracts accept the entire same curated voice catalog', () => {
  for (const voice of STUDIO_VOICES) {
    assert.ok(CreatePublishingJobBody.shape.voice.safeParse(voice.id).success);
    assert.ok(CreateReaderNarrationBody.shape.voiceName.safeParse(voice.id).success);
    assert.match(narrationDirection(voice.id), /Read the supplied script exactly/);
    assert.match(narrationDirection(voice.id), /without additions/);
  }
  for (const legacy of ['Kore', 'Charon', 'Puck', 'Aoede']) assert.ok(studioVoice(legacy));
  assert.throws(() => narrationDirection('invented-voice'));
  assert.equal(CreateReaderNarrationBody.shape.voiceName.safeParse('invented-voice').success, false);
});

test('reader studio clips require explicit bounded spending approval and do not truncate oversized input', () => {
  const good = {
    requestId: 'e5bca34c-cff1-4c66-83fa-0f10cec2c64e',
    text: 'A synthetic voice test.', voiceName: DEFAULT_MALE_VOICE,
    approveSpend: true, budgetUsd: 0.1,
  };
  assert.ok(CreateReaderNarrationBody.safeParse(good).success);
  for (const patch of [
    { approveSpend: false }, { approveSpend: undefined }, { budgetUsd: 1 },
    { text: 'x'.repeat(501) }, { requestId: 'invalid' },
  ]) assert.equal(CreateReaderNarrationBody.safeParse({ ...good, ...patch }).success, false);
});

test('publishing uses the shared studio model and voice-specific direction without changing the script', () => {
  const source = readFileSync(new URL('../../artifacts/api-server/src/bookatlas/publishing/generation.ts', import.meta.url), 'utf8');
  assert.match(source, /model:\s*STUDIO_SPEECH_MODEL/);
  assert.match(source, /speechMetadata:\s*\{\s*style:\s*narrationDirection\(this\.job\.data\.config\.voice\)/);
});

test('reader preview request identity survives reloads without retaining chapter text', async () => {
  const rows = new Map();
  const storage = { getItem: key => rows.get(key) ?? null, setItem: (key, value) => rows.set(key, value) };
  const identity = { accountId: 'synthetic-reader', bookId: 'sample-book', voice: DEFAULT_FEMALE_VOICE, text: 'A private synthetic paragraph.' };
  const first = await narrationRequestId(identity, storage);
  assert.equal(await narrationRequestId({ ...identity }, storage), first);
  assert.notEqual(await narrationRequestId({ ...identity, voice: DEFAULT_MALE_VOICE }, storage), first);
  assert.notEqual(await narrationRequestId({ ...identity, accountId: 'another-reader' }, storage), first);
  assert.ok([...rows.entries()].every(([key, value]) => !key.includes(identity.text) && !value.includes(identity.text)));
  await assert.rejects(narrationRequestId(identity, { getItem: () => null, setItem: () => {} }), /safely retain/);
});
