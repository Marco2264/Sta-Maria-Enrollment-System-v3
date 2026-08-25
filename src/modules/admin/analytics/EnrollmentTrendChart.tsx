import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { EnrollmentTrendData } from '../../../lib/services/analyticsService';

interface EnrollmentTrendChartProps {
  data: EnrollmentTrendData[];
  selectedYear?: string;
}

export const EnrollmentTrendChart: React.FC<EnrollmentTrendChartProps> = React.memo(({ data, selectedYear = '2026-2027' }) => {
  const currentStartYear = parseInt(selectedYear.split('-')[0], 10) || 2026;
  const previousStartYear = currentStartYear - 1;

  const currentLabel = `AY ${currentStartYear}-${currentStartYear + 1}`;
  const previousLabel = `AY ${previousStartYear}-${currentStartYear}`;

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
          barGap={6}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="month" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} 
            dy={10} 
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748b', fontSize: 12 }} 
          />
          <Tooltip 
            contentStyle={{ 
              borderRadius: '12px', 
              border: '1px solid #e2e8f0', 
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
              backgroundColor: '#ffffff',
              fontSize: '12px'
            }}
            formatter={(value: any, name: any) => [
              `${Number(value).toLocaleString()} Enrollees`, 
              name === 'currentYear' || name === currentLabel ? currentLabel : previousLabel
            ]}
            cursor={{ fill: '#f8fafc' }}
          />
          <Legend 
            verticalAlign="top" 
            height={36} 
            iconType="circle"
            wrapperStyle={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}
          />
          <Bar 
            dataKey="previousYear" 
            name={previousLabel} 
            fill="#94a3b8" 
            radius={[6, 6, 0, 0]}
            maxBarSize={36}
          />
          <Bar 
            dataKey="currentYear" 
            name={currentLabel} 
            fill="#D8232A" 
            radius={[6, 6, 0, 0]}
            maxBarSize={36}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});
