import React, { useState } from 'react';
import { ActionType, MentorActionPayload } from '@/lib/types';
import {
  ArrowLeft,
  CheckCircle,
  Send,
  Sparkles,
  Info,
  Calendar,
  BookOpen,
  UserCheck,
  Zap,
} from 'lucide-react';

interface MentorActionPanelProps {
  studentId: string;
  studentName: string;
  riskScore?: number;
  suggestedAction?: string;
  dominantFactor?: string;
  onBack: () => void;
  onSubmitSuccess: (payload: MentorActionPayload) => void;
  onNavigateToOutcomeView?: (studentId: string) => void;
}

export const MentorActionPanel: React.FC<MentorActionPanelProps> = ({
  studentId,
  studentName,
  riskScore = 0,
  suggestedAction = 'Extra Class / Tutoring',
  dominantFactor = 'Risk Factors',
  onBack,
  onSubmitSuccess,
  onNavigateToOutcomeView,
}) => {
  // Determine initial action type from suggestedAction
  const getInitialActionType = (suggestion: string): ActionType => {
    if (suggestion.toLowerCase().includes('extra class') || suggestion.toLowerCase().includes('tutoring')) {
      return 'Extra Class';
    }
    if (suggestion.toLowerCase().includes('counseling')) {
      return 'Counseling';
    }
    if (suggestion.toLowerCase().includes('financial')) {
      return 'Financial Aid Referral';
    }
    if (suggestion.toLowerCase().includes('academic')) {
      return 'Academic Support';
    }
    if (suggestion.toLowerCase().includes('parent')) {
      return 'Parent/Guardian Notified';
    }
    return 'Other';
  };

  const [actionType, setActionType] = useState<ActionType>(getInitialActionType(suggestedAction));
  const [subject, setSubject] = useState('Data Structures');
  const [schedule, setSchedule] = useState('Tue/Thu 4pm');
  const [instructor, setInstructor] = useState('');
  const [notes, setNotes] = useState('');
  const [assignedBy] = useState('Mentor');
  const [startDate] = useState(new Date().toISOString().split('T')[0]);

  const [submittedPayload, setSubmittedPayload] = useState<MentorActionPayload | null>(null);
  const [groqRationale, setGroqRationale] = useState<string>('');
  const [rationaleLoading, setRationaleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Construct the exact object specified by data contract
    const payload: MentorActionPayload = {
      studentId,
      type: actionType,
      details:
        actionType === 'Extra Class'
          ? {
              subject: subject.trim(),
              schedule: schedule.trim(),
              instructor: instructor.trim(),
            }
          : {},
      notes: notes.trim(),
      assignedBy,
      startDate,
    };

    console.log('[MentorActionPanel] Created intervention payload:', payload);
    setSubmittedPayload(payload);
    onSubmitSuccess(payload);

    // Fetch Groq rationale async
    setRationaleLoading(true);
    try {
      const res = await fetch('/api/groq/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'rationale',
          studentName: studentName,
          riskScore: riskScore,
          actionType: actionType,
          dominantFactor: dominantFactor
        })
      });
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      setGroqRationale(data.text);
    } catch {
      setGroqRationale(`"${actionType}" is the recommended intervention based on ${studentName}'s primary risk factor.`);
    } finally {
      setRationaleLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          id="action-panel-back-btn"
          onClick={onBack}
          className="neo-btn px-3.5 py-1.5 bg-white text-[#0D0D0D] text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Student Profile</span>
        </button>

      </div>

      {/* Success Confirmation Modal / Card if submitted */}
      {submittedPayload && (
        <div className="neo-card p-6 bg-[#4ADE80] text-[#0D0D0D] space-y-4 border-[3px] border-[#0D0D0D]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#0D0D0D] text-white flex items-center justify-center font-black border-2 border-[#0D0D0D]">
              ✓
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-[#0D0D0D]">
                Intervention Assigned Successfully
              </h2>
              <p className="text-xs font-bold text-[#0D0D0D]">
                Payload formatted and recorded for student {studentName} ({studentId}).
              </p>
            </div>
          </div>

          {/* Groq Rationale */}
          <div className="bg-white text-[#0D0D0D] p-4 border-2 border-white">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-3.5 h-3.5 text-[#D62828]" />
              <span className="text-xs font-black uppercase tracking-wider text-neutral-600">AI Rationale (Groq)</span>
            </div>
            {rationaleLoading ? (
              <div className="animate-pulse space-y-1.5">
                <div className="h-3 bg-neutral-200 w-3/4 rounded"></div>
                <div className="h-3 bg-neutral-200 w-full rounded"></div>
              </div>
            ) : (
              <p className="text-sm font-medium text-[#0D0D0D] leading-relaxed select-none">{groqRationale}</p>
            )}
          </div>



          <div className="flex flex-wrap items-center gap-3 pt-2">

            {onNavigateToOutcomeView && (
              <button
                id="view-outcome-btn"
                onClick={() => onNavigateToOutcomeView(studentId)}
                className="neo-btn px-4 py-2 bg-[#F4C430] text-[#0D0D0D] text-xs font-black uppercase tracking-wider"
              >
                View Outcome Comparison
              </button>
            )}
            <button
              onClick={onBack}
              className="neo-btn px-4 py-2 bg-[#0D0D0D] text-white text-xs font-black uppercase tracking-wider ml-auto"
            >
              Done &amp; Return
            </button>
          </div>
        </div>
      )}

      {/* Main Intervention Form Card — hidden after submission */}
      {!submittedPayload && (
      <div className="neo-card p-6 md:p-8 bg-white">
        <div className="border-b-2 border-[#0D0D0D] pb-4 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <UserCheck className="w-5 h-5 text-[#D62828]" />
            <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-[#0D0D0D]">
              Assign Student Intervention Plan
            </h1>
          </div>
          <p className="text-xs text-neutral-600 font-semibold">
            Configuring formalized retention protocol for candidate{' '}
            <span className="font-black text-[#0D0D0D] underline">{studentName}</span> (
            <span className="font-mono font-bold text-[#0D0D0D]">{studentId}</span>).
          </p>
        </div>

        {/* Suggestion Context Header */}
        <div className="p-3.5 mb-6 bg-[#FFFDEB] border-2 border-[#0D0D0D] flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-[#D62828] shrink-0" />
          <div className="text-xs">
            <span className="font-extrabold uppercase tracking-wider text-neutral-600 block">
              Automated Suggestion Context
            </span>
            <span className="font-black text-sm text-[#0D0D0D]">{suggestedAction}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Action Type Dropdown */}
          <div className="space-y-1.5">
            <label
              htmlFor="action-type-select"
              className="block font-black text-xs uppercase tracking-wider text-[#0D0D0D]"
            >
              Action Type <span className="text-[#D62828]">*</span>
            </label>
            <select
              id="action-type-select"
              value={actionType}
              onChange={(e) => setActionType(e.target.value as ActionType)}
              className="neo-input w-full p-2.5 text-sm font-bold"
              required
            >
              <option value="Extra Class">Extra Class</option>
              <option value="Counseling">Counseling</option>
              <option value="Financial Aid Referral">Financial Aid Referral</option>
              <option value="Academic Support">Academic Support</option>
              <option value="Parent/Guardian Notified">Parent/Guardian Notified</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Conditional Fields: Only if Action Type is 'Extra Class' */}
          {actionType === 'Extra Class' && (
            <div className="p-4 bg-[#F5F1E8] border-2 border-[#0D0D0D] space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b-2 border-[#0D0D0D]">
                <BookOpen className="w-4 h-4 text-[#0D0D0D]" />
                <span className="text-xs font-black uppercase tracking-wider text-[#0D0D0D]">
                  Extra Class Logistics
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label
                    htmlFor="subject-input"
                    className="block font-bold text-xs uppercase tracking-wider text-[#0D0D0D]"
                  >
                    Subject <span className="text-[#D62828]">*</span>
                  </label>
                  <input
                    id="subject-input"
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Data Structures"
                    className="neo-input w-full p-2 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="schedule-input"
                    className="block font-bold text-xs uppercase tracking-wider text-[#0D0D0D]"
                  >
                    Schedule <span className="text-[#D62828]">*</span>
                  </label>
                  <input
                    id="schedule-input"
                    type="text"
                    required
                    value={schedule}
                    onChange={(e) => setSchedule(e.target.value)}
                    placeholder="e.g. Tue/Thu 4pm"
                    className="neo-input w-full p-2 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="instructor-input"
                  className="block font-bold text-xs uppercase tracking-wider text-[#0D0D0D]"
                >
                  Instructor (Optional)
                </label>
                <input
                  id="instructor-input"
                  type="text"
                  value={instructor}
                  onChange={(e) => setInstructor(e.target.value)}
                  placeholder="e.g. Prof. Mehta"
                  className="neo-input w-full p-2 text-sm"
                />
              </div>
            </div>
          )}

          {/* Notes Textarea (Optional) */}
          <div className="space-y-1.5">
            <label
              htmlFor="notes-textarea"
              className="block font-black text-xs uppercase tracking-wider text-[#0D0D0D]"
            >
              Mentor Notes / Objectives (Optional)
            </label>
            <textarea
              id="notes-textarea"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter context, goals, or check-in criteria for this intervention..."
              className="neo-input w-full p-2.5 text-sm"
            />
          </div>

          {/* Meta Information Bar */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-neutral-100 border-2 border-[#0D0D0D] text-xs font-mono">
            <div>
              <span className="font-sans font-extrabold uppercase text-neutral-500 block text-[10px]">
                Assigned By
              </span>
              <span className="font-bold text-[#0D0D0D]">{assignedBy}</span>
            </div>
            <div>
              <span className="font-sans font-extrabold uppercase text-neutral-500 block text-[10px]">
                Effective Start Date
              </span>
              <span className="font-bold text-[#0D0D0D] flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {startDate}
              </span>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onBack}
              className="neo-btn px-4 py-2.5 bg-white text-[#0D0D0D] text-xs font-bold"
            >
              Cancel
            </button>
            <button
              id="submit-intervention-btn"
              type="submit"
              className="neo-btn px-6 py-2.5 bg-[#D62828] text-white text-xs font-black uppercase tracking-wider flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Assign Intervention</span>
            </button>
          </div>
        </form>
      </div>
      )}
    </div>
  );
};
