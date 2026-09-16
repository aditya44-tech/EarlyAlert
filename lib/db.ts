/**
 * lib/db.ts
 * 
 * In-memory data store for the prototype.
 * All 50 students are seeded from lib/mockData.ts on first access.
 * 
 * When MONGODB_URI is set, this module will switch to MongoDB via Mongoose.
 * For the hackathon demo, in-memory is sufficient and zero-config.
 */

import { StudentSummary, StudentDetail, StudentStatusData, OutcomeComparisonData, MentorActionPayload } from './types';
import { initialStudents, studentDetailsMap, studentStatusMap, outcomeComparisonsMap } from './mockData';

// ─────────────────────────────────────────────────────────────────────────────
// In-memory store (persists for the lifetime of the Next.js server process)
// ─────────────────────────────────────────────────────────────────────────────

let studentsStore: StudentSummary[] = [...initialStudents];
let detailsStore: Record<string, StudentDetail> = { ...studentDetailsMap };
let interventionStatusStore: Record<string, StudentStatusData> = { ...studentStatusMap };
let outcomeStore: Record<string, OutcomeComparisonData> = { ...outcomeComparisonsMap };

// Intervention log (list of all assigned interventions)
interface InterventionRecord {
  id: string;
  studentId: string;
  type: string;
  details: Record<string, unknown>;
  notes: string;
  assignedBy: string;
  startDate: string;
  baselineRiskScore: number;
  status: 'Active' | 'Resolved' | 'Discontinued';
  createdAt: string;
}

let interventionsLog: InterventionRecord[] = [
  // Pre-seeded demo interventions matching mockData
  {
    id: 'INT-S006-001',
    studentId: 'S006',
    type: 'Extra Class',
    details: { subject: 'Data Structures & DBMS', schedule: 'Tue/Thu 4:00 PM', instructor: 'Dr. Mehta' },
    notes: 'Student has 3 backlogs and declining attendance — extra class for core subjects.',
    assignedBy: 'mentor-demo',
    startDate: '2026-09-02',
    baselineRiskScore: detailsStore['S006']?.riskScore ?? 78,
    status: 'Active',
    createdAt: '2026-09-02T09:00:00.000Z',
  },
  {
    id: 'INT-S019-001',
    studentId: 'S019',
    type: 'Counseling',
    details: { schedule: 'Mon 3:00 PM', instructor: 'Counselor Priya' },
    notes: 'Rapid attendance decline over 4 weeks. Financial stress likely contributing.',
    assignedBy: 'mentor-demo',
    startDate: '2026-09-05',
    baselineRiskScore: detailsStore['S019']?.riskScore ?? 72,
    status: 'Active',
    createdAt: '2026-09-05T10:00:00.000Z',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// DB API
// ─────────────────────────────────────────────────────────────────────────────

export function getAllStudents(): StudentSummary[] {
  return studentsStore;
}

export function getStudentDetail(studentId: string): StudentDetail | null {
  return detailsStore[studentId] ?? null;
}

export function updateStudentRisk(studentId: string, update: Partial<StudentDetail>): void {
  if (detailsStore[studentId]) {
    detailsStore[studentId] = { ...detailsStore[studentId], ...update };
  }
  const idx = studentsStore.findIndex(s => s.studentId === studentId);
  if (idx !== -1) {
    studentsStore[idx] = {
      ...studentsStore[idx],
      riskScore: update.riskScore ?? studentsStore[idx].riskScore,
      riskLevel: update.riskLevel ?? studentsStore[idx].riskLevel,
    };
  }
}

export function getIntervention(studentId: string): StudentStatusData | null {
  return interventionStatusStore[studentId] ?? null;
}

export function getAllInterventions(): InterventionRecord[] {
  return interventionsLog;
}

export function createIntervention(payload: MentorActionPayload, baselineRiskScore: number): InterventionRecord {
  const id = `INT-${payload.studentId}-${Date.now()}`;
  const record: InterventionRecord = {
    id,
    studentId: payload.studentId,
    type: payload.type,
    details: payload.details as Record<string, unknown>,
    notes: payload.notes,
    assignedBy: payload.assignedBy,
    startDate: payload.startDate,
    baselineRiskScore,
    status: 'Active',
    createdAt: new Date().toISOString(),
  };
  interventionsLog.push(record);

  // Update student summary status
  const idx = studentsStore.findIndex(s => s.studentId === payload.studentId);
  if (idx !== -1) studentsStore[idx].interventionStatus = 'Active';

  // Update intervention status store (for student view)
  const detail = detailsStore[payload.studentId];
  interventionStatusStore[payload.studentId] = {
    studentId: payload.studentId,
    name: detail?.name ?? '',
    activeIntervention: {
      type: payload.type,
      details: payload.details,
      status: 'Active',
      assignedDate: payload.startDate,
    },
  };

  // Create outcome record
  const currentScore = detailsStore[payload.studentId]?.riskScore ?? baselineRiskScore;
  outcomeStore[payload.studentId] = {
    studentId: payload.studentId,
    name: detail?.name ?? '',
    intervention: { type: payload.type, details: payload.details, startDate: payload.startDate },
    baselineScore: baselineRiskScore,
    currentScore,
    scoreDelta: currentScore - baselineRiskScore,
    outcome: 'No Change',
    checkpointDate: new Date().toISOString().split('T')[0],
  };

  return record;
}

export function resolveIntervention(studentId: string): void {
  const idx = studentsStore.findIndex(s => s.studentId === studentId);
  if (idx !== -1) studentsStore[idx].interventionStatus = 'Resolved';

  const intervention = interventionStatusStore[studentId];
  if (intervention?.activeIntervention) {
    intervention.activeIntervention.status = 'Resolved';
  }

  const log = interventionsLog.find(i => i.studentId === studentId && i.status === 'Active');
  if (log) log.status = 'Resolved';
}

export function getOutcome(studentId: string): OutcomeComparisonData | null {
  return outcomeStore[studentId] ?? null;
}

export function bulkUpdateStudents(
  updates: Array<{ studentId: string; detail: Partial<StudentDetail> }>
): number {
  let count = 0;
  for (const { studentId, detail } of updates) {
    updateStudentRisk(studentId, detail);
    count++;
  }
  return count;
}
