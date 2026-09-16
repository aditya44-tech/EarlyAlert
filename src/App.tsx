import React, { useState } from 'react';
import {
  initialStudents,
  studentDetailsMap,
  studentStatusMap,
  outcomeComparisonsMap,
} from './mockData';
import {
  StudentSummary,
  StudentDetail,
  StudentStatusData,
  OutcomeComparisonData,
  MentorActionPayload,
  UploadLog,
} from './types';
import { DashboardView } from './views/DashboardView';
import { StudentDetailView } from './views/StudentDetailView';
import { MentorActionPanel } from './views/MentorActionPanel';
import { StudentFacingStatusView } from './views/StudentFacingStatusView';
import { OutcomeComparisonView } from './views/OutcomeComparisonView';
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
} from 'lucide-react';

type ScreenKey = 'dashboard' | 'detail' | 'action' | 'student-view' | 'outcome';
type Role = 'mentor' | 'student';

export default function App() {
  // Application Data States
  const [students, setStudents] = useState<StudentSummary[]>(initialStudents);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('S001');
  const [detailsMap, setDetailsMap] = useState<Record<string, StudentDetail>>(studentDetailsMap);
  const [uploadHistory, setUploadHistory] = useState<UploadLog[]>([
    { week: 'Week 4', type: 'overall', uploadedAt: '2026-09-15T10:00:00Z', studentsUpdated: 154, uploadedBy: 'System' },
    { week: 'Week 3', type: 'overall', uploadedAt: '2026-09-08T10:00:00Z', studentsUpdated: 154, uploadedBy: 'System' },
    { week: 'Week 2', type: 'overall', uploadedAt: '2026-09-01T10:00:00Z', studentsUpdated: 154, uploadedBy: 'System' },
    { week: 'Week 1', type: 'overall', uploadedAt: '2026-08-25T10:00:00Z', studentsUpdated: 154, uploadedBy: 'System' },
  ]);
  const [studentStatusData, setStudentStatusData] = useState<Record<string, StudentStatusData>>(
    studentStatusMap
  );
  const [outcomeDataMap, setOutcomeDataMap] = useState<Record<string, OutcomeComparisonData>>(
    outcomeComparisonsMap
  );

  // Active Role and Navigation Screen
  const [role, setRole] = useState<Role>('mentor');
  const [currentScreen, setCurrentScreen] = useState<ScreenKey>('dashboard');

  // Active selected student detail
  const currentDetail: StudentDetail =
    detailsMap[selectedStudentId] || detailsMap['S001'];

  // Active student status view data
  const currentStudentStatus: StudentStatusData =
    studentStatusData[selectedStudentId] || {
      studentId: selectedStudentId,
      name: currentDetail.name,
      activeIntervention: null,
    };

  // Active outcome comparison data
  const currentOutcome: OutcomeComparisonData =
    outcomeDataMap[selectedStudentId] || {
      studentId: selectedStudentId,
      name: currentDetail.name,
      intervention: {
        type: currentDetail.suggestedAction.split('/')[0].trim(),
        details: { subject: 'Academic Support Session', schedule: 'Weekly 4pm' },
        startDate: '2026-09-01',
      },
      baselineScore: currentDetail.riskScore,
      currentScore: Math.max(10, currentDetail.riskScore - 20),
      scoreDelta: -20,
      outcome: 'Improving',
      checkpointDate: '2026-09-15',
    };

  // CSV Upload Handler
  const handleDataUpload = (parsedData: any[], weekLabel: string, uploadType: 'overall' | 'fee' | 'backlog' | 'subject_wise') => {
    let updatedCount = 0;
    
    const newDetails = { ...detailsMap };
    const newStudents = [...students];
    
    parsedData.forEach(row => {
      const sid = row.studentId?.trim();
      if (!sid || !newDetails[sid]) return;
      
      const student = { ...newDetails[sid] };
      let newRisk = student.riskScore;

      if (uploadType === 'overall') {
        const att = parseFloat(row.attendance);
        const score = parseFloat(row.testScore);
        if (isNaN(att) || isNaN(score)) return;
        
        student.attendanceHistory = [...student.attendanceHistory, { week: weekLabel, percentage: att }];
        student.gradeHistory = [...student.gradeHistory, { test: weekLabel, score }];
        
        if (att < 75) newRisk += 10;
        else if (att >= 85) newRisk -= 5;
        if (score < 60) newRisk += 15;
        else if (score >= 80) newRisk -= 5;
        
      } else if (uploadType === 'fee') {
        const overdue = parseInt(row.overdueDays || '0', 10);
        if (isNaN(overdue)) return;
        
        // Remove old fee factor, add new one if overdue
        student.contributingFactors = student.contributingFactors.filter(f => f.factor !== 'Fee Overdue');
        if (overdue > 0) {
          student.contributingFactors.push({ factor: 'Fee Overdue', points: 15, reason: `Fee overdue by ${overdue} days` });
          newRisk += 15;
        } else {
          // If they paid, lower risk slightly if they previously had fee overdue
          newRisk -= 10; 
        }
      } else if (uploadType === 'backlog') {
        const backlogs = parseInt(row.backlogCount || '0', 10);
        if (isNaN(backlogs)) return;
        
        student.contributingFactors = student.contributingFactors.filter(f => f.factor !== 'Backlogs');
        if (backlogs > 0) {
          student.contributingFactors.push({ factor: 'Backlogs', points: 20, reason: `${backlogs} active backlogs` });
          newRisk += 20;
        }
      } else if (uploadType === 'subject_wise') {
        // Just record generic engagement for now
        student.gradeHistory = [...student.gradeHistory, { test: `${weekLabel} (Subject Update)`, score: 75 }];
        // Assume processing was valid
      }
      
      newRisk = Math.max(0, Math.min(100, newRisk));
      student.riskScore = newRisk;
      
      if (newRisk >= 60) student.riskLevel = 'High';
      else if (newRisk >= 35) student.riskLevel = 'Medium';
      else student.riskLevel = 'Low';
      
      newDetails[sid] = student;
      
      const summaryIdx = newStudents.findIndex(s => s.studentId === sid);
      if (summaryIdx !== -1) {
        newStudents[summaryIdx] = {
          ...newStudents[summaryIdx],
          riskScore: newRisk,
          riskLevel: student.riskLevel
        };
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
        uploadedBy: 'System'
      };
      setUploadHistory(prev => [log, ...prev]);
    }

    return { success: true, updatedCount, skippedCount: parsedData.length - updatedCount };
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
        name: currentDetail.name,
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
        name: currentDetail.name,
        intervention: {
          type: payload.type,
          details: payload.details,
          startDate: payload.startDate,
        },
        baselineScore: currentDetail.riskScore,
        currentScore: Math.max(15, currentDetail.riskScore - 27),
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

            {/* Role Switcher & Controls */}
            <div className="flex items-center gap-2 sm:gap-4 self-end sm:self-auto">
              <div className="flex items-center border-2 border-white bg-neutral-900 p-1">
                <button
                  id="mentor-role-toggle-btn"
                  onClick={() => {
                    setRole('mentor');
                    if (currentScreen === 'student-view') {
                      setCurrentScreen('dashboard');
                    }
                  }}
                  className={`px-3 py-1 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
                    role === 'mentor'
                      ? 'bg-[#D62828] text-white'
                      : 'text-neutral-300 hover:text-white'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Mentor View</span>
                </button>
                <button
                  id="student-role-toggle-btn"
                  onClick={() => {
                    setRole('student');
                    setCurrentScreen('student-view');
                  }}
                  className={`px-3 py-1 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
                    role === 'student'
                      ? 'bg-[#2563EB] text-white'
                      : 'text-neutral-300 hover:text-white'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Student View</span>
                </button>
              </div>
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
          />
        ) : currentScreen === 'detail' ? (
          <StudentDetailView
            student={currentDetail}
            hasIntervention={hasIntervention}
            onBackToDashboard={() => setCurrentScreen('dashboard')}
            onAssignAction={(id) => handleOpenActionPanel(id)}
            onViewInterventions={(id) => handleOpenOutcome(id)}
          />
        ) : currentScreen === 'action' ? (
          <MentorActionPanel
            studentId={selectedStudentId}
            studentName={currentDetail.name}
            suggestedAction={currentDetail.suggestedAction}
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
