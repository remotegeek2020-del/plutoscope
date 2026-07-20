// DEPRECATED (Week 4). Superseded by the Next.js tracking processor.
//
// Tracking execution moved out of this Supabase Edge (Deno) function into a secret-protected
// Next.js route — `GET /api/internal/tracking/process` — triggered by Vercel Cron. Reason: the
// engine API keys live in Vercel's env store (not Supabase's), and keeping all engine
// adapters/normalizers in one Node runtime keeps them unit-testable. The enqueue half remains a
// pg_cron SQL job (migration 0005). This stub stays only so the deployed function isn't a
// dangling executor; it can be deleted from the Supabase dashboard.

Deno.serve(() =>
  Response.json(
    {
      ok: false,
      deprecated: true,
      use: 'GET /api/internal/tracking/process (Next.js, triggered by Vercel Cron)',
    },
    { status: 410 },
  ),
);
