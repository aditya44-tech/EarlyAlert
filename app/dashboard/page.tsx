"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useEarlyAlert } from '@/app/providers';
import { DashboardView } from '@/views/DashboardView';

export default function DashboardPage() {
  const { authUser, students, uploadHistory, handleDataUpload, handleClearAllData, handleDeleteUpload } = useEarlyAlert();
  const router = useRouter();

  useEffect(() => {
    if (!authUser) {
      router.push('/');
    } else if (authUser.role !== 'mentor') {
      router.push('/student');
    }
  }, [authUser, router]);

  if (!authUser || authUser.role !== 'mentor') return null;

  const handleSelectStudent = (studentId: string) => {
    router.push(`/dashboard/student/${studentId}`);
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      <DashboardView 
        students={students} 
        onSelectStudent={handleSelectStudent} 
        uploadHistory={uploadHistory}
        onDataUpload={handleDataUpload}
        onClearAllData={handleClearAllData}
        onDeleteUpload={handleDeleteUpload}
      />
    </div>
  );
}
