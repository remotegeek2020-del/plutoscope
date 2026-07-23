import { createClient } from '@/lib/supabase/server';

import { CompToggle } from './comp-toggle';
import { LoginAs } from './login-as';

export const dynamic = 'force-dynamic';

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  const [{ data: accounts }, { data: auditLog }] = await Promise.all([
    supabase.rpc('admin_search_accounts', { p_query: q ?? '' }),
    supabase.rpc('admin_audit_log'),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-instrument dark:text-pluto">
        Admin Console
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        Support access to customer accounts. Every &ldquo;login as&rdquo; is audited, read-only,
        time-limited, and disclosed to the customer.
      </p>

      <form className="mt-6 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search by email or account name…"
          className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
        <button className="rounded-md bg-instrument px-3 py-2 text-sm font-medium text-white">
          Search
        </button>
      </form>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left dark:border-slate-800">
              <th className="py-2 pr-4 font-medium">Account</th>
              <th className="py-2 pr-4 font-medium">Email</th>
              <th className="py-2 pr-4 font-medium">Tier</th>
              <th className="py-2 pr-4 font-medium">Projects</th>
              <th className="py-2 pr-4 font-medium">Complimentary</th>
              <th className="py-2 pr-4 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {(accounts ?? []).map((account) => (
              <tr key={account.id} className="border-b border-slate-100 dark:border-slate-900">
                <td className="py-2 pr-4">{account.name ?? '—'}</td>
                <td className="py-2 pr-4 text-slate-500">{account.owner_email}</td>
                <td className="py-2 pr-4 capitalize">{account.tier}</td>
                <td className="py-2 pr-4 tabular-nums">{account.projects}</td>
                <td className="py-2 pr-4">
                  <CompToggle
                    accountId={account.id}
                    isComplimentary={account.is_complimentary}
                    compReason={account.comp_reason}
                  />
                </td>
                <td className="py-2 pr-4">
                  <LoginAs accountId={account.id} />
                </td>
              </tr>
            ))}
            {(accounts ?? []).length === 0 ? (
              <tr>
                <td colSpan={6} className="py-4 text-sm text-slate-500">
                  No accounts found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 text-sm font-semibold">Impersonation audit log</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left dark:border-slate-800">
              <th className="py-2 pr-4 font-medium">Staff</th>
              <th className="py-2 pr-4 font-medium">Account</th>
              <th className="py-2 pr-4 font-medium">Reason</th>
              <th className="py-2 pr-4 font-medium">Mode</th>
              <th className="py-2 pr-4 font-medium">Started</th>
              <th className="py-2 pr-4 font-medium">Ended</th>
            </tr>
          </thead>
          <tbody>
            {(auditLog ?? []).map((entry) => (
              <tr key={entry.id} className="border-b border-slate-100 dark:border-slate-900">
                <td className="py-2 pr-4 text-slate-500">{entry.staff_email}</td>
                <td className="py-2 pr-4">{entry.account_name ?? '—'}</td>
                <td className="py-2 pr-4">{entry.reason}</td>
                <td className="py-2 pr-4">{entry.access_mode}</td>
                <td className="py-2 pr-4 text-slate-500">
                  {new Date(entry.started_at).toLocaleString()}
                </td>
                <td className="py-2 pr-4 text-slate-500">
                  {entry.ended_at ? new Date(entry.ended_at).toLocaleString() : 'active'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
