"use client";

import React, { useState, useEffect } from 'react';

import {
  StudentSummary,
  StudentDetail,
  StudentStatusData,
  OutcomeComparisonData,
  MentorActionPayload,
  UploadLog,
} from '@/lib/types';
import { computeRiskScore, generateFallbackExplanation, RawStudentData } from '@/lib/riskEngine';

import { DashboardView } from '@/views/DashboardView';
import { StudentDetailView } from '@/views/StudentDetailView';
import { MentorActionPanel } from '@/views/MentorActionPanel';
import { StudentFacingStatusView } from '@/views/StudentFacingStatusView';
import { OutcomeComparisonView } from '@/views/OutcomeComparisonView';
import { LoginView, AuthUser } from '@/views/LoginView';
import {
  ShieldAlert,
  GraduationCap,
  LayoutDashboard,
  UserCheck,
  User,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  LogOut,
} from 'lucide-react';

type ScreenKey = 'dashboard' | 'detail' | 'action' | 'student-view' | 'outcome';
type Role = 'mentor' | 'student';

export default function App() {
  // Application Data States
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [detailsMap, setDetailsMap] = useState<Record<string, StudentDetail>>({});
  const [uploadHistory, setUploadHistory] = useState<UploadLog[]>([]);
  const [studentStatusData, setStudentStatusData] = useState<Record<string, StudentStatusData>>({});
  const [outcomeDataMap, setOutcomeDataMap] = useState<Record<string, OutcomeComparisonData>>({});

  const [isClient, setIsClient] = useState(false);

  // Load from MongoDB on mount
  useEffect(() => {
    setIsClient(true);
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

  // Lazy load student details when selected
  useEffect(() => {
    if (selectedStudentId && !detailsMap[selectedStudentId]) {
      fetch(`/api/students/${selectedStudentId}`)
        .then(res => res.json())
        .then(data => {
          if (data.student) {
            setDetailsMap(prev => ({ ...prev, [selectedStudentId]: data.student }));
          }
        })
        .catch(console.error);
    }
  }, [selectedStudentId]);

  // Auth State
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  // Active Role and Navigation Screen
  const [role, setRole] = useState<Role>('mentor');
  const [currentScreen, setCurrentScreen] = useState<ScreenKey>('dashboard');

  const handleLogin = (user: AuthUser) => {
    setAuthUser(user);
    if (user.role === 'student') {
      setRole('student');
      setSelectedStudentId(user.studentId);
      setCurrentScreen('student-view');
    } else {
      setRole('mentor');
      setCurrentScreen('dashboard');
    }
  };

  const handleLogout = () => {
    setAuthUser(null);
    setRole('mentor');
    setCurrentScreen('dashboard');
    setSelectedStudentId('');
  };

  // Active selected student detail
  const currentDetail: StudentDetail | null =
    detailsMap[selectedStudentId] || null;

  // Active student status view data
  const currentStudentStatus: StudentStatusData =
    studentStatusData[selectedStudentId] || {
      studentId: selectedStudentId,
      name: currentDetail?.name ?? '',
      activeIntervention: null,
    };

  // Active outcome comparison data
  const currentOutcome: OutcomeComparisonData =
    outcomeDataMap[selectedStudentId] || {
      studentId: selectedStudentId,
      name: currentDetail?.name ?? '',
      intervention: {
        type: currentDetail?.suggestedAction?.split('/')[0]?.trim() ?? 'Monitor',
        details: { subject: 'Academic Support Session', schedule: 'Weekly 4pm' },
        startDate: '2026-09-01',
      },
      baselineScore: currentDetail?.riskScore ?? 0,
      currentScore: Math.max(10, (currentDetail?.riskScore ?? 0) - 20),
      scoreDelta: -20,
      outcome: 'Improving',
      checkpointDate: '2026-09-15',
    };

  // CSV Upload Handler — uses the deterministic risk engine for consistent scoring
  const handleDataUpload = (parsedData: any[], weekLabel: string, uploadType: 'overall' | 'fee' | 'backlog' | 'subject_wise', fileName?: string) => {
    let updatedCount = 0;
    let skippedCount = 0;

    const newDetails = { ...detailsMap };
    const newStudents = [...students];

    parsedData.forEach(row => {
      const sid = row.studentId?.trim();
      if (!sid) { skippedCount++; return; }

      // Ensure student entry exists
      if (!newDetails[sid]) {
        const name = row.name?.trim() || sid;
        const department = row.department?.trim() || 'Computer Science';
        const year = parseInt(row.year, 10) || 1;

        newDetails[sid] = {
          studentId: sid, name, department, year,
          riskScore: 0, riskLevel: 'Low',
          contributingFactors: [],
          attendanceHistory: [],
          gradeHistory: [],
          aiExplanation: '',
          suggestedAction: 'Monitor',
        };
        if (!newStudents.find(s => s.studentId === sid)) {
          newStudents.push({ studentId: sid, name, department, year, riskScore: 0, riskLevel: 'Low', interventionStatus: 'None' });
        }
      }

      const existing = { ...newDetails[sid] };

      // Mutate the history based on upload type
      if (uploadType === 'overall') {
        const att = parseFloat(row.attendance);
        const score = parseFloat(row.testScore);
        if (isNaN(att) || isNaN(score)) { skippedCount++; return; }
        existing.attendanceHistory = [...existing.attendanceHistory, { week: weekLabel, percentage: att }];
        existing.gradeHistory = [...existing.gradeHistory, { test: weekLabel, score }];

      } else if (uploadType === 'fee') {
        const overdue = parseInt(row.overdueDays || '0', 10);
        if (isNaN(overdue)) { skippedCount++; return; }
        // Store overdue in a synthetic contributing factor for engine input reconstruction
        existing.contributingFactors = existing.contributingFactors.filter(f => f.factor !== 'Fee Overdue');
        // We encode it for the engine via a sentinel attendance entry (not shown) —
        // instead we directly recompute via a raw object:
        const feeOverdueDays = overdue;
        const raw: RawStudentData = {
          studentId: sid,
          name: existing.name,
          department: existing.department,
          year: existing.year,
          attendanceHistory: existing.attendanceHistory,
          gradeHistory: existing.gradeHistory,
          backlogs: existing.contributingFactors.find(f => f.factor === 'Backlogs')?.points
            ? Math.round((existing.contributingFactors.find(f => f.factor === 'Backlogs')?.points ?? 0) / 6.5)
            : 0,
          backlogSubjects: [],
          feeOverdueDays,
          submissionRate: existing.contributingFactors.find(f => f.factor === 'Low Engagement') ? 45 : 70,
        };
        const result = computeRiskScore(raw);
        existing.riskScore = result.riskScore;
        existing.riskLevel = result.riskLevel;
        existing.contributingFactors = result.contributingFactors;
        existing.suggestedAction = result.suggestedAction;
        existing.aiExplanation = generateFallbackExplanation({ name: existing.name, department: existing.department, year: existing.year }, result);
        newDetails[sid] = existing;
        const summaryIdx = newStudents.findIndex(s => s.studentId === sid);
        if (summaryIdx !== -1) {
          newStudents[summaryIdx] = { ...newStudents[summaryIdx], riskScore: result.riskScore, riskLevel: result.riskLevel };
        }
        updatedCount++;
        return;

      } else if (uploadType === 'backlog') {
        const backlogs = parseInt(row.backlogCount || '0', 10);
        const subjects = row.backlogSubjects ? String(row.backlogSubjects).split(';').map((s: string) => s.trim()).filter(Boolean) : [];
        if (isNaN(backlogs)) { skippedCount++; return; }
        const raw: RawStudentData = {
          studentId: sid,
          name: existing.name,
          department: existing.department,
          year: existing.year,
          attendanceHistory: existing.attendanceHistory,
          gradeHistory: existing.gradeHistory,
          backlogs,
          backlogSubjects: subjects,
          feeOverdueDays: existing.contributingFactors.find(f => f.factor === 'Fee Overdue') ? 15 : 0,
          submissionRate: existing.contributingFactors.find(f => f.factor === 'Low Engagement') ? 45 : 70,
        };
        const result = computeRiskScore(raw);
        existing.riskScore = result.riskScore;
        existing.riskLevel = result.riskLevel;
        existing.contributingFactors = result.contributingFactors;
        existing.suggestedAction = result.suggestedAction;
        existing.aiExplanation = generateFallbackExplanation({ name: existing.name, department: existing.department, year: existing.year }, result);
        newDetails[sid] = existing;
        const summaryIdx = newStudents.findIndex(s => s.studentId === sid);
        if (summaryIdx !== -1) {
          newStudents[summaryIdx] = { ...newStudents[summaryIdx], riskScore: result.riskScore, riskLevel: result.riskLevel };
        }
        updatedCount++;
        return;

      } else if (uploadType === 'subject_wise') {
        // Subject-wise scores: add to grade history with average
        const subjectCols = Object.keys(row).filter(k => k !== 'studentId' && k !== 'name' && k !== 'department' && k !== 'year' && k !== 'week');
        const scores = subjectCols.map(k => parseFloat(row[k])).filter(v => !isNaN(v));
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 70;
        existing.gradeHistory = [...existing.gradeHistory, { test: `${weekLabel} (Subject)`, score: avgScore }];
      }

      // Run the full engine after 'overall' or 'subject_wise' history update
      const raw: RawStudentData = {
        studentId: sid,
        name: existing.name,
        department: existing.department,
        year: existing.year,
        attendanceHistory: existing.attendanceHistory,
        gradeHistory: existing.gradeHistory,
        backlogs: existing.contributingFactors.find(f => f.factor === 'Backlogs')?.points
          ? Math.max(1, Math.round((existing.contributingFactors.find(f => f.factor === 'Backlogs')?.points ?? 0) / 6.5))
          : 0,
        backlogSubjects: [],
        feeOverdueDays: existing.contributingFactors.find(f => f.factor === 'Fee Overdue') ? 15 : 0,
        submissionRate: existing.contributingFactors.find(f => f.factor === 'Low Engagement') ? 45 : 70,
      };
      const result = computeRiskScore(raw);

      existing.riskScore = result.riskScore;
      existing.riskLevel = result.riskLevel;
      existing.contributingFactors = result.contributingFactors;
      existing.suggestedAction = result.suggestedAction;
      existing.aiExplanation = generateFallbackExplanation(
        { name: existing.name, department: existing.department, year: existing.year },
        result
      );

      newDetails[sid] = existing;

      const summaryIdx = newStudents.findIndex(s => s.studentId === sid);
      if (summaryIdx !== -1) {
        newStudents[summaryIdx] = { ...newStudents[summaryIdx], riskScore: result.riskScore, riskLevel: result.riskLevel };
      }
      updatedCount++;
    });

    setDetailsMap(newDetails);
    setStudents(newStudents);

    // Save batch to MongoDB
    fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.values(newDetails).filter(d => parsedData.some(r => r.studentId === d.studentId)))
    }).catch(console.error);

    if (updatedCount > 0) {
      const log: UploadLog = {
        id: `upload-${Date.now()}`,
        week: weekLabel,
        type: uploadType,
        uploadedAt: new Date().toISOString(),
        studentsUpdated: updatedCount,
        uploadedBy: 'System',
        rawData: parsedData,
        fileName: fileName,
      };
      
      fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...log, date: log.uploadedAt, recordsProcessed: updatedCount })
      }).catch(console.error);

      setUploadHistory(prev => [log, ...prev]);
    }

    return { success: true, updatedCount, skippedCount };
  };




  const handleClearAllData = async () => {
    if (confirm('Are you sure you want to reset all data to the initial state? This cannot be undone.')) {
      await fetch('/api/students', { method: 'DELETE' });
      await fetch('/api/history', { method: 'DELETE' });
      setStudents([]);
      setDetailsMap({});
      setUploadHistory([]);
      setStudentStatusData({});
      setOutcomeDataMap({});
    }
  };

  const handleDeleteUpload = async (uploadedAt: string) => {
    if (confirm('Delete this upload log?')) {
      const log = uploadHistory.find(l => l.uploadedAt === uploadedAt);
      if (log?.id) {
        await fetch(`/api/history?id=${log.id}`, { method: 'DELETE' });
      }
      setUploadHistory(prev => prev.filter(log => log.uploadedAt !== uploadedAt));
    }
  };

  // Navigation handlers
  const handleSelectStudent = (studentId: string) => {
    setSelectedStudentId(studentId);
    setCurrentScreen('detail');
  };

  const handleOpenActionPanel = (studentId: string) => {
    setSelectedStudentId(studentId);
    setCurrentScreen('action');
  };

  const handleOpenOutcome = (studentId: string) => {
    setSelectedStudentId(studentId);
    setCurrentScreen('outcome');
  };

  // Assign intervention submission handler
  const handleInterventionAssigned = async (payload: MentorActionPayload) => {
    const activeIntervention = {
      type: payload.type,
      details: payload.details,
      status: 'Active',
      assignedDate: payload.startDate,
    };

    // Optimistic UI Updates
    setStudents((prev) =>
      prev.map((s) => s.studentId === payload.studentId ? { ...s, interventionStatus: 'Active' } : s)
    );
    setDetailsMap(prev => ({
      ...prev,
      [payload.studentId]: {
        ...prev[payload.studentId],
        interventionStatus: 'Active',
        activeIntervention
      }
    }));
    setStudentStatusData((prev) => ({
      ...prev,
      [payload.studentId]: {
        studentId: payload.studentId,
        name: currentDetail?.name ?? '',
        activeIntervention
      },
    }));

    // Update MongoDB
    await fetch(`/api/students/${payload.studentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        interventionStatus: 'Active',
        activeIntervention
      })
    });
  };

  // Mark resolved handler for Screen 5
  const handleResolveIntervention = async (studentId: string) => {
    setStudents((prev) =>
      prev.map((s) => s.studentId === studentId ? { ...s, interventionStatus: 'Resolved' } : s)
    );

    setDetailsMap(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        interventionStatus: 'Resolved',
        activeIntervention: prev[studentId]?.activeIntervention 
          ? { ...prev[studentId].activeIntervention!, status: 'Resolved' }
          : undefined
      }
    }));

    await fetch(`/api/students/${studentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        interventionStatus: 'Resolved',
        'activeIntervention.status': 'Resolved'
      })
    });
  };

  // Check if current student has active or past intervention
  const hasIntervention =
    Boolean(studentStatusData[selectedStudentId]?.activeIntervention) ||
    Boolean(outcomeDataMap[selectedStudentId]) ||
    students.find((s) => s.studentId === selectedStudentId)?.interventionStatus !== 'None';

  if (!isClient) return null; // Avoid hydration mismatch

  if (!authUser) {
    return <LoginView students={students.map(s => ({ studentId: s.studentId, name: s.name }))} onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8] text-[#0D0D0D] flex flex-col font-sans">
      {/* Top System Header */}
      <header className="bg-[#0D0D0D] text-white border-b-4 border-[#0D0D0D] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Logo / Brand */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#D62828] text-white flex items-center justify-center font-black text-xl border-2 border-white shadow-[2px_2px_0px_#FFFFFF]">
                EA
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-lg md:text-xl tracking-tight uppercase">
                    EarlyAlert
                  </span>
                  <span className="px-1.5 py-0.2 bg-[#D62828] text-white font-mono font-bold text-[10px] tracking-wider uppercase border border-white">
                    Predictive Engine
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 font-medium hidden sm:block">
                  Student Dropout Detection &amp; Targeted Intervention System
                </p>
              </div>
            </div>

            {/* Auth Info & Controls */}
            <div className="flex items-center gap-2 sm:gap-4 self-end sm:self-auto">
              {/* Logged-in user badge */}
              <div className="flex items-center gap-2 bg-neutral-800 border border-neutral-600 px-3 py-1.5">
                {authUser.role === 'mentor' ? (
                  <UserCheck className="w-4 h-4 text-[#D62828]" />
                ) : (
                  <GraduationCap className="w-4 h-4 text-[#2563EB]" />
                )}
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  {authUser.role === 'student' ? `${authUser.name} (${authUser.studentId})` : authUser.name}
                </span>
              </div>
              {/* Role Switcher — only visible for mentors */}
              {authUser.role === 'mentor' && (
                <div className="flex items-center border-2 border-white bg-neutral-900 p-1">
                  <button
                    id="mentor-role-toggle-btn"
                    onClick={() => {
                      setRole('mentor');
                      if (currentScreen === 'student-view') setCurrentScreen('dashboard');
                    }}
                    className={`px-3 py-1 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
                      role === 'mentor' ? 'bg-[#D62828] text-white' : 'text-neutral-300 hover:text-white'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Mentor</span>
                  </button>
                  <button
                    id="student-role-toggle-btn"
                    onClick={() => { setRole('student'); setCurrentScreen('student-view'); }}
                    className={`px-3 py-1 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
                      role === 'student' ? 'bg-[#2563EB] text-white' : 'text-neutral-300 hover:text-white'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Student</span>
                  </button>
                </div>
              )}
              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 border border-neutral-600 text-neutral-300 hover:text-white text-xs font-black uppercase tracking-wider transition-colors"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>

      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Render View based on role and screen */}
        {role === 'student' || currentScreen === 'student-view' ? (
          <StudentFacingStatusView
            statusData={currentStudentStatus}
            allStudents={authUser?.role === 'mentor' ? students.map((s) => ({ studentId: s.studentId, name: s.name })) : []}
            onSelectDifferentStudent={authUser?.role === 'mentor' ? (id) => setSelectedStudentId(id) : undefined}
            onSwitchToMentor={authUser?.role === 'mentor' ? () => {
              setRole('mentor');
              setCurrentScreen('dashboard');
            } : undefined}
          />
        ) : currentScreen === 'dashboard' ? (
          <DashboardView 
            students={students} 
            onSelectStudent={handleSelectStudent} 
            uploadHistory={uploadHistory}
            onDataUpload={handleDataUpload}
            onClearAllData={handleClearAllData}
            onDeleteUpload={handleDeleteUpload}
          />
        ) : currentScreen === 'detail' && currentDetail ? (
          <StudentDetailView
            student={currentDetail}
            hasIntervention={hasIntervention}
            onBackToDashboard={() => setCurrentScreen('dashboard')}
            onAssignAction={(id) => handleOpenActionPanel(id)}
            onViewInterventions={(id) => handleOpenOutcome(id)}
          />
        ) : currentScreen === 'action' && currentDetail ? (
          <MentorActionPanel
            studentId={selectedStudentId}
            studentName={currentDetail.name}
            riskScore={currentDetail.riskScore}
            suggestedAction={currentDetail.suggestedAction}
            dominantFactor={currentDetail.contributingFactors[0]?.factor ?? 'Risk Factors'}
            onBack={() => setCurrentScreen('detail')}
            onSubmitSuccess={handleInterventionAssigned}
            onNavigateToStudentView={(id) => {
              setSelectedStudentId(id);
              setRole('student');
              setCurrentScreen('student-view');
            }}
            onNavigateToOutcomeView={(id) => {
              setSelectedStudentId(id);
              setCurrentScreen('outcome');
            }}
          />
        ) : currentScreen === 'outcome' ? (
          <OutcomeComparisonView
            data={currentOutcome}
            onBack={() => setCurrentScreen('detail')}
            onResolveIntervention={handleResolveIntervention}
          />
        ) : (
          <DashboardView 
            students={students} 
            onSelectStudent={handleSelectStudent} 
            uploadHistory={uploadHistory}
            onDataUpload={handleDataUpload}
            onClearAllData={handleClearAllData}
            onDeleteUpload={handleDeleteUpload}
          />
        )}

      </main>

      {/* Neo-Brutalist Technical Footer */}
      <footer className="border-t-4 border-[#0D0D0D] bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-mono font-bold text-[#0D0D0D]">
            <span className="w-2.5 h-2.5 bg-[#D62828] border border-[#0D0D0D]" />
            <span>EARLYALERT SYSTEM // FRONTEND PROTOTYPE SPEC V1.0</span>
          </div>

          <div className="flex items-center gap-4 text-neutral-600 font-bold">
            <span>Data Contract: Strict Mock Sync</span>
            <span className="hidden md:inline">•</span>
            <span>Theme: Neo-Brutalist High Contrast</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
