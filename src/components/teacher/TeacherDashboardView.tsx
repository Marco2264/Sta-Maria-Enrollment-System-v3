import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Users, CheckCircle, XCircle, BarChart, GraduationCap, TrendingUp, Bell, Clock, ArrowUpRight } from 'lucide-react';
import { useTeacherData } from '../../lib/teacherData';
import { AttendanceTrendChart } from './AttendanceTrendChart';

export function TeacherDashboardView() {
  const { students, attendance, loading, currentGradeLevel } = useTeacherData();
  const todayDate = new Date().toISOString().split('T')[0];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  const enrolled = students.filter((s) => s.status === 'Enrolled');
  const pending = students.filter((s) => s.status === 'Pending');
  const todayAttendance = attendance.filter((a) => a.date === todayDate);

  const getDayStatus = (a: any) => {
    const am = a.amStatus || a.status || 'Present';
    const pm = a.pmStatus || a.status || 'Present';
    if (am === 'Absent' || pm === 'Absent') return 'Absent';
    if (am === 'Late' || pm === 'Late') return 'Late';
    return 'Present';
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
    
    // Fallback for legacy flat grades format
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
      positive: true,
      color: 'blue'
    },
    {
      label: 'Present Today',
      value: todayAttendance.length > 0 ? presentToday.toString() : '--',
      change: todayAttendance.length > 0 ? 'Attendance recorded' : 'Not taken yet',
      icon: CheckCircle,
      positive: todayAttendance.length > 0,
      color: 'emerald'
    },
    {
      label: 'Absent Today',
      value: todayAttendance.length > 0 ? absentToday.toString() : '--',
      change: absentToday > 0 ? 'Follow up required' : 'All present',
      icon: XCircle,
      positive: absentToday === 0,
      color: 'rose'
    },
    {
      label: 'Average Grade',
      value: `${avgGrade}%`,
      change: 'Steady performance',
      icon: BarChart,
      positive: true,
      color: 'indigo'
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

  const statsTheme: Record<string, { card: string; iconBg: string; textChange: string }> = {
    blue: {
      card: 'hover:shadow-blue-500/5 hover:border-blue-200/60',
      iconBg: 'bg-blue-50 text-blue-600 border-blue-100',
      textChange: 'text-blue-600 bg-blue-50/80 border-blue-100'
    },
    emerald: {
      card: 'hover:shadow-emerald-500/5 hover:border-emerald-200/60',
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      textChange: 'text-emerald-600 bg-emerald-50/80 border-emerald-100'
    },
    rose: {
      card: 'hover:shadow-rose-500/5 hover:border-rose-200/60',
      iconBg: 'bg-rose-50 text-rose-600 border-rose-100',
      textChange: 'text-rose-600 bg-rose-50/80 border-rose-100'
    },
    indigo: {
      card: 'hover:shadow-indigo-500/5 hover:border-indigo-200/60',
      iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-100',
      textChange: 'text-indigo-600 bg-indigo-50/80 border-indigo-100'
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 relative overflow-hidden">
      {/* Soft Ambient Background Glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

      <header className="relative px-8 py-10 border-b border-slate-200 bg-white/70 backdrop-blur-md shrink-0 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 max-w-7xl mx-auto w-full">
          <div className="space-y-1">
            <div className="flex items-center gap-3 text-slate-800">
              <div className="p-2.5 bg-slate-100 rounded-2xl text-primary shadow-sm border border-slate-200">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Teacher Dashboard</h1>
            </div>
            <p className="text-sm text-slate-500 pl-14">
              Welcome back. Monitor live metrics, attendance tracking, and grading analytics for your classroom.
            </p>
          </div>
          
          <div className="flex items-center gap-3 md:self-center">
            {pending.length > 0 && (
              <Badge className="bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-4 py-2.5 shadow-sm rounded-2xl cursor-pointer flex items-center gap-2 transition-all font-semibold text-xs active:scale-95 duration-100">
                <Bell className="w-4 h-4 text-amber-500 animate-bounce shrink-0" />
                {pending.length} Pending Approvals
              </Badge>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 sm:p-8 lg:p-10 space-y-8 max-w-7xl mx-auto w-full relative">
        {/* Stats Grid */}
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => {
            const theme = statsTheme[stat.color || 'blue'] || statsTheme.blue;

            return (
              <Card 
                key={i} 
                className={`group relative bg-white border border-slate-200/50 p-6 rounded-3xl shadow-sm overflow-hidden transition-all duration-300 ${theme.card} hover:shadow-xl hover:-translate-y-1`}
              >
                <div className="flex items-start justify-between mb-4.5">
                  <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-inner ${theme.iconBg}`}>
                    <stat.icon className="w-5.5 h-5.5" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                    Live Data
                  </span>
                </div>
                <div className="space-y-1 pt-1">
                  <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{stat.value}</p>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {stat.label}
                  </p>
                  <div className="flex items-center gap-1.5 pt-3.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 shrink-0 ${theme.textChange}`}>
                      {stat.positive ? (
                        <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                      )}
                      {stat.change}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Charts & Activities Grid */}
        <div className="grid gap-8 grid-cols-1 lg:grid-cols-7">
          {/* Attendance Chart */}
          <Card className="lg:col-span-4 bg-white border border-slate-200/50 rounded-3xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Attendance Trends</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Daily attendance history tracking for the last 30 active days.</p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-slate-300" />
            </div>
            <div className="h-[320px] w-full relative flex-1 bg-slate-50/30 p-4">
              <AttendanceTrendChart data={trendData} />
            </div>
          </Card>

          {/* Recent Activity List */}
          <Card className="lg:col-span-3 bg-white border border-slate-200/50 rounded-3xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Recent Activity</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Recent student movements and enrollment listings.</p>
              </div>
              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
            </div>
            <div className="p-3 flex-1 overflow-y-auto max-h-[320px]">
              {displayActivities.length > 0 ? (
                <div className="space-y-1.5">
                  {displayActivities.map((item, i) => (
                    <div 
                      key={item.id || i} 
                      className="flex items-center gap-3.5 p-3.5 hover:bg-slate-50 transition-all rounded-2xl border border-transparent hover:border-slate-100"
                    >
                      <div className={`w-10 h-10 rounded-full border flex items-center justify-center font-extrabold text-xs shrink-0 shadow-sm ${
                        item.gender === 'Female' 
                          ? 'bg-pink-50 text-pink-700 border-pink-100' 
                          : 'bg-blue-50 text-blue-700 border-blue-100'
                      }`}>
                        {item.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{item.name}</p>
                        <p className="text-xs text-slate-400 truncate mt-0.5">{item.detail}</p>
                      </div>
                      <Badge variant="outline" className={`${item.color} px-2.5 py-1 rounded-xl font-bold text-[9px] uppercase tracking-wider shrink-0 shadow-inner border`}>
                        {item.value}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-16 px-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    <Clock className="w-8 h-8 text-slate-300" />
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