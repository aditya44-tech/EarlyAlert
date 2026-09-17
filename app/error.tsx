'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F0E8]">
      <div className="neo-card p-10 max-w-md text-center">
        <h1 className="text-4xl font-black text-[#0D0D0D] mb-2">Something went wrong</h1>
        <p className="text-neutral-600 font-semibold mb-6 text-sm">{error.message || 'An unexpected error occurred.'}</p>
        <button
          onClick={reset}
          className="px-6 py-2.5 bg-[#0D0D0D] text-white font-bold uppercase tracking-wide border-2 border-[#0D0D0D] shadow-[4px_4px_0px_#555] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
