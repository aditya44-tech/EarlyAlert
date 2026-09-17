"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser } from '@/views/LoginView';
import { StudentSummary, StudentDetail, UploadLog, MentorActionPayload, OutcomeComparisonData } from '@/lib/types';
import { computeRiskScore, generateFallbackExplanation, RawStudentData } from '@/lib/riskEngine';

interface EarlyAlertContextType {
  authUser: AuthUser | null;
  role: 'mentor' | 'student';
  login: (user: AuthUser) => void;
  logout: () => void;
  students: StudentSummary[];
  setStudents: React.Dispatch<React.SetStateAction<StudentSummary[]>>;
  uploadHistory: UploadLog[];
  setUploadHistory: React.Dispatch<React.SetStateAction<UploadLog[]>>;
  detailsMap: Record<string, StudentDetail>;
  fetchStudentDetail: (id: string) => Promise<StudentDetail | null>;
  handleDataUpload: (parsedData: any[], weekLabel: string, uploadType: import('@/lib/types').UploadType, fileName?: string) => { success: boolean; updatedCount: number; skippedCount: number };
  handleClearAllData: () => void;
  handleDeleteUpload: (uploadedAt: string) => void;
  handleInterventionAssigned: (payload: MentorActionPayload) => Promise<void>;
  handleResolveIntervention: (studentId: string) => Promise<void>;
}

const EarlyAlertContext = createContext<EarlyAlertContextType | undefined>(undefined);

