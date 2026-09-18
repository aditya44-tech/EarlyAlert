/**
 * tests/dbRevert.test.ts
 *
 * Tests for the server-side upload revert (lib/db.ts → revertUpload).
 * Deleting an upload log must roll every affected student back to the exact
 * state they were in before that upload, and remove students the upload created.
 *
 * Run with: npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  getAllStudents,
  getStudentDetail,
  upsertStudent,
  revertUpload,
} from '../lib/db.ts';
import { computeRiskScore, type RawStudentData } from '../lib/riskEngine.ts';

const clone = (value: any) => JSON.parse(JSON.stringify(value));

/** The snapshot shape providers.tsx writes into each upload log. */
function snapshotOf(detail: any) {
  return {
    attendanceHistory: clone(detail.attendanceHistory ?? []),
    subjectAttendance: clone(detail.subjectAttendance ?? []),
    termTests: clone(detail.termTests ?? []),
    backlogCount: detail.backlogCount ?? 0,
    backlogSubjects: clone(detail.backlogSubjects ?? []),
    feeOverdueDays: detail.feeOverdueDays ?? 0,
    feeStatus: detail.feeStatus ?? 'Paid',
    lastSemResult: clone(detail.lastSemResult ?? { score: 0, maxMarks: 0 }),
    endSemResult: clone(detail.endSemResult ?? { status: 'Upcoming' }),
    submissionRate: detail.submissionRate,
  };
}

function rawFrom(detail: any): RawStudentData {
  return {
    studentId: detail.studentId,
    name: detail.name,
    department: detail.department,
    year: detail.year,
    attendanceHistory: detail.attendanceHistory ?? [],
    subjectAttendance: detail.subjectAttendance ?? [],
    termTests: detail.termTests ?? [],
    backlogs: detail.backlogCount ?? 0,
    backlogSubjects: detail.backlogSubjects ?? [],
    feeOverdueDays: detail.feeOverdueDays ?? 0,
    submissionRate: detail.submissionRate ?? 70,
  };
}

test('revert restores a student to their exact pre-upload state', () => {
  const sid = getAllStudents()[0].studentId;
  const before = clone(getStudentDetail(sid));
  assert.ok(before, `expected seeded student ${sid}`);

  const snapshots = { [sid]: snapshotOf(before) };

  // Simulate the upload changing attendance, backlogs and fees
  upsertStudent({
    ...before,
    attendanceHistory: [...clone(before.attendanceHistory), { week: 'Week 9', percentage: 18 }],
    backlogCount: 5,
    backlogSubjects: ['OS', 'DBMS'],
    feeOverdueDays: 60,
  });
  const inflated = getStudentDetail(sid)!;
  assert.notDeepEqual(inflated.attendanceHistory, before.attendanceHistory);

  const result = revertUpload({
    week: 'Week 9',
    type: 'WeeklyAttendance',
    uploadedAt: 'test-revert-1',
    studentsUpdated: 1,
    uploadedBy: 'Mentor',
    rawData: [{ studentId: sid, week: 'Week 9', attendance: 18 }],
    snapshots,
  });

  const after = getStudentDetail(sid)!;
  assert.deepEqual(after.attendanceHistory, before.attendanceHistory, 'attendance restored');
  assert.deepEqual(after.termTests, before.termTests, 'grades restored');
  assert.equal(after.backlogCount ?? 0, before.backlogCount ?? 0, 'backlogs restored');
  assert.deepEqual(after.backlogSubjects ?? [], before.backlogSubjects ?? [], 'backlog subjects restored');
  assert.equal(after.feeOverdueDays ?? 0, before.feeOverdueDays ?? 0, 'fees restored');

  // Risk score is recalculated from the restored data
  assert.equal(after.riskScore, computeRiskScore(rawFrom(before)).riskScore);
  assert.deepEqual(result.revertedStudents.map(s => s.studentId), [sid]);
  assert.deepEqual(result.removedStudentIds, []);
});

test('revert removes students that the upload created', () => {
  const sid = 'S900';
  upsertStudent({
    studentId: sid,
    name: 'Upload Only',
    department: 'Computer Science',
    year: 1,
    riskScore: 40,
    riskLevel: 'Medium',
    attendanceHistory: [{ week: 'Week 1', percentage: 50 }],
  });
  assert.ok(getStudentDetail(sid), 'student exists after the upload');

  const result = revertUpload({
    week: 'Week 1',
    type: 'WeeklyAttendance',
    uploadedAt: 'test-revert-2',
    studentsUpdated: 1,
    uploadedBy: 'Mentor',
    rawData: [{ studentId: sid, week: 'Week 1', attendance: 50 }],
    snapshots: { [sid]: null },
  });

  assert.equal(getStudentDetail(sid), null, 'created student is gone');
  assert.ok(!getAllStudents().some(s => s.studentId === sid), 'dashboard summary is gone');
  assert.deepEqual(result.removedStudentIds, [sid]);
});

test('legacy upload with no snapshot removes its own entries and leaves the rest alone', () => {
  const sid = getAllStudents()[1].studentId;
  const before = clone(getStudentDetail(sid));

  // Simulate a legacy upload writing Unit Test 1
  upsertStudent({
    ...before,
    termTests: [...clone(before.termTests), { testName: 'Unit Test 1', score: 25, maxMarks: 100, date: '2026-09-10' }],
  });

  revertUpload({
    week: 'Initial',
    type: 'UnitTest1',
    uploadedAt: 'test-revert-3',
    studentsUpdated: 1,
    uploadedBy: 'Mentor',
    rawData: [{ studentId: sid, score: 25 }],
    snapshots: null,
  });

  const after = getStudentDetail(sid)!;
  assert.equal(after.termTests.filter(t => t.testName === 'Unit Test 1').length, 0, 'uploaded test removed');
  assert.deepEqual(after.attendanceHistory, before.attendanceHistory, 'attendance untouched');
  assert.equal(after.backlogCount ?? 0, before.backlogCount ?? 0, 'backlogs untouched');
});

test('revert leaves unaffected students alone', () => {
  const students = getAllStudents();
  const target = students[2].studentId;
  const bystander = students[3].studentId;
  const bystanderBefore = clone(getStudentDetail(bystander));

  const before = clone(getStudentDetail(target));
  upsertStudent({ ...before, attendanceHistory: [...clone(before.attendanceHistory), { week: 'Week 9', percentage: 30 }] });

  revertUpload({
    week: 'Week 9',
    type: 'WeeklyAttendance',
    uploadedAt: 'test-revert-4',
    studentsUpdated: 1,
    uploadedBy: 'Mentor',
    rawData: [{ studentId: target, week: 'Week 9', attendance: 30 }],
    snapshots: { [target]: snapshotOf(before) },
  });

  assert.deepEqual(getStudentDetail(bystander), bystanderBefore, 'bystander untouched');
});
