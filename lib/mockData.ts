/**
 * mockData.ts
 * 
 * All 50 CS students seeded from the CSV files in /data.
 * Risk scores computed deterministically by riskEngine.computeRiskScore().
 * AI explanations are generated at runtime via Groq (with fallback).
 * 
 * Engagement/submission rate is derived from attendance trend profile:
 *   stable_high  → 88%    stable_mid → 70%
 *   stable_low   → 45%    declining  → 38%    improving → 62%
 */

import {
  StudentSummary,
  StudentDetail,
  StudentStatusData,
  OutcomeComparisonData,
} from './types';
import { computeRiskScore, RawStudentData, generateFallbackExplanation } from './riskEngine';

// ─────────────────────────────────────────────────────────────────────────────
// Raw CSV data embedded as typed constants
// ─────────────────────────────────────────────────────────────────────────────

type TrendProfile = 'stable_high' | 'stable_mid' | 'stable_low' | 'declining' | 'improving';

interface MasterRow {
  studentId: string;
  name: string;
  department: string;
  year: number;
  trendProfile: TrendProfile;
  weeks: { att: number; score: number }[]; // [W1, W2, W3, W4]
}

const masterRows: MasterRow[] = [
  { studentId: 'S001', name: 'Mohit Chopra',      department: 'Computer Science', year: 4, trendProfile: 'stable_high',  weeks: [{att:87,score:92},{att:87,score:91},{att:85,score:89},{att:86,score:91}] },
  { studentId: 'S002', name: 'Mohit Rao',          department: 'Computer Science', year: 2, trendProfile: 'stable_low',   weeks: [{att:52,score:42},{att:54,score:40},{att:57,score:39},{att:56,score:36}] },
  { studentId: 'S003', name: 'Manoj Agarwal',      department: 'Computer Science', year: 4, trendProfile: 'stable_high',  weeks: [{att:96,score:84},{att:97,score:86},{att:95,score:88},{att:96,score:89}] },
  { studentId: 'S004', name: 'Manoj Joshi',        department: 'Computer Science', year: 4, trendProfile: 'stable_mid',   weeks: [{att:76,score:62},{att:73,score:60},{att:73,score:62},{att:74,score:64}] },
  { studentId: 'S005', name: 'Simran Kulkarni',    department: 'Computer Science', year: 1, trendProfile: 'improving',    weeks: [{att:64,score:55},{att:72,score:58},{att:78,score:61},{att:85,score:64}] },
  { studentId: 'S006', name: 'Kabir Kale',         department: 'Computer Science', year: 4, trendProfile: 'declining',    weeks: [{att:72,score:66},{att:64,score:62},{att:56,score:56},{att:49,score:51}] },
  { studentId: 'S007', name: 'Mohit Pawar',        department: 'Computer Science', year: 2, trendProfile: 'stable_mid',   weeks: [{att:79,score:70},{att:82,score:69},{att:83,score:71},{att:83,score:70}] },
  { studentId: 'S008', name: 'Rohan Bansal',       department: 'Computer Science', year: 1, trendProfile: 'stable_mid',   weeks: [{att:79,score:70},{att:81,score:69},{att:82,score:68},{att:80,score:66}] },
  { studentId: 'S009', name: 'Aditi Verma',        department: 'Computer Science', year: 2, trendProfile: 'stable_low',   weeks: [{att:55,score:48},{att:52,score:50},{att:49,score:49},{att:52,score:47}] },
  { studentId: 'S010', name: 'Karan Kale',         department: 'Computer Science', year: 1, trendProfile: 'stable_high',  weeks: [{att:90,score:92},{att:89,score:93},{att:90,score:95},{att:91,score:95}] },
  { studentId: 'S011', name: 'Sameer Yadav',       department: 'Computer Science', year: 4, trendProfile: 'stable_high',  weeks: [{att:93,score:88},{att:93,score:90},{att:91,score:90},{att:93,score:90}] },
  { studentId: 'S012', name: 'Akash Rao',          department: 'Computer Science', year: 2, trendProfile: 'stable_high',  weeks: [{att:91,score:86},{att:92,score:85},{att:90,score:85},{att:89,score:84}] },
  { studentId: 'S013', name: 'Radhika Pillai',     department: 'Computer Science', year: 1, trendProfile: 'stable_mid',   weeks: [{att:67,score:78},{att:65,score:82},{att:66,score:79},{att:65,score:78}] },
  { studentId: 'S014', name: 'Diya Iyer',          department: 'Computer Science', year: 3, trendProfile: 'stable_mid',   weeks: [{att:75,score:65},{att:78,score:69},{att:74,score:67},{att:73,score:67}] },
  { studentId: 'S015', name: 'Pallavi Naik',       department: 'Computer Science', year: 1, trendProfile: 'improving',    weeks: [{att:63,score:57},{att:70,score:61},{att:74,score:67},{att:81,score:71}] },
  { studentId: 'S016', name: 'Neha Yadav',         department: 'Computer Science', year: 2, trendProfile: 'stable_mid',   weeks: [{att:76,score:68},{att:78,score:72},{att:82,score:73},{att:85,score:74}] },
  { studentId: 'S017', name: 'Nidhi Sharma',       department: 'Computer Science', year: 1, trendProfile: 'stable_mid',   weeks: [{att:77,score:65},{att:76,score:64},{att:78,score:61},{att:78,score:65}] },
  { studentId: 'S018', name: 'Riya Reddy',         department: 'Computer Science', year: 1, trendProfile: 'stable_low',   weeks: [{att:52,score:47},{att:49,score:46},{att:50,score:43},{att:47,score:43}] },
  { studentId: 'S019', name: 'Radhika Reddy',      department: 'Computer Science', year: 1, trendProfile: 'declining',    weeks: [{att:74,score:74},{att:65,score:70},{att:58,score:66},{att:49,score:62}] },
  { studentId: 'S020', name: 'Aarav Chopra',       department: 'Computer Science', year: 1, trendProfile: 'stable_high',  weeks: [{att:90,score:92},{att:91,score:91},{att:93,score:93},{att:94,score:94}] },
  { studentId: 'S021', name: 'Harsh Shah',         department: 'Computer Science', year: 1, trendProfile: 'declining',    weeks: [{att:70,score:69},{att:63,score:63},{att:55,score:56},{att:48,score:50}] },
  { studentId: 'S022', name: 'Ruchi Reddy',        department: 'Computer Science', year: 4, trendProfile: 'stable_low',   weeks: [{att:48,score:47},{att:49,score:47},{att:47,score:47},{att:48,score:44}] },
  { studentId: 'S023', name: 'Ketan Patil',        department: 'Computer Science', year: 2, trendProfile: 'stable_mid',   weeks: [{att:80,score:61},{att:84,score:60},{att:85,score:62},{att:85,score:60}] },
  { studentId: 'S024', name: 'Isha Yadav',         department: 'Computer Science', year: 1, trendProfile: 'stable_low',   weeks: [{att:54,score:39},{att:51,score:40},{att:51,score:40},{att:54,score:40}] },
  { studentId: 'S025', name: 'Anjali Yadav',       department: 'Computer Science', year: 1, trendProfile: 'stable_mid',   weeks: [{att:77,score:71},{att:75,score:72},{att:77,score:75},{att:81,score:76}] },
  { studentId: 'S026', name: 'Pallavi Kumar',      department: 'Computer Science', year: 1, trendProfile: 'stable_mid',   weeks: [{att:73,score:64},{att:73,score:62},{att:69,score:60},{att:68,score:60}] },
  { studentId: 'S027', name: 'Amit Mehta',         department: 'Computer Science', year: 1, trendProfile: 'declining',    weeks: [{att:73,score:66},{att:65,score:61},{att:56,score:57},{att:47,score:53}] },
  { studentId: 'S028', name: 'Rohan Verma',        department: 'Computer Science', year: 4, trendProfile: 'stable_high',  weeks: [{att:94,score:89},{att:92,score:90},{att:93,score:92},{att:95,score:91}] },
  { studentId: 'S029', name: 'Ravi Deshmukh',      department: 'Computer Science', year: 2, trendProfile: 'stable_high',  weeks: [{att:90,score:95},{att:89,score:97},{att:91,score:97},{att:90,score:96}] },
  { studentId: 'S030', name: 'Sudhanshu Shinde',   department: 'Computer Science', year: 2, trendProfile: 'stable_mid',   weeks: [{att:78,score:71},{att:79,score:70},{att:78,score:69},{att:75,score:67}] },
  { studentId: 'S031', name: 'Ketan Pawar',        department: 'Computer Science', year: 4, trendProfile: 'stable_high',  weeks: [{att:89,score:87},{att:90,score:85},{att:91,score:86},{att:93,score:85}] },
  { studentId: 'S032', name: 'Kavya Reddy',        department: 'Computer Science', year: 4, trendProfile: 'stable_mid',   weeks: [{att:69,score:68},{att:68,score:69},{att:69,score:66},{att:73,score:67}] },
  { studentId: 'S033', name: 'Harsh Sharma',       department: 'Computer Science', year: 3, trendProfile: 'stable_high',  weeks: [{att:92,score:84},{att:90,score:82},{att:92,score:84},{att:94,score:86}] },
  { studentId: 'S034', name: 'Simran Malhotra',    department: 'Computer Science', year: 1, trendProfile: 'improving',    weeks: [{att:62,score:51},{att:66,score:55},{att:71,score:59},{att:77,score:62}] },
  { studentId: 'S035', name: 'Varun Deshmukh',     department: 'Computer Science', year: 4, trendProfile: 'stable_low',   weeks: [{att:52,score:42},{att:52,score:39},{att:55,score:36},{att:54,score:36}] },
  { studentId: 'S036', name: 'Pooja Verma',        department: 'Computer Science', year: 2, trendProfile: 'declining',    weeks: [{att:77,score:71},{att:70,score:65},{att:64,score:61},{att:57,score:56}] },
  { studentId: 'S037', name: 'Harsh Iyer',         department: 'Computer Science', year: 3, trendProfile: 'stable_low',   weeks: [{att:50,score:49},{att:49,score:49},{att:47,score:50},{att:45,score:47}] },
  { studentId: 'S038', name: 'Rohan Kumar',        department: 'Computer Science', year: 3, trendProfile: 'stable_high',  weeks: [{att:86,score:91},{att:88,score:93},{att:87,score:95},{att:89,score:95}] },
  { studentId: 'S039', name: 'Ananya Patil',       department: 'Computer Science', year: 1, trendProfile: 'improving',    weeks: [{att:58,score:53},{att:65,score:57},{att:71,score:62},{att:78,score:66}] },
  { studentId: 'S040', name: 'Varun Bhosale',      department: 'Computer Science', year: 2, trendProfile: 'stable_high',  weeks: [{att:93,score:86},{att:93,score:86},{att:94,score:84},{att:92,score:84}] },
  { studentId: 'S041', name: 'Rohan Kale',         department: 'Computer Science', year: 3, trendProfile: 'stable_mid',   weeks: [{att:76,score:73},{att:76,score:73},{att:77,score:72},{att:79,score:70}] },
  { studentId: 'S042', name: 'Deepak Kale',        department: 'Computer Science', year: 4, trendProfile: 'stable_high',  weeks: [{att:91,score:92},{att:90,score:90},{att:91,score:92},{att:89,score:90}] },
  { studentId: 'S043', name: 'Rahul Bhosale',      department: 'Computer Science', year: 4, trendProfile: 'stable_mid',   weeks: [{att:78,score:66},{att:81,score:68},{att:85,score:64},{att:84,score:66}] },
  { studentId: 'S044', name: 'Amit Chopra',        department: 'Computer Science', year: 4, trendProfile: 'stable_high',  weeks: [{att:88,score:86},{att:88,score:86},{att:90,score:88},{att:92,score:89}] },
  { studentId: 'S045', name: 'Manoj Pawar',        department: 'Computer Science', year: 2, trendProfile: 'improving',    weeks: [{att:62,score:60},{att:66,score:63},{att:73,score:67},{att:80,score:73}] },
  { studentId: 'S046', name: 'Anjali Kapoor',      department: 'Computer Science', year: 2, trendProfile: 'improving',    weeks: [{att:60,score:55},{att:67,score:61},{att:74,score:66},{att:82,score:72}] },
  { studentId: 'S047', name: 'Siddharth Shinde',   department: 'Computer Science', year: 2, trendProfile: 'stable_high',  weeks: [{att:94,score:90},{att:95,score:90},{att:97,score:90},{att:97,score:88}] },
  { studentId: 'S048', name: 'Nikhil Shinde',      department: 'Computer Science', year: 2, trendProfile: 'declining',    weeks: [{att:72,score:70},{att:63,score:63},{att:57,score:57},{att:48,score:53}] },
  { studentId: 'S049', name: 'Komal Malhotra',     department: 'Computer Science', year: 4, trendProfile: 'stable_mid',   weeks: [{att:76,score:69},{att:78,score:72},{att:78,score:71},{att:74,score:75}] },
  { studentId: 'S050', name: 'Diya Nair',          department: 'Computer Science', year: 1, trendProfile: 'declining',    weeks: [{att:72,score:74},{att:66,score:70},{att:57,score:63},{att:51,score:58}] },
];

