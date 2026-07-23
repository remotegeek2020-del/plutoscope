import { ensureAccount } from '@/lib/accounts';
import { createClient } from '@/lib/supabase/server';

import { BillingSection } from './billing-section';
import { BrandingForm } from './branding-form';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const account = await ensureAccount();
  const supabase = await createClient();
  const { data: accessLog } = await supabase.rpc('account_access_log');

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-instrument dark:text-pluto">
        Settings
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        White-label branding applied to exported PDF reports, and your subscription.
      </p>

      <BrandingForm
        accountId={account.id}
        initialBrandName={account.report_brand_name}
        initialLogoUrl={account.report_logo_url}
      />

      <BillingSection
        tier={account.tier}
        billingStatus={account.billing_status}
        hasCustomer={Boolean(account.stripe_customer_id)}
        isComplimentary={account.is_complimentary}
      />

      <section className="mt-8 max-w-md border-t border-slate-200 pt-6 dark:border-slate-800">
        <h2 className="text-sm font-semibold">Account access log</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          When our support team accesses your account, it&apos;s logged here.
        </p>
        {(accessLog ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No support access.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {(accessLog ?? []).map((entry, i) => (
              <li key={i} className="text-slate-600 dark:text-slate-400">
                {new Date(entry.started_at).toLocaleString()} — {entry.staff_email} (
                {entry.access_mode}) · {entry.reason}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
