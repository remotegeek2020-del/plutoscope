import { ensureAccount } from '@/lib/accounts';
import { getTierLimits } from '@/lib/tiers';

import { ProjectSetupForm } from './project-setup-form';

export const dynamic = 'force-dynamic';

export default async function ProjectSetupPage() {
  const account = await ensureAccount();
  const limits = getTierLimits(account.tier);

  return (
    <ProjectSetupForm
      tier={account.tier}
      maxTopics={limits.maxTopicsPerProject}
      maxPromptsPerTopic={limits.maxPromptsPerTopic}
      maxCompetitors={limits.maxCompetitorsPerProject}
    />
  );
}
