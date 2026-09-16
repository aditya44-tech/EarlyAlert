"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { useEarlyAlert } from '@/app/providers';
import { MentorActionPanel } from '@/views/MentorActionPanel';
import { StudentDetail } from '@/lib/types';

export default function MentorActionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { authUser, fetchStudentDetail, handleInterventionAssigned } = useEarlyAlert();
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

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      <MentorActionPanel
        studentId={detail.studentId}
        studentName={detail.name}
        riskScore={detail.riskScore}
        suggestedAction={detail.suggestedAction}
        dominantFactor={detail.contributingFactors[0]?.factor ?? 'Risk Factors'}
        onBack={() => router.push(`/dashboard/student/${id}`)}
        onSubmitSuccess={handleInterventionAssigned}
        onNavigateToOutcomeView={(sid) => router.push(`/dashboard/student/${sid}/outcome`)}
      />
    </div>
  );
}
