import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { cn } from '../ui/utils';
import { Users, CheckCircle, XCircle, BarChart, GraduationCap, TrendingUp, Bell, Clock, ArrowUpRight } from 'lucide-react';
import { useTeacherData } from '../../lib/teacherData';
import { AttendanceTrendChart } from './AttendanceTrendChart';

export function TeacherDashboardView() {
  const { students, attendance, loading, currentGradeLevel, assignedSections } = useTeacherData();
  const advisorySection = (assignedSections || []).find(s => s.isAdvisor);
  const todayDate = new Date().toISOString().split('T')[0];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-[#D8232A]/20 border-t-[#D8232A] rounded-full animate-spin"></div>
      </div>
    );
  }

  const enrolled = students.filter((s) => s.status === 'Enrolled');
  const pending = students.filter((s) => s.status === 'Pending');
  const todayAttendance = attendance.filter((a) => a.date === todayDate);

  const getDayStatus = (a: any) => {
    return a.status || a.amStatus || 'Present';
  };

  const presentToday = todayAttendance.filter(
    (a) => getDayStatus(a) === 'Present' || getDayStatus(a) === 'Late'
  ).length;
  
  const absentToday = todayAttendance.filter(
    (a) => getDayStatus(a) === 'Absent'
  ).length;
  
  const allGrades = enrolled.flatMap((s) => {
    const gradeKey = currentGradeLevel || 'Grade 6';
    const gradeLevelData = s.grades?.[gradeKey];
    
    if (gradeLevelData && typeof gradeLevelData === 'object') {
      return Object.values(gradeLevelData).flatMap((subj: any) => {
        if (typeof subj === 'object' && subj !== null) {
          return Object.values(subj).map((v: any) => parseFloat(v)).filter(v => !isNaN(v));
        }
        return [];
      });
    }
    
    return Object.values(s.grades || {}).map((v: any) => parseFloat(v)).filter(v => !isNaN(v));
  });
  const avgGrade = allGrades.length > 0 
    ? (allGrades.reduce((a, b) => a + b, 0) / allGrades.length).toFixed(1) 
    : '0';

  const stats = [
    {
      label: 'Total Students',
      value: enrolled.length.toString(),
      change: pending.length > 0 ? `${pending.length} pending approval` : 'All enrolled',
      icon: Users,
      hero: true
    },
    {
      label: 'Present Today',
      value: todayAttendance.length > 0 ? presentToday.toString() : '--',
      change: todayAttendance.length > 0 ? 'Attendance recorded' : 'Not taken yet',
      icon: CheckCircle
    },
    {
      label: 'Absent Today',
      value: todayAttendance.length > 0 ? absentToday.toString() : '--',
      change: absentToday > 0 ? 'Follow up required' : 'All present',
      icon: XCircle
    },
    {
      label: 'Average Grade',
      value: `${avgGrade}%`,
      change: 'Steady performance',
      icon: BarChart
    }
  ];

  const recentActivity: { id: string; initials: string; name: string; detail: string; value: string; color: string; gender: string; }[] = [];
  
  pending.forEach(s => {
    recentActivity.push({
      id: s.id + '-pending',
      initials: (s.firstName?.[0] || '') + (s.lastName?.[0] || ''),
      name: `${s.firstName} ${s.lastName}`,
      detail: 'Enrollment pending approval',
      value: 'Pending',
      color: 'bg-amber-50 text-amber-700 border-amber-200/60',
      gender: s.gender || 'Male'
    });
  });

  todayAttendance.slice(0, 4).forEach(a => {
    const s = students.find(st => st.id === a.studentId);
    if(s) {
      const dayStatus = getDayStatus(a);
      recentActivity.push({
        id: a.studentId + '-att',
        initials: (s.firstName?.[0] || '') + (s.lastName?.[0] || ''),
        name: `${s.firstName} ${s.lastName}`,
        detail: `Attendance recorded - ${dayStatus}`,
        value: 'Today',
        color: dayStatus === 'Present' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 
               dayStatus === 'Late' ? 'bg-amber-50 text-amber-700 border-amber-200/60' : 
               'bg-rose-50 text-rose-700 border-rose-200/60',
        gender: s.gender || 'Male'
      });
    }
  });

  const displayActivities = recentActivity.slice(0, 5);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const groupedAttendance: Record<string, { present: number; absent: number }> = {};
  
  attendance.forEach(a => {
    const d = new Date(a.date);
    if (d >= thirtyDaysAgo) {
      if (!groupedAttendance[a.date]) {
        groupedAttendance[a.date] = { present: 0, absent: 0 };
      }
      const dayStatus = getDayStatus(a);
      if (dayStatus === 'Present' || dayStatus === 'Late') {
        groupedAttendance[a.date].present++;
      } else if (dayStatus === 'Absent') {
        groupedAttendance[a.date].absent++;
      }
    }
  });

  const trendData = Object.keys(groupedAttendance).sort().map(dateStr => {
    const dateObj = new Date(dateStr);
    return {
      dateStr: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      present: groupedAttendance[dateStr].present,
      absent: groupedAttendance[dateStr].absent
    };
  });

  return (
    <div className="flex flex-col h-full bg-slate-50/50 relative overflow-hidden">
      <header className="h-[72px] px-6 sm:px-8 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex flex-row items-center justify-between gap-4 w-full">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-slate-900">
                <GraduationCap className="w-5 h-5 text-[#D8232A]" />
                <h1 className="text-lg font-bold tracking-tight text-slate-900">Teacher Dashboard</h1>
              </div>
              <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>
              <p className="text-xs text-slate-500 max-w-md hidden lg:block">
                Welcome back. Monitor live metrics, attendance, and grading.
              </p>
            </div>
          
          <div className="flex items-center gap-3 md:self-center">
            {advisorySection && (
              <Badge className="bg-rose-50 text-[#D8232A] border border-rose-200 text-xs font-black uppercase tracking-wider py-1.5 px-4 shadow-sm rounded-2xl select-none shrink-0">
                Advisory: {advisorySection.gradeLevel} — {advisorySection.name}
              </Badge>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8 w-full relative">
        {/* Stat Cards */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
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

        {/* Charts & Activities Grid */}
        <div className="grid gap-6 lg:gap-8 grid-cols-1 lg:grid-cols-7">
          {/* Attendance Chart */}
          <Card className="lg:col-span-4 bg-white border-slate-200/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 rounded-full bg-[#D8232A]" />
                  <h3 className="text-lg font-bold text-slate-800">Attendance Trends</h3>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-1 pl-3">Daily attendance history tracking for the last 30 active days.</p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-slate-300" />
            </div>
            <div className="h-[320px] w-full relative flex-1 bg-slate-50/30 p-4">
              <AttendanceTrendChart data={trendData} />
            </div>
          </Card>

          {/* Recent Activity List */}
          <Card className="lg:col-span-3 bg-white border-slate-200/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 rounded-full bg-[#D8232A]" />
                  <h3 className="text-lg font-bold text-slate-800">Recent Activity</h3>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-1 pl-3">Recent student movements and enrollment listings.</p>
              </div>
              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
            </div>
            <div className="p-3 flex-1 overflow-y-auto max-h-[320px]">
              {displayActivities.length > 0 ? (
                <div className="space-y-1.5">
                  {displayActivities.map((item, i) => (
                    <div 
                      key={item.id || i} 
                      className="flex items-center gap-3.5 p-3.5 hover:bg-red-50/60 transition-all rounded-2xl border border-transparent hover:border-slate-100"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#D8232A]/10 text-[#D8232A] border border-[#D8232A]/20 flex items-center justify-center font-bold text-xs shrink-0 shadow-inner">
                        {item.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{item.name}</p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{item.detail}</p>
                      </div>
                      <Badge variant="outline" className={`${item.color} px-2.5 py-1 rounded-xl font-bold text-[9px] uppercase tracking-wider shrink-0 shadow-inner border`}>
                        {item.value}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-16 px-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-red-50 text-[#D8232A] flex items-center justify-center mb-4">
                    <Clock className="w-8 h-8 text-[#D8232A]" />
                  </div>
                  <h4 className="text-slate-800 font-bold mb-1">No Recent Activity</h4>
                  <p className="text-xs text-slate-400 font-medium">Recorded updates and notifications will list here.</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}