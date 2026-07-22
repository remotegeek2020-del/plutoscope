'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { ensureAccount } from '@/lib/accounts';
import { getStripe } from '@/lib/billing/stripe';
import { priceIdForTier, type PaidTier } from '@/lib/billing/plans';
import { createClient } from '@/lib/supabase/server';

export type BillingActionResult = { ok: false; error: string };

async function appOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  const host = (await headers()).get('host');
  return host ? `https://${host}` : 'http://localhost:3000';
}

/** Start a Stripe Checkout for a paid tier. Redirects to Stripe on success. */
export async function startCheckout(tier: PaidTier): Promise<BillingActionResult | void> {
  const price = priceIdForTier(tier);
  if (!price) return { ok: false, error: `No Stripe price configured for the ${tier} plan.` };

  const account = await ensureAccount();
  const stripe = getStripe();
  const supabase = await createClient();

  let customerId = account.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: account.name ?? undefined,
      metadata: { account_id: account.id },
    });
    customerId = customer.id;
    await supabase.from('accounts').update({ stripe_customer_id: customerId }).eq('id', account.id);
  }

  const origin = await appOrigin();
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    client_reference_id: account.id,
    subscription_data: { metadata: { account_id: account.id } },
    success_url: `${origin}/settings?billing=success`,
    cancel_url: `${origin}/settings?billing=cancel`,
  });

  if (!session.url) return { ok: false, error: 'Could not start checkout.' };
  redirect(session.url);
}

/** Open the Stripe billing portal to manage/cancel the subscription. */
export async function openBillingPortal(): Promise<BillingActionResult | void> {
  const account = await ensureAccount();
  if (!account.stripe_customer_id) return { ok: false, error: 'No billing account yet.' };

  const stripe = getStripe();
  const origin = await appOrigin();
  const portal = await stripe.billingPortal.sessions.create({
    customer: account.stripe_customer_id,
    return_url: `${origin}/settings`,
  });
  redirect(portal.url);
}
