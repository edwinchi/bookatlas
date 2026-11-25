import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCast, speakerOf, voicedPieces } from '../../tools/local-narrator/voices.mjs';

const VOICES = { af_heart: 1, am_michael: 1, bf_emma: 1, bf_isabella: 1 };

test('narrator cast: parsed, checked against the voices', () => {
  assert.deepEqual([...parseCast('Kofi=am_michael, Lina = bf_isabella', VOICES)], [['kofi', 'am_michael'], ['lina', 'bf_isabella']]);
  assert.throws(() => parseCast('Kofi=xx_nobody', VOICES), /Unknown voice/);
  assert.throws(() => parseCast('Kofi am_michael', VOICES), /Cannot read/);
  assert.equal(parseCast('', VOICES).size, 0);
});

test('narrator cast: who speaks, before or after the quote', () => {
  const cast = parseCast('Kofi=am_michael,Lina=bf_isabella', VOICES);
  assert.equal(speakerOf('', ', said Kofi.', cast), 'kofi');
  assert.equal(speakerOf('', ' Lina whispered.', cast), 'lina');
  assert.equal(speakerOf('Then Lina asked, ', ' and waited.', cast), 'lina');
  assert.equal(speakerOf('The wind blew. ', ' It was late.', cast), null);
});

test('narrator cast: speech in the speaker’s voice, the rest in the narrator’s', () => {
  const cast = parseCast('Kofi=am_michael', VOICES);
  const opts = { narrator: 'af_heart', dialogue: 'bf_emma', cast };
  assert.deepEqual(voicedPieces('“Look at the kite!” said Kofi. Lina laughed. “It is huge.”', opts), [
    { text: '“Look at the kite!”', voice: 'am_michael' },
    { text: 'said Kofi. Lina laughed.', voice: 'af_heart' },
    { text: '“It is huge.”', voice: 'bf_emma' },
  ]);
  // Without a cast or a dialogue voice nothing changes.
  assert.deepEqual(voicedPieces('“Hi,” she said.', { narrator: 'af_heart' }), [{ text: '“Hi,” she said.', voice: 'af_heart' }]);
  assert.deepEqual(voicedPieces('No speech here.', opts), [{ text: 'No speech here.', voice: 'af_heart' }]);
});
