import React from 'react';
import { StudentStatusData } from '@/lib/types';
import {
  Calendar,
  Clock,
  CheckCircle,
  HelpCircle,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  User,
} from 'lucide-react';

interface StudentFacingStatusViewProps {
  statusData: StudentStatusData;
  allStudents?: { studentId: string; name: string }[];
  studentDetail?: import('@/lib/types').StudentDetail;
  onSelectDifferentStudent?: (studentId: string) => void;
  onSwitchToMentor?: () => void;
}

export const StudentFacingStatusView: React.FC<StudentFacingStatusViewProps> = ({
  statusData,
  allStudents = [],
  studentDetail,
  onSelectDifferentStudent,
  onSwitchToMentor,
}) => {
  const intervention = statusData.activeIntervention;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Student Portal Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white border-2 border-[#0D0D0D] shadow-[3px_3px_0px_#0D0D0D]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#0D0D0D] text-white flex items-center justify-center font-bold text-xs">
            <User className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500 block">
              Student Academic Portal
            </span>
            <span className="text-xs font-bold text-[#0D0D0D]">
              Logged in as: <strong className="underline">{statusData.name}</strong> ({statusData.studentId})
            </span>
          </div>
        </div>

        {allStudents.length > 0 && onSelectDifferentStudent && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-neutral-600">Simulate:</span>
            <select
              id="student-view-account-select"
              value={statusData.studentId}
              onChange={(e) => onSelectDifferentStudent(e.target.value)}
              className="neo-input text-xs py-1 px-2 font-bold"
            >
              {allStudents.map((s) => (
                <option key={s.studentId} value={s.studentId}>
                  {s.name} ({s.studentId})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Student Status Card */}
      {intervention ? (
        <div className="neo-card p-6 md:p-8 bg-white space-y-6">
          <div className="flex items-center justify-between border-b-2 border-[#0D0D0D] pb-4">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-[#2563EB] flex items-center gap-1.5">
                <span className="w-2 h-2 bg-[#2563EB] inline-block animate-ping" />
                Active Academic Support Plan
              </span>
              <h1 className="text-xl md:text-2xl font-black text-[#0D0D0D] mt-1">
                Scheduled Learning Session
              </h1>
            </div>
            <span className="px-3 py-1 bg-[#2563EB] text-white font-black text-xs uppercase tracking-wider border-2 border-[#0D0D0D] shadow-[2px_2px_0px_#0D0D0D]">
              {intervention.status}
            </span>
          </div>

          {/* Simple, Friendly Main Announcement */}
          <div className="p-5 bg-[#FFFDEB] border-[3px] border-[#0D0D0D] shadow-[4px_4px_0px_#0D0D0D]">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[#0D0D0D] text-white shrink-0 mt-0.5">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base md:text-lg font-black text-[#0D0D0D] leading-snug">
                  You have an {intervention.type} scheduled:
                </h2>
                <div className="text-base font-extrabold text-[#D62828]">
                  {intervention.details.subject || 'General Academic Coaching'}
                  {intervention.details.schedule && `, ${intervention.details.schedule}`}
                </div>
                {intervention.details.instructor && (
                  <p className="text-xs font-bold text-neutral-700">
                    Instructor / Mentor: {String(intervention.details.instructor)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Schedule Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 bg-neutral-50 border-2 border-[#0D0D0D]">
              <span className="text-[11px] font-black uppercase tracking-wider text-neutral-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#0D0D0D]" />
                Assigned Date
              </span>
              <span className="text-sm font-bold font-mono text-[#0D0D0D] block mt-1">
                {intervention.assignedDate}
              </span>
            </div>

            <div className="p-3.5 bg-neutral-50 border-2 border-[#0D0D0D]">
              <span className="text-[11px] font-black uppercase tracking-wider text-neutral-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#0D0D0D]" />
                Session Timing
              </span>
              <span className="text-sm font-bold font-mono text-[#0D0D0D] block mt-1">
                {intervention.details.schedule || 'To be confirmed with department'}
              </span>
            </div>
          </div>

          {/* Student Academic Standing Summary (if available) */}
          {studentDetail && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <div className="p-4 bg-[#0D0D0D] text-white border-[3px] border-[#0D0D0D]">
                <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Current Academic Standing</span>
                <div className="text-3xl font-black font-mono mt-1 text-[#F4C430]">{100 - studentDetail.riskScore}<span className="text-sm">/100</span></div>
                <div className="text-xs font-bold mt-1 text-neutral-300">Overall Health Score</div>
              </div>
              <div className="p-4 bg-white border-[3px] border-[#0D0D0D]">
                 <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Key Areas for Improvement</span>
                 <ul className="mt-2 text-xs font-bold text-[#0D0D0D] space-y-1 list-disc list-inside">
                   {studentDetail.contributingFactors.slice(0,2).map(f => (
                     <li key={f.factor}>{f.factor}</li>
                   ))}
                   {studentDetail.contributingFactors.length === 0 && (
                     <li>Keep up the good work!</li>
                   )}
                 </ul>
              </div>
            </div>
          )}

          {/* Reassuring Guidance & Next Steps */}
          <div className="p-4 bg-[#F5F1E8] border-2 border-[#0D0D0D] text-xs space-y-2 mt-4">
            <div className="flex items-center gap-1.5 font-black uppercase tracking-wider text-[#0D0D0D]">
              <ShieldCheck className="w-4 h-4 text-[#2D9D5F]" />
              <span>What to bring &amp; expectations</span>
            </div>
            <div className="text-neutral-700 font-medium space-y-1">
              {intervention.type.toLowerCase().includes('counseling') ? (
                <p>This is a safe, confidential space. Please come prepared to discuss how you're balancing your workload, any personal or academic challenges you're facing, and how we can best support your well-being.</p>
              ) : intervention.type.toLowerCase().includes('financial') ? (
                <p>Please bring any recent correspondence from the financial aid office, your student ID, and an outline of your current financial concerns so we can explore scholarships or payment plans.</p>
              ) : (
                <p>Please attend with your course syllabus, recent graded assignments, and any specific homework questions. Mentors are here to reinforce fundamentals and ensure you stay on pace for the upcoming term.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Neutral Empty State: No active interventions */
        <div className="neo-card p-8 md:p-12 bg-white text-center space-y-4">
          <div className="w-12 h-12 bg-[#2D9D5F] text-white flex items-center justify-center mx-auto border-[3px] border-[#0D0D0D] shadow-[3px_3px_0px_#0D0D0D]">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-[#0D0D0D]">
              No Active Interventions
            </h2>
            <p className="text-sm text-neutral-600 mt-1 max-w-md mx-auto font-medium">
              Your academic standing is currently on track. No tutoring, counseling, or advisory
              sessions are currently required.
            </p>
          </div>
          <div className="pt-2">
            <span className="inline-block px-3 py-1 bg-neutral-100 border border-[#0D0D0D] font-mono text-xs font-bold text-neutral-600">
              Account Status: Clear
            </span>
          </div>
        </div>
      )}

      {/* Support / Mentor Contact Note */}
      <div className="p-4 bg-white border-2 border-[#0D0D0D] shadow-[2px_2px_0px_#0D0D0D] flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-neutral-600" />
          <span className="font-semibold text-neutral-700">
            Have questions about your schedule? Contact your department academic advisor.
          </span>
        </div>
        {onSwitchToMentor && (
          <button
            onClick={onSwitchToMentor}
            className="font-black text-[#0D0D0D] underline uppercase text-xs shrink-0 cursor-pointer"
          >
            Switch to Staff View
          </button>
        )}
      </div>
    </div>
  );
};
