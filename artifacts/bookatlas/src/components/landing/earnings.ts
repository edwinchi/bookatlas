// eBook earnings for the landing page estimator, from the accepted prices (TASK-0002 P10: R1 and R4).
// Amounts are before VAT and payment-provider fees.

export const PLANS = {
  standard: { label: 'Standard', commission: 0.2, monthlyFee: 0 },
  pro: { label: 'Author Pro', commission: 0.1, monthlyFee: 9.99 },
} as const;

export type PlanId = keyof typeof PLANS;

export interface Earnings {
  sales: number;
  commission: number;
  fee: number;
  net: number;
}

const cents = (n: number) => Math.round(n * 100) / 100;

export function monthlyEarnings(price: number, copies: number, plan: PlanId): Earnings {
  const { commission, monthlyFee } = PLANS[plan];
  const sales = cents(Math.max(0, price) * Math.max(0, Math.floor(copies)));
  const cut = cents(sales * commission);
  return { sales, commission: cut, fee: monthlyFee, net: cents(sales - cut - monthlyFee) };
}

export function betterPlan(price: number, copies: number): PlanId {
  return monthlyEarnings(price, copies, 'pro').net > monthlyEarnings(price, copies, 'standard').net ? 'pro' : 'standard';
}

/** Fewest copies a month at which Author Pro pays the author more than Standard, in the rounded amounts shown. */
export function proPaysMoreFrom(price: number): number | null {
  const saving = (PLANS.standard.commission - PLANS.pro.commission) * price;
  if (!(saving > 0)) return null;
  // Start just below the exact break-even and step past any cent-rounding ties.
  let copies = Math.max(1, Math.floor(PLANS.pro.monthlyFee / saving));
  while (betterPlan(price, copies - 1) === 'pro' && copies > 1) copies--;
  while (betterPlan(price, copies) !== 'pro') copies++;
  return copies;
}
