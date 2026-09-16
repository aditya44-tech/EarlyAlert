import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

interface TrendChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  title?: string;
  unit?: string;
  lineColor?: string;
  targetThreshold?: number;
  thresholdLabel?: string;
  height?: number;
  yDomain?: [number, number];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
  unit?: string;
}

const CustomNeoTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, unit = '' }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border-[3px] border-[#0D0D0D] shadow-[4px_4px_0px_#0D0D0D] p-2.5 text-xs">
        <p className="font-extrabold text-[#0D0D0D] uppercase tracking-wider">{label}</p>
        <p className="font-black text-sm text-[#D62828] mt-0.5">
          {payload[0].value}
          <span className="text-xs text-[#0D0D0D] ml-0.5">{unit}</span>
        </p>
      </div>
    );
  }
  return null;
};

export const TrendChart: React.FC<TrendChartProps> = ({
  data,
  xKey,
  yKey,
  title,
  unit = '',
  lineColor = '#D62828',
  targetThreshold,
  thresholdLabel,
  height = 240,
  yDomain = [0, 100],
}) => {
  return (
    <div className="w-full">
      {title && (
        <div className="flex items-center justify-between mb-3 border-b-2 border-[#0D0D0D] pb-1.5">
          <h4 className="font-black text-sm uppercase tracking-wider text-[#0D0D0D]">{title}</h4>
          {targetThreshold !== undefined && (
            <span className="text-xs font-bold text-neutral-600 bg-neutral-100 px-2 py-0.5 border border-[#0D0D0D]">
              Target: {targetThreshold}{unit}
            </span>
          )}
        </div>
      )}

      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
            <CartesianGrid stroke="#0D0D0D" strokeDasharray="3 3" strokeOpacity={0.2} />
            <XAxis
              dataKey={xKey}
              stroke="#0D0D0D"
              strokeWidth={2}
              tick={{ fill: '#0D0D0D', fontSize: 11, fontWeight: 700 }}
              tickLine={{ stroke: '#0D0D0D', strokeWidth: 2 }}
            />
            <YAxis
              domain={yDomain}
              stroke="#0D0D0D"
              strokeWidth={2}
              tick={{ fill: '#0D0D0D', fontSize: 11, fontWeight: 700 }}
              tickLine={{ stroke: '#0D0D0D', strokeWidth: 2 }}
            />
            <Tooltip content={<CustomNeoTooltip unit={unit} />} />
            {targetThreshold !== undefined && (
              <ReferenceLine
                y={targetThreshold}
                stroke="#0D0D0D"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={
                  thresholdLabel
                    ? {
                        value: thresholdLabel,
                        fill: '#0D0D0D',
                        fontSize: 10,
                        fontWeight: 'bold',
                        position: 'insideBottomRight',
                      }
                    : undefined
                }
              />
            )}
            <Line
              type="linear"
              dataKey={yKey}
              stroke={lineColor}
              strokeWidth={3.5}
              dot={{
                r: 5,
                fill: '#FFFFFF',
                stroke: '#0D0D0D',
                strokeWidth: 2.5,
              }}
              activeDot={{
                r: 7,
                fill: lineColor,
                stroke: '#0D0D0D',
                strokeWidth: 3,
              }}
              isAnimationActive={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
