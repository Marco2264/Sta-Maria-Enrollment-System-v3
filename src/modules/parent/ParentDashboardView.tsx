import React, { useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Users,
  AlertCircle,
  BarChart,
  Calendar,
  GraduationCap,
  TrendingUp,
  Clock,
  PlusCircle,
  CalendarDays
} from 'lucide-react';
import { useParentData } from '../../lib/parentData';

export function ParentDashboardView({
  onNavigate
}: {onNavigate: (view: string) => void;}) {
  const { children, loading } = useParentData();

  const formatDateStr = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getChildAverage = (child: any) => {
    if (!child.grades) return '--';
    const gradesValues: number[] = [];
    Object.values(child.grades).forEach((subjectGrades: any) => {
      if (typeof subjectGrades === 'object' && subjectGrades !== null) {
        Object.values(subjectGrades).forEach((g: any) => {
          const num = parseFloat(g);
          if (!isNaN(num)) gradesValues.push(num);
        });
      } else {
        const num = parseFloat(subjectGrades);
        if (!isNaN(num)) gradesValues.push(num);
      }
    });
    if (gradesValues.length === 0) return '--';
    return (gradesValues.reduce((a, b) => a + b, 0) / gradesValues.length).toFixed(1);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  const enrolledCount = children.filter((c) => c.status === 'Enrolled').length;
  const pendingCount = children.filter((c) => c.status === 'Pending').length;
  
  let totalDays = 0;
  let presentDays = 0;
  
  children.filter((c) => c.status === 'Enrolled').forEach((child) => {
    const attendance = child.attendance || [];
    totalDays += attendance.length;
    presentDays += attendance.filter(
      (a) => a.status === 'Present' || a.status === 'Late'
    ).length;
  });
  
  const attendanceRate = totalDays > 0 ? Math.round(presentDays / totalDays * 100) : 0;

  // Calculate average grade across all children
  const enrolledChildren = children.filter(c => c.status === 'Enrolled');
  const allGradesValues: number[] = [];
  enrolledChildren.forEach((c) => {
    if (c.grades) {
      Object.values(c.grades).forEach((subjectGrades: any) => {
        if (typeof subjectGrades === 'object' && subjectGrades !== null) {
          Object.values(subjectGrades).forEach((g: any) => {
            const num = parseFloat(g);
            if (!isNaN(num)) allGradesValues.push(num);
          });
        } else {
          const num = parseFloat(subjectGrades);
          if (!isNaN(num)) allGradesValues.push(num);
        }
      });
    }
  });
  const overallAverage = allGradesValues.length > 0 
    ? (allGradesValues.reduce((a, b) => a + b, 0) / allGradesValues.length).toFixed(1)
    : 'N/A';

  // Derive recent updates from children status and attendance
  const recentUpdates = children.flatMap(c => {
    const updates = [];
    if (c.status === 'Pending') {
      updates.push({
        initials: (c.firstName?.[0] || '') + (c.lastName?.[0] || ''),
        name: `${c.firstName} ${c.lastName}`,
        gender: c.gender,
        detail: 'Registration pending review',
        value: 'Pending',
        color: 'bg-amber-50 text-amber-700 border-amber-200'
      });
    }
    if (c.attendance && c.attendance.length > 0) {
      const sortedAttendance = [...c.attendance].sort((a, b) => b.date.localeCompare(a.date));
      const latest = sortedAttendance[0];
      updates.push({
        initials: (c.firstName?.[0] || '') + (c.lastName?.[0] || ''),
        name: `${c.firstName} ${c.lastName}`,
        gender: c.gender,
        detail: `Latest attendance: ${formatDateStr(latest.date)}`,
        value: latest.status,
        color: latest.status === 'Present' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
               latest.status === 'Late' ? 'bg-amber-50 text-amber-700 border-amber-200' :
               'bg-rose-50 text-rose-700 border-rose-200'
      });
    }
    return updates;
  }).slice(0, 5);

  const stats = [
    {
      label: 'Enrolled Students',
      value: enrolledCount.toString(),
      change: 'Active enrollments',
      icon: Users,
      positive: true,
      color: 'blue'
    },
    {
      label: 'Pending Actions',
      value: pendingCount.toString(),
      change: pendingCount > 0 ? 'Requires attention' : 'All clear',
      icon: AlertCircle,
      positive: pendingCount === 0,
      color: pendingCount === 0 ? 'emerald' : 'amber'
    },
    {
      label: 'Average Grade',
      value: overallAverage,
      change: overallAverage !== 'N/A' ? 'Overall subject average' : 'No grades encoded',
      icon: BarChart,
      positive: overallAverage !== 'N/A',
      color: 'indigo'
    },
    {
      label: 'Attendance Rate',
      value: `${attendanceRate}%`,
      change: 'Term attendance',
      icon: Calendar,
      positive: true,
      color: 'emerald'
    }
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50/50 relative overflow-hidden">
      {/* Background ambient glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

      <header className="relative px-8 py-10 border-b border-slate-200 bg-white/70 backdrop-blur-md shrink-0 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 max-w-7xl mx-auto w-full">
          <div className="space-y-1 text-left">
            <div className="flex items-center gap-3 text-slate-800">
              <div className="p-2.5 bg-slate-100 rounded-2xl text-primary shadow-sm border border-slate-200">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Parent Dashboard</h1>
            </div>
            <p className="text-sm text-slate-500 pl-14">
              Monitor your child's active enrollments, grades, and attendance metrics.
            </p>
          </div>
          
          <Button
            className="w-full sm:w-auto rounded-2xl h-12 px-6 shadow-md transition-all active:scale-95 border-none font-bold bg-[#0C3B99] hover:bg-blue-800 text-white flex items-center justify-center gap-2"
            onClick={() => onNavigate('enrollment')}
          >
            <PlusCircle className="w-4 h-4" />
            Register a Student
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 sm:p-8 lg:p-10 space-y-8 max-w-7xl mx-auto w-full relative">
        {/* Stats Grid */}
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => {
            const gradients = {
              blue: 'from-blue-50/70 to-indigo-50/40 border-blue-100/60 text-blue-600',
              emerald: 'from-emerald-50/70 to-teal-50/40 border-emerald-100/60 text-emerald-600',
              amber: 'from-amber-50/70 to-orange-50/40 border-amber-100/60 text-amber-600',
              indigo: 'from-indigo-50/70 to-purple-50/40 border-indigo-100/60 text-indigo-600'
            }[stat.color || 'blue'];
            
            const iconStyle = {
              blue: 'bg-blue-500/10 border-blue-200/50 text-blue-600',
              emerald: 'bg-emerald-500/10 border-emerald-200/50 text-emerald-600',
              amber: 'bg-amber-500/10 border-amber-200/50 text-amber-600',
              indigo: 'bg-indigo-500/10 border-indigo-200/50 text-indigo-600'
            }[stat.color || 'blue'];

            return (
              <Card 
                key={i} 
                className={`bg-gradient-to-br ${gradients} border p-6 rounded-3xl shadow-sm relative overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-0.5`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-0.5 text-left">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{stat.label}</p>
                    <p className="text-3xl font-extrabold text-slate-800 tracking-tight mt-1">{stat.value}</p>
                  </div>
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-sm ${iconStyle}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 text-left">
                  {stat.positive ? (
                    <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                  )}
                  <span className={`text-[11px] font-bold ${stat.positive ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {stat.change}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Dashboard split panels */}
        <div className="grid gap-8 grid-cols-1 lg:grid-cols-7">
          {/* Left panel: Academic Progress list */}
          <Card className="lg:col-span-4 bg-white border-slate-200/60 rounded-3xl shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 border border-indigo-100">
                <BarChart className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold text-slate-800 leading-snug">Academic Progress</h3>
                <p className="text-xs text-slate-400 font-medium">Average grades across subjects</p>
              </div>
            </div>

            <div className="p-6 space-y-4 flex-1 flex flex-col justify-center">
              {enrolledChildren.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-3">
                    <GraduationCap className="w-6 h-6 text-slate-300" />
                  </div>
                  <h4 className="text-slate-600 font-bold mb-0.5">No Active Enrollments</h4>
                  <p className="text-xs text-slate-400 max-w-[240px] leading-relaxed">
                    Student gradesheets will populate here once they are officially enrolled.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 w-full">
                  {enrolledChildren.map((c) => {
                    const avg = getChildAverage(c);
                    const isMale = c.gender === 'Male';
                    return (
                      <div 
                        key={c.id} 
                        className="p-5 bg-slate-50/50 rounded-2xl border border-slate-200/60 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full border flex items-center justify-center text-sm font-bold shadow-sm shrink-0 ${
                            isMale 
                              ? 'bg-blue-50 text-blue-700 border-blue-100' 
                              : 'bg-pink-50 text-pink-700 border-pink-100'
                          }`}>
                            {c.firstName?.charAt(0) || ''}{c.lastName?.charAt(0) || ''}
                          </div>
                          <div className="text-left">
                            <h4 className="font-extrabold text-slate-800 text-sm leading-snug">
                              {c.lastName}, {c.firstName}
                            </h4>
                            <p className="text-xs text-slate-400 font-semibold mt-0.5">
                              Grade {c.gradeLevel} {c.section ? `• Section ${c.section}` : ''}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-5 sm:self-center">
                          <div className="text-right hidden sm:block">
                            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">General Average</p>
                            <div className="w-28 bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                              <div 
                                className="bg-indigo-500 h-full rounded-full transition-all" 
                                style={{ width: `${avg !== '--' ? Math.min(100, Math.max(0, parseFloat(avg))) : 0}%` }}
                              />
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none sm:hidden">Avg</span>
                            <Badge className="bg-indigo-50 border border-indigo-200/60 text-indigo-700 font-mono text-sm px-3.5 py-1.5 mt-1 sm:mt-0 rounded-xl shadow-sm">
                              {avg}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>

          {/* Right panel: Recent Updates activity log */}
          <Card className="lg:col-span-3 bg-white border-slate-200/60 rounded-3xl shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600 border border-emerald-100">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold text-slate-800 leading-snug">Recent Updates</h3>
                <p className="text-xs text-slate-400 font-medium">Latest activity for your students</p>
              </div>
            </div>

            <div className="p-4 flex-1">
              {recentUpdates.length > 0 ? (
                <div className="space-y-3">
                  {recentUpdates.map((item, i) => {
                    const isMale = item.gender === 'Male';
                    return (
                      <div key={i} className="flex items-center gap-4 p-3 hover:bg-slate-50/50 border border-transparent hover:border-slate-100 transition-all rounded-2xl">
                        <div className={`w-10 h-10 rounded-full border flex items-center justify-center font-bold text-sm shrink-0 shadow-sm ${
                          isMale 
                            ? 'bg-blue-50 text-blue-700 border-blue-100' 
                            : 'bg-pink-50 text-pink-700 border-pink-100'
                        }`}>
                          {item.initials}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-bold text-slate-800 truncate leading-snug">{item.name}</p>
                          <p className="text-xs text-slate-400 font-medium truncate mt-0.5">{item.detail}</p>
                        </div>
                        <Badge variant="outline" className={`${item.color} px-2.5 py-0.5 rounded-lg font-bold text-[9px] shrink-0 shadow-sm border`}>
                          {item.value}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-3">
                    <Clock className="w-6 h-6 text-slate-300" />
                  </div>
                  <h4 className="text-slate-600 font-bold mb-0.5">No Recent Activity</h4>
                  <p className="text-xs text-slate-400">Updates about your students will appear here.</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}