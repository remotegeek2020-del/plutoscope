import type { Enums } from '@/types/database.types';

export type AccountTier = Enums<'account_tier'>;

/**
 * Per-tier limits. These are the levers that bound AI-API cost (Part III §17.2 warns that
 * topic count × refresh cadence is the cost driver and must be capped per tier, not left
 * unlimited). Numbers below are a first pass aligned with Part I §7 tier definitions and are
 * PENDING FOUNDER SIGN-OFF before launch pricing is finalized (Part III §22 open question:
 * "Define exact topic-to-prompt expansion logic ... needs a hard cap per tier").
 */
export interface TierLimits {
  /** Max tracked domains/projects on the account (Starter = 3 domains, Consultant = 10). */
  maxProjects: number;
  /** Max tracked competitors per project (MVP caps at 3 — Part III §18). */
  maxCompetitorsPerProject: number;
  /** Max user topics per project. */
  maxTopicsPerProject: number;
  /** Hard cap on how many prompts a single topic may expand into (the cost lever). */
  maxPromptsPerTopic: number;
  /** Max pages a single whole-site audit scan will crawl (a crawl-credit cost lever). */
  maxAuditPagesPerScan: number;
  /** Tracking refresh cadence. MVP is weekly across tiers (Part I §7). */
  refreshCadence: 'weekly';
}

export const TIER_LIMITS: Record<AccountTier, TierLimits> = {
  free: {
    maxProjects: 1,
    maxCompetitorsPerProject: 1,
    maxTopicsPerProject: 3,
    maxPromptsPerTopic: 3,
    maxAuditPagesPerScan: 5,
    refreshCadence: 'weekly',
  },
  starter: {
    maxProjects: 3,
    maxCompetitorsPerProject: 3,
    maxTopicsPerProject: 10,
    maxPromptsPerTopic: 5,
    maxAuditPagesPerScan: 10,
    refreshCadence: 'weekly',
  },
  consultant: {
    maxProjects: 10,
    maxCompetitorsPerProject: 3,
    maxTopicsPerProject: 20,
    maxPromptsPerTopic: 8,
    maxAuditPagesPerScan: 20,
    refreshCadence: 'weekly',
  },
  // Agency/Enterprise are Phase 2/3 (Part I §6). Placeholder limits until those tiers ship.
  agency: {
    maxProjects: 25,
    maxCompetitorsPerProject: 5,
    maxTopicsPerProject: 40,
    maxPromptsPerTopic: 10,
    maxAuditPagesPerScan: 40,
    refreshCadence: 'weekly',
  },
  enterprise: {
    maxProjects: 100,
    maxCompetitorsPerProject: 10,
    maxTopicsPerProject: 100,
    maxPromptsPerTopic: 12,
    maxAuditPagesPerScan: 100,
    refreshCadence: 'weekly',
  },
};

export function getTierLimits(tier: AccountTier): TierLimits {
  return TIER_LIMITS[tier];
}
