import React from 'react';
import { ContributingFactor } from '../types';

interface FactorBreakdownListProps {
  factors: ContributingFactor[];
}

export const FactorBreakdownList: React.FC<FactorBreakdownListProps> = ({ factors }) => {
  return (
    <div className="w-full">
      <div className="border-[3px] border-[#0D0D0D] bg-white shadow-[4px_4px_0px_#0D0D0D]">
        <div className="grid grid-cols-12 bg-[#0D0D0D] text-white p-3 font-black text-xs uppercase tracking-wider">
          <div className="col-span-4 md:col-span-3">Risk Factor</div>
          <div className="col-span-2 md:col-span-2 text-center">Impact Pts</div>
          <div className="col-span-6 md:col-span-7">Diagnostic Reason</div>
        </div>

        <div className="divide-y-2 divide-[#0D0D0D]">
          {factors.map((item, idx) => {
            const isHighImpact = item.points >= 20;
            const isMediumImpact = item.points > 5 && item.points < 20;

            return (
              <div
                key={idx}
                id={`factor-row-${idx}`}
                className="grid grid-cols-12 p-3 items-center hover:bg-[#FFFDF5] transition-colors"
              >
                <div className="col-span-4 md:col-span-3 font-bold text-sm text-[#0D0D0D] flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 border border-[#0D0D0D] shrink-0 ${
                      isHighImpact
                        ? 'bg-[#D62828]'
                        : isMediumImpact
                        ? 'bg-[#F4C430]'
                        : 'bg-neutral-300'
                    }`}
                  />
                  <span>{item.factor}</span>
                </div>

                <div className="col-span-2 md:col-span-2 text-center">
                  <span
                    className={`inline-block font-mono font-black text-xs px-2 py-0.5 border-[2px] border-[#0D0D0D] shadow-[1px_1px_0px_#0D0D0D] ${
                      item.points > 0
                        ? isHighImpact
                          ? 'bg-[#D62828] text-white'
                          : 'bg-[#F4C430] text-[#0D0D0D]'
                        : 'bg-neutral-100 text-neutral-500'
                    }`}
                  >
                    +{item.points} pts
                  </span>
                </div>

                <div className="col-span-6 md:col-span-7 text-xs md:text-sm text-neutral-800 font-medium">
                  {item.reason}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