// Backlogs data from CS_Backlogs.csv
const backlogData: Record<string, { count: number; subjects: string[] }> = {
  S001: { count: 0, subjects: [] },
  S002: { count: 2, subjects: ['Computer Network', 'Python Programming'] },
  S003: { count: 0, subjects: [] },
  S004: { count: 0, subjects: [] },
  S005: { count: 1, subjects: ['DS'] },
  S006: { count: 3, subjects: ['Python Programming', 'Computer Network', 'DBMS'] },
  S007: { count: 0, subjects: [] },
  S008: { count: 0, subjects: [] },
  S009: { count: 2, subjects: ['DBMS', 'Computer Network'] },
  S010: { count: 0, subjects: [] },
  S011: { count: 0, subjects: [] },
  S012: { count: 0, subjects: [] },
  S013: { count: 1, subjects: ['DBMS'] },
  S014: { count: 1, subjects: ['DBMS'] },
  S015: { count: 2, subjects: ['Computer Network', 'Python Programming'] },
  S016: { count: 0, subjects: [] },
  S017: { count: 0, subjects: [] },
  S018: { count: 2, subjects: ['Computer Network', 'Computational Math'] },
  S019: { count: 3, subjects: ['DBMS', 'Computational Math', 'DS'] },
  S020: { count: 0, subjects: [] },
  S021: { count: 2, subjects: ['DS', 'Computer Network'] },
  S022: { count: 3, subjects: ['DS', 'Computational Math', 'DBMS'] },
  S023: { count: 0, subjects: [] },
  S024: { count: 2, subjects: ['Computer Network', 'DS'] },
  S025: { count: 1, subjects: ['Computer Network'] },
  S026: { count: 0, subjects: [] },
  S027: { count: 2, subjects: ['Computer Network', 'Computational Math'] },
  S028: { count: 0, subjects: [] },
  S029: { count: 0, subjects: [] },
  S030: { count: 0, subjects: [] },
  S031: { count: 0, subjects: [] },
  S032: { count: 0, subjects: [] },
  S033: { count: 0, subjects: [] },
  S034: { count: 1, subjects: ['Computational Math'] },
  S035: { count: 1, subjects: ['Computer Network'] },
  S036: { count: 3, subjects: ['Computer Network', 'Python Programming', 'Computational Math'] },
  S037: { count: 3, subjects: ['Python Programming', 'Computer Network', 'Computational Math'] },
  S038: { count: 0, subjects: [] },
  S039: { count: 1, subjects: ['DS'] },
  S040: { count: 0, subjects: [] },
  S041: { count: 1, subjects: ['DS'] },
  S042: { count: 0, subjects: [] },
  S043: { count: 1, subjects: ['Computer Network'] },
  S044: { count: 0, subjects: [] },
  S045: { count: 1, subjects: ['Computational Math'] },
  S046: { count: 1, subjects: ['Python Programming'] },
  S047: { count: 0, subjects: [] },
  S048: { count: 2, subjects: ['Python Programming', 'Computational Math'] },
  S049: { count: 1, subjects: ['DBMS'] },
  S050: { count: 2, subjects: ['Computational Math', 'Computer Network'] },
};

