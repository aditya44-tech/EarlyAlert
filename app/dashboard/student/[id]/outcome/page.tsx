"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { useEarlyAlert } from '@/app/providers';
import { OutcomeComparisonView } from '@/views/OutcomeComparisonView';
import { StudentDetail, OutcomeComparisonData } from '@/lib/types';

export default function MentorOutcomePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { authUser, fetchStudentDetail, handleResolveIntervention } = useEarlyAlert();
  const router = useRouter();
  const [detail, setDetail] = useState<StudentDetail | null>(null);

  useEffect(() => {
    if (!authUser) {
      router.push('/');
    } else if (authUser.role !== 'mentor') {
      router.push('/student');
    }
  }, [authUser, router]);

  useEffect(() => {
    if (id) {
      fetchStudentDetail(id).then(d => {
        if (d) setDetail(d);
      });
    }
  }, [id, fetchStudentDetail]);

  if (!authUser || authUser.role !== 'mentor' || !detail) return null;

  const outcomeData: OutcomeComparisonData = {
    studentId: detail.studentId,
    name: detail.name,
    intervention: {
      type: detail.activeIntervention?.type ?? detail.suggestedAction?.split('/')[0]?.trim() ?? 'Monitor',
      details: detail.activeIntervention?.details ?? { subject: 'Pending Configuration', schedule: 'TBD' },
      startDate: detail.activeIntervention?.assignedDate ?? new Date().toISOString().split('T')[0],
    },
    baselineScore: detail.riskScore,
    currentScore: detail.riskScore,
    scoreDelta: 0,
    outcome: 'No Change',
    checkpointDate: new Date().toISOString().split('T')[0],
  };

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
