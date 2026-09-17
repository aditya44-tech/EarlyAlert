"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { useEarlyAlert } from '@/app/providers';
import { StudentDetailView } from '@/views/StudentDetailView';
import { StudentDetail } from '@/lib/types';

export default function MentorStudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { authUser, fetchStudentDetail } = useEarlyAlert();
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

  const hasIntervention =
    Boolean(detail.activeIntervention) ||
    (Boolean(detail.interventionStatus) && detail.interventionStatus !== 'None');

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      <StudentDetailView
        student={detail}
        hasIntervention={hasIntervention}
        onBackToDashboard={() => router.push('/dashboard')}
        onAssignAction={(sid) => router.push(`/dashboard/student/${sid}/action`)}
        onViewInterventions={(sid) => router.push(`/dashboard/student/${sid}/outcome`)}
      />
    </div>
  );
}