// Fee data from CS_FeeStatus.csv
const feeData: Record<string, number> = {
  S001: 0,  S002: 20, S003: 0,  S004: 0,  S005: 0,
  S006: 0,  S007: 0,  S008: 5,  S009: 20, S010: 0,
  S011: 0,  S012: 0,  S013: 0,  S014: 5,  S015: 0,
  S016: 0,  S017: 5,  S018: 0,  S019: 12, S020: 0,
  S021: 15, S022: 0,  S023: 0,  S024: 0,  S025: 0,
  S026: 0,  S027: 0,  S028: 0,  S029: 0,  S030: 0,
  S031: 0,  S032: 0,  S033: 0,  S034: 0,  S035: 0,
  S036: 0,  S037: 0,  S038: 0,  S039: 0,  S040: 0,
  S041: 0,  S042: 0,  S043: 0,  S044: 0,  S045: 0,
  S046: 0,  S047: 0,  S048: 15, S049: 0,  S050: 12,
};

// Engagement rate derived from trend profile
function engagementRate(profile: TrendProfile): number {
  switch (profile) {
    case 'stable_high': return 88;
    case 'stable_mid':  return 70;
    case 'improving':   return 62;
    case 'stable_low':  return 45;
    case 'declining':   return 38;
  }
}

// Week labels
const WEEK_LABELS = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];

