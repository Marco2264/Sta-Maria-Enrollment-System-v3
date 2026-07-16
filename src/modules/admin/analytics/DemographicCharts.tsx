import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, Label } from 'recharts';

interface DemographicData {
  ipGroups: { name: string; count: number }[];
  totalIp: number;
  total4ps: number;
  motherTongues: { name: string; count: number }[];
  religions: { name: string; count: number }[];
  totalStudents: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

export function DemographicCharts({ data }: { data: DemographicData }) {
  const { ipGroups, totalIp, total4ps, motherTongues, religions, totalStudents } = data;

  // Derive binary data for 4Ps
  const fourPsData = [
    { name: '4Ps Beneficiary', value: total4ps },
    { name: 'Non-4Ps', value: totalStudents - total4ps }
  ];

  // Custom Legend Formatter to append the count
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderLegendText = (value: string, entry: any) => {
    const { payload } = entry;
    const count = payload.count !== undefined ? payload.count : payload.value;
    return <span className="text-slate-700 font-medium">{value} ({count})</span>;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="flex flex-col h-[320px]">
        <h4 className="text-sm font-bold text-slate-700 mb-2 text-center">Indigenous Peoples (IP)</h4>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={ipGroups.length > 0 ? ipGroups : [{ name: 'No Data', count: 0, value: 1 }]}
                cx="50%"
                cy="45%"
                innerRadius={70}
                outerRadius={95}
                paddingAngle={2}
                dataKey={ipGroups.length > 0 ? "count" : "value"}
              >
                {(ipGroups.length > 0 ? ipGroups : [{ name: 'No Data', count: 0, value: 1 }]).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={ipGroups.length > 0 ? COLORS[index % COLORS.length] : '#f1f5f9'} />
                ))}
                <Label value={totalIp.toString()} position="centerBottom" className="text-3xl font-bold fill-slate-800" dy={-5} />
                <Label value="TOTAL IP" position="centerTop" className="text-[10px] fill-slate-500 font-bold uppercase tracking-widest" dy={18} />
              </Pie>
              <Tooltip formatter={(value) => [`${Number(value)} Students`, 'Count']} />
              <Legend verticalAlign="bottom" height={48} iconType="circle" wrapperStyle={{ fontSize: '11px', lineHeight: '20px' }} formatter={renderLegendText} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex flex-col h-[320px]">
        <h4 className="text-sm font-bold text-slate-700 mb-2 text-center">4Ps Beneficiaries</h4>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={fourPsData}
                cx="50%"
                cy="45%"
                innerRadius={70}
                outerRadius={95}
                paddingAngle={2}
                dataKey="value"
              >
                <Cell fill="#10b981" />
                <Cell fill="#cbd5e1" />
                <Label value={totalStudents.toString()} position="centerBottom" className="text-3xl font-bold fill-slate-800" dy={-5} />
                <Label value="TOTAL" position="centerTop" className="text-[10px] fill-slate-500 font-bold uppercase tracking-widest" dy={18} />
              </Pie>
              <Tooltip formatter={(value) => [`${Number(value)} Students`, 'Count']} />
              <Legend verticalAlign="bottom" height={48} iconType="circle" wrapperStyle={{ fontSize: '11px', lineHeight: '20px' }} formatter={renderLegendText} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex flex-col h-[320px]">
        <h4 className="text-sm font-bold text-slate-700 mb-2 text-center">Mother Tongue</h4>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={motherTongues.length > 0 ? motherTongues : [{ name: 'No Data', count: 0, value: 1 }]}
                cx="50%"
                cy="45%"
                innerRadius={70}
                outerRadius={95}
                paddingAngle={2}
                dataKey={motherTongues.length > 0 ? "count" : "value"}
              >
                {(motherTongues.length > 0 ? motherTongues : [{ name: 'No Data', count: 0, value: 1 }]).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={motherTongues.length > 0 ? COLORS[(index + 2) % COLORS.length] : '#f1f5f9'} />
                ))}
                <Label value={totalStudents.toString()} position="centerBottom" className="text-3xl font-bold fill-slate-800" dy={-5} />
                <Label value="TOTAL" position="centerTop" className="text-[10px] fill-slate-500 font-bold uppercase tracking-widest" dy={18} />
              </Pie>
              <Tooltip formatter={(value) => [`${Number(value)} Students`, 'Count']} />
              <Legend verticalAlign="bottom" height={60} iconType="circle" wrapperStyle={{ fontSize: '11px', lineHeight: '20px' }} formatter={renderLegendText} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="flex flex-col h-[320px] lg:col-span-3">
        <h4 className="text-sm font-bold text-slate-700 mb-2 text-center">Religious Affiliation</h4>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={religions.length > 0 ? religions : [{ name: 'No Data', count: 0, value: 1 }]}
                cx="50%"
                cy="45%"
                innerRadius={70}
                outerRadius={95}
                paddingAngle={2}
                dataKey={religions.length > 0 ? "count" : "value"}
              >
                {(religions.length > 0 ? religions : [{ name: 'No Data', count: 0, value: 1 }]).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={religions.length > 0 ? COLORS[(index + 4) % COLORS.length] : '#f1f5f9'} />
                ))}
                <Label value={totalStudents.toString()} position="centerBottom" className="text-3xl font-bold fill-slate-800" dy={-5} />
                <Label value="TOTAL" position="centerTop" className="text-[10px] fill-slate-500 font-bold uppercase tracking-widest" dy={18} />
              </Pie>
              <Tooltip formatter={(value) => [`${Number(value)} Students`, 'Count']} />
              <Legend verticalAlign="bottom" height={60} iconType="circle" wrapperStyle={{ fontSize: '11px', lineHeight: '20px' }} formatter={renderLegendText} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
