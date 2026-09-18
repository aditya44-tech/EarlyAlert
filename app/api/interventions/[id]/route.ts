import { NextRequest, NextResponse } from 'next/server';
import { resolveIntervention, reopenIntervention, getOutcome } from '@/lib/db';

/**
 * PATCH /api/interventions/[id]
 *
 * `id` is the studentId in our store.
 * Body: { status?: 'Resolved' | 'Active' }  — defaults to 'Resolved'.
 *
 * Resolving closes the intervention on the student record as well, so the
 * profile, outcome page and student portal all stop showing it as active.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let status: 'Resolved' | 'Active' = 'Resolved';
  try {
    const body = await request.json();
    if (body?.status === 'Active' || body?.status === 'Resolved') {
      status = body.status;
    }
  } catch {
    // No body sent — treat as a plain resolve
  }

  if (status === 'Active') {
    reopenIntervention(id);
  } else {
    resolveIntervention(id);
  }

  const outcome = getOutcome(id);
  return NextResponse.json({ success: true, status, outcome });
}
