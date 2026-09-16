import React from 'react';
import { InterventionStatus } from '../types';

interface InterventionStatusBadgeProps {
  status: InterventionStatus | string;
  className?: string;
  size?: 'sm' | 'md';
}

export const InterventionStatusBadge: React.FC<InterventionStatusBadgeProps> = ({
  status,
  className = '',
  size = 'md',
}) => {
  if (status === 'None') {
    return (
      <span
        id="intervention-badge-none"
        className={`inline-flex items-center font-bold uppercase tracking-wider border-[2px] border-[#0D0D0D] bg-neutral-100 text-[#0D0D0D] shadow-[2px_2px_0px_#0D0D0D] ${
          size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1'
        } ${className}`}
      >
        No Action
      </span>
    );
  }

  if (status === 'Active') {
    return (
      <span
        id="intervention-badge-active"
        className={`inline-flex items-center gap-1 font-extrabold uppercase tracking-wider border-[2px] border-[#0D0D0D] bg-[#2563EB] text-white shadow-[2px_2px_0px_#0D0D0D] ${
          size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1'
        } ${className}`}
      >
        <span className="w-1.5 h-1.5 bg-white inline-block animate-pulse" />
        Intervention Active
      </span>
    );
  }

  if (status === 'Resolved') {
    return (
      <span
        id="intervention-badge-resolved"
        className={`inline-flex items-center font-extrabold uppercase tracking-wider border-[2px] border-[#0D0D0D] bg-[#10B981] text-white shadow-[2px_2px_0px_#0D0D0D] ${
          size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1'
        } ${className}`}
      >
        ✓ Resolved
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center font-bold uppercase tracking-wider border-[2px] border-[#0D0D0D] bg-white text-[#0D0D0D] shadow-[2px_2px_0px_#0D0D0D] text-xs px-2 py-0.5 ${className}`}
    >
      {status}
    </span>
  );
};
