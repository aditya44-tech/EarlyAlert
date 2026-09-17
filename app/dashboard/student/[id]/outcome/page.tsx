"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { useSentinel } from '@/app/providers';
import { OutcomeComparisonView } from '@/views/OutcomeComparisonView';
import { StudentDetail, OutcomeComparisonData } from '@/lib/types';

function buildOutcomeData(detail: StudentDetail): OutcomeComparisonData | null {
  if (!detail.activeIntervention) return null;

  const intervention = detail.activeIntervention;

  // Baseline: stored when intervention was assigned (if available), else current score
  const baselineScore: number = (detail as any).baselineRiskScore ?? detail.riskScore;
  const currentScore = detail.riskScore;
  const scoreDelta = currentScore - baselineScore;

  let outcome: 'Improving' | 'No Change' | 'Worsening';
  if (scoreDelta < -2) outcome = 'Improving';
  else if (scoreDelta > 2) outcome = 'Worsening';
  else outcome = 'No Change';

  // Derive checkpoint date from most recent test date or attendance
  let checkpointDate = '__awaiting__';
  if ((detail.termTests ?? []).length > 0) {
    const dates = detail.termTests.map(t => t.date).filter(Boolean).sort();
    if (dates.length > 0) checkpointDate = dates[dates.length - 1];
  }
  if ((detail.attendanceHistory ?? []).length > 0) {
    checkpointDate = new Date().toISOString().split('T')[0];
  }

  return {
    studentId: detail.studentId,
    name: detail.name,
    intervention: {
      type: intervention.type,
      details: intervention.details as Record<string, unknown>,
      startDate: intervention.assignedDate,
    },
    baselineScore,
    currentScore,
    scoreDelta,
    outcome,
    checkpointDate,
  };
}

export default function MentorOutcomePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { authUser, fetchStudentDetail, handleResolveIntervention } = useSentinel();
  const router = useRouter();
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authUser) {
      router.push('/');
    } else if (authUser.role !== 'mentor') {
      router.push('/student');
    }
  }, [authUser, router]);

  useEffect(() => {
    if (id) {
      setLoading(true);
      fetchStudentDetail(id)
        .then(d => { if (d) setDetail(d); })
        .finally(() => setLoading(false));
    }
  }, [id, fetchStudentDetail]);

  if (!authUser || authUser.role !== 'mentor') return null;

  if (loading) {
    return (
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="neo-card p-8 bg-white text-center">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-neutral-200 rounded w-1/2 mx-auto" />
            <div className="h-4 bg-neutral-200 rounded w-3/4 mx-auto" />
            <div className="h-4 bg-neutral-200 rounded w-2/3 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  const outcomeData = detail ? buildOutcomeData(detail) : null;

  if (!outcomeData) {
    return (
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="neo-card p-8 bg-white text-center space-y-4">
          <p className="text-lg font-black text-[#0D0D0D]">
            No active intervention found for this student.
          </p>
          <p className="text-xs text-neutral-500 font-medium">
            Assign an intervention from the student&apos;s profile first.
          </p>
          <button
            onClick={() => router.push(`/dashboard/student/${id}`)}
            className="neo-btn px-4 py-2 bg-[#D62828] text-white text-xs font-black uppercase tracking-wider"
          >
            ← Back to Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      <OutcomeComparisonView
        data={outcomeData}
        onBack={() => router.push(`/dashboard/student/${id}`)}
        onResolveIntervention={handleResolveIntervention}
      />
    </div>
  );
}
