import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENGLISH, YOUNG_LANGS, cap, loadYoung, startLang } from './youngLang';
import { findRound } from './firstWords';
import { pictureRound } from './youngReaders';

test('young readers in more languages: every translation matches the English, text for text', async () => {
  for (const { id } of YOUNG_LANGS.filter((l) => l.id !== 'en')) {
    const c = await loadYoung(id);
    assert.equal(c.id, id);
    assert.match(c.voice, new RegExp(`^${id}-[A-Z]{2}$`));
    for (const [i, s] of c.stories.entries()) {
      const en = ENGLISH.stories[i]!;
      assert.equal(s.id, en.id);
      assert.notEqual(s.title, en.title, `${id}: ${s.id} is translated`);
      assert.equal(s.paragraphs.length, en.paragraphs.length, `${id}: ${s.id} paragraphs`);
      s.questions.forEach((q, k) => {
        assert.notEqual(q.question, en.questions[k]!.question, `${id}: ${s.id} question ${k}`);
        assert.equal(q.options.length, en.questions[k]!.options.length, `${id}: ${s.id} options ${k}`);
        assert.equal(q.answer, en.questions[k]!.answer);
      });
    }
    for (const lvl of [1, 2, 3] as const) {
      const words = c.words[lvl].map((w) => w.word);
      assert.equal(words.length, ENGLISH.words[lvl].length);
      assert.equal(new Set(words).size, words.length, `${id}: level ${lvl} words are different from each other`);
      assert.ok(words.every((w) => w && !/\s/.test(w)), `${id}: level ${lvl} words are single words (for spelling)`);
    }
    for (const [i, g] of c.firstWords.entries()) {
      assert.equal(g.words.length, ENGLISH.firstWords[i]!.words.length);
      assert.equal(new Set(g.words.map((w) => w.word)).size, g.words.length, `${id}: ${g.id} words`);
    }
    for (const [i, b] of c.pictureBooks.entries()) {
      assert.equal(b.pages.length, ENGLISH.pictureBooks[i]!.pages.length);
      assert.notEqual(b.pages[0]!.text, ENGLISH.pictureBooks[i]!.pages[0]!.text, `${id}: ${b.id} is translated`);
    }
    // The games work with the translated words.
    const r = findRound(3, null, c.firstWords);
    assert.ok(r.choices.some((x) => x.word === r.target.word));
    assert.ok(c.find(r.target.word).includes(r.target.word));
    assert.ok(pictureRound(2, 5, 3, c.words).choices.length === 3);
  }
});

test('young readers in more languages: the starting language and capitals', () => {
  assert.equal(startLang(null, 'fr-BE'), 'fr');
  assert.equal(startLang(null, 'de-DE'), 'en');
  assert.equal(startLang('es', 'fr-FR'), 'es');
  assert.equal(startLang('xx', 'pt-BR'), 'pt');
  assert.equal(cap('le chien'), 'Le chien');
  assert.equal(cap('él'), 'Él');
});

test('young readers in more languages: letter sounds and the recorded clips list for each language', async () => {
  const { youngClipTexts, clipKey, youngAudioDir } = await import('./youngVoice');
  assert.equal(youngAudioDir('en'), 'audio/young');
  assert.equal(youngAudioDir('fr'), 'audio/young/fr');
  for (const { id } of YOUNG_LANGS.filter((l) => l.id !== 'en')) {
    const c = await loadYoung(id);
    assert.ok(c.sounds.length >= 30, `${id}: letter sounds`);
    assert.equal(new Set(c.sounds.map((s) => s.id)).size, c.sounds.length, `${id}: one of each sound`);
    assert.ok(c.sounds.some((s) => s.group === 'pairs') && c.sounds.some((s) => s.group === 'vowels'));
    const texts = youngClipTexts(c);
    assert.equal(new Set(texts.map(clipKey)).size, texts.length, `${id}: no two texts share a key`);
    assert.ok(texts.includes(c.stories[0]!.paragraphs[0]!));
    assert.ok(texts.includes(c.find(c.firstWords[0]!.words[0]!.word)));
    assert.ok(texts.includes(c.sounds[0]!.say));
  }
  assert.match((await loadYoung('fr')).sounds.find((s) => s.id === 'ch')!.say, /^ch, comme dans chat\.$/);
});
