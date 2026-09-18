"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser } from '@/views/LoginView';
import { StudentSummary, StudentDetail, UploadLog, MentorActionPayload, OutcomeComparisonData } from '@/lib/types';
import { computeRiskScore, generateFallbackExplanation, RawStudentData } from '@/lib/riskEngine';
import { buildSnapshot, planUploadRevert, affectedStudentIds } from '@/lib/uploadRevert';

interface SentinelContextType {
  authUser: AuthUser | null;
  role: 'mentor' | 'student';
  login: (user: AuthUser) => void;
  logout: () => void;
  students: StudentSummary[];
  setStudents: React.Dispatch<React.SetStateAction<StudentSummary[]>>;
  uploadHistory: UploadLog[];
  setUploadHistory: React.Dispatch<React.SetStateAction<UploadLog[]>>;
  detailsMap: Record<string, StudentDetail>;
  fetchStudentDetail: (id: string, opts?: { force?: boolean }) => Promise<StudentDetail | null>;
  handleDataUpload: (parsedData: any[], weekLabel: string, uploadType: import('@/lib/types').UploadType, fileName?: string) => Promise<{ success: boolean; updatedCount: number; skippedCount: number }>;
  handleClearAllData: () => void;
  handleDeleteUpload: (uploadedAt: string) => Promise<void>;
  handleInterventionAssigned: (payload: MentorActionPayload) => Promise<void>;
  handleResolveIntervention: (studentId: string) => Promise<void>;
  handleReopenIntervention: (studentId: string) => Promise<void>;
}

const SentinelContext = createContext<SentinelContextType | undefined>(undefined);

