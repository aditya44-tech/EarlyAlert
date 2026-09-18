/**
 * mockData.ts
 * 
 * 50 CS students with realistic, varied risk profiles.
 * Patterns include: improving, declining, was-good-then-bad, good-attendance-bad-grades,
 * stable-high, stable-low, and mixed combinations.
 * 
 * Risk scores computed deterministically by riskEngine.computeRiskScore().
 * AI explanations generated at runtime via Groq (with fallback).
 */

import type {
  StudentSummary,
  StudentDetail,
  StudentStatusData,
  OutcomeComparisonData,
} from './types';
import {
  computeRiskScore,
  generateFallbackExplanation,
  type RawStudentData,
} from './riskEngine';

// ─────────────────────────────────────────────────────────────────────────────
// Trend profiles describe the 4-week trajectory
// ─────────────────────────────────────────────────────────────────────────────

type TrendProfile =
  | 'stable_high'      // Consistently good (85%+ att, 80+ score)
  | 'stable_mid'       // Average (70-80% att, 60-75 score)
  | 'stable_low'       // Consistently poor (45-55% att, 35-50 score)
  | 'improving'        // Starting low, trending up
  | 'declining'        // Starting mid/high, trending down
  | 'was_good_then_bad' // Strong W1-W2, sharp drop W3-W4
  | 'good_att_bad_grades' // High attendance but poor test scores
  | 'spike_then_drop'  // One good week then crash
  | 'recovering';      // Was declining, now improving

interface MasterRow {
  studentId: string;
  name: string;
  department: string;
  year: number;
  trendProfile: TrendProfile;
  weeks: { att: number; score: number }[]; // [W1, W2, W3, W4]
  ut2Score?: number; // Unit Test 2 score (if present, shows decline/improvement vs UT1)
}

// ─────────────────────────────────────────────────────────────────────────────
// Student data — realistic, varied patterns
// ─────────────────────────────────────────────────────────────────────────────

