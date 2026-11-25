// A voice for every character (Reading Intelligence phase 3, owner request 2026-11-25). Speech in quotes is read
// in the speaker's voice when the line says who speaks ("…," said Kofi / Kofi asked, "…"), in the dialogue voice
// otherwise; the rest stays in the narrator's voice. Without a cast or a dialogue voice, nothing changes.
//
//   npm run narrate -- --narration <id> --voice af_heart --dialogue-voice bf_emma --cast "Kofi=am_michael,Lina=bf_isabella"

const SPEECH_VERBS = 'said|says|asked|asks|replied|replies|answered|whispered|shouted|called|cried|added|muttered|laughed|exclaimed|told|continued|yelled|began|sighed';

/** "Kofi=am_michael, Lina = bf_emma" → Map { kofi → am_michael, lina → bf_emma } (names compared without case). */
export function parseCast(text, knownVoices) {
  const cast = new Map();
  for (const pair of String(text ?? '').split(',')) {
    const m = /^\s*([^=]{1,40}?)\s*=\s*([a-z]{2}_[a-z]+)\s*$/i.exec(pair);
    if (!m) { if (pair.trim()) throw new Error(`Cannot read the cast entry "${pair.trim()}". Write Name=voice, for example Kofi=am_michael.`); continue; }
    if (knownVoices && !knownVoices[m[2]]) throw new Error(`Unknown voice "${m[2]}" for ${m[1]}.`);
    cast.set(m[1].toLowerCase(), m[2]);
  }
  return cast;
}

/** The character a quote belongs to, from the words just before or just after it. */
export function speakerOf(before, after, cast) {
  const names = [...cast.keys()].sort((a, b) => b.length - a.length).map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!names.length) return null;
  const who = `(${names.join('|')})`;
  const tail = after.slice(0, 60), head = before.slice(-60);
  const m = new RegExp(`^[\\s,;:—–-]*(?:(?:${SPEECH_VERBS})\\s+${who}\\b|${who}\\s+(?:${SPEECH_VERBS})\\b)`, 'i').exec(tail)
    ?? new RegExp(`\\b${who}\\s+(?:${SPEECH_VERBS})[^"“”]{0,20}[,:]?\\s*$`, 'i').exec(head);
  const name = m && (m[1] ?? m[2] ?? m[3]);
  return name ? name.toLowerCase() : null;
}

/**
 * A chunk split into pieces with their voice: narration in `narrator`, quoted speech in the speaker's voice (cast)
 * or `dialogue`. Pieces with no letters are dropped.
 */
export function voicedPieces(chunk, { narrator, dialogue = null, cast = new Map() }) {
  if (!dialogue && !cast.size) return [{ text: chunk, voice: narrator }];
  const out = [];
  const push = (text, voice) => {
    const t = text.trim();
    if (!/\p{L}|\p{N}/u.test(t)) return;
    const last = out[out.length - 1];
    if (last && last.voice === voice) last.text += ` ${t}`; else out.push({ text: t, voice });
  };
  const re = /“([^”]+)”|"([^"]+)"/g;
  let at = 0, m;
  while ((m = re.exec(chunk))) {
    push(chunk.slice(at, m.index), narrator);
    const name = speakerOf(chunk.slice(0, m.index), chunk.slice(m.index + m[0].length), cast);
    push(m[0], (name && cast.get(name)) || dialogue || narrator);
    at = m.index + m[0].length;
  }
  push(chunk.slice(at), narrator);
  return out.length ? out : [{ text: chunk, voice: narrator }];
}
