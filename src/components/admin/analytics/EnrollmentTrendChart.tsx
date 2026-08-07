import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { EnrollmentTrendData } from '../../../lib/services/analyticsService';

interface EnrollmentTrendChartProps {
  data: EnrollmentTrendData[];
}

export const EnrollmentTrendChart: React.FC<EnrollmentTrendChartProps> = React.memo(({ data }) => {
  // Use a stable ID for the gradient to prevent re-renders breaking the SVG
  const gradientId = useMemo(() => "colorEnrolled_" + Math.random().toString(36).substr(2, 9), []);

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl">
        No enrollment data available for trends.
      </div>
    );
  }

  return (
    <div className="w-full h-[300px] p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 10,
            left: -20,
            bottom: 0,
          }}
          barGap={4}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="month" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748b', fontSize: 12 }} 
            dy={10} 
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748b', fontSize: 12 }} 
          />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
            itemStyle={{ fontWeight: 'bold' }}
            cursor={{ fill: '#f1f5f9' }}
          />
          <Legend 
            verticalAlign="top" 
            height={36} 
            iconType="circle"
            wrapperStyle={{ fontSize: '12px', color: '#64748b' }}
          />
          <Bar 
            dataKey="previousYear" 
            name="Previous Year" 
            fill="#94a3b8" 
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
          <Bar 
            dataKey="currentYear" 
            name="Current Year" 
            fill="#D8232A" 
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});
