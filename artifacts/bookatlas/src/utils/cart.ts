import type { CartItem } from '../types';

export const GUEST_CART_KEY = 'bookatlas:guest-cart:v1';
export const VALID_PROMO_CODES = new Set(['BOOKATLAS20', 'READMORE']);
export const PROMO_DISCOUNT_PERCENT = 20;
export const DEMO_CHECKOUT_NOTICE =
  'Demo complete. No payment was processed, no order was placed, and no book was added to your library.';

export function calculateCartSubtotal(cart: readonly CartItem[]): number {
  return Number(cart.reduce((sum, item) => sum + (item.book.price || 0), 0).toFixed(2));
}

export function applyPromoDiscount(subtotal: number, promoCode: string): {
  valid: boolean;
  discountPercent: number;
  discountAmount: number;
  total: number;
  error?: string;
} {
  const code = (promoCode || '').trim().toUpperCase();
  if (VALID_PROMO_CODES.has(code)) {
    const discountAmount = Number(((subtotal * PROMO_DISCOUNT_PERCENT) / 100).toFixed(2));
    const total = Math.max(0, Number((subtotal - discountAmount).toFixed(2)));
    return { valid: true, discountPercent: PROMO_DISCOUNT_PERCENT, discountAmount, total };
  }
  return {
    valid: false,
    discountPercent: 0,
    discountAmount: 0,
    total: subtotal,
    error: 'Invalid promo code. Try "BOOKATLAS20" for 20% off.',
  };
}

export function calculateCartSuperPoints(cart: readonly CartItem[]): number {
  return cart.reduce((sum, item) => sum + (item.book.superPointsEarned || Math.round((item.book.price || 0) * 10)), 0);
}

export function mergeGuestCartIntoAccount(accountCart: readonly CartItem[], guestCart: readonly CartItem[]): CartItem[] {
  const existing = new Set(accountCart.map((item) => `${item.book.id}:${item.format}`));
  return [...accountCart, ...guestCart.filter((item) => !existing.has(`${item.book.id}:${item.format}`))];
}
