/** Stripe's own webhook signing for the payment tests; no request ever leaves the process. */
import Stripe from 'stripe';

export const stripeWebhooks = new Stripe('sk_test_synthetic_key_not_used_for_requests').webhooks;
