"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEarlyAlert } from '@/app/providers';
import { StudentFacingStatusView } from '@/views/StudentFacingStatusView';
import { StudentStatusData, StudentDetail } from '@/lib/types';

export default function StudentPortalPage() {
  const { authUser, fetchStudentDetail } = useEarlyAlert();
  const router = useRouter();
  const [detail, setDetail] = useState<StudentDetail | null>(null);

  useEffect(() => {
    if (!authUser) {
      router.push('/');
    } else if (authUser.role !== 'student') {
      router.push('/dashboard');
    }
  }, [authUser, router]);

  useEffect(() => {
    if (authUser?.role === 'student' && authUser.studentId) {
      fetchStudentDetail(authUser.studentId).then(d => {
        if (d) setDetail(d);
      });
    }
  }, [authUser, fetchStudentDetail]);

  if (!authUser || authUser.role !== 'student' || !detail) return null;

  const currentStudentStatus: StudentStatusData = {
    studentId: authUser.studentId!,
    name: authUser.name,
    activeIntervention: detail.activeIntervention ?? null,
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      <StudentFacingStatusView
        statusData={currentStudentStatus}
        studentDetail={detail}
      />
    </div>
  );
}
