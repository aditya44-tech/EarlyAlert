import { NextRequest, NextResponse } from 'next/server';
import { getOutcome } from '@/lib/db';

// GET /api/outcomes/[id] — get before/after outcome comparison for a student
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const outcome = getOutcome(id);

  if (!outcome) {
    return NextResponse.json({ error: `No outcome data for student ${id}` }, { status: 404 });
  }

  return NextResponse.json({ outcome });
}
