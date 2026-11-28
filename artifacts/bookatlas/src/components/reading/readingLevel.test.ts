import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectLang, readingEase, readingLevel, syllables } from './readingLevel';

const easyEn = Array.from({ length: 30 }, () => 'The cat sat on the mat. It was a big red cat. The dog ran to it.');
const hardEn = Array.from({ length: 12 }, () => 'Notwithstanding considerable institutional resistance, the administration systematically implemented comprehensive organisational restructuring initiatives, fundamentally transforming established operational methodologies throughout the international conglomerate.');
const easyNl = Array.from({ length: 30 }, () => 'De kat zit op de mat. Het is een kat. Ik zie de hond en de kat. Hij is niet groot.');

test('reading level: the language of the text, and syllables', () => {
  assert.equal(detectLang(easyEn.join(' ')), 'en');
  assert.equal(detectLang(easyNl.join(' ')), 'nl');
  assert.equal(detectLang('x'), null);
  assert.equal(syllables('cat', 'en'), 1);
  assert.equal(syllables('table', 'en'), 1, 'a rough count is fine for a band');
  assert.equal(syllables('organisation', 'en'), 5);
  assert.equal(syllables('huis', 'nl'), 1);
  assert.ok(readingEase(8, 1.2, 'en') > readingEase(25, 1.8, 'en'));
});

test('reading level: short simple text is very easy for young readers; dense prose is for adults', () => {
  const easy = readingLevel(easyEn)!;
  assert.equal(easy.label, 'Very easy');
  assert.equal(easy.ages, '6–8');
  assert.equal(easy.groep, undefined, 'the Dutch school year only for Dutch books');
  const hard = readingLevel(hardEn)!;
  assert.ok(['Hard', 'Very hard'].includes(hard.label), hard.label);
  assert.match(hard.who, /readers$/);
  assert.equal(easy.who, 'readers aged 6–8');
  const nl = readingLevel(easyNl)!;
  assert.equal(nl.lang, 'nl');
  assert.equal(nl.groep, 'groep 3–4');
  assert.equal(readingLevel(['Too short to say.']), null);
});
