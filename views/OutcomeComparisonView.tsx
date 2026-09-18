import React, { useState } from 'react';
import { OutcomeComparisonData } from '@/lib/types';
import { RiskBadge } from '@/components/RiskBadge';
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Minus,
  CheckCircle,
  BookOpen,
  Sparkles,
  RotateCcw,
  Clock,
  GraduationCap,
  UserCheck,
  DollarSign,
  Users,
  HelpCircle,
} from 'lucide-react';

interface OutcomeComparisonViewProps {
  data: OutcomeComparisonData;
  onBack: () => void;
  onResolveIntervention?: (studentId: string) => void;
  onReopenIntervention?: (studentId: string) => void;
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2.5 bg-neutral-50 border border-[#0D0D0D]">
      <span className="text-neutral-500 font-bold block text-[10px] uppercase mb-0.5">{label}</span>
      <span className="font-bold text-[#0D0D0D] text-xs">{value}</span>
    </div>
  );
}

function InterventionDetailsGrid({ type, details }: { type: string; details: Record<string, unknown> }) {
  const str = (v: unknown, fallback = '-') => v ? String(v) : fallback;

  switch (type) {
    case 'Extra Class':
      return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <DetailCell label="Program Type" value="Extra Class" />
          <DetailCell label="Subject" value={str(details.subject)} />
          <DetailCell label="Schedule" value={str(details.schedule)} />
          {details.instructor ? <DetailCell label="Instructor" value={str(details.instructor)} /> : null}
        </div>
      );
    case 'Counseling':
      return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <DetailCell label="Program Type" value="Counseling" />
          <DetailCell label="Counseling Type" value={str(details.counselingType, 'Academic')} />
          <DetailCell label="Scheduled" value={str(details.schedule)} />
          {details.counselorName ? <DetailCell label="Counselor" value={str(details.counselorName)} /> : null}
        </div>
      );
    case 'Financial Aid Referral':
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <DetailCell label="Program Type" value="Financial Aid Referral" />
          <DetailCell label="Referred To" value={str(details.referredDepartment, 'Financial Aid Office')} />
          {details.feeNotes ? <DetailCell label="Notes" value={str(details.feeNotes)} /> : null}
        </div>
      );
    case 'Academic Support':
      return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <DetailCell label="Program Type" value="Academic Support" />
          <DetailCell label="Support Type" value={str(details.supportType, 'Tutoring')} />
          <DetailCell label="Subjects" value={
            Array.isArray(details.supportSubjects)
              ? (details.supportSubjects as string[]).join(', ')
              : str(details.supportSubjects)
          } />
        </div>
      );
    case 'Other':
    default:
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <DetailCell label="Program Type" value={type || 'Other'} />
          {details.description ? <DetailCell label="Description" value={str(details.description)} /> : null}
        </div>
      );
  }
}

function interventionIcon(type: string) {
  switch (type) {
    case 'Extra Class': return <GraduationCap className="w-4 h-4" />;
    case 'Counseling': return <UserCheck className="w-4 h-4" />;
    case 'Financial Aid Referral': return <DollarSign className="w-4 h-4" />;
    case 'Academic Support': return <BookOpen className="w-4 h-4" />;
    case 'Parent/Guardian Notified': return <Users className="w-4 h-4" />;
    default: return <HelpCircle className="w-4 h-4" />;
  }
}

