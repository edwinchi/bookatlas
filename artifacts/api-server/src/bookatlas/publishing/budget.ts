export interface BudgetLedger {
  limitMicros: number;
  reservedMicros: number;
  reservations: Record<string, number>;
}

function nonnegativeInteger(value: number) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Budget values must be nonnegative safe integers.');
}

/** Integer microdollars, rounded upward. Caller supplies verified per-million-token rates. */
export function tokenCostUpperBound(inputTokens: number, maxOutputTokens: number, rates: {
  inputMicrosPerMillionTokens: number; outputMicrosPerMillionTokens: number;
  safetyPercent: number;
}): number {
  [inputTokens, maxOutputTokens, rates.inputMicrosPerMillionTokens,
    rates.outputMicrosPerMillionTokens, rates.safetyPercent].forEach(nonnegativeInteger);
  const numerator = (BigInt(inputTokens) * BigInt(rates.inputMicrosPerMillionTokens) +
    BigInt(maxOutputTokens) * BigInt(rates.outputMicrosPerMillionTokens)) *
    (100n + BigInt(rates.safetyPercent));
  const micros = (numerator + 99_999_999n) / 100_000_000n;
  if (micros > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Cost estimate is too large.');
  return Number(micros);
}

/**
 * Calculate a reservation BEFORE a paid call. The job worker must persist the
 * returned ledger using a version/lease compare-and-swap BEFORE invoking Gemini.
 * This pure function alone is NOT a durable or provider-enforced spending cap.
 * Reservations are never refunded on timeouts or ambiguous provider failures.
 */
export function reserveBudget(ledger: BudgetLedger, reservationId: string, upperBoundMicros: number): BudgetLedger {
  [ledger.limitMicros, ledger.reservedMicros, upperBoundMicros].forEach(nonnegativeInteger);
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(reservationId) ||
      Object.hasOwn(ledger.reservations, reservationId)) throw new Error('Invalid or already reserved provider attempt.');
  const recorded = Object.values(ledger.reservations);
  recorded.forEach(nonnegativeInteger);
  if (recorded.reduce((sum, value) => sum + value, 0) !== ledger.reservedMicros) {
    throw new Error('Budget ledger is inconsistent.');
  }
  if (upperBoundMicros <= 0 || upperBoundMicros > ledger.limitMicros - ledger.reservedMicros) {
    throw new Error('The approved budget cannot cover this provider attempt.');
  }
  return {
    limitMicros: ledger.limitMicros,
    reservedMicros: ledger.reservedMicros + upperBoundMicros,
    reservations: { ...ledger.reservations, [reservationId]: upperBoundMicros },
  };
}
