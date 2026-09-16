import { NextRequest, NextResponse } from 'next/server';
import { createIntervention, getAllInterventions, getStudentDetail } from '@/lib/db';
import { MentorActionPayload } from '@/lib/types';

// GET /api/interventions — list all intervention records
export async function GET() {
  const interventions = getAllInterventions();
  return NextResponse.json({ interventions, count: interventions.length });
}

// POST /api/interventions — assign a new intervention
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = body as MentorActionPayload;

    if (!payload.studentId || !payload.type) {
      return NextResponse.json({ error: 'studentId and type are required' }, { status: 400 });
    }

    const studentDetail = getStudentDetail(payload.studentId);
    if (!studentDetail) {
      return NextResponse.json({ error: `Student ${payload.studentId} not found` }, { status: 404 });
    }

    const baselineRiskScore = studentDetail.riskScore;
    const record = createIntervention(payload, baselineRiskScore);

    return NextResponse.json({
      success: true,
      intervention: record,
      baselineRiskScore,
    }, { status: 201 });

  } catch (error) {
    console.error('[API /interventions POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