export function EarlyAlertProvider({ children }: { children: React.ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<'mentor' | 'student'>('mentor');
  
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [uploadHistory, setUploadHistory] = useState<UploadLog[]>([]);
  const [detailsMap, setDetailsMap] = useState<Record<string, StudentDetail>>({});

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    try {
      const savedAuth = localStorage.getItem('ea_authUser');
      if (savedAuth) {
        const u = JSON.parse(savedAuth);
        setAuthUser(u);
        setRole(u.role === 'student' ? 'student' : 'mentor');
      }
    } catch {}

    const fetchData = async () => {
      try {
        const [histRes, studRes] = await Promise.all([
          fetch('/api/history'),
          fetch('/api/students')
        ]);
        if (histRes.ok) setUploadHistory(await histRes.json());
        if (studRes.ok) setStudents(await studRes.json());
      } catch (e) {
        console.error("Failed to fetch data from DB", e);
      }
    };
    fetchData();
  }, []);

  const login = (user: AuthUser) => {
    setAuthUser(user);
    setRole(user.role === 'student' ? 'student' : 'mentor');
    localStorage.setItem('ea_authUser', JSON.stringify(user));
  };

  const logout = () => {
    setAuthUser(null);
    setRole('mentor');
    localStorage.removeItem('ea_authUser');
  };

  const fetchStudentDetail = async (id: string) => {
    if (detailsMap[id]) return detailsMap[id];
    try {
      const res = await fetch(`/api/students/${id}`);
      const data = await res.json();
      if (data.student) {
        setDetailsMap(prev => ({ ...prev, [id]: data.student }));
        return data.student as StudentDetail;
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  };

  const handleDataUpload = (parsedData: any[], weekLabel: string, uploadType: import('@/lib/types').UploadType, fileName?: string): { success: boolean; updatedCount: number; skippedCount: number } => {
    const newDetails = { ...detailsMap };
    const newStudents = [...students];
    let updatedCount = 0;
    let skippedCount = 0;

    parsedData.forEach(row => {
      const sid = row.studentId?.trim();
      if (!sid) { skippedCount++; return; }

      if (!newDetails[sid]) {
        const name = row.name?.trim() || sid;
        newDetails[sid] = {
          studentId: sid, name, department: row.department?.trim() || 'Computer Science', year: parseInt(row.year, 10) || 1,
          riskScore: 0, riskLevel: 'Low', contributingFactors: [], attendanceHistory: [], subjectAttendance: [], termTests: [], endSemResult: { status: 'Upcoming' }, lastSemResult: { score: 0, maxMarks: 0 }, aiExplanation: '', suggestedAction: 'Monitor', interventionStatus: 'None'
        };
        if (!newStudents.find(s => s.studentId === sid)) {
          newStudents.push({ studentId: sid, name, department: newDetails[sid].department, year: newDetails[sid].year, riskScore: 0, riskLevel: 'Low', interventionStatus: 'None' });
        }
      }

      const existing = { ...newDetails[sid] };

      if (uploadType === 'WeeklyAttendance') {
        const att = parseFloat(row.attendance);
        if (!isNaN(att)) {
          existing.attendanceHistory = [...existing.attendanceHistory, { week: weekLabel, percentage: att }];
          const raw: RawStudentData = {
            studentId: sid, name: existing.name, department: existing.department, year: existing.year,
            attendanceHistory: existing.attendanceHistory, subjectAttendance: existing.subjectAttendance, termTests: existing.termTests,
            backlogs: existing.backlogCount || 0, backlogSubjects: existing.backlogSubjects || [], feeOverdueDays: existing.feeOverdueDays || 0,
            submissionRate: existing.contributingFactors.find(f => f.factor === 'Low Engagement') ? 45 : 70,
          };
          const result = computeRiskScore(raw);
          existing.riskScore = result.riskScore; existing.riskLevel = result.riskLevel; existing.contributingFactors = result.contributingFactors; existing.suggestedAction = result.suggestedAction;
          existing.aiExplanation = generateFallbackExplanation({ name: existing.name, department: existing.department, year: existing.year }, result);
        }
      } else if (uploadType === 'SubjectAttendance') {
        const subs = Object.keys(row).filter(k => k.endsWith('_attendance'));
        const newSubjects = subs.map(k => ({
          subject: k.replace('_attendance', '').trim(),
          week: weekLabel,
          percentage: parseFloat(row[k])
        })).filter(s => !isNaN(s.percentage));
        
        if (newSubjects.length > 0) {
          existing.subjectAttendance = newSubjects;
        }
      } else if (uploadType === 'UnitTest1' || uploadType === 'UnitTest2') {
        const score = parseFloat(row.score);
        const maxMarks = parseFloat(row.maxMarks) || 100;
        const date = row.date || new Date().toISOString().split('T')[0];
        
        if (!isNaN(score)) {
          const testName = uploadType === 'UnitTest1' ? 'Unit Test 1' : 'Unit Test 2';
          const filteredTests = existing.termTests.filter(t => t.testName !== testName);
          existing.termTests = [...filteredTests, { testName, score, maxMarks, date }];
          
          const raw: RawStudentData = {
            studentId: sid, name: existing.name, department: existing.department, year: existing.year,
            attendanceHistory: existing.attendanceHistory, subjectAttendance: existing.subjectAttendance, termTests: existing.termTests,
            backlogs: existing.backlogCount || 0, backlogSubjects: existing.backlogSubjects || [], feeOverdueDays: existing.feeOverdueDays || 0,
            submissionRate: existing.contributingFactors.find(f => f.factor === 'Low Engagement') ? 45 : 70,
          };
          const result = computeRiskScore(raw);
          existing.riskScore = result.riskScore; existing.riskLevel = result.riskLevel; existing.contributingFactors = result.contributingFactors; existing.suggestedAction = result.suggestedAction;
          existing.aiExplanation = generateFallbackExplanation({ name: existing.name, department: existing.department, year: existing.year }, result);
        }
      } else if (uploadType === 'FeeStatus') {
        const overdue = parseInt(row.overdueDays || '0', 10);
        if (!isNaN(overdue)) {
          existing.feeOverdueDays = overdue;
          existing.feeStatus = row.feeStatus;
          const raw: RawStudentData = {
            studentId: sid, name: existing.name, department: existing.department, year: existing.year,
            attendanceHistory: existing.attendanceHistory, subjectAttendance: existing.subjectAttendance, termTests: existing.termTests,
            backlogs: existing.backlogCount || 0, backlogSubjects: existing.backlogSubjects || [], feeOverdueDays: overdue,
            submissionRate: existing.contributingFactors.find(f => f.factor === 'Low Engagement') ? 45 : 70,
          };
          const result = computeRiskScore(raw);
          existing.riskScore = result.riskScore; existing.riskLevel = result.riskLevel; existing.contributingFactors = result.contributingFactors; existing.suggestedAction = result.suggestedAction;
          existing.aiExplanation = generateFallbackExplanation({ name: existing.name, department: existing.department, year: existing.year }, result);
        }
      } else if (uploadType === 'Backlogs') {
        const count = parseInt(row.backlogCount || '0', 10);
        const subjects = row.backlogSubjects ? row.backlogSubjects.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean) : [];
        if (!isNaN(count)) {
          existing.backlogCount = count;
          existing.backlogSubjects = subjects;
          const raw: RawStudentData = {
            studentId: sid, name: existing.name, department: existing.department, year: existing.year,
            attendanceHistory: existing.attendanceHistory, subjectAttendance: existing.subjectAttendance, termTests: existing.termTests,
            backlogs: count, backlogSubjects: subjects, feeOverdueDays: existing.feeOverdueDays || 0,
            submissionRate: existing.contributingFactors.find(f => f.factor === 'Low Engagement') ? 45 : 70,
          };
          const result = computeRiskScore(raw);
          existing.riskScore = result.riskScore; existing.riskLevel = result.riskLevel; existing.contributingFactors = result.contributingFactors; existing.suggestedAction = result.suggestedAction;
          existing.aiExplanation = generateFallbackExplanation({ name: existing.name, department: existing.department, year: existing.year }, result);
        }
      } else if (uploadType === 'LastSemResult') {
        const score = parseFloat(row.score || row.marks || '0');
        const maxMarks = parseFloat(row.maxMarks || '100');
        if (!isNaN(score)) {
          existing.lastSemResult = { score, maxMarks };
        }
      } else if (uploadType === 'EndSemResult') {
        const scoreStr = row.score || row.marks || '';
        const statusStr = row.status || (scoreStr ? 'Completed' : 'Upcoming');
        if (statusStr === 'Upcoming' || scoreStr === '' || scoreStr?.toLowerCase() === 'upcoming') {
          existing.endSemResult = { status: 'Upcoming' };
        } else {
          const score = parseFloat(scoreStr);
          const maxMarks = parseFloat(row.maxMarks || '100');
          existing.endSemResult = { score: isNaN(score) ? undefined : score, maxMarks, status: 'Completed' };
        }
      }

      newDetails[sid] = existing;
      const summaryIdx = newStudents.findIndex(s => s.studentId === sid);
      if (summaryIdx !== -1) {
        newStudents[summaryIdx] = { ...newStudents[summaryIdx], riskScore: existing.riskScore, riskLevel: existing.riskLevel };
      }
      updatedCount++;
    });

    setDetailsMap(newDetails);
    setStudents(newStudents);  // update dashboard immediately

    // Server Sync (fire and forget)
    const studentsArray = Object.values(newDetails);
    fetch('/api/students', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(studentsArray)
    }).catch(e => console.error('Student sync failed', e));

    const newLog: UploadLog = {
      uploadedAt: new Date().toISOString(),
      fileName: fileName || `dataset_${uploadType}.csv`,
      week: weekLabel || 'Initial',
      type: uploadType,
      studentsUpdated: updatedCount,
      uploadedBy: 'Mentor',
      rawData: parsedData,
    } as unknown as UploadLog;
    
    setUploadHistory(prev => [newLog, ...prev]);
    fetch('/api/history', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newLog, rawData: parsedData })
    }).catch(e => console.error('History sync failed', e));

    return { success: true, updatedCount, skippedCount };
  };

  const handleClearAllData = async () => {
    setStudents([]);
    setDetailsMap({});
    setUploadHistory([]);
    await fetch('/api/students', { method: 'DELETE' });
    await fetch('/api/history', { method: 'DELETE' });
  };

  const handleDeleteUpload = async (uploadedAt: string) => {
    const res = await fetch(`/api/history?uploadedAt=${encodeURIComponent(uploadedAt)}`, { method: 'DELETE' });
    if (res.ok) {
      setUploadHistory(prev => prev.filter(log => log.uploadedAt !== uploadedAt));
    }
  };

  const handleInterventionAssigned = async (payload: MentorActionPayload) => {
    const status = payload.status || 'Active';

    if (status === 'Notified') {
      // Parent/Guardian Notified is a timestamped log only.
      await fetch(`/api/students/${payload.studentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationLog: payload })
      });
      return;
    }

    const activeIntervention = {
      type: payload.type,
      details: payload.details,
      status: status,
      assignedDate: payload.startDate,
    };

    setStudents(prev => prev.map(s => s.studentId === payload.studentId ? { ...s, interventionStatus: status as import('@/lib/types').InterventionStatus } : s));
    setDetailsMap(prev => ({
      ...prev,
      [payload.studentId]: {
        ...prev[payload.studentId],
        interventionStatus: status as import('@/lib/types').InterventionStatus,
        activeIntervention
      }
    }));

    await fetch(`/api/students/${payload.studentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interventionStatus: status, activeIntervention })
    });
  };

  const handleResolveIntervention = async (studentId: string) => {
    setStudents(prev => prev.map(s => s.studentId === studentId ? { ...s, interventionStatus: 'Resolved' } : s));
    setDetailsMap(prev => {
      const existing = prev[studentId];
      if (!existing) return prev;
      return {
        ...prev,
        [studentId]: {
          ...existing,
          interventionStatus: 'Resolved',
          activeIntervention: existing.activeIntervention ? { ...existing.activeIntervention, status: 'Resolved' } : null
        }
      };
    });

    await fetch(`/api/students/${studentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interventionStatus: 'Resolved' })
    });
  };

  if (!isClient) return null;

  return (
    <EarlyAlertContext.Provider value={{
      authUser, role, login, logout,
      students, setStudents,
      uploadHistory, setUploadHistory,
      detailsMap, fetchStudentDetail,
      handleDataUpload, handleClearAllData, handleDeleteUpload,
      handleInterventionAssigned, handleResolveIntervention
    }}>
      {children}
    </EarlyAlertContext.Provider>
  );
}

export function useEarlyAlert() {
  const context = useContext(EarlyAlertContext);
  if (context === undefined) {
    throw new Error('useEarlyAlert must be used within an EarlyAlertProvider');
  }
  return context;
}