// ─────────────────────────────────────────────────────────────────────────────
// Build all student data by running the engine over every student
// ─────────────────────────────────────────────────────────────────────────────

function buildStudentData() {
  const summaries: StudentSummary[] = [];
  const detailsMap: Record<string, StudentDetail> = {};

  for (const row of masterRows) {
    const sid = row.studentId;
    const bl = backlogData[sid] ?? { count: 0, subjects: [] };
    const overdueDays = feeData[sid] ?? 0;
    const submissionRate = engagementRate(row.trendProfile);

    const attendanceHistory = row.weeks.map((w, i) => ({
      week: WEEK_LABELS[i],
      percentage: w.att,
    }));
    
    // For demo purposes, we will just use the first week's score as Unit Test 1
    const termTests = [
      { testName: 'Unit Test 1', score: row.weeks[0].score, maxMarks: 100, date: '2026-08-15' }
    ];
    
    const subjectAttendance = [
      { subject: 'DBMS', week: 'Week 4', percentage: Math.max(0, row.weeks[3].att - 5) },
      { subject: 'Computer Network', week: 'Week 4', percentage: row.weeks[3].att },
      { subject: 'Python Programming', week: 'Week 4', percentage: Math.min(100, row.weeks[3].att + 5) }
    ];

    const endSemResult = { status: "Upcoming" as const };
    const lastSemResult = { score: 65 + (sid.charCodeAt(sid.length - 1) % 20), maxMarks: 100 };

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
      aiExplanation: explanation,
      suggestedAction: result.suggestedAction,
    };
  }

  // Sort summaries by risk score descending (High risk first)
  summaries.sort((a, b) => b.riskScore - a.riskScore);

  return { summaries, detailsMap };
}

