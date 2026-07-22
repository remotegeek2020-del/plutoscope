import type Stripe from 'stripe';

import { mapStripeStatus, tierForPriceId } from '@/lib/billing/plans';
import { getStripe } from '@/lib/billing/stripe';
import { getServerEnv } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/admin';
import type { TablesUpdate } from '@/types/database.types';

export const dynamic = 'force-dynamic';

// Stripe webhook (Part VIII §48 Week 19). Reconciles an account's tier + billing_status from
// subscription events. Uses the service-role client (no user session here); the Stripe signature
// is the authentication.
export async function POST(request: Request) {
  const { STRIPE_WEBHOOK_SECRET } = getServerEnv();
  if (!STRIPE_WEBHOOK_SECRET) {
    return new Response('Webhook not configured', { status: 500 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) return new Response('Missing signature', { status: 400 });

  const stripe = getStripe();
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return new Response(`Signature verification failed: ${(err as Error).message}`, {
      status: 400,
    });
  }

  const supabase = createAdminClient();

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const accountId = session.client_reference_id ?? session.metadata?.account_id;
      const subscriptionId =
        typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
      if (accountId && subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await applySubscription(supabase, accountId, subscription);
      }
    } else if (
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      const accountId = subscription.metadata?.account_id;
      if (accountId) await applySubscription(supabase, accountId, subscription);
    }
  } catch (err) {
    return new Response(`Handler error: ${(err as Error).message}`, { status: 500 });
  }

  return new Response('ok');
}

async function applySubscription(
  supabase: ReturnType<typeof createAdminClient>,
  accountId: string,
  subscription: Stripe.Subscription,
): Promise<void> {
  const priceId = subscription.items.data[0]?.price?.id;
  const tier = tierForPriceId(priceId);
  const canceled = subscription.status === 'canceled';

  const update: TablesUpdate<'accounts'> = {
    billing_status: mapStripeStatus(subscription.status),
    stripe_subscription_id: subscription.id,
  };
  // Downgrade to free when canceled; otherwise reflect the purchased tier (if recognized).
  if (canceled) update.tier = 'free';
  else if (tier) update.tier = tier;

  await supabase.from('accounts').update(update).eq('id', accountId);
}
