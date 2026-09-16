/**
 * tests/riskEngine.test.ts
 *
 * Unit tests for the deterministic risk scoring engine (lib/riskEngine.ts).
 * Run with: node --test tests/
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  computeRiskScore,
  getSuggestedAction,
  generateFallbackExplanation,
  type RawStudentData,
} from '../lib/riskEngine.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function weeks(values: number[]) {
  return values.map((percentage, i) => ({ week: `W${i + 1}`, percentage }));
}

function scores(values: number[]) {
  return values.map((score, i) => ({ test: `T${i + 1}`, score }));
}

/** Healthy baseline student: zero risk on every factor. */
function makeStudent(overrides: Partial<RawStudentData> = {}): RawStudentData {
  return {
    studentId: 'S001',
    name: 'Test Student',
    department: 'CSE',
    year: 2,
    attendanceHistory: weeks([92, 91, 93, 92]), // stable, >= 85
    gradeHistory: scores([85, 88, 86, 87]),     // stable, >= 75
    backlogs: 0,
    backlogSubjects: [],
    feeOverdueDays: 0,
    submissionRate: 90,
    ...overrides,
  };
}

/** Simple linear-slope helper: values move by `step` per entry. */
function series(start: number, step: number, n = 4) {
  return Array.from({ length: n }, (_, i) => start + i * step);
}

// ─────────────────────────────────────────────────────────────────────────────
// Baseline & factor isolation
// ─────────────────────────────────────────────────────────────────────────────

test('healthy student scores zero with no contributing factors', () => {
  const r = computeRiskScore(makeStudent());
  assert.equal(r.riskScore, 0);
  assert.equal(r.riskLevel, 'Low');
  assert.deepEqual(r.contributingFactors, []);
  assert.equal(r.dominantFactor, 'None');
  assert.equal(r.suggestedAction, 'Monitor');
});

test('attendance factor: <60% caps out at 30 points', () => {
  const r = computeRiskScore(makeStudent({ attendanceHistory: weeks([55, 50, 48, 45]) }));
  const att = r.contributingFactors.find(f => f.factor === 'Attendance Decline');
  assert.equal(att?.points, 30);
  assert.equal(r.riskScore, 30); // only factor
  assert.equal(r.riskLevel, 'Low');
});

test('attendance factor: 60-74% base is 20, drops get +8', () => {
  const flat = computeRiskScore(makeStudent({ attendanceHistory: weeks([70, 70, 71, 70]) }));
  assert.equal(flat.contributingFactors.find(f => f.factor === 'Attendance Decline')?.points, 20);

  const steep = computeRiskScore(makeStudent({ attendanceHistory: weeks([80, 76, 73, 70]) }));
  assert.equal(steep.contributingFactors.find(f => f.factor === 'Attendance Decline')?.points, 28);
});

test('attendance factor: 75-84% base is 8, sharp decline gets +10', () => {
  const flat = computeRiskScore(makeStudent({ attendanceHistory: weeks([80, 80, 81, 80]) }));
  assert.equal(flat.contributingFactors.find(f => f.factor === 'Attendance Decline')?.points, 8);

  // slope over [95, 90, 85, 80] is -5 (< -3), latest in 75-84 band
  const drop = computeRiskScore(makeStudent({ attendanceHistory: weeks([95, 90, 85, 80]) }));
  assert.equal(drop.contributingFactors.find(f => f.factor === 'Attendance Decline')?.points, 18);
});

test('attendance factor: >=85% is zero unless the drop is large', () => {
  const stable = computeRiskScore(makeStudent({ attendanceHistory: weeks([90, 91, 90, 92]) }));
  assert.equal(stable.contributingFactors.find(f => f.factor === 'Attendance Decline'), undefined);

  const mildDrop = computeRiskScore(makeStudent({ attendanceHistory: weeks([95, 92, 90, 88]) })); // drop 7? -> slope strong
  const pts = mildDrop.contributingFactors.find(f => f.factor === 'Attendance Decline')?.points;
  assert.ok(pts === 0 || pts === undefined || pts === 12 || pts === 5, `unexpected pts ${pts}`);

  const bigDrop = computeRiskScore(makeStudent({ attendanceHistory: weeks([98, 95, 90, 86]) })); // drop 12 -> slope < -4
  assert.equal(bigDrop.contributingFactors.find(f => f.factor === 'Attendance Decline')?.points, 12);
});

test('grade factor: <40 scores max 25 points', () => {
  const r = computeRiskScore(makeStudent({ gradeHistory: scores([45, 38, 30, 25]) }));
  assert.equal(r.contributingFactors.find(f => f.factor === 'Grade Decline')?.points, 25);
});