const { summaries, detailsMap } = buildStudentData();

export const initialStudents: StudentSummary[] = summaries;
export const studentDetailsMap: Record<string, StudentDetail> = detailsMap;

// ─────────────────────────────────────────────────────────────────────────────
// Pre-seeded intervention demos (for demo/showcase purposes)
// Shows the full Phase 5-9 workflow for 3 high-risk students
// ─────────────────────────────────────────────────────────────────────────────

// S006 - Kabir Kale (High Risk, declining, 3 backlogs): Extra Class assigned
// S019 - Radhika Reddy (High Risk, declining, 3 backlogs, fee overdue): Counseling assigned
// S022 - Ruchi Reddy (High Risk, stable_low, 3 backlogs): Academic Support assigned

export const studentStatusMap: Record<string, StudentStatusData> = {
  S006: {
    studentId: 'S006',
    name: 'Kabir Kale',
    activeIntervention: {
      type: 'Extra Class',
      details: { subject: 'Data Structures & DBMS', schedule: 'Tue/Thu 4:00 PM', instructor: 'Dr. Mehta' },
      status: 'Active',
      assignedDate: '2026-09-02',
    },
  },
  S019: {
    studentId: 'S019',
    name: 'Radhika Reddy',
    activeIntervention: {
      type: 'Counseling',
      details: { schedule: 'Mon 3:00 PM', instructor: 'Counselor Priya' },
      status: 'Active',
      assignedDate: '2026-09-05',
    },
  },
  S022: {
    studentId: 'S022',
    name: 'Ruchi Reddy',
    activeIntervention: {
      type: 'Academic Support',
      details: { subject: 'DS, Computational Math, DBMS', schedule: 'Wed/Fri 5:00 PM' },
      status: 'Active',
      assignedDate: '2026-09-03',
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Pre-seeded outcome comparisons for the 3 demo students
// Shows before-after risk score after ~2 weeks of intervention
// ─────────────────────────────────────────────────────────────────────────────

export const outcomeComparisonsMap: Record<string, OutcomeComparisonData> = {
  S006: {
    studentId: 'S006',
    name: 'Kabir Kale',
    intervention: {
      type: 'Extra Class',
      details: { subject: 'Data Structures & DBMS', schedule: 'Tue/Thu 4:00 PM', instructor: 'Dr. Mehta' },
      startDate: '2026-09-02',
    },
    baselineScore: detailsMap['S006']?.riskScore ?? 78,
    currentScore: Math.max(38, (detailsMap['S006']?.riskScore ?? 78) - 34),
    scoreDelta: -34,
    outcome: 'Improving',
    checkpointDate: '2026-09-15',
  },
  S019: {
    studentId: 'S019',
    name: 'Radhika Reddy',
    intervention: {
      type: 'Counseling',
      details: { schedule: 'Mon 3:00 PM', instructor: 'Counselor Priya' },
      startDate: '2026-09-05',
    },
    baselineScore: detailsMap['S019']?.riskScore ?? 72,
    currentScore: Math.max(45, (detailsMap['S019']?.riskScore ?? 72) - 18),
    scoreDelta: -18,
    outcome: 'Improving',
    checkpointDate: '2026-09-15',
  },
  S022: {
    studentId: 'S022',
    name: 'Ruchi Reddy',
    intervention: {
      type: 'Academic Support',
      details: { subject: 'DS, Computational Math, DBMS', schedule: 'Wed/Fri 5:00 PM' },
      startDate: '2026-09-03',
    },
    baselineScore: detailsMap['S022']?.riskScore ?? 70,
    currentScore: detailsMap['S022']?.riskScore ?? 70, // No change yet
    scoreDelta: 0,
    outcome: 'No Change',
    checkpointDate: '2026-09-15',
  },
};
