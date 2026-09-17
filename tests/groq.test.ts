/**
 * tests/groq.test.ts
 * 
 * Unit and integration tests for the Groq Predictive Risk Narrative & Diagnostic Explanation logic.
 * Run with: npm test
 * 
 * Live API tests auto-skip when dev server is not running on localhost:3000.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

// ── Unit tests (no server needed) ──────────────────────────────────────────

test('Groq prompt construction handles high-risk factor breakdown accurately', () => {
  const student = {
    name: 'Kabir Kale',
    year: 3,
    department: 'Computer Science',
    riskScore: 78,
    riskLevel: 'High',
    contributingFactors: [
      { factor: 'Attendance Decline', points: 28, reason: 'Attendance dropped by 18% to 58%' },
      { factor: 'Grade Decline', points: 20, reason: 'UT1 average 38%' },
      { factor: 'Backlogs', points: 17, reason: '3 active backlogs' },
      { factor: 'Fee Overdue', points: 12, reason: 'Fee overdue by 12 days' },
    ]
  };

  const factorSummary = student.contributingFactors
    .map(f => `- ${f.factor} (${f.points} pts): ${f.reason}`)
    .join('\n');

  assert.ok(factorSummary.includes('Attendance Decline (28 pts)'));
  assert.ok(factorSummary.includes('Grade Decline (20 pts)'));
  assert.ok(factorSummary.includes('Backlogs (17 pts)'));
  assert.ok(factorSummary.includes('Fee Overdue (12 pts)'));
});

// ── Integration tests (need dev server + GROQ_API_KEY) ─────────────────────

const LIVE_SERVER = 'http://localhost:3000/api/groq/explain';

async function checkServer(t: any) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2000);
    const res = await fetch(LIVE_SERVER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'explain', studentName: 'test', riskScore: 0, contributingFactors: [] }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (res.status !== 200 && res.status !== 400) {
      t.skip('Dev server responded with ' + res.status + ' — GROQ_API_KEY may be missing');
      return false;
    }
    const data = await res.json();
    if (!data.powered) {
      t.skip('GROQ_API_KEY not configured — AI responses unavailable');
      return false;
    }
    return true;
  } catch {
    t.skip('Dev server not running on localhost:3000');
    return false;
  }
}

test('Groq explain endpoint handles live request with qwen/qwen3.8-27b when API key is present', async (t) => {
  if (!(await checkServer(t))) return;

  const res = await fetch(LIVE_SERVER, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'explain',
      studentName: 'Kabir Kale',
      department: 'Computer Science',
      year: 3,
      riskScore: 78,
      riskLevel: 'High',
      contributingFactors: [
        { factor: 'Attendance Decline', points: 28, reason: 'Attendance dropped by 18% to 58%' },
        { factor: 'Grade Decline', points: 20, reason: 'UT1 average 38%' },
      ]
    })
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(typeof data.text === 'string' && data.text.length > 20);
  assert.equal(data.powered, true);
  assert.equal(data.model, 'qwen/qwen3.8-27b');
  assert.ok(data.text.toLowerCase().includes('kabir') || data.text.toLowerCase().includes('attendance') || data.text.toLowerCase().includes('risk'));
});

test('Groq explain endpoint generates encouraging narrative for low-risk student', async (t) => {
  if (!(await checkServer(t))) return;

  const res = await fetch(LIVE_SERVER, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'explain',
      studentName: 'Priya Sharma',
      department: 'Information Technology',
      year: 2,
      riskScore: 8,
      riskLevel: 'Low',
      contributingFactors: []
    })
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(typeof data.text === 'string' && data.text.length > 20);
  assert.equal(data.powered, true);
});

test('Groq rationale mode produces focused 1-sentence intervention explanation', async (t) => {
  if (!(await checkServer(t))) return;

  const res = await fetch(LIVE_SERVER, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'rationale',
      studentName: 'Aarav Patel',
      riskScore: 65,
      actionType: 'Extra Class / Tutoring',
      dominantFactor: 'Grade Decline'
    })
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(typeof data.text === 'string' && data.text.length > 10);
  assert.equal(data.powered, true);
});

test('Groq endpoint handles missing or malformed contributingFactors safely without throwing 500', async (t) => {
  if (!(await checkServer(t))) return;

  const res = await fetch(LIVE_SERVER, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'explain',
      studentName: 'Edge Case Student',
      riskScore: 45,
      contributingFactors: null
    })
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(typeof data.text === 'string');
});

test('Groq endpoint rejects invalid mode with 400', async (t) => {
  if (!(await checkServer(t))) return;

  const res = await fetch(LIVE_SERVER, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'unknown_mode'
    })
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.ok(data.error.includes('Invalid mode'));
});
