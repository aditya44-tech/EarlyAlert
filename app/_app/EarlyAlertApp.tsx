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

  // Load from localStorage on mount
  useEffect(() => {
    setIsClient(true);
    try {
      const savedUploads = localStorage.getItem('ea_uploadHistory');
      if (savedUploads) setUploadHistory(JSON.parse(savedUploads));
      
      const savedStudents = localStorage.getItem('ea_students');
      if (savedStudents) setStudents(JSON.parse(savedStudents));
      
      const savedDetails = localStorage.getItem('ea_detailsMap');
      if (savedDetails) setDetailsMap(JSON.parse(savedDetails));
    } catch (e) {
      console.error("Failed to parse local storage data", e);
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (isClient) {
      localStorage.setItem('ea_uploadHistory', JSON.stringify(uploadHistory));
      localStorage.setItem('ea_students', JSON.stringify(students));
      localStorage.setItem('ea_detailsMap', JSON.stringify(detailsMap));
    }
  }, [uploadHistory, students, detailsMap, isClient]);

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

    if (updatedCount > 0) {
      const log: UploadLog = {
        week: weekLabel,
        type: uploadType,
        uploadedAt: new Date().toISOString(),
        studentsUpdated: updatedCount,
        uploadedBy: 'System',
        rawData: parsedData,
        fileName: fileName,
      };
      setUploadHistory(prev => [log, ...prev]);
    }

    return { success: true, updatedCount, skippedCount };
  };




  const handleClearAllData = () => {
    if (confirm('Are you sure you want to reset all data to the initial state? This cannot be undone.')) {
      setStudents([]);
      setDetailsMap({});
      setUploadHistory([]);
      setStudentStatusData({});
      setOutcomeDataMap({});
      localStorage.removeItem('ea_uploadHistory');
      localStorage.removeItem('ea_students');
      localStorage.removeItem('ea_detailsMap');
    }
  };

  const handleDeleteUpload = (uploadedAt: string) => {
    if (confirm('Delete this upload log?')) {
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
  const handleInterventionAssigned = (payload: MentorActionPayload) => {
    // 1. Update students summary list
    setStudents((prev) =>
      prev.map((s) =>
        s.studentId === payload.studentId ? { ...s, interventionStatus: 'Active' } : s
      )
    );

    // 2. Update student status map for Screen 4
    setStudentStatusData((prev) => ({
      ...prev,
      [payload.studentId]: {
        studentId: payload.studentId,
        name: currentDetail?.name ?? '',
        activeIntervention: {
          type: payload.type,
          details: payload.details,
          status: 'Active',
          assignedDate: payload.startDate,
        },
      },
    }));

    // 3. Update outcome comparison baseline/current for Screen 5
    setOutcomeDataMap((prev) => ({
      ...prev,
      [payload.studentId]: {
        studentId: payload.studentId,
        name: currentDetail?.name ?? '',
        intervention: {
          type: payload.type,
          details: payload.details,
          startDate: payload.startDate,
        },
        baselineScore: currentDetail?.riskScore ?? 0,
        currentScore: Math.max(15, (currentDetail?.riskScore ?? 0) - 27),
        scoreDelta: -27,
        outcome: 'Improving',
        checkpointDate: '2026-09-15',
      },
    }));
  };

  // Mark resolved handler for Screen 5
  const handleResolveIntervention = (studentId: string) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.studentId === studentId ? { ...s, interventionStatus: 'Resolved' } : s
      )
    );

    setStudentStatusData((prev) => {
      const existing = prev[studentId];
      if (!existing || !existing.activeIntervention) return prev;
      return {
        ...prev,
        [studentId]: {
          ...existing,
          activeIntervention: {
            ...existing.activeIntervention,
            status: 'Resolved',
          },
        },
      };
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

        {/* Screen Breadcrumb Bar (Quick navigation across all 5 requested screens) */}
        <div className="bg-[#1A1A1A] border-t border-neutral-800 text-xs overflow-x-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-4">
            <div className="flex items-center gap-1 shrink-0">
              <span className="font-extrabold uppercase tracking-wider text-neutral-400 mr-2 text-[11px]">
                Screens:
              </span>

              {/* Screen 1 Button */}
              <button
                id="nav-screen-1-btn"
                onClick={() => {
                  setRole('mentor');
                  setCurrentScreen('dashboard');
                }}
                className={`px-2.5 py-1 font-bold uppercase tracking-wider text-xs border ${
                  role === 'mentor' && currentScreen === 'dashboard'
                    ? 'bg-[#F4C430] text-[#0D0D0D] border-white font-black'
                    : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:text-white'
                }`}
              >
                1. Dashboard
              </button>

              {/* Screen 2 Button */}
              <button
                id="nav-screen-2-btn"
                onClick={() => {
                  setRole('mentor');
                  setCurrentScreen('detail');
                }}
                className={`px-2.5 py-1 font-bold uppercase tracking-wider text-xs border ${
                  role === 'mentor' && currentScreen === 'detail'
                    ? 'bg-[#F4C430] text-[#0D0D0D] border-white font-black'
                    : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:text-white'
                }`}
              >
                2. Student Detail
              </button>

              {/* Screen 3 Button */}
              <button
                id="nav-screen-3-btn"
                onClick={() => {
                  setRole('mentor');
                  setCurrentScreen('action');
                }}
                className={`px-2.5 py-1 font-bold uppercase tracking-wider text-xs border ${
                  role === 'mentor' && currentScreen === 'action'
                    ? 'bg-[#F4C430] text-[#0D0D0D] border-white font-black'
                    : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:text-white'
                }`}
              >
                3. Action Panel
              </button>

              {/* Screen 4 Button */}
              <button
                id="nav-screen-4-btn"
                onClick={() => {
                  setRole('student');
                  setCurrentScreen('student-view');
                }}
                className={`px-2.5 py-1 font-bold uppercase tracking-wider text-xs border ${
                  role === 'student' && currentScreen === 'student-view'
                    ? 'bg-[#2563EB] text-white border-white font-black'
                    : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:text-white'
                }`}
              >
                4. Student View
              </button>

              {/* Screen 5 Button */}
              <button
                id="nav-screen-5-btn"
                onClick={() => {
                  setRole('mentor');
                  setCurrentScreen('outcome');
                }}
                className={`px-2.5 py-1 font-bold uppercase tracking-wider text-xs border ${
                  role === 'mentor' && currentScreen === 'outcome'
                    ? 'bg-[#F4C430] text-[#0D0D0D] border-white font-black'
                    : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:text-white'
                }`}
              >
                5. Outcome Comparison
              </button>
            </div>

            {/* Active Student Selector Context */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-bold text-neutral-400">Context Student:</span>
              <select
                id="global-student-select"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="bg-neutral-800 text-white border border-neutral-600 px-2 py-0.5 text-xs font-mono font-bold"
              >
                {students.map((s) => (
                  <option key={s.studentId} value={s.studentId}>
                    {s.studentId} — {s.name} ({s.riskLevel})
                  </option>
                ))}
              </select>
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
            allStudents={students.map((s) => ({ studentId: s.studentId, name: s.name }))}
            onSelectDifferentStudent={(id) => setSelectedStudentId(id)}
            onSwitchToMentor={() => {
              setRole('mentor');
              setCurrentScreen('dashboard');
            }}
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
