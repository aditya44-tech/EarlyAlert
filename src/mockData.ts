import {
  StudentSummary,
  StudentDetail,
  StudentStatusData,
  OutcomeComparisonData,
} from './types';

export const initialStudents: StudentSummary[] = [
  {
    studentId: 'S001',
    name: 'Aditi Sharma',
    department: 'Computer Engineering',
    year: 2,
    riskScore: 68,
    riskLevel: 'High',
    interventionStatus: 'None',
  },
  {
    studentId: 'S002',
    name: 'Rohan Patil',
    department: 'Mechanical Engineering',
    year: 3,
    riskScore: 22,
    riskLevel: 'Low',
    interventionStatus: 'None',
  },
  {
    studentId: 'S003',
    name: 'Meera Joshi',
    department: 'Computer Engineering',
    year: 1,
    riskScore: 55,
    riskLevel: 'Medium',
    interventionStatus: 'Active',
  },
  {
    studentId: 'S004',
    name: 'Kavya Nair',
    department: 'Electrical Engineering',
    year: 4,
    riskScore: 74,
    riskLevel: 'High',
    interventionStatus: 'None',
  },
  {
    studentId: 'S005',
    name: 'Arjun Deshmukh',
    department: 'Civil Engineering',
    year: 2,
    riskScore: 18,
    riskLevel: 'Low',
    interventionStatus: 'Resolved',
  },
];

export const studentDetailsMap: Record<string, StudentDetail> = {
  S001: {
    studentId: 'S001',
    name: 'Aditi Sharma',
    department: 'Computer Engineering',
    year: 2,
    riskScore: 68,
    riskLevel: 'High',
    contributingFactors: [
      { factor: 'Attendance Decline', points: 30, reason: 'Attendance dropped 22% over the past 3 weeks' },
      { factor: 'Backlogs', points: 20, reason: '2 active backlogs' },
      { factor: 'Fee Overdue', points: 15, reason: 'Fee overdue by 15 days' },
      { factor: 'Grade Decline', points: 0, reason: 'No significant decline' },
      { factor: 'Low Engagement', points: 3, reason: 'Slight drop in assignment submissions' },
    ],
    attendanceHistory: [
      { week: 'Week 1', percentage: 82 },
      { week: 'Week 2', percentage: 75 },
      { week: 'Week 3', percentage: 68 },
      { week: 'Week 4', percentage: 60 },
    ],
    gradeHistory: [
      { test: 'Test 1', score: 78 },
      { test: 'Test 2', score: 74 },
      { test: 'Test 3', score: 71 },
    ],
    aiExplanation:
      'This student shows high dropout risk primarily due to a sharp attendance decline over the past three weeks, compounded by two active academic backlogs. Recommended action: assign academic support and schedule a check-in within the week.',
    suggestedAction: 'Extra Class / Tutoring',
  },
  S002: {
    studentId: 'S002',
    name: 'Rohan Patil',
    department: 'Mechanical Engineering',
    year: 3,
    riskScore: 22,
    riskLevel: 'Low',
    contributingFactors: [
      { factor: 'Attendance Decline', points: 4, reason: 'Consistent attendance at 91%' },
      { factor: 'Backlogs', points: 0, reason: 'Zero active backlogs' },
      { factor: 'Fee Overdue', points: 0, reason: 'Tuition fees paid in full' },
      { factor: 'Grade Decline', points: 8, reason: 'Minor decrease in Thermodynamics midterm' },
      { factor: 'Low Engagement', points: 10, reason: 'Regular lab and workshop participation' },
    ],
    attendanceHistory: [
      { week: 'Week 1', percentage: 94 },
      { week: 'Week 2', percentage: 92 },
      { week: 'Week 3', percentage: 89 },
      { week: 'Week 4', percentage: 91 },
    ],
    gradeHistory: [
      { test: 'Test 1', score: 85 },
      { test: 'Test 2', score: 82 },
      { test: 'Test 3', score: 88 },
    ],
    aiExplanation:
      'Student exhibits stable academic metrics with strong attendance and no backlogs. Minimal intervention needed beyond routine milestone reviews.',
    suggestedAction: 'Academic Support',
  },
  S003: {
    studentId: 'S003',
    name: 'Meera Joshi',
    department: 'Computer Engineering',
    year: 1,
    riskScore: 55,
    riskLevel: 'Medium',
    contributingFactors: [
      { factor: 'Attendance Decline', points: 18, reason: 'Irregular morning lecture attendance (72%)' },
      { factor: 'Backlogs', points: 15, reason: '1 pending prerequisite exam' },
      { factor: 'Fee Overdue', points: 0, reason: 'Fee payment current' },
      { factor: 'Grade Decline', points: 12, reason: 'Dropped 14% on recent discrete math quiz' },
      { factor: 'Low Engagement', points: 10, reason: 'Infrequent portal logins' },
    ],
    attendanceHistory: [
      { week: 'Week 1', percentage: 86 },
      { week: 'Week 2', percentage: 80 },
      { week: 'Week 3', percentage: 74 },
      { week: 'Week 4', percentage: 72 },
    ],
    gradeHistory: [
      { test: 'Test 1', score: 80 },
      { test: 'Test 2', score: 70 },
      { test: 'Test 3', score: 66 },
    ],
    aiExplanation:
      'First-year transition difficulty detected. Drop in discrete math quiz performance combined with missed morning lectures indicates need for structured mentoring and tutoring assistance.',
    suggestedAction: 'Extra Class / Tutoring',
  },
  S004: {
    studentId: 'S004',
    name: 'Kavya Nair',
    department: 'Electrical Engineering',
    year: 4,
    riskScore: 74,
    riskLevel: 'High',
    contributingFactors: [
      { factor: 'Attendance Decline', points: 28, reason: 'Severe drop to 54% over 4 weeks' },
      { factor: 'Backlogs', points: 25, reason: '3 active backlogs in power systems' },
      { factor: 'Fee Overdue', points: 15, reason: 'Fee overdue by 30 days' },
      { factor: 'Grade Decline', points: 6, reason: 'Incomplete project submission' },
    ],
    attendanceHistory: [
      { week: 'Week 1', percentage: 76 },
      { week: 'Week 2', percentage: 68 },
      { week: 'Week 3', percentage: 59 },
      { week: 'Week 4', percentage: 54 },
    ],
    gradeHistory: [
      { test: 'Test 1', score: 65 },
      { test: 'Test 2', score: 58 },
      { test: 'Test 3', score: 51 },
    ],
    aiExplanation:
      'Senior student flagged with critical risk trajectory due to compounded backlogs, steep attendance reduction, and financial hold. Urgent multi-department intervention recommended.',
    suggestedAction: 'Counseling',
  },
  S005: {
    studentId: 'S005',
    name: 'Arjun Deshmukh',
    department: 'Civil Engineering',
    year: 2,
    riskScore: 18,
    riskLevel: 'Low',
    contributingFactors: [
      { factor: 'Attendance Decline', points: 0, reason: 'Attendance steady at 95%' },
      { factor: 'Backlogs', points: 0, reason: 'Clear record' },
      { factor: 'Fee Overdue', points: 0, reason: 'No outstanding balance' },
      { factor: 'Grade Decline', points: 5, reason: 'Minor lab score variance' },
    ],
    attendanceHistory: [
      { week: 'Week 1', percentage: 92 },
      { week: 'Week 2', percentage: 95 },
      { week: 'Week 3', percentage: 96 },
      { week: 'Week 4', percentage: 95 },
    ],
    gradeHistory: [
      { test: 'Test 1', score: 88 },
      { test: 'Test 2', score: 84 },
      { test: 'Test 3', score: 89 },
    ],
    aiExplanation:
      'Prior intervention successfully completed. Attendance and grades have stabilized within healthy thresholds.',
    suggestedAction: 'Academic Support',
  },
};

