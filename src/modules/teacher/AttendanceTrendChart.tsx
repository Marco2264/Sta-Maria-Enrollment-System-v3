import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AttendanceTrendChartProps {
  data: {
    dateStr: string;
    present: number;
    absent: number;
  }[];
}

export const AttendanceTrendChart: React.FC<AttendanceTrendChartProps> = React.memo(({ data }) => {
  const gradientId = useMemo(() => "colorPresent_" + Math.random().toString(36).substr(2, 9), []);

  const chartData = useMemo(() => {
    return (data || []).map(d => {
      const p = d.present || 0;
      const ab = d.absent || 0;
      const total = p + ab;
      const rate = total > 0 ? Math.round((p / total) * 100) : 0;
      return {
        dateStr: d.dateStr || 'Unknown',
        rate
      };
    });
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[300px] flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl relative">
        <p className="text-sm font-medium z-10 bg-white/80 px-4 py-2 rounded-full shadow-sm">No historical attendance data available yet.</p>
        <svg viewBox="0 0 1000 250" preserveAspectRatio="none" className="absolute inset-0 w-full h-full opacity-30 grayscale pointer-events-none">
          <defs>
            <linearGradient id="tg1_placeholder" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#94a3b8" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,180 C200,250 300,80 500,160 C700,240 800,80 1000,120 L1000,250 L0,250 Z" fill="url(#tg1_placeholder)" />
          <path d="M0,180 C200,250 300,80 500,160 C700,240 800,80 1000,120" fill="none" stroke="#94a3b8" strokeWidth="2" opacity="0.8" />
        </svg>
      </div>
    );
  }

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{
            top: 10,
            right: 10,
            left: -20,
            bottom: 0,
          }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#D8232A" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#D8232A" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="dateStr" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748b', fontSize: 12 }} 
            dy={10} 
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748b', fontSize: 12 }} 
            domain={[0, 100]}
            unit="%"
          />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
            itemStyle={{ fontWeight: 'bold' }}
            cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3' }}
            formatter={(value: any) => [`${value}%`, 'Attendance Rate']}
          />
          <Area 
            type="monotone" 
            dataKey="rate" 
            name="Attendance Rate"
            stroke="#D8232A" 
            strokeWidth={3}
            fillOpacity={1} 
            fill={`url(#${gradientId})`} 
            activeDot={{ r: 6, fill: '#D8232A', stroke: '#fff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});