const masterRows: MasterRow[] = [
  // ── STABLE HIGH (8 students) — low risk baseline ──
  { studentId: 'S001', name: 'Mohit Chopra',      department: 'Computer Science', year: 4, trendProfile: 'stable_high',  weeks: [{att:88,score:91},{att:87,score:89},{att:86,score:90},{att:87,score:92}] },
  { studentId: 'S003', name: 'Manoj Agarwal',      department: 'Computer Science', year: 4, trendProfile: 'stable_high',  weeks: [{att:95,score:85},{att:96,score:87},{att:94,score:86},{att:95,score:88}] },
  { studentId: 'S010', name: 'Karan Kale',         department: 'Computer Science', year: 1, trendProfile: 'stable_high',  weeks: [{att:91,score:92},{att:90,score:93},{att:91,score:94},{att:92,score:95}] },
  { studentId: 'S011', name: 'Sameer Yadav',       department: 'Computer Science', year: 4, trendProfile: 'stable_high',  weeks: [{att:92,score:88},{att:93,score:90},{att:91,score:89},{att:92,score:90}] },
  { studentId: 'S020', name: 'Aarav Chopra',       department: 'Computer Science', year: 1, trendProfile: 'stable_high',  weeks: [{att:90,score:92},{att:91,score:91},{att:92,score:93},{att:93,score:94}] },
  { studentId: 'S028', name: 'Rohan Verma',        department: 'Computer Science', year: 4, trendProfile: 'stable_high',  weeks: [{att:93,score:89},{att:94,score:90},{att:92,score:91},{att:93,score:92}] },
  { studentId: 'S038', name: 'Rohan Kumar',        department: 'Computer Science', year: 3, trendProfile: 'stable_high',  weeks: [{att:87,score:91},{att:88,score:92},{att:86,score:90},{att:88,score:93}] },
  { studentId: 'S042', name: 'Deepak Kale',        department: 'Computer Science', year: 4, trendProfile: 'stable_high',  weeks: [{att:90,score:90},{att:91,score:91},{att:89,score:89},{att:90,score:90}] },

  // ── STABLE MID (8 students) — medium risk ──
  { studentId: 'S004', name: 'Manoj Joshi',        department: 'Computer Science', year: 4, trendProfile: 'stable_mid',   weeks: [{att:75,score:63},{att:74,score:62},{att:76,score:64},{att:75,score:63}] },
  { studentId: 'S007', name: 'Mohit Pawar',        department: 'Computer Science', year: 2, trendProfile: 'stable_mid',   weeks: [{att:80,score:68},{att:79,score:70},{att:81,score:69},{att:80,score:71}] },
  { studentId: 'S008', name: 'Rohan Bansal',       department: 'Computer Science', year: 1, trendProfile: 'stable_mid',   weeks: [{att:78,score:66},{att:80,score:67},{att:79,score:65},{att:78,score:66}] },
  { studentId: 'S014', name: 'Diya Iyer',          department: 'Computer Science', year: 3, trendProfile: 'stable_mid',   weeks: [{att:74,score:65},{att:75,score:67},{att:73,score:66},{att:74,score:65}] },
  { studentId: 'S017', name: 'Nidhi Sharma',       department: 'Computer Science', year: 1, trendProfile: 'stable_mid',   weeks: [{att:76,score:63},{att:77,score:64},{att:75,score:62},{att:76,score:63}] },
  { studentId: 'S025', name: 'Anjali Yadav',       department: 'Computer Science', year: 1, trendProfile: 'stable_mid',   weeks: [{att:77,score:71},{att:76,score:70},{att:78,score:72},{att:77,score:71}] },
  { studentId: 'S030', name: 'Sudhanshu Shinde',   department: 'Computer Science', year: 2, trendProfile: 'stable_mid',   weeks: [{att:77,score:69},{att:78,score:70},{att:76,score:68},{att:77,score:69}] },
  { studentId: 'S041', name: 'Rohan Kale',         department: 'Computer Science', year: 3, trendProfile: 'stable_mid',   weeks: [{att:76,score:72},{att:77,score:71},{att:75,score:70},{att:76,score:72}] },

  // ── STABLE LOW (5 students) — high risk, consistently poor ──
  { studentId: 'S002', name: 'Mohit Rao',          department: 'Computer Science', year: 2, trendProfile: 'stable_low',   weeks: [{att:52,score:42},{att:50,score:40},{att:53,score:38},{att:51,score:36}] },
  { studentId: 'S009', name: 'Aditi Verma',        department: 'Computer Science', year: 2, trendProfile: 'stable_low',   weeks: [{att:54,score:47},{att:52,score:45},{att:50,score:43},{att:51,score:42}] },
  { studentId: 'S022', name: 'Ruchi Reddy',        department: 'Computer Science', year: 4, trendProfile: 'stable_low',   weeks: [{att:47,score:44},{att:48,score:43},{att:46,score:42},{att:47,score:41}] },
  { studentId: 'S035', name: 'Varun Deshmukh',     department: 'Computer Science', year: 4, trendProfile: 'stable_low',   weeks: [{att:51,score:38},{att:50,score:36},{att:52,score:35},{att:51,score:34}] },
  { studentId: 'S037', name: 'Harsh Iyer',         department: 'Computer Science', year: 3, trendProfile: 'stable_low',   weeks: [{att:49,score:46},{att:48,score:45},{att:47,score:44},{att:46,score:43}] },

  // ── DECLINING (6 students) — was okay, now dropping ──
  { studentId: 'S006', name: 'Kabir Kale',         department: 'Computer Science', year: 4, trendProfile: 'declining',    weeks: [{att:78,score:72},{att:70,score:65},{att:62,score:58},{att:52,score:50}] },
  { studentId: 'S019', name: 'Radhika Reddy',      department: 'Computer Science', year: 1, trendProfile: 'declining',    weeks: [{att:75,score:70},{att:68,score:64},{att:60,score:58},{att:50,score:52}] },
  { studentId: 'S021', name: 'Harsh Shah',         department: 'Computer Science', year: 1, trendProfile: 'declining',    weeks: [{att:72,score:68},{att:65,score:62},{att:58,score:55},{att:48,score:48}] },
  { studentId: 'S027', name: 'Amit Mehta',         department: 'Computer Science', year: 1, trendProfile: 'declining',    weeks: [{att:74,score:67},{att:66,score:60},{att:57,score:54},{att:47,score:50}] },
  { studentId: 'S036', name: 'Pooja Verma',        department: 'Computer Science', year: 2, trendProfile: 'declining',    weeks: [{att:78,score:72},{att:70,score:65},{att:63,score:60},{att:55,score:54}] },
  { studentId: 'S048', name: 'Nikhil Shinde',      department: 'Computer Science', year: 2, trendProfile: 'declining',    weeks: [{att:73,score:68},{att:65,score:62},{att:57,score:55},{att:48,score:50}] },

  // ── WAS GOOD THEN BAD (5 students) — strong W1-W2, sharp drop W3-W4 ──
  { studentId: 'S015', name: 'Pallavi Naik',       department: 'Computer Science', year: 1, trendProfile: 'was_good_then_bad', weeks: [{att:85,score:78},{att:83,score:76},{att:68,score:55},{att:55,score:45}] },
  { studentId: 'S026', name: 'Pallavi Kumar',      department: 'Computer Science', year: 1, trendProfile: 'was_good_then_bad', weeks: [{att:82,score:72},{att:80,score:70},{att:65,score:52},{att:52,score:42}] },
  { studentId: 'S043', name: 'Rahul Bhosale',      department: 'Computer Science', year: 4, trendProfile: 'was_good_then_bad', weeks: [{att:86,score:75},{att:84,score:73},{att:70,score:58},{att:58,score:48}] },
  { studentId: 'S032', name: 'Kavya Reddy',        department: 'Computer Science', year: 4, trendProfile: 'was_good_then_bad', weeks: [{att:80,score:70},{att:78,score:68},{att:62,score:50},{att:50,score:40}] },
  { studentId: 'S049', name: 'Komal Malhotra',     department: 'Computer Science', year: 4, trendProfile: 'was_good_then_bad', weeks: [{att:84,score:76},{att:82,score:74},{att:67,score:56},{att:55,score:46}] },

  // ── IMPROVING (5 students) — starting low, trending up ──
  { studentId: 'S005', name: 'Simran Kulkarni',    department: 'Computer Science', year: 1, trendProfile: 'improving',    weeks: [{att:62,score:52},{att:68,score:56},{att:75,score:62},{att:83,score:68}] },
  { studentId: 'S016', name: 'Neha Yadav',         department: 'Computer Science', year: 2, trendProfile: 'improving',    weeks: [{att:65,score:55},{att:70,score:60},{att:76,score:66},{att:82,score:72}] },
  { studentId: 'S034', name: 'Simran Malhotra',    department: 'Computer Science', year: 1, trendProfile: 'improving',    weeks: [{att:60,score:50},{att:65,score:55},{att:72,score:62},{att:78,score:68}] },
  { studentId: 'S045', name: 'Manoj Pawar',        department: 'Computer Science', year: 2, trendProfile: 'improving',    weeks: [{att:63,score:58},{att:68,score:62},{att:74,score:68},{att:80,score:74}] },
  { studentId: 'S046', name: 'Anjali Kapoor',      department: 'Computer Science', year: 2, trendProfile: 'improving',    weeks: [{att:61,score:54},{att:66,score:59},{att:73,score:65},{att:80,score:72}] },

  // ── GOOD ATTENDANCE BUT BAD GRADES (4 students) — attendance ≥75%, scores <55 ──
  { studentId: 'S013', name: 'Radhika Pillai',     department: 'Computer Science', year: 1, trendProfile: 'good_att_bad_grades', weeks: [{att:82,score:42},{att:80,score:40},{att:81,score:38},{att:79,score:36}] },
  { studentId: 'S023', name: 'Ketan Patil',        department: 'Computer Science', year: 2, trendProfile: 'good_att_bad_grades', weeks: [{att:84,score:48},{att:83,score:45},{att:85,score:43},{att:84,score:40}] },
  { studentId: 'S024', name: 'Isha Yadav',         department: 'Computer Science', year: 1, trendProfile: 'good_att_bad_grades', weeks: [{att:78,score:38},{att:77,score:35},{att:79,score:33},{att:78,score:30}] },
  { studentId: 'S044', name: 'Amit Chopra',        department: 'Computer Science', year: 4, trendProfile: 'good_att_bad_grades', weeks: [{att:86,score:50},{att:85,score:48},{att:87,score:45},{att:86,score:42}] },

  // ── SPIKE THEN DROP (3 students) — one good week then crash ──
  { studentId: 'S018', name: 'Riya Reddy',         department: 'Computer Science', year: 1, trendProfile: 'spike_then_drop', weeks: [{att:80,score:75},{att:55,score:45},{att:48,score:38},{att:42,score:35}] },
  { studentId: 'S029', name: 'Ravi Deshmukh',      department: 'Computer Science', year: 2, trendProfile: 'spike_then_drop', weeks: [{att:82,score:78},{att:58,score:48},{att:50,score:40},{att:44,score:34}] },
  { studentId: 'S050', name: 'Diya Nair',          department: 'Computer Science', year: 1, trendProfile: 'spike_then_drop', weeks: [{att:78,score:72},{att:52,score:42},{att:45,score:36},{att:40,score:30}] },

  // ── RECOVERING (3 students) — was declining, now improving ──
  { studentId: 'S039', name: 'Ananya Patil',       department: 'Computer Science', year: 1, trendProfile: 'recovering',    weeks: [{att:50,score:40},{att:55,score:45},{att:65,score:55},{att:75,score:65}] },
  { studentId: 'S040', name: 'Varun Bhosale',      department: 'Computer Science', year: 2, trendProfile: 'recovering',    weeks: [{att:55,score:48},{att:60,score:52},{att:68,score:60},{att:76,score:68}] },
  { studentId: 'S033', name: 'Harsh Sharma',       department: 'Computer Science', year: 3, trendProfile: 'recovering',    weeks: [{att:60,score:52},{att:65,score:58},{att:72,score:65},{att:80,score:72}] },

  // ── REMAINING (3 students) — mixed patterns ──
  { studentId: 'S031', name: 'Ketan Pawar',        department: 'Computer Science', year: 4, trendProfile: 'stable_high',  weeks: [{att:88,score:85},{att:89,score:86},{att:87,score:84},{att:88,score:85}] },
  { studentId: 'S047', name: 'Siddharth Shinde',   department: 'Computer Science', year: 2, trendProfile: 'stable_high',  weeks: [{att:93,score:88},{att:94,score:89},{att:92,score:87},{att:93,score:88}] },
  { studentId: 'S012', name: 'Akash Rao',          department: 'Computer Science', year: 2, trendProfile: 'stable_mid',   weeks: [{att:78,score:66},{att:79,score:67},{att:77,score:65},{att:78,score:66}] },
];