export function SentinelProvider({ children }: { children: React.ReactNode }) {
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

  const fetchStudentDetail = async (id: string, opts?: { force?: boolean }) => {
    if (!opts?.force && detailsMap[id]) return detailsMap[id];
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

  const handleDataUpload = async (parsedData: any[], weekLabel: string, uploadType: import('@/lib/types').UploadType, fileName?: string): Promise<{ success: boolean; updatedCount: number; skippedCount: number }> => {
    // The client-side detail cache is lazy — make sure we hold each affected
    // student's FULL record from the server before applying changes. Otherwise a
    // student we have never opened would be replaced by an empty stub, wiping
    // their attendance, grades and backlogs.
    const affectedIds = Array.from(new Set(
      parsedData
        .map(row => (typeof row?.studentId === 'string' ? row.studentId.trim() : ''))
        .filter(Boolean)
    ));

    const missingIds = affectedIds.filter(sid => !detailsMap[sid]);
    const preloaded: Record<string, StudentDetail> = {};
    if (missingIds.length > 0) {
      await Promise.all(missingIds.map(async (sid) => {
        try {
          const res = await fetch(`/api/students/${sid}`);
          if (!res.ok) return;
          const data = await res.json();
          if (data?.student) preloaded[sid] = data.student as StudentDetail;
        } catch {
          // Leave it missing — it will be treated as a brand-new student
        }
      }));
    }

    const newDetails = { ...detailsMap, ...preloaded };
    const newStudents = [...students];
    let updatedCount = 0;
    let skippedCount = 0;

    // Snapshot original state of each affected student BEFORE making changes
    // This allows clean revert when the upload is deleted
    const snapshots: Record<string, any> = {};

    parsedData.forEach(row => {
      const sid = row.studentId?.trim();
      if (!sid) { skippedCount++; return; }

      // Save snapshot of original state before any modifications
      if (newDetails[sid] && !snapshots[sid]) {
        snapshots[sid] = buildSnapshot(newDetails[sid]);
      }

      if (!newDetails[sid]) {
        const name = row.name?.trim() || sid;
        newDetails[sid] = {
          studentId: sid, name, department: row.department?.trim() || 'Computer Science', year: parseInt(row.year, 10) || 1,
          riskScore: 0, riskLevel: 'Low', contributingFactors: [], attendanceHistory: [], subjectAttendance: [], termTests: [], endSemResult: { status: 'Upcoming' }, lastSemResult: { score: 0, maxMarks: 0 }, aiExplanation: '', suggestedAction: 'Monitor', interventionStatus: 'None'
        };
        // Mark as created by this upload (no snapshot needed — delete will remove student)
        snapshots[sid] = null;
        if (!newStudents.find(s => s.studentId === sid)) {
          newStudents.push({ studentId: sid, name, department: newDetails[sid].department, year: newDetails[sid].year, riskScore: 0, riskLevel: 'Low', interventionStatus: 'None' });
        }
      }

      const existing = { ...newDetails[sid] };

      if (uploadType === 'WeeklyAttendance') {
        const att = parseFloat(row.attendance);
        // If CSV has its own "week" column (new overall format), prefer that over the UI-provided label
        const effectiveWeekLabel = row.week?.trim() || weekLabel;
        if (!isNaN(att)) {
          // Parse subject attendance columns from CSV (e.g., "DBMS_attendance", "CN_attendance")
          const subjectCols = Object.keys(row).filter(k => k.endsWith('_attendance'));
          const subjectBreakdown = subjectCols.map(k => ({
            subject: k.replace('_attendance', '').trim(),
            percentage: parseFloat(row[k])
          })).filter(s => !isNaN(s.percentage));

          // Merge with any existing subject data for this week
          const existingWeek = existing.attendanceHistory.find(h => h.week === effectiveWeekLabel);
          let mergedSubjects = subjectBreakdown;
          if (existingWeek?.subjects && existingWeek.subjects.length > 0) {
            mergedSubjects = [...existingWeek.subjects];
            for (const newSub of subjectBreakdown) {
              const idx = mergedSubjects.findIndex(s => s.subject === newSub.subject);
              if (idx !== -1) mergedSubjects[idx] = newSub;
              else mergedSubjects.push(newSub);
            }
          }

          const withoutThisWeek = existing.attendanceHistory.filter(h => h.week !== effectiveWeekLabel);
          existing.attendanceHistory = [...withoutThisWeek, {
            week: effectiveWeekLabel,
            percentage: att,
            subjects: mergedSubjects.length > 0 ? mergedSubjects : undefined,
          }];
          
          // Also update the top-level subjectAttendance with this latest data
          if (mergedSubjects.length > 0) {
            existing.subjectAttendance = mergedSubjects.map(sub => ({
              subject: sub.subject,
              week: effectiveWeekLabel,
              percentage: sub.percentage
            }));
          }
          const raw: RawStudentData = {
            studentId: sid, name: existing.name, department: existing.department, year: existing.year,
            attendanceHistory: existing.attendanceHistory, subjectAttendance: existing.subjectAttendance, termTests: existing.termTests,
            backlogs: existing.backlogCount || 0, backlogSubjects: existing.backlogSubjects || [], feeOverdueDays: existing.feeOverdueDays || 0,
            submissionRate: existing.submissionRate ?? (existing.contributingFactors.some(f => f.factor === 'Low Engagement') ? 45 : 70),
          };
          const result = computeRiskScore(raw);
          existing.riskScore = result.riskScore; existing.riskLevel = result.riskLevel; existing.contributingFactors = result.contributingFactors; existing.suggestedAction = result.suggestedAction;
          existing.aiExplanation = generateFallbackExplanation({ name: existing.name, department: existing.department, year: existing.year }, result);
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
            submissionRate: existing.submissionRate ?? (existing.contributingFactors.some(f => f.factor === 'Low Engagement') ? 45 : 70),
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
            submissionRate: existing.submissionRate ?? (existing.contributingFactors.some(f => f.factor === 'Low Engagement') ? 45 : 70),
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
            submissionRate: existing.submissionRate ?? (existing.contributingFactors.some(f => f.factor === 'Low Engagement') ? 45 : 70),
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
    }).catch(e => console.error('Student sync failed', e));    const newLog: UploadLog = {
      uploadedAt: new Date().toISOString(),
      fileName: fileName || `dataset_${uploadType}.csv`,
      week: weekLabel || 'Initial',
      type: uploadType,
      studentsUpdated: updatedCount,
      uploadedBy: 'Mentor',
      rawData: parsedData,
      snapshots: snapshots,
    } as unknown as UploadLog;
    
    setUploadHistory(prev => [newLog, ...prev]);
    fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newLog, rawData: parsedData, snapshots })
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
    const uploadLog = uploadHistory.find(log => log.uploadedAt === uploadedAt) ?? null;

    // ── 1. Work out the restored records for this upload ────────────────────
    let revertedStudents: StudentDetail[] = [];
    let removedIds: string[] = [];

    if (uploadLog && Array.isArray((uploadLog as any).rawData)) {
      // Load any student we do not hold yet, same as the upload path does
      const ids = affectedStudentIds(uploadLog);
      const preloaded: Record<string, StudentDetail> = {};
      await Promise.all(
        ids.filter(sid => !detailsMap[sid]).map(async (sid) => {
          try {
            const res = await fetch(`/api/students/${sid}`);
            if (!res.ok) return;
            const data = await res.json();
            if (data?.student) preloaded[sid] = data.student as StudentDetail;
          } catch {
            // Student may have been created by this very upload — it will be removed
          }
        })
      );

      const plan = planUploadRevert(uploadLog, { ...detailsMap, ...preloaded });
      revertedStudents = plan.updated;
      removedIds = plan.removedIds;
    }

    // ── 2. Push the restored records back through the students API ──────────
    // The client is the only writer the dashboard reads from, so this is what
    // makes the delete visible everywhere (dashboard, detail pages, outcomes).
    try {
      if (revertedStudents.length > 0) {
        await fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(revertedStudents),
        });
      }
      for (const sid of removedIds) {
        await fetch(`/api/students/${sid}`, { method: 'DELETE' });
      }
    } catch (e) {
      console.error('Failed to sync reverted students', e);
    }

    // ── 3. Delete the log itself ────────────────────────────────────────────
    try {
      await fetch(`/api/history?uploadedAt=${encodeURIComponent(uploadedAt)}`, { method: 'DELETE' });
    } catch (e) {
      console.error('Failed to delete upload log', e);
    }

    // ── 4. Refresh everything the UI reads from ─────────────────────────────
    setDetailsMap({});

    try {
      const studRes = await fetch('/api/students');
      if (studRes.ok) setStudents(await studRes.json());
    } catch (e) {
      console.error('Failed to refresh students after delete', e);
    }

    setUploadHistory(prev => prev.filter(log => log.uploadedAt !== uploadedAt));
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

    // Register the intervention server-side first: it is the authority for the
    // baseline risk score, so the outcome store and the student record can never
    // disagree about what "before" means.
    let baselineRiskScore = detailsMap[payload.studentId]?.riskScore;
    try {
      const res = await fetch('/api/interventions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (typeof data?.baselineRiskScore === 'number') {
        baselineRiskScore = data.baselineRiskScore;
      }
    } catch (e) {
      console.error('Failed to register intervention', e);
    }

    // Last resort only if the student is unknown to both the cache and the server
    const resolvedBaseline = baselineRiskScore ?? 0;

    const activeIntervention = {
      type: payload.type,
      details: payload.details,
      status: status,
      assignedDate: payload.startDate,
      baselineRiskScore: resolvedBaseline,
    };

    // Update local client state immediately
    setStudents(prev => prev.map(s => s.studentId === payload.studentId ? { ...s, interventionStatus: status as import('@/lib/types').InterventionStatus } : s));
    setDetailsMap(prev => ({
      ...prev,
      [payload.studentId]: {
        ...prev[payload.studentId],
        interventionStatus: status as import('@/lib/types').InterventionStatus,
        activeIntervention
      }
    }));

    // Persist the intervention (with its frozen baseline) on the student record
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

    // Close the intervention itself, not just the summary flag — otherwise the
    // outcome page and the student portal keep showing it as active.
    await fetch(`/api/interventions/${studentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Resolved' })
    }).catch((e) => console.error('Failed to resolve intervention', e));

    await fetch(`/api/students/${studentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        interventionStatus: 'Resolved',
        ...(detailsMap[studentId]?.activeIntervention
          ? { activeIntervention: { ...detailsMap[studentId]!.activeIntervention, status: 'Resolved' } }
          : {}),
      })
    }).catch((e) => console.error('Failed to update student record on resolve', e));
  };

  const handleReopenIntervention = async (studentId: string) => {
    setStudents(prev => prev.map(s => s.studentId === studentId ? { ...s, interventionStatus: 'Active' } : s));
    setDetailsMap(prev => {
      const existing = prev[studentId];
      if (!existing) return prev;
      return {
        ...prev,
        [studentId]: {
          ...existing,
          interventionStatus: 'Active',
          activeIntervention: existing.activeIntervention ? { ...existing.activeIntervention, status: 'Active' } : null
        }
      };
    });

    await fetch(`/api/interventions/${studentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Active' })
    }).catch((e) => console.error('Failed to reopen intervention', e));

    await fetch(`/api/students/${studentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        interventionStatus: 'Active',
        ...(detailsMap[studentId]?.activeIntervention
          ? { activeIntervention: { ...detailsMap[studentId]!.activeIntervention, status: 'Active' } }
          : {}),
      })
    }).catch((e) => console.error('Failed to update student record on reopen', e));
  };

  if (!isClient) return null;

  return (
    <SentinelContext.Provider value={{
      authUser, role, login, logout,
      students, setStudents,
      uploadHistory, setUploadHistory,
      detailsMap, fetchStudentDetail,
      handleDataUpload, handleClearAllData, handleDeleteUpload,
      handleInterventionAssigned, handleResolveIntervention, handleReopenIntervention
    }}>
      {children}
    </SentinelContext.Provider>
  );
}

export function useSentinel() {
  const context = useContext(SentinelContext);
  if (context === undefined) {
    throw new Error('useSentinel must be used within a SentinelProvider');
  }
  return context;
}
