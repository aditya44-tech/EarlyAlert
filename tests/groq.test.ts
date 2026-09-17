/**
 * tests/groq.test.ts
 * 
 * Unit and integration tests for the Groq Predictive Risk Narrative & Diagnostic Explanation logic.
 * Run with: npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

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

test('Groq explain endpoint handles live request with qwen/qwen3.8-27b when API key is present', async () => {
  const res = await fetch('http://localhost:3000/api/groq/explain', {
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
  // Text should mention the student and relevant academic context
  assert.ok(data.text.toLowerCase().includes('kabir') || data.text.toLowerCase().includes('attendance') || data.text.toLowerCase().includes('risk'));
});

test('Groq explain endpoint generates encouraging narrative for low-risk student', async () => {
  const res = await fetch('http://localhost:3000/api/groq/explain', {
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

test('Groq rationale mode produces focused 1-sentence intervention explanation', async () => {
  const res = await fetch('http://localhost:3000/api/groq/explain', {
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

test('Groq endpoint handles missing or malformed contributingFactors safely without throwing 500', async () => {
  const res = await fetch('http://localhost:3000/api/groq/explain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'explain',
      studentName: 'Edge Case Student',
      riskScore: 45,
      contributingFactors: null // invalid type
    })
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(typeof data.text === 'string');
});

test('Groq endpoint rejects invalid mode with 400', async () => {
  const res = await fetch('http://localhost:3000/api/groq/explain', {
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