export const OutcomeComparisonView: React.FC<OutcomeComparisonViewProps> = ({
  data,
  onBack,
  onResolveIntervention,
  onReopenIntervention,
}) => {
  // Optimistic local override; the persisted intervention status is the source
  // of truth, so a resolved plan still renders as resolved after a reload.
  const [optimisticResolved, setOptimisticResolved] = useState<boolean | null>(null);
  const isResolved = optimisticResolved ?? data.status === 'Resolved';

  const isImproving = data.outcome === 'Improving';
  const isWorsening = data.outcome === 'Worsening';
  const isAwaiting = data.checkpointDate === '__awaiting__';
  const hasImprovedSignificantly = data.scoreDelta <= -10;

  // Guess current risk level from currentScore for the badge
  const currentRiskLevel = data.currentScore >= 70 ? 'High' : data.currentScore >= 40 ? 'Medium' : 'Low';

  const handleMarkResolved = () => {
    if (!hasImprovedSignificantly) {
      const confirmed = window.confirm(
        `Risk score hasn't improved significantly (only ${Math.abs(data.scoreDelta)} pts so far). Are you sure you want to mark this resolved?`
      );
      if (!confirmed) return;
    }
    setOptimisticResolved(true);
    if (onResolveIntervention) {
      onResolveIntervention(data.studentId);
    }
  };

  const handleReopenIntervention = () => {
    setOptimisticResolved(false);
    if (onReopenIntervention) {
      onReopenIntervention(data.studentId);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          id="outcome-back-btn"
          onClick={onBack}
          className="neo-btn px-3.5 py-1.5 bg-white text-[#0D0D0D] text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Profile</span>
        </button>

        <span className="font-mono text-xs font-black uppercase tracking-wider bg-[#0D0D0D] text-white px-2 py-1">
          Outcome Comparison
        </span>
      </div>

      {/* Main Comparison Card */}
      <div className="neo-card p-6 md:p-8 bg-white space-y-6">
        {/* Student & Intervention Summary Bar */}
        <div className="border-b-2 border-[#0D0D0D] pb-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <span className="text-xs font-mono font-bold bg-[#0D0D0D] text-white px-2 py-0.5">
                {data.studentId}
              </span>
              <h1 className="text-2xl md:text-3xl font-black text-[#0D0D0D] mt-1">
                {data.name} : Intervention Evaluation
              </h1>
            </div>

            {/* Fix 5: Show BOTH risk badge and monitoring status side by side */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <RiskBadge riskLevel={currentRiskLevel} size="sm" />
              {isResolved ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2D9D5F] text-white border-2 border-[#0D0D0D] font-black text-xs uppercase tracking-wider shadow-[2px_2px_0px_#0D0D0D]">
                  <CheckCircle className="w-4 h-4" />
                  <span>Resolved</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] text-white border-2 border-[#0D0D0D] font-black text-xs uppercase tracking-wider shadow-[2px_2px_0px_#0D0D0D]">
                  <span className="w-2 h-2 bg-white inline-block animate-pulse" />
                  <span>Monitoring in Progress</span>
                </div>
              )}
            </div>
          </div>

          {/* Intervention type summary with icon */}
          <div className="mt-3 p-3 bg-[#FFFDEB] border-2 border-[#0D0D0D] text-sm font-black text-[#0D0D0D] flex items-center gap-2 flex-wrap">
            {interventionIcon(data.intervention.type)}
            <span className="text-[#D62828] uppercase">{data.intervention.type}</span>
            {' '}started on{' '}
            <span className="font-mono underline">{data.intervention.startDate}</span>
            {' '}•{' '}
            {isAwaiting ? (
              <span className="px-1.5 py-0.5 border border-[#0D0D0D] bg-neutral-500 text-white font-extrabold uppercase text-xs">
                Awaiting New Data
              </span>
            ) : (
              <span
                className={`px-1.5 py-0.5 border border-[#0D0D0D] text-white font-extrabold uppercase text-xs ${
                  isImproving ? 'bg-[#2D9D5F]' : isWorsening ? 'bg-[#D62828]' : 'bg-neutral-600'
                }`}
              >
                {data.outcome}
              </span>
            )}
          </div>
        </div>

        {/* Before / After Numbers Display */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-neutral-600">
              Risk Score Trajectory (Before vs. After Intervention)
            </span>
            <span className="text-xs font-mono font-bold text-neutral-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {isAwaiting ? (
                <span className="italic text-neutral-400">Awaiting next data update</span>
              ) : (
                `Checkpoint: ${data.checkpointDate}`
              )}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Baseline Card */}
            <div className="p-5 bg-neutral-100 border-[3px] border-[#0D0D0D] shadow-[3px_3px_0px_#0D0D0D]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-neutral-600">
                  Baseline Risk
                </span>
                <span className="text-xs font-mono font-bold text-neutral-500">Pre-Intervention</span>
              </div>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-4xl md:text-5xl font-black font-mono text-[#0D0D0D]">
                  {data.baselineScore}
                </span>
                <span className="text-sm font-bold text-neutral-500 font-mono">/100</span>
              </div>
              <p className="text-xs text-neutral-600 mt-2 font-semibold">
                Score at time of intervention assignment.
              </p>
            </div>

            {/* Current Score Card */}
            <div
              className={`p-5 border-[3px] border-[#0D0D0D] shadow-[3px_3px_0px_#0D0D0D] ${
                isAwaiting
                  ? 'bg-neutral-50'
                  : isImproving
                  ? 'bg-[#E8F8F0]'
                  : isWorsening
                  ? 'bg-[#FDECEC]'
                  : 'bg-neutral-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-[#0D0D0D]">
                  Current Risk Score
                </span>
                <span className="text-xs font-mono font-bold text-neutral-600">
                  {isAwaiting ? 'No new data yet' : 'Post-Intervention'}
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-2">
                {isAwaiting ? (
                  <span className="text-2xl font-black font-mono text-neutral-400 italic">
                    N/A
                  </span>
                ) : (
                  <>
                    <span
                      className={`text-4xl md:text-5xl font-black font-mono ${
                        isImproving ? 'text-[#2D9D5F]' : isWorsening ? 'text-[#D62828]' : 'text-[#0D0D0D]'
                      }`}
                    >
                      {data.currentScore}
                    </span>
                    <span className="text-sm font-bold text-neutral-500 font-mono">/100</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-2 font-black text-xs">
                {isAwaiting ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-neutral-200 text-neutral-600 border border-[#0D0D0D]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Awaiting next data update</span>
                  </span>
                ) : isImproving ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#2D9D5F] text-white border border-[#0D0D0D]">
                    <ArrowDown className="w-3.5 h-3.5" />
                    <span>{Math.abs(data.scoreDelta)} pts Reduction</span>
                  </span>
                ) : isWorsening ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#D62828] text-white border border-[#0D0D0D]">
                    <ArrowUp className="w-3.5 h-3.5" />
                    <span>+{data.scoreDelta} pts Escalation</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-neutral-400 text-[#0D0D0D] border border-[#0D0D0D]">
                    <Minus className="w-3.5 h-3.5" />
                    <span>No Change (0 pts)</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Fix 3: Type-specific Intervention Details */}
        <div className="p-4 bg-white border-2 border-[#0D0D0D] space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#D62828]" />
            <h3 className="font-black text-xs uppercase tracking-wider text-[#0D0D0D]">
              Assigned Intervention Details
            </h3>
          </div>
          <InterventionDetailsGrid
            type={data.intervention.type}
            details={data.intervention.details as Record<string, unknown>}
          />
        </div>

        {/* Resolution Action Area */}
        <div className="pt-2 border-t-2 border-[#0D0D0D] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-neutral-600 font-medium">
            {isResolved
              ? 'This intervention is officially flagged as resolved and archived.'
              : isAwaiting
              ? 'New attendance or test data is needed before a meaningful outcome can be determined.'
              : isWorsening
              ? 'Risk score has escalated since the intervention started. Review the plan before resolving or re-assigning.'
              : !hasImprovedSignificantly
              ? 'Risk score has not yet improved significantly. Consider waiting for more data before resolving.'
              : 'Significant improvement detected. You may safely mark this intervention as resolved.'}
          </div>

          <div className="flex items-center gap-3">
            {/* Fix 6: Conditional safeguard built into handleMarkResolved */}
            {!isResolved ? (
              <button
                id="mark-resolved-btn"
                onClick={handleMarkResolved}
                className="neo-btn px-5 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 bg-[#2D9D5F] text-white"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Mark as Resolved</span>
              </button>
            ) : (
              <button
                id="reopen-intervention-btn"
                onClick={handleReopenIntervention}
                className="neo-btn px-5 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 bg-neutral-100 text-[#0D0D0D]"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Re-open Intervention</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
