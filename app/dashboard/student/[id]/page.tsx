"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { useSentinel } from '@/app/providers';
import { StudentDetailView } from '@/views/StudentDetailView';
import { StudentDetail } from '@/lib/types';

export default function MentorStudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { authUser, fetchStudentDetail, dataVersion } = useSentinel();
  const router = useRouter();
  const [detail, setDetail] = useState<StudentDetail | null>(null);

  // `fetchStudentDetail` is recreated on every provider render, so hold it in a
  // ref: using it as an effect dependency re-triggered the fetch in a loop.
  const fetchRef = useRef(fetchStudentDetail);
  fetchRef.current = fetchStudentDetail;

  useEffect(() => {
    if (!authUser) {
      router.push('/');
    } else if (authUser.role !== 'mentor') {
      router.push('/student');
    }
  }, [authUser, router]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    // Always read the live record: after a reset (or an upload/delete) the
    // student may have been wiped, and a cached copy would keep showing the old
    // intervention status.
    fetchRef.current(id, { force: true }).then(d => {
      if (cancelled) return;
      if (d) {
        setDetail(d);
      } else {
        setDetail(null);
        router.push('/dashboard');
      }
    });

    return () => { cancelled = true; };
  }, [id, dataVersion, router]);

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
