/**
 * lib/types.ts — Shared types (identical to src/types.ts)
 */

export type RiskLevel = 'Low' | 'Medium' | 'High';
export type InterventionStatus = 'None' | 'Active' | 'Resolved';

export type ActionType =
  | 'Extra Class'
  | 'Counseling'
  | 'Financial Aid Referral'
  | 'Academic Support'
  | 'Parent/Guardian Notified'
  | 'Other';

export interface StudentSummary {
  studentId: string;
  name: string;
  department: string;
  year: number;
  riskScore: number;
  riskLevel: RiskLevel;
  interventionStatus: InterventionStatus;
}

export interface ContributingFactor {
  factor: string;
  points: number;
  reason: string;
}

export interface AttendanceHistoryItem {
  week: string;
  percentage: number;
}

export interface SubjectAttendanceItem {
  subject: string;
  week: string;
  percentage: number;
}

export interface TermTestItem {
  testName: string;
  score: number;
  maxMarks: number;
  date: string;
}

export interface SemesterResult {
  score?: number;
  maxMarks?: number;
  status?: "Upcoming" | "Completed";
}

export interface StudentDetail {
  studentId: string;
  name: string;
  department: string;
  year: number;
  riskScore: number;
  riskLevel: RiskLevel;
  interventionStatus?: InterventionStatus;
  activeIntervention?: StudentActiveIntervention | null;
  contributingFactors: ContributingFactor[];
  attendanceHistory: AttendanceHistoryItem[];
  subjectAttendance: SubjectAttendanceItem[];
  termTests: TermTestItem[];
  endSemResult: SemesterResult;
  lastSemResult: SemesterResult;
  backlogCount?: number;
  backlogSubjects?: string[];
  feeStatus?: string;
  feeOverdueDays?: number;
  aiExplanation: string;
  suggestedAction: string;
}

export interface InterventionDetails {
  subject?: string;
  schedule?: string;
  instructor?: string;
  [key: string]: unknown;
}

export interface MentorActionPayload {
  studentId: string;
  type: ActionType;
  details: InterventionDetails;
  notes: string;
  assignedBy: string;
  startDate: string;
}

export interface StudentActiveIntervention {
  type: string;
  details: {
    subject?: string;
    schedule?: string;
    instructor?: string;
    [key: string]: unknown;
  };
  status: string;
  assignedDate: string;
}

export interface StudentStatusData {
  studentId: string;
  name: string;
  activeIntervention?: StudentActiveIntervention | null;
}

export interface OutcomeComparisonData {
  studentId: string;
  name: string;
  intervention: {
    type: string;
    details: {
      subject?: string;
      schedule?: string;
      instructor?: string;
      [key: string]: unknown;
    };
    startDate: string;
  };
  baselineScore: number;
  currentScore: number;
  scoreDelta: number;
  outcome: 'Improving' | 'No Change' | 'Worsening';
  checkpointDate: string;
}

export type UploadType = 'WeeklyAttendance' | 'SubjectAttendance' | 'UnitTest1' | 'UnitTest2' | 'Backlogs' | 'FeeStatus';

export interface UploadLog {
  id?: string;
  week: string;
  type: UploadType;
  uploadedAt: string;
  studentsUpdated: number;
  uploadedBy: string;
  rawData?: any[];
  fileName?: string;
}
