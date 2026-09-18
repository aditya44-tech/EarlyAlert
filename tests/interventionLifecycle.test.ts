/**
 * tests/interventionLifecycle.test.ts
 *
 * Guards the intervention lifecycle:
 *   - the baseline risk score is frozen when the intervention is assigned
 *   - it never tracks the current score (even for legacy records missing one)
 *   - resolving closes the intervention everywhere, re-opening restores it
 *
 * Run with: npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  createIntervention,
  resolveIntervention,
  reopenIntervention,
  getOutcome,
  ensureBaseline,
  getStudentDetail,
  getAllStudents,
  upsertStudent,
} from '../lib/db.ts';

function payload(studentId: string) {
  return {
    studentId,
    type: 'Counseling' as const,
    details: { counselingType: 'Academic' },
    notes: 'lifecycle test',
    assignedBy: 'test-runner',
    startDate: '2026-09-18',
    status: 'Active',
  };
}

test('baseline is frozen at assignment while the current score moves', () => {
  const sid = getAllStudents()[5].studentId;
  const assignedScore = getStudentDetail(sid)!.riskScore;

  createIntervention(payload(sid), assignedScore);

  const first = getOutcome(sid)!;
  assert.equal(first.baselineScore, assignedScore, 'baseline recorded at assignment');
  assert.equal(first.currentScore, assignedScore);
  assert.equal(first.outcome, 'No Change');

  // New attendance/grade data arrives and the student gets worse
  upsertStudent({ ...getStudentDetail(sid)!, riskScore: assignedScore + 25, riskLevel: 'High' });

  const second = getOutcome(sid)!;
  assert.equal(second.baselineScore, assignedScore, 'baseline must not move');
  assert.equal(second.currentScore, assignedScore + 25, 'current score follows the data');
  assert.equal(second.scoreDelta, 25);
  assert.equal(second.outcome, 'Worsening');

  // ...and again after an improvement
  upsertStudent({ ...getStudentDetail(sid)!, riskScore: assignedScore - 12, riskLevel: 'Low' });

  const third = getOutcome(sid)!;
  assert.equal(third.baselineScore, assignedScore, 'baseline still the assignment score');
  assert.equal(third.scoreDelta, -12);
  assert.equal(third.outcome, 'Improving');
});

test('a legacy intervention with no baseline is frozen once, not tracked', () => {
  const sid = getAllStudents()[6].studentId;
  const detail = getStudentDetail(sid)!;

  // Simulate a record written before baselines were stored
  upsertStudent({
    ...detail,
    riskScore: 55,
    riskLevel: 'Medium',
    activeIntervention: { type: 'Extra Class', details: {}, status: 'Active', assignedDate: '2026-09-01' },
  });

  assert.equal(ensureBaseline(sid), 55, 'baseline repaired from the score at first read');

  upsertStudent({ ...getStudentDetail(sid)!, riskScore: 70, riskLevel: 'High' });

  const outcome = getOutcome(sid)!;
  assert.equal(outcome.baselineScore, 55, 'repair is a one-time freeze, not a moving fallback');
  assert.equal(outcome.currentScore, 70);
  assert.equal(outcome.outcome, 'Worsening');
});

test('resolving closes the intervention everywhere and re-opening restores it', () => {
  const sid = getAllStudents()[7].studentId;
  createIntervention(payload(sid), 42);

  resolveIntervention(sid);

  const afterResolve = getStudentDetail(sid)!;
  assert.equal(afterResolve.interventionStatus, 'Resolved', 'student record status closed');
  assert.equal(afterResolve.activeIntervention?.status, 'Resolved', 'intervention itself closed');
  assert.equal(getAllStudents().find(s => s.studentId === sid)?.interventionStatus, 'Resolved', 'summary closed');
  assert.equal(getOutcome(sid)?.status, 'Resolved', 'outcome reports the closed state');
  assert.equal(getOutcome(sid)?.baselineScore, 42, 'baseline survives resolution');

  reopenIntervention(sid);

  const afterReopen = getStudentDetail(sid)!;
  assert.equal(afterReopen.interventionStatus, 'Active');
  assert.equal(afterReopen.activeIntervention?.status, 'Active');
  assert.equal(getOutcome(sid)?.status, 'Active');
});

test('resolving leaves no stale baseline behind', () => {
  const sid = getAllStudents()[8].studentId;
  createIntervention(payload(sid), 30);
  resolveIntervention(sid);

  upsertStudent({ ...getStudentDetail(sid)!, riskScore: 90, riskLevel: 'High' });

  const outcome = getOutcome(sid)!;
  assert.equal(outcome.baselineScore, 30, 'baseline unchanged after resolution and new data');
  assert.equal(outcome.currentScore, 90);
  assert.equal(outcome.status, 'Resolved');
});

test('a student with no intervention has no outcome', () => {
  assert.equal(getOutcome('S900'), null);
  assert.equal(ensureBaseline('S900'), null);
});

test('seeded interventions ship with a frozen baseline and a real gap', () => {
  const outcome = getOutcome('S006');
  assert.ok(outcome, 'seeded student S006 has an outcome');
  assert.equal(typeof outcome!.baselineScore, 'number');
  assert.notEqual(outcome!.baselineScore, outcome!.currentScore, 'demo shows a before/after gap');

  const frozen = outcome!.baselineScore;
  upsertStudent({ ...getStudentDetail('S006')!, riskScore: 90, riskLevel: 'High' });

  assert.equal(getOutcome('S006')!.baselineScore, frozen, 'seeded baseline is frozen too');
});
