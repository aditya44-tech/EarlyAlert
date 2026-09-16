import { NextRequest, NextResponse } from 'next/server';
import { resolveIntervention, getOutcome } from '@/lib/db';

// PATCH /api/interventions/[id]/resolve — mark intervention as resolved
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // id is studentId in our in-memory store
  resolveIntervention(id);
  const outcome = getOutcome(id);
  return NextResponse.json({ success: true, outcome });
}