// ─────────────────────────────────────────────────────────────────────────────
// Backlogs — realistic distribution
// ─────────────────────────────────────────────────────────────────────────────

const backlogData: Record<string, { count: number; subjects: string[] }> = {
  // Stable High — mostly 0 backlogs
  S001: { count: 0, subjects: [] },
  S003: { count: 0, subjects: [] },
  S010: { count: 0, subjects: [] },
  S011: { count: 0, subjects: [] },
  S020: { count: 0, subjects: [] },
  S028: { count: 0, subjects: [] },
  S038: { count: 0, subjects: [] },
  S042: { count: 0, subjects: [] },
  S031: { count: 0, subjects: [] },
  S047: { count: 0, subjects: [] },

  // Stable Mid — 0-1 backlogs
  S004: { count: 0, subjects: [] },
  S007: { count: 0, subjects: [] },
  S008: { count: 1, subjects: ['DBMS'] },
  S014: { count: 1, subjects: ['DBMS'] },
  S017: { count: 0, subjects: [] },
  S025: { count: 1, subjects: ['Computer Network'] },
  S030: { count: 0, subjects: [] },
  S041: { count: 1, subjects: ['DS'] },
  S012: { count: 0, subjects: [] },

  // Stable Low — 2-4 backlogs (consistent poor performance)
  S002: { count: 2, subjects: ['Computer Network', 'Python Programming'] },
  S009: { count: 2, subjects: ['DBMS', 'Computer Network'] },
  S022: { count: 3, subjects: ['DS', 'Computational Math', 'DBMS'] },
  S035: { count: 2, subjects: ['Computer Network', 'Python Programming'] },
  S037: { count: 3, subjects: ['Python Programming', 'Computer Network', 'Computational Math'] },

  // Declining — 1-3 backlogs (accumulating from decline)
  S006: { count: 3, subjects: ['Python Programming', 'Computer Network', 'DBMS'] },
  S019: { count: 3, subjects: ['DBMS', 'Computational Math', 'DS'] },
  S021: { count: 2, subjects: ['DS', 'Computer Network'] },
  S027: { count: 2, subjects: ['Computer Network', 'Computational Math'] },
  S036: { count: 3, subjects: ['Computer Network', 'Python Programming', 'Computational Math'] },
  S048: { count: 2, subjects: ['Python Programming', 'Computational Math'] },

  // Was Good Then Bad — 1-2 backlogs (recent failures)
  S015: { count: 1, subjects: ['DS'] },
  S026: { count: 1, subjects: ['Computer Network'] },
  S043: { count: 1, subjects: ['Computer Network'] },
  S032: { count: 2, subjects: ['DBMS', 'Computational Math'] },
  S049: { count: 1, subjects: ['DBMS'] },

  // Improving — 0-1 backlogs (recovering from past issues)
  S005: { count: 1, subjects: ['DS'] },
  S016: { count: 0, subjects: [] },
  S034: { count: 1, subjects: ['Computational Math'] },
  S045: { count: 1, subjects: ['Computational Math'] },
  S046: { count: 1, subjects: ['Python Programming'] },

  // Good Attendance Bad Grades — 2-3 backlogs (passing attendance but failing exams)
  S013: { count: 2, subjects: ['DBMS', 'Python Programming'] },
  S023: { count: 2, subjects: ['DBMS', 'Computer Network'] },
  S024: { count: 3, subjects: ['Computer Network', 'DS', 'Computational Math'] },
  S044: { count: 1, subjects: ['DBMS'] },

  // Spike Then Drop — 2-3 backlogs (sudden failures after good start)
  S018: { count: 2, subjects: ['Computer Network', 'Computational Math'] },
  S029: { count: 2, subjects: ['Python Programming', 'DBMS'] },
  S050: { count: 2, subjects: ['Computational Math', 'Computer Network'] },

  // Recovering — 1-2 backlogs (clearing old backlogs)
  S039: { count: 1, subjects: ['DS'] },
  S040: { count: 0, subjects: [] },
  S033: { count: 0, subjects: [] },
};

