import { notFound } from 'next/navigation';

import { getStaffRole } from '@/lib/admin/staff';

// Staff-only gate (Part III §18.1). Non-staff get a 404 (the admin area shouldn't reveal itself).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const role = await getStaffRole();
  if (!role) notFound();
  return <>{children}</>;
}
