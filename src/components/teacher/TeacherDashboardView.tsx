import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Users, CheckCircle, XCircle, BarChart, GraduationCap, TrendingUp, Bell, Clock } from 'lucide-react';
import { useTeacherData } from '../../lib/teacherData';
import { AttendanceTrendChart } from './AttendanceTrendChart';

export function TeacherDashboardView() {
  const { students, attendance, loading } = useTeacherData();
  const todayDate = new Date().toISOString().split('T')[0];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
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
  
  const allGrades = enrolled.flatMap((s) => Object.values(s.grades || {}));
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

  const recentActivity: { id: string; initials: string; name: string; detail: string; value: string; color: string; }[] = [];
  
  pending.forEach(s => {
    recentActivity.push({
      id: s.id + '-pending',
      initials: (s.firstName?.[0] || '') + (s.lastName?.[0] || ''),
      name: `${s.firstName} ${s.lastName}`,
      detail: 'Enrollment pending approval',
      value: 'Pending',
      color: 'bg-amber-100 text-amber-700 border-amber-200'
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
        color: dayStatus === 'Present' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
               dayStatus === 'Late' ? 'bg-amber-100 text-amber-700 border-amber-200' : 
               'bg-rose-100 text-rose-700 border-rose-200'
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
    <div className="flex flex-col h-full bg-slate-50/50">
      <header className="px-6 py-8 border-b border-border bg-gradient-to-r from-primary/5 via-primary/10 to-transparent shrink-0">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 max-w-7xl mx-auto w-full">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <GraduationCap className="w-6 h-6" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Teacher Dashboard</h1>
            </div>
            <p className="text-sm text-slate-600 max-w-md leading-relaxed">
              Welcome back. Here's what's happening with your students today.
            </p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            {pending.length > 0 && (
              <Badge className="bg-amber-100 hover:bg-amber-200 text-amber-700 border-none px-3 py-1.5 shadow-sm rounded-full cursor-pointer flex items-center gap-2">
                <Bell className="w-4 h-4 animate-bounce" />
                {pending.length} Pending Approvals
              </Badge>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => {
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
                    {stat.positive ? (
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-500" />
                    )}
                    <span className={`text-xs font-medium ${stat.positive ? 'text-emerald-600' : 'text-amber-600'}`}>
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
              <h3 className="text-lg font-bold text-slate-800">Attendance Trends</h3>
              <p className="text-sm text-slate-500 mt-1">Class attendance over the last 30 days</p>
            </div>
            <div className="h-[300px] w-full relative flex-1 bg-slate-50/50 p-2">
              <AttendanceTrendChart data={trendData} />
            </div>
          </Card>

          <Card className="lg:col-span-3 bg-white border-slate-200/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">Recent Activity</h3>
              <p className="text-sm text-slate-500 mt-1">Latest classroom updates.</p>
            </div>
            <div className="p-2 flex-1">
              {displayActivities.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {displayActivities.map((item, i) => (
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
                    <Clock className="w-8 h-8 text-slate-300" />
                  </div>
                  <h4 className="text-slate-700 font-bold mb-1">No Recent Activity</h4>
                  <p className="text-sm text-slate-500">Classroom events and attendance will appear here.</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}