// ─────────────────────────────────────────────────────────────────────────────
// Fee overdue days — realistic distribution
// ─────────────────────────────────────────────────────────────────────────────

const feeData: Record<string, number> = {
  // Stable High — mostly 0
  S001: 0,  S003: 0,  S010: 0,  S011: 0,  S020: 0,
  S028: 0,  S038: 0,  S042: 0,  S031: 0,  S047: 0,

  // Stable Mid — mostly 0, one with small overdue
  S004: 0,  S007: 0,  S008: 5,  S014: 5,  S017: 5,
  S025: 0,  S030: 0,  S041: 0,  S012: 0,

  // Stable Low — some with overdue (financial stress)
  S002: 20, S009: 20, S022: 0,  S035: 0,  S037: 0,

  // Declining — some with overdue (contributing to decline)
  S006: 0,  S019: 12, S021: 15, S027: 0,  S036: 0,  S048: 15,

  // Was Good Then Bad — some with recent overdue
  S015: 0,  S026: 0,  S043: 0,  S032: 0,  S049: 0,

  // Improving — mostly 0
  S005: 0,  S016: 0,  S034: 0,  S045: 0,  S046: 0,

  // Good Attendance Bad Grades — some with overdue
  S013: 0,  S023: 0,  S024: 0,  S044: 0,

  // Spike Then Drop — some with overdue (financial stress triggered decline)
  S018: 0,  S029: 0,  S050: 12,

  // Recovering — cleared their fees
  S039: 0,  S040: 0,  S033: 0,
};

