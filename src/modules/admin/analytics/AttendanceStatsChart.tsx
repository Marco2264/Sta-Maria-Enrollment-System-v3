import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector } from 'recharts';
import { AttendanceStatData } from '../../../lib/services/analyticsService';

interface AttendanceStatsChartProps {
  data: AttendanceStatData[];
}

const COLORS = {
  Present: '#D8232A',
  Late: '#F0555B',
  Absent: '#F8A1A5'
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderActiveShape = (props: any) => {
  const RADIAN = Math.PI / 180;
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} fontSize={16} fontWeight="bold">
        {payload.status}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 10}
        outerRadius={outerRadius + 14}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#334155" fontSize={14} fontWeight="600">{`${value}`}</text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#94a3b8" fontSize={12}>
        {`(${(percent * 100).toFixed(1)}%)`}
      </text>
    </g>
  );
};

export const AttendanceStatsChart: React.FC<AttendanceStatsChartProps> = React.memo(({ data }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[250px] flex items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl">
        No attendance data available.
      </div>
    );
  }

  // Ensure data has non-zero values to avoid chart crash
  const hasData = data.some(d => d.count > 0);

  if (!hasData) {
    return (
      <div className="w-full h-[250px] flex items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl text-sm">
        No attendance records found.
      </div>
    );
  }

  return (
    <div className="w-full h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            // @ts-expect-error recharts types issue with activeIndex
            activeIndex={activeIndex}
            activeShape={renderActiveShape}
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            dataKey="count"
            onMouseEnter={onPieEnter}
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[entry.status as keyof typeof COLORS] || '#cbd5e1'} 
              />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
            itemStyle={{ fontWeight: 'bold' }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any, name: any) => [`${value} Students`, name]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
});
