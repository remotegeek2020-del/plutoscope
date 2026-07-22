import 'server-only';

import Stripe from 'stripe';

import { getServerEnv } from '@/lib/env';

// Stripe client (Part VIII §48 Week 19). Founder-approved processor. Server-only.
let cached: Stripe | null = null;

export function getStripe(): Stripe {
  const { STRIPE_SECRET_KEY } = getServerEnv();
  if (!STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not configured');
  if (!cached) cached = new Stripe(STRIPE_SECRET_KEY);
  return cached;
}
