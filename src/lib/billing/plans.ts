import type { AccountTier } from '@/lib/tiers';
import type { Enums } from '@/types/database.types';

// Maps between our paid tiers and Stripe prices/statuses. Price IDs come from env (test/live).
export type PaidTier = 'starter' | 'consultant';

export function priceIdForTier(tier: PaidTier): string | undefined {
  return tier === 'starter'
    ? process.env.STRIPE_PRICE_STARTER
    : process.env.STRIPE_PRICE_CONSULTANT;
}

export function tierForPriceId(priceId: string | undefined | null): AccountTier | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_STARTER) return 'starter';
  if (priceId === process.env.STRIPE_PRICE_CONSULTANT) return 'consultant';
  return null;
}

/** Map a Stripe subscription status onto our billing_status enum. */
export function mapStripeStatus(status: string): Enums<'billing_status'> {
  switch (status) {
    case 'active':
    case 'trialing':
    case 'past_due':
    case 'canceled':
    case 'unpaid':
    case 'incomplete':
    case 'incomplete_expired':
      return status;
    case 'paused':
      return 'past_due';
    default:
      return 'incomplete';
  }
}