// ─────────────────────────────────────────────────────────────────────────────
// Engagement rate — derived from trend profile
// ─────────────────────────────────────────────────────────────────────────────

function engagementRate(profile: TrendProfile): number {
  switch (profile) {
    case 'stable_high':         return 88;
    case 'stable_mid':          return 70;
    case 'improving':           return 65;
    case 'stable_low':          return 42;
    case 'declining':           return 35;
    case 'was_good_then_bad':   return 48; // Was good, now dropping
    case 'good_att_bad_grades': return 75; // Attends but doesn't do assignments
    case 'spike_then_drop':     return 30; // Crashed hard
    case 'recovering':          return 60; // Getting better
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Week labels
// ─────────────────────────────────────────────────────────────────────────────

const WEEK_LABELS = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];

// ─────────────────────────────────────────────────────────────────────────────
// Build all student data
// ─────────────────────────────────────────────────────────────────────────────

function buildStudentData() {
  const summaries: StudentSummary[] = [];
  const detailsMap: Record<string, StudentDetail> = {};

  for (const row of masterRows) {
    const sid = row.studentId;
    const bl = backlogData[sid] ?? { count: 0, subjects: [] };
    const overdueDays = feeData[sid] ?? 0;
    const submissionRate = engagementRate(row.trendProfile);

    // Build attendance history with subject-level breakdown per week
    const subjects = ['DBMS', 'Computer Network', 'Python Programming'];
    const attendanceHistory = row.weeks.map((w, i) => {
      // Each subject has slightly different attendance from overall
      const subjectBreakdown = subjects.map((subj, si) => {
        // Create realistic variation: some subjects higher, some lower
        const offset = ((si - 1) * 4) + (((sid.charCodeAt(3) + i * 7 + si * 13) % 7) - 3);
        return {
          subject: subj,
          percentage: Math.max(0, Math.min(100, w.att + offset)),
        };
      });
      return {
        week: WEEK_LABELS[i],
        percentage: w.att,
        subjects: subjectBreakdown,
      };
    });

    // UT1 = first week's score, UT2 = if provided (shows decline/improvement)
    const termTests = [
      { testName: 'Unit Test 1', score: row.weeks[0].score, maxMarks: 100, date: '2026-08-15' }
    ];
    if (row.ut2Score !== undefined) {
      termTests.push({ testName: 'Unit Test 2', score: row.ut2Score, maxMarks: 100, date: '2026-09-10' });
    }

    // Legacy subjectAttendance for backward compatibility
    const lastAtt = row.weeks[3].att;
    const subjectAttendance = [
      { subject: 'DBMS', week: 'Week 4', percentage: Math.max(0, lastAtt - 5) },
      { subject: 'Computer Network', week: 'Week 4', percentage: lastAtt },
      { subject: 'Python Programming', week: 'Week 4', percentage: Math.min(100, lastAtt + 3) },
    ];

    const endSemResult = { status: "Upcoming" as const };
    const lastSemResult = { score: 60 + (sid.charCodeAt(sid.length - 1) % 25), maxMarks: 100 };

    const raw: RawStudentData = {
      studentId: sid,
      name: row.name,
      department: row.department,
      year: row.year,
      attendanceHistory,
      subjectAttendance,
      termTests,
      backlogs: bl.count,
      backlogSubjects: bl.subjects,
      feeOverdueDays: overdueDays,
      submissionRate,
    };

    const result = computeRiskScore(raw);
    const explanation = generateFallbackExplanation(
      { name: row.name, department: row.department, year: row.year },
      result
    );

    summaries.push({
      studentId: sid,
      name: row.name,
      department: row.department,
      year: row.year,
      riskScore: result.riskScore,
      riskLevel: result.riskLevel,
      interventionStatus: 'None',
    });

    detailsMap[sid] = {
      studentId: sid,
      name: row.name,
      department: row.department,
      year: row.year,
      riskScore: result.riskScore,
      riskLevel: result.riskLevel,
      contributingFactors: result.contributingFactors,
      attendanceHistory,
      subjectAttendance,
      termTests,
      endSemResult,
      lastSemResult,
      backlogCount: bl.count,
      backlogSubjects: bl.subjects,
      feeOverdueDays: overdueDays,
      feeStatus: overdueDays > 0 ? 'Overdue' : 'Paid',
      submissionRate,
      aiExplanation: explanation,
      suggestedAction: result.suggestedAction,
    };
  }

  // Sort by risk score descending (high risk first)
  summaries.sort((a, b) => b.riskScore - a.riskScore);

  return { summaries, detailsMap };
}

const { summaries, detailsMap } = buildStudentData();

export const initialStudents: StudentSummary[] = summaries;
export const studentDetailsMap: Record<string, StudentDetail> = detailsMap;

// ─────────────────────────────────────────────────────────────────────────────
// Pre-seeded intervention demos
//
// `baselineScore` is the risk score recorded at the moment the intervention was
// assigned. It is the ONLY source of "before" on the Outcome Comparison page —
// it must never be derived from the current score, otherwise the baseline would
// drift every time fresh attendance/grade data arrives.
// ─────────────────────────────────────────────────────────────────────────────

export const studentStatusMap: Record<string, StudentStatusData> = {
  S006: {
    studentId: 'S006', name: 'Kabir Kale',
    activeIntervention: {
      type: 'Extra Class', status: 'Active', assignedDate: '2026-09-02',
      details: { subject: 'Data Structures & DBMS', schedule: 'Tue/Thu 4:00 PM', instructor: 'Dr. Mehta' },
    },
  },
  S019: {
    studentId: 'S019', name: 'Radhika Reddy',
    activeIntervention: {
      type: 'Counseling', status: 'Active', assignedDate: '2026-09-05',
      details: { schedule: 'Mon 3:00 PM', instructor: 'Counselor Priya' },
    },
  },
  S022: {
    studentId: 'S022', name: 'Ruchi Reddy',
    activeIntervention: {
      type: 'Academic Support', status: 'Active', assignedDate: '2026-09-03',
      details: { subject: 'DS, Computational Math, DBMS', schedule: 'Wed/Fri 5:00 PM' },
    },
  },
};

/**
 * Risk score each seeded intervention recorded when it was assigned.
 * Deliberately above the students' current scores, so the demo shows a real
 * before/after gap (the intervention was opened while the student was worse).
 */
export const seededBaselineScores: Record<string, number> = {
  S006: 84,
  S019: 88,
  S022: 74,
};

// Attach the seeded interventions to the student records themselves. Without
// this the mentor dashboard, the student profile and the outcome page had no
// idea these interventions existed (they only lived in studentStatusMap).
for (const [sid, statusEntry] of Object.entries(studentStatusMap)) {
  const intervention = statusEntry.activeIntervention;
  if (!intervention) continue;

  const detail = studentDetailsMap[sid];
  if (!detail) continue;

  const status = intervention.status as NonNullable<StudentDetail['interventionStatus']>;

  detail.activeIntervention = {
    ...intervention,
    baselineRiskScore: seededBaselineScores[sid] ?? detail.riskScore,
  };
  detail.interventionStatus = status;

  const summary = initialStudents.find(s => s.studentId === sid);
  if (summary) summary.interventionStatus = status;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pre-seeded outcome comparisons
// ─────────────────────────────────────────────────────────────────────────────

export const outcomeComparisonsMap: Record<string, OutcomeComparisonData> = {
  S006: {
    studentId: 'S006', name: 'Kabir Kale',
    intervention: { type: 'Extra Class', details: { subject: 'Data Structures & DBMS', schedule: 'Tue/Thu 4:00 PM', instructor: 'Dr. Mehta' }, startDate: '2026-09-02' },
    baselineScore: seededBaselineScores.S006,
    currentScore: detailsMap['S006']?.riskScore ?? 62,
    scoreDelta: (detailsMap['S006']?.riskScore ?? 62) - seededBaselineScores.S006,
    outcome: 'Improving', checkpointDate: '2026-09-15', status: 'Active',
  },
  S019: {
    studentId: 'S019', name: 'Radhika Reddy',
    intervention: { type: 'Counseling', details: { schedule: 'Mon 3:00 PM', instructor: 'Counselor Priya' }, startDate: '2026-09-05' },
    baselineScore: seededBaselineScores.S019,
    currentScore: detailsMap['S019']?.riskScore ?? 74,
    scoreDelta: (detailsMap['S019']?.riskScore ?? 74) - seededBaselineScores.S019,
    outcome: 'Improving', checkpointDate: '2026-09-15', status: 'Active',
  },
  S022: {
    studentId: 'S022', name: 'Ruchi Reddy',
    intervention: { type: 'Academic Support', details: { subject: 'DS, Computational Math, DBMS', schedule: 'Wed/Fri 5:00 PM' }, startDate: '2026-09-03' },
    baselineScore: seededBaselineScores.S022,
    currentScore: detailsMap['S022']?.riskScore ?? 72,
    scoreDelta: (detailsMap['S022']?.riskScore ?? 72) - seededBaselineScores.S022,
    outcome: 'No Change', checkpointDate: '2026-09-15', status: 'Active',
  },
};
