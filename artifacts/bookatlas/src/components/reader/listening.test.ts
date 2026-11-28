import { test } from 'node:test';
import assert from 'node:assert/strict';
import { baseLang, groupVoices } from './listening';

const voice = (lang: string, name = `Voice ${lang}`) => ({ lang, name, voiceURI: name, default: false, localService: true }) as SpeechSynthesisVoice;

test('device voices: Android language tags never break the reader (RangeError from Intl.DisplayNames, 2026-11-25)', () => {
  // Before the fix "cmn-Hans-CN" made the region "HANS", and Intl.DisplayNames threw: the reader went blank.
  assert.throws(() => new Intl.DisplayNames(['en'], { type: 'region' }).of('HANS'), RangeError);
  const voices = ['cmn-Hans-CN', 'zh-Hans-CN', 'zh_CN', 'es_419', 'en-US-x-sfg-local', 'en_GB', 'fr-CA', 'yue-Hant-HK', 'en', ''].map((l) => voice(l));
  const groups = groupVoices(voices, 'en');
  const labels = groups.map((g) => g.label);
  assert.ok(labels.includes('English – United States'), labels.join(' | '));
  assert.ok(labels.includes('English – United Kingdom'));
  assert.ok(labels.some((l) => l.startsWith('Spanish – ') && l !== 'Spanish – '), labels.join(' | '));
  assert.equal(groups[0]!.lang, 'en', 'the book language comes first');
  assert.equal(baseLang('en_GB'), 'en');
  // Android's older language codes reach the right language.
  assert.deepEqual(['in-ID', 'iw-IL', 'cmn-Hans-CN', 'yue-Hant-HK', 'fil-PH', 'nb-NO'].map(baseLang), ['id', 'he', 'zh', 'zh', 'tl', 'no']);
  assert.ok(groups.some((g) => g.lang === 'zh' && g.label === 'Chinese – China'), labels.join(' | '));
  assert.equal(baseLang(undefined as unknown as string), '');
});

test('device translator: used when ready, skipped (and downloaded for later) when not, never waited on for ever', async () => {
  const { translateOnDevice } = await import('./listening');
  const g = globalThis as unknown as { Translator?: unknown };
  let created = 0;
  g.Translator = { availability: () => new Promise(() => {}), create: async () => ({ translate: async (t: string) => t }) };
  const t0 = Date.now();
  assert.equal(await translateOnDevice('Hello', 'en', 'de'), null, 'a check that never answers');
  assert.ok(Date.now() - t0 < 4500);
  g.Translator = { availability: async () => 'downloadable', create: async () => { created += 1; return { translate: async (t: string) => t }; } };
  assert.equal(await translateOnDevice('Hello', 'en', 'it'), null, 'not ready yet: BooksAtlas translates this time');
  assert.equal(created, 1, 'the download starts for next time');
  g.Translator = { availability: async () => 'available', create: async () => ({ translate: async (t: string) => `[pt] ${t}` }) };
  assert.equal(await translateOnDevice('Hello', 'en', 'pt'), '[pt] Hello');
  delete g.Translator;
});
