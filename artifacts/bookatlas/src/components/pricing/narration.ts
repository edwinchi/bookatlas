// The natural-voice narration price, as the server charges it (artifacts/api-server/src/bookatlas/narration/plan.ts):
// €24.99 up to 60,000 words, then €3.99 for every further 10,000 words or part of them, VAT included.
export const NARRATION = { baseCents: 2499, baseWords: 60_000, extraCents: 399, extraWords: 10_000 } as const;

export function narrationPriceCents(words: number) {
  const extra = Math.max(0, Math.ceil((words - NARRATION.baseWords) / NARRATION.extraWords));
  return NARRATION.baseCents + extra * NARRATION.extraCents;
}
