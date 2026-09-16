"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEarlyAlert } from '@/app/providers';
import { StudentDetailView } from '@/views/StudentDetailView';
import { StudentDetail } from '@/lib/types';

export default function MentorStudentDetailPage({ params }: { params: { id: string } }) {
  const { authUser, fetchStudentDetail, studentStatusData, outcomeDataMap, students } = useEarlyAlert();
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
    if (params.id) {
      fetchStudentDetail(params.id).then(d => {
        if (d) setDetail(d);
      });
    }
  }, [params.id, fetchStudentDetail]);

  if (!authUser || authUser.role !== 'mentor' || !detail) return null;

  // Determine if there is an active intervention
  const hasIntervention =
    Boolean(detail.activeIntervention) ||
    detail.interventionStatus !== 'None';

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      <StudentDetailView
        student={detail}
        hasIntervention={hasIntervention}
        onBackToDashboard={() => router.push('/dashboard')}
        onAssignAction={(id) => router.push(`/dashboard/student/${id}/action`)}
        onViewInterventions={(id) => router.push(`/dashboard/student/${id}/outcome`)}
      />
    </div>
  );
}
