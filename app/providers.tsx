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
  handleDataUpload: (parsedData: any[], weekLabel: string, uploadType: 'overall' | 'fee' | 'backlog' | 'subject_wise', fileName?: string) => void;
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

  const handleDataUpload = async (parsedData: any[], weekLabel: string, uploadType: 'overall' | 'fee' | 'backlog' | 'subject_wise', fileName?: string) => {
    const newDetails = { ...detailsMap };
    const newStudents = [...students];
    let updatedCount = 0;

    parsedData.forEach(row => {
      const sid = row.studentId?.trim();
      if (!sid) return;

      if (!newDetails[sid]) {
        const name = row.name?.trim() || sid;
        newDetails[sid] = {
          studentId: sid, name, department: row.department?.trim() || 'Computer Science', year: parseInt(row.year, 10) || 1,
          riskScore: 0, riskLevel: 'Low', contributingFactors: [], attendanceHistory: [], gradeHistory: [], aiExplanation: '', suggestedAction: 'Monitor',
        };
        if (!newStudents.find(s => s.studentId === sid)) {
          newStudents.push({ studentId: sid, name, department: newDetails[sid].department, year: newDetails[sid].year, riskScore: 0, riskLevel: 'Low', interventionStatus: 'None' });
        }
      }

      const existing = { ...newDetails[sid] };

      if (uploadType === 'overall') {
        const att = parseFloat(row.attendance);
        const score = parseFloat(row.testScore);
        if (!isNaN(att) && !isNaN(score)) {
          existing.attendanceHistory = [...existing.attendanceHistory, { week: weekLabel, percentage: att }];
          existing.gradeHistory = [...existing.gradeHistory, { test: weekLabel, score }];
        }
      } else if (uploadType === 'fee') {
        const overdue = parseInt(row.overdueDays || '0', 10);
        if (!isNaN(overdue)) {
          existing.contributingFactors = existing.contributingFactors.filter(f => f.factor !== 'Fee Overdue');
          const raw: RawStudentData = {
            studentId: sid, name: existing.name, department: existing.department, year: existing.year,
            attendanceHistory: existing.attendanceHistory, gradeHistory: existing.gradeHistory,
            backlogs: existing.contributingFactors.find(f => f.factor === 'Backlogs')?.points ? Math.round((existing.contributingFactors.find(f => f.factor === 'Backlogs')?.points ?? 0) / 6.5) : 0,
            backlogSubjects: [], feeOverdueDays: overdue,
            submissionRate: existing.contributingFactors.find(f => f.factor === 'Low Engagement') ? 45 : 70,
          };
          const result = computeRiskScore(raw);
          existing.riskScore = result.riskScore; existing.riskLevel = result.riskLevel; existing.contributingFactors = result.contributingFactors; existing.suggestedAction = result.suggestedAction;
          existing.aiExplanation = generateFallbackExplanation({ name: existing.name, department: existing.department, year: existing.year }, result);
        }
      } else if (uploadType === 'backlog') {
        const count = parseInt(row.backlogCount || '0', 10);
        if (!isNaN(count)) {
          existing.contributingFactors = existing.contributingFactors.filter(f => f.factor !== 'Backlogs');
          const raw: RawStudentData = {
            studentId: sid, name: existing.name, department: existing.department, year: existing.year,
            attendanceHistory: existing.attendanceHistory, gradeHistory: existing.gradeHistory,
            backlogs: count, backlogSubjects: [], feeOverdueDays: existing.contributingFactors.find(f => f.factor === 'Fee Overdue') ? 45 : 0,
            submissionRate: 70,
          };
          const result = computeRiskScore(raw);
          existing.riskScore = result.riskScore; existing.riskLevel = result.riskLevel; existing.contributingFactors = result.contributingFactors; existing.suggestedAction = result.suggestedAction;
          existing.aiExplanation = generateFallbackExplanation({ name: existing.name, department: existing.department, year: existing.year }, result);
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
    
    // Server Sync
    fetch('/api/students', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students: Object.values(newDetails) })
    }).then(() => {
      fetch('/api/students').then(r => r.json()).then(setStudents);
    });

    const newLog: UploadLog = {
      uploadedAt: new Date().toISOString(),
      fileName: fileName || `dataset_${uploadType}.csv`,
      dataType: uploadType === 'overall' ? 'Attendance & Grades' : uploadType === 'fee' ? 'Fee Defaulters' : 'Backlog Data',
      recordsProcessed: updatedCount,
      status: 'Success'
    };
    
    setUploadHistory(prev => [newLog, ...prev]);
    fetch('/api/history', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLog)
    });
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
    const activeIntervention = {
      type: payload.type,
      details: payload.details,
      status: 'Active',
      assignedDate: payload.startDate,
    };

    setStudents(prev => prev.map(s => s.studentId === payload.studentId ? { ...s, interventionStatus: 'Active' } : s));
    setDetailsMap(prev => ({
      ...prev,
      [payload.studentId]: {
        ...prev[payload.studentId],
        interventionStatus: 'Active',
        activeIntervention
      }
    }));

    await fetch(`/api/students/${payload.studentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interventionStatus: 'Active', activeIntervention })
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
