import React, { useState } from 'react';
import { OutcomeComparisonData } from '../types';
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Minus,
  CheckCircle,
  Calendar,
  Layers,
  BookOpen,
  Sparkles,
  TrendingDown,
  RotateCcw,
} from 'lucide-react';

interface OutcomeComparisonViewProps {
  data: OutcomeComparisonData;
  onBack: () => void;
  onResolveIntervention?: (studentId: string) => void;
}

export const OutcomeComparisonView: React.FC<OutcomeComparisonViewProps> = ({
  data,
  onBack,
  onResolveIntervention,
}) => {
  const [isResolved, setIsResolved] = useState(false);

  // Outcome styling calculation
  // Improving = risk reduced (score delta negative, lower risk score)
  const isImproving = data.outcome === 'Improving';
  const isWorsening = data.outcome === 'Worsening';

  const handleToggleResolved = () => {
    setIsResolved((prev) => !prev);
    if (onResolveIntervention) {
      onResolveIntervention(data.studentId);
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
          Screen 5: Outcome Comparison
        </span>
      </div>

      {/* Main Comparison Card */}
      <div className="neo-card p-6 md:p-8 bg-white space-y-6">
        {/* Student & Intervention Summary Bar */}
        <div className="border-b-2 border-[#0D0D0D] pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-mono font-bold bg-[#0D0D0D] text-white px-2 py-0.5">
                {data.studentId}
              </span>
              <h1 className="text-2xl md:text-3xl font-black text-[#0D0D0D] mt-1">
                {data.name} — Intervention Evaluation
              </h1>
            </div>

            {/* Resolved Status Indicator */}
            {isResolved ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2D9D5F] text-white border-2 border-[#0D0D0D] font-black text-xs uppercase tracking-wider shadow-[2px_2px_0px_#0D0D0D]">
                <CheckCircle className="w-4 h-4" />
                <span>Intervention Resolved</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] text-white border-2 border-[#0D0D0D] font-black text-xs uppercase tracking-wider shadow-[2px_2px_0px_#0D0D0D]">
                <span className="w-2 h-2 bg-white inline-block animate-pulse" />
                <span>Monitoring in Progress</span>
              </div>
            )}
          </div>

          {/* Short summary line as required: "[Intervention type] started on [date] — [outcome]" */}
          <div className="mt-3 p-3 bg-[#FFFDEB] border-2 border-[#0D0D0D] text-sm font-black text-[#0D0D0D]">
            <span className="text-[#D62828] uppercase">{data.intervention.type}</span> started on{' '}
            <span className="font-mono underline">{data.intervention.startDate}</span> —{' '}
            <span
              className={`px-1.5 py-0.5 border border-[#0D0D0D] text-white font-extrabold uppercase text-xs ${
                isImproving ? 'bg-[#2D9D5F]' : isWorsening ? 'bg-[#D62828]' : 'bg-neutral-600'
              }`}
            >
              {data.outcome}
            </span>
          </div>
        </div>

        {/* Before / After Numbers Display */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-neutral-600">
              Risk Score Trajectory (Before vs. After Intervention)
            </span>
            <span className="text-xs font-mono font-bold text-neutral-500">
              Checkpoint: {data.checkpointDate}
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
                Measured at initial dropout triage detection.
              </p>
            </div>

            {/* Current Score Card with Visual Indicator */}
            <div
              className={`p-5 border-[3px] border-[#0D0D0D] shadow-[3px_3px_0px_#0D0D0D] ${
                isImproving ? 'bg-[#E8F8F0]' : isWorsening ? 'bg-[#FDECEC]' : 'bg-neutral-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-[#0D0D0D]">
                  Current Risk Score
                </span>
                <span className="text-xs font-mono font-bold text-neutral-600">Post-Intervention</span>
              </div>
              <div className="flex items-baseline gap-1 mt-2">
                <span
                  className={`text-4xl md:text-5xl font-black font-mono ${
                    isImproving ? 'text-[#2D9D5F]' : isWorsening ? 'text-[#D62828]' : 'text-[#0D0D0D]'
                  }`}
                >
                  {data.currentScore}
                </span>
                <span className="text-sm font-bold text-neutral-500 font-mono">/100</span>
              </div>
              <div className="flex items-center gap-1.5 mt-2 font-black text-xs">
                {isImproving ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#2D9D5F] text-white border border-[#0D0D0D]">
                    <ArrowDown className="w-3.5 h-3.5" />
                    <span>{Math.abs(data.scoreDelta)} Points Reduction</span>
                  </span>
                ) : isWorsening ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#D62828] text-white border border-[#0D0D0D]">
                    <ArrowUp className="w-3.5 h-3.5" />
                    <span>+{data.scoreDelta} Points Escalation</span>
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

        {/* Intervention Specifics & Logistics */}
        <div className="p-4 bg-white border-2 border-[#0D0D0D] space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#0D0D0D]" />
            <h3 className="font-black text-xs uppercase tracking-wider text-[#0D0D0D]">
              Assigned Intervention Details
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-2.5 bg-neutral-50 border border-[#0D0D0D]">
              <span className="text-neutral-500 font-bold block text-[10px] uppercase">
                Program Type
              </span>
              <span className="font-black text-[#0D0D0D]">{data.intervention.type}</span>
            </div>

            <div className="p-2.5 bg-neutral-50 border border-[#0D0D0D]">
              <span className="text-neutral-500 font-bold block text-[10px] uppercase">
                Curriculum / Subject
              </span>
              <span className="font-bold text-[#0D0D0D]">
                {String(data.intervention.details.subject || 'Core Foundation')}
              </span>
            </div>

            <div className="p-2.5 bg-neutral-50 border border-[#0D0D0D]">
              <span className="text-neutral-500 font-bold block text-[10px] uppercase">
                Schedule Cadence
              </span>
              <span className="font-bold text-[#0D0D0D]">
                {String(data.intervention.details.schedule || 'Weekly check-in')}
              </span>
            </div>
          </div>
        </div>

        {/* Resolution Action Area */}
        <div className="pt-2 border-t-2 border-[#0D0D0D] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-neutral-600 font-medium">
            {isResolved
              ? 'This intervention is officially flagged as resolved and archived.'
              : 'When the student completes the requirement and stabilizes, mark as resolved.'}
          </div>

          <div className="flex items-center gap-3">
            <button
              id="mark-resolved-btn"
              onClick={handleToggleResolved}
              className={`neo-btn px-5 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 ${
                isResolved
                  ? 'bg-neutral-100 text-[#0D0D0D] hover:bg-neutral-200'
                  : 'bg-[#2D9D5F] text-white hover:bg-[#25824e]'
              }`}
            >
              {isResolved ? (
                <>
                  <RotateCcw className="w-4 h-4" />
                  <span>Re-open Intervention</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Mark as Resolved</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
