"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { useSentinel } from '@/app/providers';
import { OutcomeComparisonView } from '@/views/OutcomeComparisonView';
import { OutcomeComparisonData } from '@/lib/types';

export default function MentorOutcomePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { authUser, handleResolveIntervention } = useSentinel();
  const router = useRouter();
  const [outcomeData, setOutcomeData] = useState<OutcomeComparisonData | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!authUser) {
      router.push('/');
    } else if (authUser.role !== 'mentor') {
      router.push('/student');
    }
  }, [authUser, router]);

  useEffect(() => {
    if (id) {
      fetch(`/api/outcomes/${id}`)
        .then(res => {
          if (!res.ok) { setNotFound(true); return null; }
          return res.json();
        })
        .then(data => {
          if (data?.outcome) setOutcomeData(data.outcome);
        })
        .catch(() => setNotFound(true));
    }
  }, [id]);

  if (!authUser || authUser.role !== 'mentor') return null;

  if (notFound) {
    return (
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="neo-card p-8 bg-white text-center space-y-4">
          <p className="text-lg font-black text-[#0D0D0D]">No active intervention found for this student.</p>
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

  if (!outcomeData) {
    return (
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="neo-card p-8 bg-white text-center">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-neutral-200 rounded w-1/2 mx-auto" />
            <div className="h-4 bg-neutral-200 rounded w-3/4 mx-auto" />
          </div>
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
