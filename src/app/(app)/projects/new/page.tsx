import { ensureAccount } from '@/lib/accounts';
import { createClient } from '@/lib/supabase/server';
import { getTierLimits } from '@/lib/tiers';

import { ProjectList } from './project-list';
import { ProjectSetupForm } from './project-setup-form';

export const dynamic = 'force-dynamic';

export default async function ProjectSetupPage() {
  const account = await ensureAccount();
  const limits = getTierLimits(account.tier);

  const supabase = await createClient();
  const { data: projects } = await supabase
    .from('projects')
    .select('id, domain, label')
    .order('created_at', { ascending: false });

  return (
    <div>
      <ProjectList projects={projects ?? []} />
      <ProjectSetupForm
        tier={account.tier}
        maxTopics={limits.maxTopicsPerProject}
        maxPromptsPerTopic={limits.maxPromptsPerTopic}
        maxCompetitors={limits.maxCompetitorsPerProject}
      />
    </div>
  );
}
