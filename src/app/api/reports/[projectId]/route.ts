import { buildReportHtml } from '@/lib/reports/build-report';
import { htmlToPdf } from '@/lib/reports/pdf';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// White-label PDF export for a project (Part VIII §47 Week 17). Auth via the user session; the
// report gatherer is RLS-scoped, so a user can only export a project they own.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { projectId } = await params;
  const html = await buildReportHtml(projectId);
  if (!html) {
    return new Response('Not found', { status: 404 });
  }

  const pdf = await htmlToPdf(html);
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="plutoscope-report-${projectId}.pdf"`,
    },
  });
}
