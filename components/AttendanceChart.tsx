import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from 'recharts';

interface SubjectEntry {
  subject: string;
  percentage: number;
}

interface AttendanceEntry {
  week: string;
  percentage: number;
  subjects?: SubjectEntry[];
}

interface AttendanceChartProps {
  data: AttendanceEntry[];
  height?: number;
  yDomain?: [number, number];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}

const SUBJECT_COLORS: Record<string, string> = {
  'DBMS': '#2563EB',
  'Computer Network': '#059669',
  'Python Programming': '#D97706',
  'Data Structures': '#7C3AED',
  'Computational Math': '#DC2626',
};

const DEFAULT_COLORS = ['#2563EB', '#059669', '#D97706', '#7C3AED', '#DC2626'];

const CustomNeoTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white border-[3px] border-[#0D0D0D] shadow-[4px_4px_0px_#0D0D0D] p-3 text-xs max-w-[220px]">
      <p className="font-extrabold text-[#0D0D0D] uppercase tracking-wider mb-1">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center justify-between gap-2 mt-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border border-[#0D0D0D]" style={{ backgroundColor: entry.color }} />
            <span className="font-medium text-[#0D0D0D]">{entry.name}</span>
          </div>
          <span className="font-black text-[#0D0D0D]">{entry.value}%</span>
        </div>
      ))}
    </div>
  );
};

/** Extract numeric part from a week label */
function weekSortKey(label: string): number {
  if (!label) return 999;
  const lower = label.toLowerCase();
  if (lower === 'initial') return 0;
  const match = lower.match(/\d+/);
  return match ? parseInt(match[0], 10) : 999;
}

export const AttendanceChart: React.FC<AttendanceChartProps> = ({
  data,
  height = 260,
  yDomain = [40, 100],
}) => {
  const sortedData = [...data].sort((a, b) => weekSortKey(a.week) - weekSortKey(b.week));

  // Collect all unique subjects across all weeks
  const allSubjects = new Set<string>();
  sortedData.forEach(entry => {
    entry.subjects?.forEach(s => allSubjects.add(s.subject));
  });
  const subjectList = Array.from(allSubjects);

  // Transform data for Recharts — flatten subjects into top-level keys
  const chartData = sortedData.map(entry => {
    const row: Record<string, unknown> = {
      week: entry.week,
      percentage: entry.percentage,
    };
    entry.subjects?.forEach(s => {
      row[s.subject] = s.percentage;
    });
    return row;
  });

  if (chartData.length === 0) {
    return (
      <div className="w-full flex items-center justify-center" style={{ height }}>
        <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">
          No data uploaded yet
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
            <defs>
              <linearGradient id="areaGradOverall" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#D62828" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#D62828" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#0D0D0D" strokeDasharray="3 3" strokeOpacity={0.2} />
            <XAxis
              dataKey="week"
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
            <Tooltip content={<CustomNeoTooltip />} />
            <ReferenceLine
              y={75}
              stroke="#0D0D0D"
              strokeDasharray="4 4"
              strokeWidth={2}
              label={{
                value: 'Min Required (75%)',
                fill: '#0D0D0D',
                fontSize: 10,
                fontWeight: 'bold',
                position: 'insideBottomRight',
              }}
            />
            {/* Overall attendance — thick red line with area */}
            <Area
              type="monotone"
              dataKey="percentage"
              fill="url(#areaGradOverall)"
              stroke="none"
              isAnimationActive={true}
            />
            <Line
              type="linear"
              dataKey="percentage"
              name="Overall"
              stroke="#D62828"
              strokeWidth={3.5}
              dot={{ r: 5, fill: '#FFFFFF', stroke: '#0D0D0D', strokeWidth: 2.5 }}
              activeDot={{ r: 7, fill: '#D62828', stroke: '#0D0D0D', strokeWidth: 3 }}
              isAnimationActive={true}
            />
            {/* Subject-level lines — thinner, colored */}
            {subjectList.map((subj, i) => (
              <Line
                key={subj}
                type="linear"
                dataKey={subj}
                name={subj}
                stroke={SUBJECT_COLORS[subj] || DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={{ r: 3, fill: '#FFFFFF', stroke: '#0D0D0D', strokeWidth: 1.5 }}
                activeDot={{ r: 5 }}
                isAnimationActive={true}
              />
            ))}
            <Legend
              wrapperStyle={{ fontSize: 11, fontWeight: 600 }}
              iconType="plainline"
              iconSize={16}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