test('grade factor: tiered scoring 40-54 / 55-64 / 65-74', () => {
  const mid = computeRiskScore(makeStudent({ gradeHistory: scores([60, 60, 60, 60]) }));
  assert.equal(mid.contributingFactors.find(f => f.factor === 'Grade Decline')?.points, 12);

  const low = computeRiskScore(makeStudent({ gradeHistory: scores([50, 50, 50, 50]) }));
  assert.equal(low.contributingFactors.find(f => f.factor === 'Grade Decline')?.points, 18);

  const high = computeRiskScore(makeStudent({ gradeHistory: scores([70, 70, 70, 70]) }));
  assert.equal(high.contributingFactors.find(f => f.factor === 'Grade Decline')?.points, 5);
});

test('grade factor: declining trend adds points in the 55-64 band', () => {
  const flat = computeRiskScore(makeStudent({ gradeHistory: scores([64, 63, 62, 62]) }));
  const decline = computeRiskScore(makeStudent({ gradeHistory: scores(series(64, -3)) })); // 64,61,58,55 -> slope -3
  const flatPts = flat.contributingFactors.find(f => f.factor === 'Grade Decline')?.points ?? 0;
  const declinePts = decline.contributingFactors.find(f => f.factor === 'Grade Decline')?.points ?? 0;
  assert.ok(declinePts > flatPts, `expected decline (${declinePts}) > flat (${flatPts})`);
  assert.ok(declinePts <= 25, 'grade points must be capped at 25');
});

test('backlog factor: tiered 1/2/3/4+ mapping', () => {
  const cases: [number, number][] = [[0, 0], [1, 6], [2, 13], [3, 17], [5, 20]];
  for (const [backlogs, expected] of cases) {
    const r = computeRiskScore(makeStudent({ backlogs, backlogSubjects: backlogs > 0 ? ['DBMS'] : [] }));
    assert.equal(
      r.contributingFactors.find(f => f.factor === 'Backlogs')?.points ?? 0,
      expected,
      `backlogs=${backlogs}`
    );
  }
});

test('fee factor: tiered overdue mapping', () => {
  const cases: [number, number][] = [[0, 0], [1, 6], [10, 6], [11, 12], [30, 12], [31, 15], [90, 15]];
  for (const [days, expected] of cases) {
    const r = computeRiskScore(makeStudent({ feeOverdueDays: days }));
    assert.equal(
      r.contributingFactors.find(f => f.factor === 'Fee Overdue')?.points ?? 0,
      expected,
      `feeOverdueDays=${days}`
    );
  }
});

