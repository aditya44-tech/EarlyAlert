import { NextRequest, NextResponse } from 'next/server';
import { getStudentDetail } from '@/lib/db';

// GET /api/students/[id]
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = getStudentDetail(id);

  if (!detail) {
    return NextResponse.json({ error: `Student ${id} not found` }, { status: 404 });
  }

  return NextResponse.json({ student: detail });
}
