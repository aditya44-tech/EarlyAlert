/**
 * tests/resetAll.test.ts
 *
 * Tests for "Reset All Data" (lib/db.ts → resetAllData).
 *
 * A reset must be total: students, details, interventions, per-student status,
 * cached outcomes and the upload history all go away. Crucially, a student
 * uploaded again *after* a reset must come back clean — no leftover "Active" or
 * "Resolved" intervention plan and no outcome comparison hanging off their
 * studentId.
 *
 * Run with: npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  getAllStudents,
  getStudentDetail,
  getAllInterventions,
  getUploadHistory,
  addUploadHistory,
  resetAllData,
  upsertStudent,
  createIntervention,
  resolveIntervention,
  getOutcome,
} from '../lib/db.ts';
import { computeRiskScore, type RawStudentData } from '../lib/riskEngine.ts';

/** Minimal raw record, scored the same way the CSV upload path scores one. */
function freshStudent(studentId: string, name = 'Re-uploaded Student') {
  const raw: RawStudentData = {
    studentId,
    name,
    department: 'Computer Science',
    year: 4,
    attendanceHistory: [
      { week: 'Week 1', percentage: 78 },
      { week: 'Week 2', percentage: 74 },
    ],
    subjectAttendance: [],
    termTests: [{ testName: 'Unit Test 1', score: 62, maxMarks: 100 }],
    backlogs: 0,
    backlogSubjects: [],
    feeOverdueDays: 0,
    submissionRate: 70,
  };
  const scored = computeRiskScore(raw);
  return {
    ...raw,
    riskScore: scored.riskScore,
    riskLevel: scored.riskLevel,
    contributingFactors: scored.contributingFactors,
    suggestedAction: scored.suggestedAction,
    aiExplanation: '',
    endSemResult: { status: 'Upcoming' as const },
    lastSemResult: { score: 0, maxMarks: 0 },
    interventionStatus: 'None' as const,
  };
}

test('resetAllData wipes students, details, interventions, outcomes and history', () => {
  const seeded = getAllStudents()[0].studentId;
  const detail = getStudentDetail(seeded);
  assert.ok(detail, 'expected a seeded student before the reset');

  createIntervention(
    {
      studentId: seeded,
      type: 'Counseling',
      details: { schedule: 'Mon 3:00 PM' },
      notes: 'test',
      assignedBy: 'tester',
      startDate: '2026-09-10',
    } as any,
    detail!.riskScore,
  );
  addUploadHistory({ fileName: 'x.csv', uploadedAt: new Date().toISOString(), rawData: [] });

  assert.ok(getOutcome(seeded), 'an assigned intervention should produce an outcome');

  resetAllData();

  assert.equal(getAllStudents().length, 0, 'students cleared');
  assert.equal(getStudentDetail(seeded), null, 'details cleared');
  assert.equal(getAllInterventions().length, 0, 'interventions cleared');
  assert.equal(getUploadHistory().length, 0, 'history cleared');
  assert.equal(getOutcome(seeded), null, 'outcome cleared');
});

test('a student uploaded after a reset carries no previous intervention status', () => {
  // Put a resolved intervention on the record, then reset.
  upsertStudent(freshStudent('S999', 'Before Reset'));
  const detail = getStudentDetail('S999')!;
  createIntervention(
    {
      studentId: 'S999',
      type: 'Extra Class',
      details: { subject: 'DBMS' },
      notes: 'test',
      assignedBy: 'tester',
      startDate: '2026-09-10',
    } as any,
    detail.riskScore,
  );
  resolveIntervention('S999');
  assert.equal(getStudentDetail('S999')!.interventionStatus, 'Resolved');

  resetAllData();
  assert.equal(getStudentDetail('S999'), null, 'record gone after reset');

  // Re-upload the same student id, exactly as the CSV upload path does.
  upsertStudent(freshStudent('S999', 'After Reset'));

  const reuploaded = getStudentDetail('S999')!;
  assert.equal(reuploaded.interventionStatus, 'None', 'no stale intervention status');
  assert.equal(reuploaded.activeIntervention, undefined, 'no stale active intervention');
  assert.equal(getOutcome('S999'), null, 'no stale outcome comparison');
  assert.equal(getAllInterventions().length, 0, 'no stale intervention records');
  assert.deepEqual(
    reuploaded.attendanceHistory.map(h => h.week),
    ['Week 1', 'Week 2'],
    'only the uploaded weeks are present',
  );
});

test('resetAllData also clears students created by a fresh upload', () => {
  resetAllData();
  upsertStudent(freshStudent('S998'));
  assert.equal(getAllStudents().length, 1);

  resetAllData();
  assert.equal(getAllStudents().length, 0);
  assert.equal(getStudentDetail('S998'), null);
  assert.equal(getOutcome('S998'), null);
});
