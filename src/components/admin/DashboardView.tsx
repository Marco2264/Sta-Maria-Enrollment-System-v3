import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
  Users,
  GraduationCap,
  Heart,
  Home,
  LayoutDashboard,
  TrendingUp,
  Activity,
  RotateCcw
} from 'lucide-react';
import { useAdminData } from '../../lib/adminData';
import { useAuth } from '../../lib/AuthContext';
import { normalizeRole } from '../../lib/roles';
import { AnalyticsService, EnrollmentTrendData, AttendanceStatData, DemographicStats, GradeLevelStatData } from '../../lib/services/analyticsService';
import { EnrollmentTrendChart } from './analytics/EnrollmentTrendChart';
import { AttendanceStatsChart } from './analytics/AttendanceStatsChart';
import { DemographicCharts } from './analytics/DemographicCharts';
import { GradeLevelChart } from './analytics/GradeLevelChart';

export function DashboardView() {
  const { setSetupComplete, users, classrooms, loading } = useAdminData();
  const { role: currentUserRole, userData } = useAuth();
  
  const isSubAdmin = normalizeRole(currentUserRole) === 'subadmin';
  const assignedGrade = isSubAdmin ? (userData?.assignedGrade as string | undefined) : undefined;
  
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [enrollmentTrends, setEnrollmentTrends] = useState<EnrollmentTrendData[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStatData[]>([]);
  const [demographicStats, setDemographicStats] = useState<DemographicStats | null>(null);
  const [gradeLevelStats, setGradeLevelStats] = useState<GradeLevelStatData[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  interface ActivityItem {
    id: string;
    initials: string;
    name: string;
    detail: string;
    value: string;
    color: string;
    createdAt: Date;
    type: string;
  }

  const getDate = (ts: { toDate?: () => Date } | string | number | Date | null | undefined): Date => {
    if (!ts) return new Date();
    if (typeof ts === 'object' && 'toDate' in ts && typeof ts.toDate === 'function') return ts.toDate();
    return new Date(ts as string | number | Date);
  };

  useEffect(() => {
    if (loading) return;

    const userActs = users.map(u => ({
      id: u.id,
      initials: (u.firstName?.[0] || '') + (u.lastName?.[0] || ''),
      name: `${u.firstName || ''} ${u.lastName || ''}`,
      detail: `New ${u.role || 'User'} added`,
      value: u.status || 'Active',
      color: u.status === 'Pending' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200',
      createdAt: getDate(u.createdAt as string | number | Date),
      type: 'user'
    }));

    const classActs = classrooms.map(c => ({
      id: c.id,
      initials: c.roomName?.substring(0, 2).toUpperCase() || 'CR',
      name: c.roomName || 'Classroom',
      detail: `New Classroom added`,
      value: c.status || 'Available',
      color: 'bg-blue-100 text-blue-700 border-blue-200',
      createdAt: getDate(c.createdAt as string | number | Date),
      type: 'classroom'
    }));

    const allActs = [...userActs, ...classActs]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5);
    
    setRecentActivities(allActs);
  }, [users, classrooms, loading]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setAnalyticsLoading(true);
      const [trends, stats, demog, gradeStats] = await Promise.all([
        AnalyticsService.getEnrollmentTrends(assignedGrade),
        AnalyticsService.getAttendanceStats(assignedGrade),
        AnalyticsService.getDemographicStats(assignedGrade),
        AnalyticsService.getGradeLevelStats(assignedGrade)
      ]);
      setEnrollmentTrends(trends);
      setAttendanceStats(stats);
      setDemographicStats(demog);
      setGradeLevelStats(gradeStats);
      setAnalyticsLoading(false);
    };
    fetchAnalytics();
  }, [assignedGrade]);

  if (loading || analyticsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  const teachersCount = users.filter(u => u.role?.toLowerCase() === 'teacher').length;
  const parentsCount = users.filter(u => u.role?.toLowerCase() === 'parent').length;
  
  // Calculate total enrolled using actual demographic data so it accurately reflects the grade level
  const studentCount = demographicStats?.totalStudents || 0;

  const stats = [
    {
      label: 'Total Students',
      value: studentCount.toString(),
      change: 'enrolled in system',
      icon: Users,
      positive: true,
      color: 'blue'
    },
    {
      label: 'Active Teachers',
      value: teachersCount.toString(),
      change: 'live from firestore',
      icon: GraduationCap,
      positive: true,
      color: 'indigo'
    },
    {
      label: 'Enrolled Parents',
      value: parentsCount.toString(),
      change: 'live from firestore',
      icon: Heart,
      positive: true,
      color: 'rose'
    },
    {
      label: 'Active Classrooms',
      value: classrooms.filter(c => c.status === 'Active').length.toString(),
      change: 'live from firestore',
      icon: Home,
      positive: true,
      color: 'emerald'
    }
  ];

  // Hide whole-school teacher and parent counts from subadmins
  const displayStats = isSubAdmin 
    ? stats.filter(s => s.label === 'Total Students' || s.label === 'Active Classrooms') 
    : stats;

  const today = new Date();
  const currentMonthName = today.toLocaleString('default', { month: 'long' });
  const recentCountThisMonth = recentActivities.filter(a => a.createdAt.getMonth() === today.getMonth() && a.createdAt.getFullYear() === today.getFullYear()).length;

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <header className="px-6 py-4 border-b border-border bg-gradient-to-r from-primary/5 via-primary/10 to-transparent shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 max-w-[1600px] mx-auto w-full">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary">
              <LayoutDashboard className="w-5 h-5" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Admin Dashboard</h1>
            </div>
            <p className="text-sm text-slate-600 max-w-md leading-relaxed hidden sm:block">
              System overview, statistics, and recent administrative activities.
            </p>
          </div>
          
          <Button
            variant="outline"
            className="w-full sm:w-auto rounded-xl px-6 bg-white shadow-sm border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold transition-all"
            onClick={() => setSetupComplete(false)}
          >
            <RotateCcw className="w-4 h-4 mr-2 text-slate-400" />
            Rerun Setup Wizard
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto w-full">
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {displayStats.map((stat, i) => {
            const colorClasses = ({
              blue: 'from-blue-50 to-blue-100/50 border-blue-200/50 text-blue-600 bg-blue-200/50',
              emerald: 'from-emerald-50 to-emerald-100/50 border-emerald-200/50 text-emerald-600 bg-emerald-200/50',
              rose: 'from-rose-50 to-rose-100/50 border-rose-200/50 text-rose-600 bg-rose-200/50',
              indigo: 'from-indigo-50 to-indigo-100/50 border-indigo-200/50 text-indigo-600 bg-indigo-200/50'
            } as Record<string, string>)[stat.color || 'blue'] || 'from-blue-50 to-blue-100/50 border-blue-200/50 text-blue-600 bg-blue-200/50';

            return (
              <Card key={i} className={`bg-gradient-to-br ${colorClasses.split(' text-')[0]} p-6 rounded-2xl shadow-sm relative overflow-hidden transition-all hover:shadow-md`}>
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-inner ${colorClasses.split(' bg-')[1]} text-${stat.color}-600`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
                  <p className="text-sm font-semibold uppercase tracking-wider text-slate-600">
                    {stat.label}
                  </p>
                  <div className="flex items-center gap-1.5 pt-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-medium text-emerald-600">
                      {stat.change}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-6 lg:gap-8 grid-cols-1 lg:grid-cols-7">
          <Card className="lg:col-span-4 bg-white border-slate-200/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">System Overview</h3>
              <p className="text-sm text-slate-500 mt-1">Historical enrollment trends</p>
            </div>
            <div className="h-[300px] w-full relative flex-1">
              <EnrollmentTrendChart data={enrollmentTrends} />
            </div>
          </Card>

          <Card className="lg:col-span-3 bg-white border-slate-200/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">Attendance Overview</h3>
              <p className="text-sm text-slate-500 mt-1">Recent snapshot</p>
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <AttendanceStatsChart data={attendanceStats} />
            </div>
          </Card>
        </div>

        {demographicStats && (
          <div className="grid gap-6 lg:gap-8 grid-cols-1">
            <Card className="bg-white border-slate-200/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-800">Demographic Analytics</h3>
                <p className="text-sm text-slate-500 mt-1">Student distribution by IP, 4Ps, Language, and Religion</p>
              </div>
              <div className="p-6 flex-1">
                <DemographicCharts data={demographicStats} />
              </div>
            </Card>
          </div>
        )}

        {gradeLevelStats.length > 0 && (
          <div className="grid gap-6 lg:gap-8 grid-cols-1">
            <Card className="bg-white border-slate-200/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-800">Student Distribution</h3>
                <p className="text-sm text-slate-500 mt-1">Total enrolled students per grade level</p>
              </div>
              <div className="p-6 flex-1">
                <GradeLevelChart data={gradeLevelStats} />
              </div>
            </Card>
          </div>
        )}

        <div className="grid gap-6 lg:gap-8 grid-cols-1">
          <Card className="bg-white border-slate-200/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">Recent Activity</h3>
              <p className="text-sm text-slate-500 mt-1">
                {recentCountThisMonth > 0 
                  ? `You have ${recentCountThisMonth} recent actions this ${currentMonthName}.`
                  : `No recent activity in ${currentMonthName}.`}
              </p>
            </div>
            <div className="p-2 flex-1">
              {recentActivities.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {recentActivities.map((item, i) => (
                    <div key={item.id || i} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors rounded-xl">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-sm shrink-0 shadow-inner">
                        {item.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{item.name}</p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{item.detail}</p>
                      </div>
                      <Badge variant="outline" className={`${item.color} px-2.5 py-0.5 rounded-md font-semibold text-[10px] shrink-0 shadow-sm`}>
                        {item.value}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    <Activity className="w-8 h-8 text-slate-300" />
                  </div>
                  <h4 className="text-slate-700 font-bold mb-1">No Recent Activity</h4>
                  <p className="text-sm text-slate-500">System events and changes will appear here.</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}