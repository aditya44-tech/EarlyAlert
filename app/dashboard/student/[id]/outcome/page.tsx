"use client";

import { useCallback, useEffect, useRef, useState, useReducer } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { useSentinel } from '@/app/providers';
import { OutcomeComparisonView } from '@/views/OutcomeComparisonView';
import { StudentDetail, OutcomeComparisonData } from '@/lib/types';

function buildOutcomeData(detail: StudentDetail): OutcomeComparisonData | null {
  if (!detail.activeIntervention) return null;

  const intervention = detail.activeIntervention;

  // The baseline is the risk score recorded when the intervention was assigned.
  // If a legacy record never stored one, the loader freezes the current score
  // into it exactly once (see the effect below), so from then on "before" is
  // fixed — it never tracks the current score.
  const baselineScore: number = intervention.baselineRiskScore ?? detail.riskScore;
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
    status: intervention.status,
  };
}

export default function MentorOutcomePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const {
    authUser,
    fetchStudentDetail,
    handleResolveIntervention,
    handleReopenIntervention,
  } = useSentinel();
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

  // Kept in a ref so `load` can stay stable: fetchStudentDetail gets a new
  // identity on every provider render, which would otherwise re-trigger the
  // effect (and, with `force`, loop forever).
  const fetchDetailRef = useRef(fetchStudentDetail);
  useEffect(() => {
    fetchDetailRef.current = fetchStudentDetail;
  });

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    let student = await fetchDetailRef.current(id, { force: true });

    // One-time repair: an intervention stored without a baseline would otherwise
    // read its "before" from the moving current score.
    if (student?.activeIntervention && typeof student.activeIntervention.baselineRiskScore !== 'number') {
      const healed = { ...student.activeIntervention, baselineRiskScore: student.riskScore };
      try {
        await fetch(`/api/students/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activeIntervention: healed }),
        });
      } catch (e) {
        console.error('Failed to persist intervention baseline', e);
      }
      student = { ...student, activeIntervention: healed };
    }

    setDetail(student);
    setLoading(false);
  }, [id]);

  // Reload the student record whenever it changes on the server AND after the
  // outcome view has had a chance to render the optimistic local state.
  const [, forceLoad] = useReducer((n: number) => n + 1, 0);
  const outcomeStatusRef = useRef<string>('');
  useEffect(() => {
    outcomeStatusRef.current = detail?.activeIntervention?.status ?? '';
  }, [detail?.activeIntervention?.status]);
  useEffect(() => {
    if (detail?.activeIntervention) {
      const current = outcomeStatusRef.current;
      const next = detail.activeIntervention.status;
      if (current !== next) {
        forceLoad();
      }
    }
  }, [detail?.activeIntervention?.status]);

  useEffect(() => {
    load();
  }, [load]);  const handleResolve = async (studentId: string) => {
    await handleResolveIntervention(studentId);
    // Let the optimistic UI render first, then verify against the real store.
    await new Promise((r) => setTimeout(r, 350));
    const fresh = await fetchStudentDetail(studentId, { force: true });
    if (fresh) setDetail(fresh);
  };

  const handleReopen = async (studentId: string) => {
    await handleReopenIntervention(studentId);
    await new Promise((r) => setTimeout(r, 350));
    const fresh = await fetchStudentDetail(studentId, { force: true });
    if (fresh) setDetail(fresh);
  };

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
        onResolveIntervention={handleResolve}
        onReopenIntervention={handleReopen}
      />
    </div>
  );
}
