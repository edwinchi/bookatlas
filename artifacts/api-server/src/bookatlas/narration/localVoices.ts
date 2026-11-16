/** The free Kokoro voice run on the owner's computer (narration/local.ts); shared by the service and the API. */
export const LOCAL_PROVIDER = 'kokoro-local' as const;
/** Kokoro's English voices and the names readers see. */
export const KOKORO_VOICES: Record<string, string> = {
  af_heart: 'Heart', af_bella: 'Bella', af_nicole: 'Nicole', am_michael: 'Michael', am_fenrir: 'Fenrir', am_puck: 'Puck',
  bf_emma: 'Emma', bf_isabella: 'Isabella', bm_george: 'George', bm_fable: 'Fable', bm_lewis: 'Lewis',
};

type Seg = { provider?: string; kokoroVoice?: string };
/** The Kokoro voice name when the whole narration is Kokoro (for the store and the reader), else null. */
export function localVoiceLabel(n: { segments: Seg[] }): string | null {
  const first = n.segments[0];
  if (!first || !n.segments.every((s) => s.provider === LOCAL_PROVIDER)) return null;
  return KOKORO_VOICES[first.kokoroVoice ?? ''] ?? 'Kokoro';
}
/** Being narrated on the owner's computer: the cloud narrator must not add a second voice. */
export const isLocalNarration = (n: { lease_token: string | null; segments: Seg[]; done: number }) =>
  !!n.lease_token?.startsWith('local:') || n.segments.slice(0, n.done).some((s) => s.provider === LOCAL_PROVIDER);
