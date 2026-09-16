import React from 'react';
import { RiskLevel } from '../types';

interface RiskBadgeProps {
  riskLevel: RiskLevel;
  riskScore?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  riskLevel,
  riskScore,
  className = '',
  size = 'md',
}) => {
  const getColors = () => {
    switch (riskLevel) {
      case 'High':
        return 'bg-[#D62828] text-white';
      case 'Medium':
        return 'bg-[#F4C430] text-[#0D0D0D]';
      case 'Low':
        return 'bg-[#2D9D5F] text-white';
      default:
        return 'bg-neutral-200 text-[#0D0D0D]';
    }
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 border-[2px]',
    md: 'text-xs sm:text-sm px-2.5 py-1 border-[2px]',
    lg: 'text-sm sm:text-base px-3.5 py-1.5 border-[3px]',
  };

  return (
    <span
      id={`risk-badge-${riskLevel.toLowerCase()}`}
      className={`inline-flex items-center gap-1.5 font-black uppercase tracking-wider border-[#0D0D0D] shadow-[2px_2px_0px_#0D0D0D] ${sizeClasses[size]} ${getColors()} ${className}`}
    >
      <span className="w-2 h-2 border border-[#0D0D0D] bg-current inline-block opacity-80" />
      <span>{riskLevel} Risk</span>
      {typeof riskScore === 'number' && (
        <span className="ml-1 pl-1 border-l border-current opacity-90 font-mono">
          {riskScore}/100
        </span>
      )}
    </span>
  );
};
