import { NextResponse } from 'next/server';

import { getServerEnv } from '@/lib/env';
import { processPendingRuns } from '@/lib/tracking/process-runs';

// Internal endpoint that executes pending tracking runs (the "execute" half of the scheduler).
// Triggered on a schedule by Vercel Cron (see vercel.json), which presents the CRON_SECRET as a
// Bearer token. Never called by end users. GET is used because Vercel Cron issues GET requests.
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const { CRON_SECRET } = getServerEnv();
  const authorization = request.headers.get('authorization');

  if (!CRON_SECRET || authorization !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const result = await processPendingRuns();
  return NextResponse.json({ ok: true, ...result });
}