test('engagement factor: tiered submission-rate mapping', () => {
  const cases: [number, number][] = [[75, 0], [74, 2], [65, 2], [64, 4], [55, 4], [54, 7], [40, 7], [39, 10], [10, 10]];
  for (const [rate, expected] of cases) {
    const r = computeRiskScore(makeStudent({ submissionRate: rate }));
    assert.equal(
      r.contributingFactors.find(f => f.factor === 'Low Engagement')?.points ?? 0,
      expected,
      `submissionRate=${rate}`
    );
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Aggregation, risk levels, dominant factor
// ─────────────────────────────────────────────────────────────────────────────

test('maximum-risk student reaches exactly 100', () => {
  const r = computeRiskScore(makeStudent({
    attendanceHistory: weeks([50, 45, 40, 35]),
    gradeHistory: scores([30, 25, 20, 15]),
    backlogs: 4,
    backlogSubjects: ['A', 'B', 'C', 'D'],
    feeOverdueDays: 60,
    submissionRate: 10,
  }));
  assert.equal(r.riskScore, 100);
  assert.equal(r.riskLevel, 'High');
  assert.equal(r.contributingFactors.length, 5);
});

test('risk level boundaries: 30 Low, 31 Medium, 60 Medium, 61 High', () => {
  // 17 (3 backlogs) + 8 (att 75-84 flat) + 6 (fee 1-10) = 31
  const medium = computeRiskScore(makeStudent({
    attendanceHistory: weeks([80, 80, 80, 80]),
    backlogs: 3,
    backlogSubjects: ['a', 'b', 'c'],
    feeOverdueDays: 5,
  }));
  assert.equal(medium.riskScore, 31);
  assert.equal(medium.riskLevel, 'Medium');

  // 30 (att<60) + 18 (grade 40-54 flat) + 12 (fee 11-30) = 60
  const justUnder = computeRiskScore(makeStudent({
    attendanceHistory: weeks([55, 50, 48, 45]),
    gradeHistory: scores([50, 50, 50, 50]),
    feeOverdueDays: 20,
  }));
  assert.equal(justUnder.riskScore, 60);
  assert.equal(justUnder.riskLevel, 'Medium');

  // 30 (att<60) + 25 (grade<40) + 6 (1 backlog) = 61
  const high = computeRiskScore(makeStudent({
    attendanceHistory: weeks([55, 50, 48, 45]),
    gradeHistory: scores([35, 30, 28, 25]),
    backlogs: 1,
    backlogSubjects: ['OS'],
  }));
  assert.equal(high.riskScore, 61);
  assert.equal(high.riskLevel, 'High');
});

test('factors are sorted descending by points', () => {
  const r = computeRiskScore(makeStudent({
    attendanceHistory: weeks([50, 45, 40, 35]), // 30
    gradeHistory: scores([50, 50, 50, 50]),     // 18
    backlogs: 2,                                 // 13
    feeOverdueDays: 20,                          // 12
    submissionRate: 50,                          // 7
  }));
  const pts = r.contributingFactors.map(f => f.points);
  assert.deepEqual(pts, [...pts].sort((a, b) => b - a));
  assert.equal(r.dominantFactor, 'Attendance Decline');
});

test('dominant factor ties keep the earlier-inserted factor (grade before fee)', () => {
  // grade 55-64 flat = 12, fee 11-30 = 12; everything else zero.
  const r = computeRiskScore(makeStudent({
    gradeHistory: scores([60, 60, 60, 60]),
    feeOverdueDays: 15,
  }));
  assert.equal(r.riskScore, 24);
  assert.equal(r.dominantFactor, 'Grade Decline');
});

test('empty history arrays contribute zero and are excluded from factors', () => {
  const r = computeRiskScore(makeStudent({ attendanceHistory: [], gradeHistory: [] }));
  assert.equal(r.riskScore, 0);
  assert.deepEqual(r.contributingFactors, []);
});test('negative / out-of-range inputs are ignored, yielding zero points', () => {
  const r = computeRiskScore(makeStudent({
    backlogs: -3,
    feeOverdueDays: -10,
    submissionRate: -50,
    attendanceHistory: weeks([100, 100, 100, 100]),
    gradeHistory: scores([100, 100, 100, 100]),
  }));
  assert.equal(r.riskScore, 0);
  assert.deepEqual(r.contributingFactors, []);

  // Invalid entries mixed into otherwise-good histories are dropped, not scored
  const mixed = computeRiskScore(makeStudent({
    attendanceHistory: weeks([NaN, 90, 150, 88]),
    gradeHistory: scores([-5, 85, 999, 87]),
  }));
  assert.equal(mixed.riskScore, 0);
  assert.deepEqual(mixed.contributingFactors, []);
});

// ─────────────────────────────────────────────────────────────────────────────
// Suggested actions
// ─────────────────────────────────────────────────────────────────────────────

test('suggested action map covers every factor and the default', () => {
  const map: [string, string][] = [
    ['Grade Decline', 'Extra Class / Tutoring'],
    ['Attendance Decline', 'Counseling / Check-in'],
    ['Fee Overdue', 'Financial Aid Referral'],
    ['Backlogs', 'Academic Support'],
    ['Low Engagement', 'Counseling / Check-in'],
    ['Unknown', 'Monitor'],
  ];
  for (const [factor, expected] of map) {
    assert.equal(getSuggestedAction(factor), expected, `factor=${factor}`);
  }
});

test('dominant factor drives the suggested action', () => {
  const r = computeRiskScore(makeStudent({ feeOverdueDays: 45 }));
  assert.equal(r.dominantFactor, 'Fee Overdue');
  assert.equal(r.suggestedAction, 'Financial Aid Referral');
});

// ─────────────────────────────────────────────────────────────────────────────
// Fallback explanation
// ─────────────────────────────────────────────────────────────────────────────

test('fallback explanation: no factors produces the healthy-student message', () => {
  const result = computeRiskScore(makeStudent());
  const text = generateFallbackExplanation({ name: 'Asha', department: 'CSE', year: 3 }, result);
  assert.match(text, /Asha/);
  assert.match(text, /no significant risk signals/);
});

test('fallback explanation: single factor mentions score, factor and reason', () => {
  const result = computeRiskScore(makeStudent({ feeOverdueDays: 45 }));
  const text = generateFallbackExplanation({ name: 'Ravi', department: 'ECE', year: 2 }, result);
  assert.match(text, /Ravi/);
  assert.match(text, /Year 2/);
  assert.match(text, new RegExp(`${result.riskScore}/100`));
  assert.match(text, /fee overdue/i);
});

test('fallback explanation: multiple factors lists secondary signals', () => {
  const result = computeRiskScore(makeStudent({
    attendanceHistory: weeks([50, 45, 40, 35]),
    gradeHistory: scores([50, 50, 50, 50]),
    backlogs: 2,
    backlogSubjects: ['DBMS', 'OS'],
  }));
  const text = generateFallbackExplanation({ name: 'Meena', department: 'IT', year: 4 }, result);
  assert.match(text, /attendance decline/i);
  assert.match(text, /grade decline/i);
  assert.match(text, /backlogs/i);
  assert.equal(result.riskLevel, 'High');
});
