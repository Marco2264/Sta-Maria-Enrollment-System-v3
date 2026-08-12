import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Heart, Activity, AlertTriangle, TrendingUp, Download } from 'lucide-react';
import { HealthAnalyticsService, HealthData, NutritionalStats } from '../../lib/services/healthAnalyticsService';
import { NutritionalStatsChart } from './analytics/NutritionalStatsChart';
import { useAuth } from '../../lib/AuthContext';
import { normalizeRole } from '../../lib/roles';
import { useAdminData } from '../../lib/adminData';

export function HealthDashboardView() {
  const [stats, setStats] = useState<NutritionalStats[]>([]);
  const [eligibleStudents, setEligibleStudents] = useState<HealthData[]>([]);
  const [loading, setLoading] = useState(true);

  const { role: currentUserRole, userData } = useAuth();
  const { sections } = useAdminData();
  const isSubAdmin = normalizeRole(currentUserRole) === 'subadmin';
  const assignedGrade = isSubAdmin ? (userData?.assignedGrade as string | undefined) : undefined;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [nutritionalStats, feedingEligible] = await Promise.all([
        HealthAnalyticsService.getNutritionalStats(assignedGrade),
        HealthAnalyticsService.getFeedingProgramEligibility(assignedGrade)
      ]);
      setStats(nutritionalStats);
      setEligibleStudents(feedingEligible);
      setLoading(false);
    };

    fetchData();
  }, [assignedGrade]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  const totalAssessed = stats.reduce((acc, curr) => acc + curr.count, 0);
  const eligibleCount = eligibleStudents.length;
  const obeseCount = stats.find(s => s.status === 'Obese')?.count || 0;

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <header className="h-[72px] px-6 sm:px-8 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex flex-row items-center justify-between gap-4 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-emerald-600">
              <Heart className="w-6 h-6" />
              <h1 className="text-lg font-bold tracking-tight text-slate-900">Health & Nutrition</h1>
            </div>
            <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>
            <p className="text-xs text-slate-500 max-w-md hidden lg:block truncate">
              Monitor student nutritional status, BMI trends, and manage feeding program eligibility based on DepEd standards.
            </p>
          </div>
          <Button
            variant="outline"
            className="w-full sm:w-auto rounded-xl px-6 bg-white shadow-sm border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-semibold transition-all"
            onClick={() => window.print()}
          >
            <Download className="w-4 h-4 mr-2" />
            Export Summary
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
        {/* KPI Cards */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200/50 p-6 rounded-2xl shadow-sm relative overflow-hidden">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-inner bg-blue-200/50 text-blue-600">
                <Activity className="w-6 h-6" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-slate-800">{totalAssessed}</p>
              <p className="text-sm font-semibold uppercase tracking-wider text-slate-600">Total Assessed</p>
              <div className="flex items-center gap-1.5 pt-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-medium text-blue-600">Students with BMI data</span>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-red-200/50 p-6 rounded-2xl shadow-sm relative overflow-hidden">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-inner bg-red-200/50 text-red-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-slate-800">{eligibleCount}</p>
              <p className="text-sm font-semibold uppercase tracking-wider text-slate-600">Feeding Program</p>
              <div className="flex items-center gap-1.5 pt-2">
                <span className="text-xs font-medium text-red-600">Eligible (Severely Wasted / Wasted)</span>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200/50 p-6 rounded-2xl shadow-sm relative overflow-hidden">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-inner bg-purple-200/50 text-purple-600">
                <Heart className="w-6 h-6" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-slate-800">{obeseCount}</p>
              <p className="text-sm font-semibold uppercase tracking-wider text-slate-600">Obese / Overweight</p>
              <div className="flex items-center gap-1.5 pt-2">
                <span className="text-xs font-medium text-purple-600">Requires health counseling</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 lg:gap-8 grid-cols-1 lg:grid-cols-2">
          {/* Chart Section */}
          <Card className="bg-white border-slate-200/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">Nutritional Status</h3>
              <p className="text-sm text-slate-500 mt-1">Distribution of BMI categories</p>
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <NutritionalStatsChart data={stats} />
            </div>
          </Card>

          {/* Feeding Program Eligibility Table */}
          <Card className="bg-white border-slate-200/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">Feeding Program Candidates</h3>
              <p className="text-sm text-slate-500 mt-1">Students classified as Severely Wasted or Wasted</p>
            </div>
            <div className="p-0 flex-1 overflow-x-auto">
              {eligibleStudents.length > 0 ? (
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-medium">
                    <tr>
                      <th className="px-6 py-3">Student Name</th>
                      <th className="px-6 py-3">Grade/Section</th>
                      <th className="px-6 py-3">BMI</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {eligibleStudents.slice(0, 10).map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-3 font-medium text-slate-700">{student.name}</td>
                        <td className="px-6 py-3 text-slate-600">
                          {student.gradeLevel} 
                          {student.sectionId ? ` (${sections.find(s => s.id === student.sectionId)?.name || student.sectionId})` : ''}
                        </td>
                        <td className="px-6 py-3 text-slate-600 font-mono">{student.bmi.toFixed(2)}</td>
                        <td className="px-6 py-3">
                          <Badge variant="outline" className={student.nutritionalStatus === 'Severely Wasted' ? 'text-red-600 bg-red-50 border-red-200' : 'text-amber-600 bg-amber-50 border-amber-200'}>
                            {student.nutritionalStatus}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                    <Heart className="w-8 h-8 text-emerald-300" />
                  </div>
                  <h4 className="text-slate-700 font-bold mb-1">No Eligible Students</h4>
                  <p className="text-sm text-slate-500">Currently, no students fall into the feeding program categories.</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
