import { NextRequest, NextResponse } from 'next/server';
import { getAllStudents, bulkUpdateStudents, getStudentDetail } from '@/lib/db';
import { computeRiskScore, generateFallbackExplanation, RawStudentData } from '@/lib/riskEngine';

// GET /api/students — returns all student summaries
export async function GET() {
  const students = getAllStudents();
  return NextResponse.json({ students, count: students.length });
}

// POST /api/students — bulk update from CSV upload data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rows, weekLabel, uploadType } = body as {
      rows: Record<string, string>[];
      weekLabel: string;
      uploadType: 'overall' | 'fee' | 'backlog' | 'subject_wise';
    };

    if (!rows || !Array.isArray(rows)) {
      return NextResponse.json({ error: 'Invalid payload: rows must be an array' }, { status: 400 });
    }

    const updates: Array<{ studentId: string; detail: any }> = [];

    for (const row of rows) {
      const sid = row.studentId?.trim();
      if (!sid) continue;

      const existing = getStudentDetail(sid);
      if (!existing) continue;

      let updatedDetail = { ...existing };

      if (uploadType === 'overall') {
        const att = parseFloat(row.attendance);
        const score = parseFloat(row.testScore);
        if (isNaN(att) || isNaN(score)) continue;

        updatedDetail.attendanceHistory = [...existing.attendanceHistory, { week: weekLabel, percentage: att }];
        updatedDetail.gradeHistory = [...existing.gradeHistory, { test: weekLabel, score }];

      } else if (uploadType === 'fee') {
        const overdue = parseInt(row.overdueDays || '0', 10);
        if (isNaN(overdue)) continue;
        // Fee update — rebuild raw for engine
        const raw: RawStudentData = {
          studentId: sid,
          name: existing.name,
          department: existing.department,
          year: existing.year,
          attendanceHistory: existing.attendanceHistory,
          gradeHistory: existing.gradeHistory,
          backlogs: existing.contributingFactors.find(f => f.factor === 'Backlogs') ? 2 : 0,
          backlogSubjects: [],
          feeOverdueDays: overdue,
          submissionRate: 70,
        };
        const result = computeRiskScore(raw);
        updates.push({ studentId: sid, detail: {
          ...existing,
          riskScore: result.riskScore,
          riskLevel: result.riskLevel,
          contributingFactors: result.contributingFactors,
          suggestedAction: result.suggestedAction,
          aiExplanation: generateFallbackExplanation({ name: existing.name, department: existing.department, year: existing.year }, result),
        }});
        continue;

      } else if (uploadType === 'backlog') {
        const backlogs = parseInt(row.backlogCount || '0', 10);
        const subjects = row.backlogSubjects ? row.backlogSubjects.split(';').map(s => s.trim()).filter(Boolean) : [];
        if (isNaN(backlogs)) continue;
        const raw: RawStudentData = {
          studentId: sid,
          name: existing.name,
          department: existing.department,
          year: existing.year,
          attendanceHistory: existing.attendanceHistory,
          gradeHistory: existing.gradeHistory,
          backlogs,
          backlogSubjects: subjects,
          feeOverdueDays: existing.contributingFactors.find(f => f.factor === 'Fee Overdue') ? 15 : 0,
          submissionRate: 70,
        };
        const result = computeRiskScore(raw);
        updates.push({ studentId: sid, detail: {
          ...existing,
          riskScore: result.riskScore,
          riskLevel: result.riskLevel,
          contributingFactors: result.contributingFactors,
          suggestedAction: result.suggestedAction,
          aiExplanation: generateFallbackExplanation({ name: existing.name, department: existing.department, year: existing.year }, result),
        }});
        continue;
      }

      // Re-score via engine for overall/subject_wise
      const raw: RawStudentData = {
        studentId: sid,
        name: updatedDetail.name,
        department: updatedDetail.department,
        year: updatedDetail.year,
        attendanceHistory: updatedDetail.attendanceHistory,
        gradeHistory: updatedDetail.gradeHistory,
        backlogs: existing.contributingFactors.find(f => f.factor === 'Backlogs') ? 2 : 0,
        backlogSubjects: [],
        feeOverdueDays: existing.contributingFactors.find(f => f.factor === 'Fee Overdue') ? 15 : 0,
        submissionRate: 70,
      };
      const result = computeRiskScore(raw);
      updates.push({ studentId: sid, detail: {
        ...updatedDetail,
        riskScore: result.riskScore,
        riskLevel: result.riskLevel,
        contributingFactors: result.contributingFactors,
        suggestedAction: result.suggestedAction,
        aiExplanation: generateFallbackExplanation({ name: updatedDetail.name, department: updatedDetail.department, year: updatedDetail.year }, result),
      }});
    }

    const updatedCount = bulkUpdateStudents(updates);
    const allStudents = getAllStudents();

    return NextResponse.json({
      success: true,
      updatedCount,
      skippedCount: rows.length - updatedCount,
      students: allStudents,
    });
  } catch (error) {
    console.error('[API /students POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
