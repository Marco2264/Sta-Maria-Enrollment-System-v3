import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { cn } from '../ui/utils';
import {
  Users,
  GraduationCap,
  Heart,
  Home,
  LayoutDashboard,
  TrendingUp,
  Activity
} from 'lucide-react';
import { useAdminData } from '../../lib/adminData';
import { useAuth } from '../../lib/AuthContext';
import { normalizeRole } from '../../lib/roles';
import { AnalyticsService, EnrollmentTrendData, AttendanceStatData, DemographicStats, GradeLevelStatData } from '../../lib/services/analyticsService';
import { EnrollmentTrendChart } from './analytics/EnrollmentTrendChart';
import { AttendanceStatsChart } from './analytics/AttendanceStatsChart';
import { DemographicCharts } from './analytics/DemographicCharts';
import { GradeLevelChart } from './analytics/GradeLevelChart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';

export function DashboardView() {
  const { users, classrooms, loading } = useAdminData();
  const { role: currentUserRole, userData } = useAuth();
  
  const isSubAdmin = normalizeRole(currentUserRole) === 'subadmin';
  const assignedGrade = isSubAdmin ? (userData?.assignedGrade as string | undefined) : undefined;
  
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [enrollmentTrends, setEnrollmentTrends] = useState<EnrollmentTrendData[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStatData[]>([]);
  const [demographicStats, setDemographicStats] = useState<DemographicStats | null>(null);
  const [gradeLevelStats, setGradeLevelStats] = useState<GradeLevelStatData[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState('2026-2027');

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
        AnalyticsService.getEnrollmentTrends(assignedGrade, selectedYear),
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
  }, [assignedGrade, selectedYear]);

  if (loading || analyticsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-[#D8232A]/20 border-t-[#D8232A] rounded-full animate-spin"></div>
      </div>
    );
  }

  const teachersCount = users.filter(u => u.role?.toLowerCase() === 'teacher').length;
  const parentsCount = users.filter(u => u.role?.toLowerCase() === 'parent').length;
  const studentCount = demographicStats?.totalStudents || 0;

  const stats = [
    {
      label: 'Total Students',
      value: studentCount.toString(),
      change: demographicStats ? `♂ ${demographicStats.totalMale.toLocaleString()} | ♀ ${demographicStats.totalFemale.toLocaleString()}` : 'Updated just now',
      icon: Users,
      hero: true
    },
    {
      label: 'Active Teachers',
      value: teachersCount.toString(),
      change: 'Updated just now',
      icon: GraduationCap
    },
    {
      label: 'Enrolled Parents',
      value: parentsCount.toString(),
      change: 'Updated just now',
      icon: Heart
    },
    {
      label: 'Active Classrooms',
      value: classrooms.filter(c => c.status === 'Available').length.toString(),
      change: 'Updated just now',
      icon: Home
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
      <header className="min-h-[96px] py-6 px-6 sm:px-8 border-b border-slate-200 bg-white flex items-center shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 max-w-[1600px] mx-auto w-full">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#D8232A]">Home</span>
            </div>
            <div className="flex items-center gap-2 text-slate-900">
              <LayoutDashboard className="w-5 h-5 text-[#D8232A]" />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Admin Dashboard</h1>
            </div>
            <p className="text-sm text-slate-500 max-w-md leading-relaxed hidden sm:block">
              System overview, statistics, and recent administrative activities.
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto w-full">
        {/* Stat Cards */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {displayStats.map((stat, i) => (
            <Card key={i} className={cn(
              'p-6 rounded-2xl shadow-sm relative overflow-hidden transition-all hover:shadow-md',
              stat.hero
                ? 'bg-gradient-to-br from-[#D8232A] to-[#9E171D] border-[#D8232A]'
                : 'bg-white border-slate-200/70 hover:border-[#D8232A]/30'
            )}>
              <div className="mb-4">
                <div className={cn('w-12 h-12 rounded-full flex items-center justify-center shadow-inner',
                  stat.hero ? 'bg-white/15 text-white' : 'bg-[#D8232A]/10 text-[#D8232A]')}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
              <div className="space-y-1">
                <p className={cn('text-3xl font-bold', stat.hero ? 'text-white' : 'text-slate-900')}>{stat.value}</p>
                <p className={cn('text-sm font-semibold uppercase tracking-wider', stat.hero ? 'text-red-100' : 'text-slate-500')}>{stat.label}</p>
                <div className="flex items-center gap-1.5 pt-2">
                  <TrendingUp className={cn('w-4 h-4', stat.hero ? 'text-red-100' : 'text-[#D8232A]')} />
                  <span className={cn('text-xs font-medium', stat.hero ? 'text-red-100/90' : 'text-slate-500')}>{stat.change}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid gap-6 lg:gap-8 grid-cols-1 lg:grid-cols-7">
          <Card className="lg:col-span-4 bg-white border-slate-200/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 rounded-full bg-[#D8232A]" />
                  <h3 className="text-lg font-bold text-slate-800">System Overview</h3>
                </div>
                <p className="text-sm text-slate-500 mt-1 pl-3">Historical enrollment trends</p>
              </div>
              <div className="shrink-0 w-full sm:w-auto">
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-full sm:w-[180px] h-9 bg-white border-slate-200/80 focus:ring-2 focus:ring-[#D8232A]/20 focus:border-[#D8232A]/40">
                    <SelectValue placeholder="Select Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2026-2027">AY 2026-2027</SelectItem>
                    <SelectItem value="2025-2026">AY 2025-2026</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="h-[300px] w-full relative flex-1">
              <EnrollmentTrendChart data={enrollmentTrends} />
            </div>
          </Card>

          <Card className="lg:col-span-3 bg-white border-slate-200/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 rounded-full bg-[#D8232A]" />
                <h3 className="text-lg font-bold text-slate-800">Attendance Overview</h3>
              </div>
              <p className="text-sm text-slate-500 mt-1 pl-3">Recent snapshot</p>
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <AttendanceStatsChart data={attendanceStats} />
            </div>
          </Card>
        </div>

        {/* Demographic Analytics */}
        {demographicStats && (
          <div className="grid gap-6 lg:gap-8 grid-cols-1">
            <Card className="bg-white border-slate-200/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 rounded-full bg-[#D8232A]" />
                  <h3 className="text-lg font-bold text-slate-800">Demographic Analytics</h3>
                </div>
                <p className="text-sm text-slate-500 mt-1 pl-3">Student distribution by IP, 4Ps, Language, and Religion</p>
              </div>
              <div className="p-6 flex-1">
                <DemographicCharts data={demographicStats} />
              </div>
            </Card>
          </div>
        )}

        {/* Student Distribution */}
        {gradeLevelStats.length > 0 && (
          <div className="grid gap-6 lg:gap-8 grid-cols-1">
            <Card className="bg-white border-slate-200/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 rounded-full bg-[#D8232A]" />
                  <h3 className="text-lg font-bold text-slate-800">Student Distribution</h3>
                </div>
                <p className="text-sm text-slate-500 mt-1 pl-3">Total enrolled students per grade level</p>
              </div>
              <div className="p-6 flex-1">
                <GradeLevelChart data={gradeLevelStats} />
              </div>
            </Card>
          </div>
        )}

        {/* Recent Activity */}
        <div className="grid gap-6 lg:gap-8 grid-cols-1">
          <Card className="bg-white border-slate-200/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 rounded-full bg-[#D8232A]" />
                <h3 className="text-lg font-bold text-slate-800">Recent Activity</h3>
              </div>
              <p className="text-sm text-slate-500 mt-1 pl-3">
                {recentCountThisMonth > 0 
                  ? `You have ${recentCountThisMonth} recent actions this ${currentMonthName}.`
                  : `No recent activity in ${currentMonthName}.`}
              </p>
            </div>
            <div className="p-2 flex-1">
              {recentActivities.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {recentActivities.map((item, i) => (
                    <div key={item.id || i} className="flex items-center gap-4 p-4 hover:bg-red-50/60 transition-colors rounded-xl">
                      <div className="w-10 h-10 rounded-full bg-[#D8232A]/10 text-[#D8232A] border border-[#D8232A]/20 flex items-center justify-center font-bold text-sm shrink-0 shadow-inner">
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
                  <div className="w-16 h-16 rounded-full bg-red-50 text-[#D8232A] flex items-center justify-center mb-4">
                    <Activity className="w-8 h-8 text-[#D8232A]" />
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