export const studentStatusMap: Record<string, StudentStatusData> = {
  S001: {
    studentId: 'S001',
    name: 'Aditi Sharma',
    activeIntervention: {
      type: 'Extra Class',
      details: { subject: 'Data Structures', schedule: 'Tue/Thu 4pm' },
      status: 'Active',
      assignedDate: '2026-09-10',
    },
  },
  S002: {
    studentId: 'S002',
    name: 'Rohan Patil',
    activeIntervention: null,
  },
  S003: {
    studentId: 'S003',
    name: 'Meera Joshi',
    activeIntervention: {
      type: 'Extra Class',
      details: { subject: 'Discrete Mathematics', schedule: 'Mon/Wed 3pm' },
      status: 'Active',
      assignedDate: '2026-09-12',
    },
  },
};

export const outcomeComparisonsMap: Record<string, OutcomeComparisonData> = {
  S001: {
    studentId: 'S001',
    name: 'Aditi Sharma',
    intervention: {
      type: 'Extra Class',
      details: { subject: 'Data Structures', schedule: 'Tue/Thu 4pm' },
      startDate: '2026-08-25',
    },
    baselineScore: 68,
    currentScore: 41,
    scoreDelta: -27,
    outcome: 'Improving',
    checkpointDate: '2026-09-15',
  },
  S003: {
    studentId: 'S003',
    name: 'Meera Joshi',
    intervention: {
      type: 'Extra Class',
      details: { subject: 'Discrete Mathematics', schedule: 'Mon/Wed 3pm' },
      startDate: '2026-08-30',
    },
    baselineScore: 55,
    currentScore: 48,
    scoreDelta: -7,
    outcome: 'Improving',
    checkpointDate: '2026-09-14',
  },
};
