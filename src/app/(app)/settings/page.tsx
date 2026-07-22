import { ensureAccount } from '@/lib/accounts';

import { BrandingForm } from './branding-form';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const account = await ensureAccount();

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-instrument dark:text-pluto">
        Settings
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        White-label branding applied to exported PDF reports.
      </p>

      <BrandingForm
        accountId={account.id}
        initialBrandName={account.report_brand_name}
        initialLogoUrl={account.report_logo_url}
      />
    </div>
  );
}
