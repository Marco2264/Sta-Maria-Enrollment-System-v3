import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../../components/ui/Card';
import { PieChart, Pie, Cell } from 'recharts';
import { Button } from '../../components/ui/Button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../../components/ui/Table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../components/ui/Select';
import { CheckCircle2, CalendarDays, UserCheck, UserX, Clock, AlertCircle, RotateCcw, Search, BarChart3, ListFilter, ClipboardCheck, Users } from 'lucide-react';
import { useTeacherData } from '../../lib/teacherData';

const toLocalYYYYMMDD = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-rose-50 border border-rose-250 rounded-2xl m-6 text-rose-800 space-y-4">
          <h2 className="text-lg font-bold">Attendance View Crashed</h2>
          <p className="text-sm font-semibold">{this.state.error?.toString()}</p>
          <pre className="text-xs bg-rose-100/50 p-4 rounded-xl overflow-auto max-h-[300px] whitespace-pre-wrap font-mono">
            {this.state.error?.stack}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function AttendanceView() {
  return (
    <ErrorBoundary>
      <AttendanceViewContent />
    </ErrorBoundary>
  );
}

function AttendanceViewContent() {
  const {
    students,
    attendance,
    updateAttendance,
    loading,
    currentSection,
    setCurrentSection,
    assignedSections
  } = useTeacherData();

  const currentSectionData = useMemo(() => {
    return (assignedSections || []).find(s => s.sectionId === currentSection);
  }, [assignedSections, currentSection]);

  // Top level pages: 'take' (Take Attendance) vs 'view' (View Records)
  const [activeSection, setActiveSection] = useState<'take' | 'view'>('take');

  // Sub-views for 'view' page
  const [viewPeriod, setViewPeriod] = useState<'monthly' | 'yearly'>('monthly');

  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());

  const todayDate = useMemo(() => toLocalYYYYMMDD(new Date()), []);
  const getInitialDate = () => {
    const today = new Date();
    const day = today.getDay();
    if (day === 0) { // Sunday -> get Friday
      const friday = new Date(today);
      friday.setDate(today.getDate() - 2);
      return toLocalYYYYMMDD(friday);
    } else if (day === 6) { // Saturday -> get Friday
      const friday = new Date(today);
      friday.setDate(today.getDate() - 1);
      return toLocalYYYYMMDD(friday);
    }
    return toLocalYYYYMMDD(today);
  };
  const [selectedDate, setSelectedDate] = useState(getInitialDate());

  const enrolled = useMemo(() => {
    return students
      .filter((s) => s.status === 'Enrolled' && (!s.enrollmentDate || selectedDate >= s.enrollmentDate))
      .sort((a, b) => {
        if (a.gender !== b.gender) {
          if (a.gender === 'Male') return -1;
          if (b.gender === 'Male') return 1;
          if (a.gender === 'Female') return -1;
          if (b.gender === 'Female') return 1;
        }
        const nameA = a.lastName?.toLowerCase() || '';
        const nameB = b.lastName?.toLowerCase() || '';
        return nameA.localeCompare(nameB);
      });
  }, [students, selectedDate]);

  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'All' | 'Male' | 'Female'>('All');

  const filteredEnrolled = useMemo(() => {
    return enrolled.filter((s) => {
      const matchesSearch = searchQuery.trim() === '' ||
        `${s.firstName} ${s.lastName} ${s.lrn}`.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGender = genderFilter === 'All' || s.gender === genderFilter;
      return matchesSearch && matchesGender;
    });
  }, [enrolled, searchQuery, genderFilter]);

  const [localAttendance, setLocalAttendance] = useState<Record<string, 'Present' | 'Absent' | 'Late' | 'Unmarked'>>({});
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const localAttendanceRef = useRef(localAttendance);
  const confirmedRef = useRef(confirmed);

  useEffect(() => {
    localAttendanceRef.current = localAttendance;
  }, [localAttendance]);

  useEffect(() => {
    confirmedRef.current = confirmed;
  }, [confirmed]);

  const presentCount = Object.values(localAttendance).filter((s) => s === 'Present').length;
  const absentCount = Object.values(localAttendance).filter((s) => s === 'Absent').length;
  const lateCount = Object.values(localAttendance).filter((s) => s === 'Late').length;

  const maleStudents = filteredEnrolled.filter(s => s.gender === 'Male');
  const femaleStudents = filteredEnrolled.filter(s => s.gender === 'Female');

  const pieData = useMemo(() => {
    const presentTotal = presentCount + lateCount;
    const absentTotal = absentCount;
    return [
      { name: 'Present', value: presentTotal, color: '#10b981' },
      { name: 'Absent', value: absentTotal, color: '#ef4444' }
    ].filter(d => d.value > 0);
  }, [presentCount, lateCount, absentCount]);

  // School Day Helpers

  const getMonthDays = (year: number, month: number) => {
    const date = new Date(year, month, 1);
    const days: string[] = [];
    while (date.getMonth() === month) {
      const day = date.getDay();
      if (day !== 0 && day !== 6) { // Mon-Fri
        days.push(toLocalYYYYMMDD(date));
      }
      date.setDate(date.getDate() + 1);
    }
    return days;
  };

  const getStatusForDate = useCallback((studentId: string, dateStr: string) => {
    const record = attendance.find(a => a.studentId === studentId && a.date === dateStr);
    if (!record) return 'Unmarked';
    return (record.status || 'Unmarked') as 'Present' | 'Absent' | 'Late' | 'Unmarked';
  }, [attendance]);

  const markedDates = useMemo(() => {
    const dates = new Set(attendance.map(a => a.date));
    return Array.from(dates).sort();
  }, [attendance]);

  // Synchronize local marked state for selected date
  useEffect(() => {
    const existing = attendance.filter((a) => a.date === selectedDate);
    const map: Record<string, 'Present' | 'Absent' | 'Late' | 'Unmarked'> = {};
    existing.forEach((e) => {
      map[e.studentId] = (e.status || 'Unmarked') as 'Present' | 'Absent' | 'Late' | 'Unmarked';
    });
    enrolled.forEach((s) => {
      if (!map[s.id]) {
        map[s.id] = 'Unmarked';
      }
    });
    setLocalAttendance(map);
    setSaved(existing.length > 0);

    if (existing.length > 0) {
      const confirmedMap: Record<string, boolean> = {};
      existing.forEach((e) => {
        const val = e.status || 'Unmarked';
        confirmedMap[e.studentId] = val !== 'Unmarked';
      });
      setConfirmed(confirmedMap);
    } else {
      setConfirmed({});
    }
  }, [selectedDate, enrolled, attendance]);

  const handleReset = async () => {
    if (!window.confirm("Are you sure you want to reset all attendance marks for this day?")) return;
    setIsSaving(true);
    try {
      const promises = enrolled.map(s => updateAttendance(s.id, selectedDate, 'Unmarked'));
      await Promise.all(promises);
      setConfirmed({});
      setSaved(true);
    } catch (error) {
      console.error("Error resetting attendance", error);
      setSaved(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirm = useCallback((studentId: string, status: 'Present' | 'Absent' = 'Present') => {
    setConfirmed(prev => ({
      ...prev,
      [studentId]: true
    }));

    setLocalAttendance(prev => ({
      ...prev,
      [studentId]: status
    }));

    setIsSaving(true);
    updateAttendance(studentId, selectedDate, status)
      .then(() => setSaved(true))
      .catch(err => {
        console.error("Auto-save failed", err);
        setSaved(false);
      })
      .finally(() => setIsSaving(false));
  }, [selectedDate, updateAttendance]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }



  const statusDropdown = (
    studentId: string,
    value: 'Present' | 'Absent' | 'Late' | 'Unmarked',
    align: 'center' | 'right'
  ) => {
    const isConfirmed = confirmed[studentId];

    if (!isConfirmed) {
      return (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => handleConfirm(studentId, 'Present')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50/60 text-emerald-700 text-xs font-bold shadow-sm hover:bg-emerald-600 hover:text-white hover:border-emerald-600 hover:shadow-md transition-all duration-200 active:scale-95 cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Present
          </button>
          <button
            onClick={() => handleConfirm(studentId, 'Absent')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-rose-200 bg-rose-50/60 text-rose-700 text-xs font-bold shadow-sm hover:bg-rose-600 hover:text-white hover:border-rose-600 hover:shadow-md transition-all duration-200 active:scale-95 cursor-pointer"
          >
            <UserX className="w-3.5 h-3.5" />
            Absent
          </button>
        </div>
      );
    }

    const displayValue = value === 'Unmarked' ? 'Present' : value;

    return (
      <Select
        value={displayValue}
        onValueChange={async (v: string) => {
          const newStatus = v as 'Present' | 'Absent' | 'Late' | 'Unmarked';

          if (newStatus === 'Unmarked') {
            setIsSaving(true);
            try {
              await updateAttendance(studentId, selectedDate, 'Unmarked');

              setConfirmed(prev => ({
                ...prev,
                [studentId]: false
              }));

              setLocalAttendance(prev => ({
                ...prev,
                [studentId]: 'Unmarked'
              }));
              setSaved(true);
            } catch (err) {
              console.error("Failed to reset student attendance", err);
              setSaved(false);
            } finally {
              setIsSaving(false);
            }
            return;
          }

          setLocalAttendance(prev => ({
            ...prev,
            [studentId]: newStatus
          }));

          setIsSaving(true);
          updateAttendance(studentId, selectedDate, newStatus)
            .then(() => setSaved(true))
            .catch(err => {
              console.error("Auto-save failed", err);
              setSaved(false);
            })
            .finally(() => setIsSaving(false));
        }}
      >
        <SelectTrigger
          className={`w-[120px] ${align === 'right' ? 'ml-auto' : 'mx-auto'
            } h-9 font-semibold transition-colors focus:ring-0 focus:ring-offset-0 ${displayValue === 'Present' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' :
              displayValue === 'Absent' ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100' :
                'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
            }`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="font-medium">
          <SelectItem value="Present" className="text-emerald-700 focus:text-emerald-800 focus:bg-emerald-50">Present</SelectItem>
          <SelectItem value="Late" className="text-amber-700 focus:text-amber-800 focus:bg-amber-50">Late</SelectItem>
          <SelectItem value="Absent" className="text-rose-700 focus:text-rose-800 focus:bg-rose-50">Absent</SelectItem>
          <SelectItem value="Unmarked" className="text-slate-500 focus:text-slate-700 focus:bg-slate-50">Unmarked (Reset)</SelectItem>
        </SelectContent>
      </Select>
    );
  };

  const renderStudentRow = (s: any, idx: number) => {
    const status = localAttendance[s.id] || 'Unmarked';
    const isConfirmed = confirmed[s.id];

    const rowColors: Record<string, string> = {
      Present: 'hover:bg-emerald-50/40',
      Absent: 'bg-rose-50/40 hover:bg-rose-50/60',
      Late: 'bg-amber-50/40 hover:bg-amber-50/60',
      Unmarked: 'hover:bg-slate-50/60'
    };
    const avatarColors = {
      Present: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      Absent: 'bg-rose-100 text-rose-700 border-rose-200',
      Late: 'bg-amber-100 text-amber-700 border-amber-200',
      Unmarked: 'bg-slate-100 text-slate-500 border-slate-200'
    };

    const avatarStatus = isConfirmed ? status : 'Unmarked';

    return (
      <TableRow
        key={s.id}
        className={`border-b border-border/40 transition-colors ${isConfirmed ? rowColors[status] : 'hover:bg-slate-50/60'
          }`}
      >
        <TableCell className="pl-6 text-slate-400 font-semibold w-16">
          {idx + 1}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-4">
            {(() => {
              const photoFields = [(s as any).photoURL, (s as any).photoUrl, (s as any).profilePicture, (s as any).avatarUrl, (s as any).avatar, (s as any).photo];
              const photo = photoFields.find((p): p is string => typeof p === 'string' && p.trim().length > 0) || null;
              if (photo) return (
                <img src={photo} alt={s.firstName} className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0" />
              );
              return (
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border ${avatarStatus === 'Unmarked' ? avatarColors.Unmarked : avatarColors[avatarStatus as 'Present' | 'Absent' | 'Late']}`}>
                  {s.firstName?.charAt(0) || ''}{s.lastName?.charAt(0) || ''}
                </div>
              );
            })()}
            <span className="font-bold text-slate-800 text-sm">
              {s.lastName}, {s.firstName}
            </span>
          </div>
        </TableCell>
        <TableCell className="text-slate-500 font-mono text-sm font-medium">
          {s.lrn}
        </TableCell>
        <TableCell className="pr-6 text-right">
          {statusDropdown(s.id, status, 'right')}
        </TableCell>
      </TableRow>
    );
  };

  const renderStatusBadge = (status: 'Present' | 'Absent' | 'Late' | 'Unmarked') => {
    switch (status) {
      case 'Present':
        return <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-250/50 shadow-2xs select-none">P</span>;
      case 'Absent':
        return <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-250/50 shadow-2xs select-none">A</span>;
      case 'Late':
        return <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-250/50 shadow-2xs select-none">L</span>;
      default:
        return <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-50 text-slate-400 text-xs font-semibold border border-slate-200 select-none">—</span>;
    }
  };

  const renderMonthlyView = () => {
    const monthDays = getMonthDays(selectedYear, selectedMonth);

    // Calculate week indices for each day to allow subtle grouping
    let currentWeekIdx = 0;
    const dayWeeks = monthDays.map((day, idx) => {
      if (idx > 0 && new Date(day).getDay() === 1) {
        currentWeekIdx++;
      }
      return currentWeekIdx;
    });

    return (
      <div className="space-y-6">
        <Card className="bg-card border-border rounded-2xl overflow-hidden shadow-md">
          <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white">
            <div className="flex items-center gap-3">
              <Select value={viewPeriod} onValueChange={(v) => setViewPeriod(v as 'monthly' | 'yearly')}>
                <SelectTrigger className="w-[180px] h-9 border-none bg-transparent hover:bg-slate-50 text-slate-800 text-base font-extrabold px-2 focus:ring-0 focus:ring-offset-0 cursor-pointer shadow-none">
                  <SelectValue>
                    {viewPeriod === 'monthly' ? 'Monthly Tracker' : 'Yearly Summary'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly Tracker</SelectItem>
                  <SelectItem value="yearly">Yearly Summary</SelectItem>
                </SelectContent>
              </Select>

              {/* Monthly-specific Month/Year Pickers */}
              <div className="flex gap-2">
                <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v, 10))}>
                  <SelectTrigger className="w-[120px] h-9 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700">
                    <SelectValue placeholder="Month">
                      {[
                        'January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'
                      ][selectedMonth]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      'January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'
                    ].map((m, idx) => (
                      <SelectItem key={idx} value={idx.toString()}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v, 10))}>
                  <SelectTrigger className="w-[90px] h-9 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027].map(y => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search logs by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-1.5 w-44 text-xs font-medium rounded-xl border border-slate-200 outline-none focus:border-[#D8232A] focus:ring-1 focus:ring-[#D8232A]/20 transition-all text-slate-700 bg-slate-50/50"
                />
              </div>

              {/* Gender Filter */}
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value as 'All' | 'Male' | 'Female')}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 outline-none focus:border-[#D8232A] text-slate-700 bg-white cursor-pointer"
              >
                <option value="All">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto max-w-full">
            <Table className="min-w-[800px]">
              <TableHeader className="bg-slate-50/80 border-b border-border">
                <TableRow>
                  <TableHead className="font-bold text-slate-700 pl-6 sticky left-0 bg-slate-50 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)] min-w-[200px] border-r">Learner Name</TableHead>
                  {monthDays.map((day, idx) => {
                    const dateObj = new Date(day);
                    const dayNum = dateObj.getDate();
                    const formattedDay = dateObj.toLocaleDateString(undefined, { weekday: 'short' });
                    const isMonday = dateObj.getDay() === 1;
                    const isFirstDay = idx === 0;
                    const borderClass = (isMonday && !isFirstDay) ? "border-l border-slate-300" : "";
                    const weekIdx = dayWeeks[idx];
                    const bgClass = weekIdx % 2 === 0 ? "bg-slate-50/80" : "bg-slate-100/50";
                    return (
                      <TableHead key={day} className={`font-bold text-slate-700 text-center text-[10px] px-1.5 py-2.5 min-w-[42px] ${borderClass} ${bgClass}`} title={day}>
                        <div className="font-bold text-slate-700">{dayNum}</div>
                        <div className="text-[8px] font-normal text-slate-400 mt-0.5">{formattedDay}</div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEnrolled.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={monthDays.length + 1} className="text-center py-12 text-muted-foreground">
                      No students found matching current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEnrolled.map(s => (
                    <TableRow key={s.id} className="border-b border-border/40 hover:bg-slate-50/60 transition-colors">
                      <TableCell className="pl-6 py-2.5 font-bold text-slate-800 text-sm sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)] min-w-[200px] border-r">
                        {s.lastName}, {s.firstName}
                      </TableCell>
                      {monthDays.map((day, idx) => {
                        const stat = getStatusForDate(s.id, day);
                        const dateObj = new Date(day);
                        const isMonday = dateObj.getDay() === 1;
                        const isFirstDay = idx === 0;
                        const borderClass = (isMonday && !isFirstDay) ? "border-l border-slate-200" : "";
                        const weekIdx = dayWeeks[idx];
                        const bgClass = weekIdx % 2 === 0 ? "bg-white" : "bg-slate-50/40";
                        return (
                          <TableCell key={day} className={`text-center p-1 ${borderClass} ${bgClass}`}>
                            {renderStatusBadge(stat)}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    );
  };

  const renderYearlyView = () => {
    const markedDatesList = markedDates;
    const totalMarkedDays = markedDatesList.length;

    return (
      <div className="space-y-6">
        {/* Yearly Overview Stats */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-250/50 shadow-xs">
          <div>
            <h3 className="font-extrabold text-slate-800 text-base">Yearly Attendance Summary</h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Cumulative metrics and attendance percentages across active school year</p>
          </div>
          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            Total School Days Tracked: {totalMarkedDays} Days
          </span>
        </div>

        <Card className="bg-card border-border rounded-2xl overflow-hidden shadow-md">
          <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white">
            <div className="flex items-center gap-3">
              <Select value={viewPeriod} onValueChange={(v) => setViewPeriod(v as 'monthly' | 'yearly')}>
                <SelectTrigger className="w-[180px] h-9 border-none bg-transparent hover:bg-slate-50 text-slate-800 text-base font-extrabold px-2 focus:ring-0 focus:ring-offset-0 cursor-pointer shadow-none">
                  <SelectValue>
                    {viewPeriod === 'monthly' ? 'Monthly Tracker' : 'Yearly Summary'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly Tracker</SelectItem>
                  <SelectItem value="yearly">Yearly Summary</SelectItem>
                </SelectContent>
              </Select>

              {/* Yearly-specific Year Picker */}
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v, 10))}>
                <SelectTrigger className="w-[95px] h-9 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027].map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search logs by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-1.5 w-44 text-xs font-medium rounded-xl border border-slate-200 outline-none focus:border-[#D8232A] focus:ring-1 focus:ring-[#D8232A]/20 transition-all text-slate-700 bg-slate-50/50"
                />
              </div>

              {/* Gender Filter */}
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value as 'All' | 'Male' | 'Female')}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 outline-none focus:border-[#D8232A] text-slate-700 bg-white cursor-pointer"
              >
                <option value="All">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80 border-b border-border">
                <TableRow>
                  <TableHead className="font-bold text-slate-700 pl-6">Learner Name</TableHead>
                  <TableHead className="font-bold text-slate-700 text-center">Days Present</TableHead>
                  <TableHead className="font-bold text-slate-700 text-center">Days Absent</TableHead>
                  <TableHead className="font-bold text-slate-700 text-center">Days Late</TableHead>
                  <TableHead className="font-bold text-slate-700 text-center">Total Tracked</TableHead>
                  <TableHead className="font-bold text-slate-700 text-right pr-6">Attendance Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEnrolled.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      No students found matching current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEnrolled.map(s => {
                    let presents = 0;
                    let absents = 0;
                    let lates = 0;

                    markedDatesList.forEach(day => {
                      const stat = getStatusForDate(s.id, day);
                      if (stat === 'Present') presents++;
                      else if (stat === 'Absent') absents++;
                      else if (stat === 'Late') lates++;
                    });

                    const totalMarkedForStudent = presents + absents + lates;
                    const rate = totalMarkedForStudent > 0
                      ? Math.round(((presents + lates) / totalMarkedForStudent) * 100)
                      : 100;

                    return (
                      <TableRow key={s.id} className="border-b border-border/40 hover:bg-slate-50/60 transition-colors">
                        <TableCell className="pl-6 py-3 font-bold text-slate-800 text-sm">
                          {s.lastName}, {s.firstName}
                        </TableCell>
                        <TableCell className="text-center text-emerald-600 font-extrabold">{presents}</TableCell>
                        <TableCell className="text-center text-rose-600 font-extrabold">{absents}</TableCell>
                        <TableCell className="text-center text-amber-600 font-extrabold">{lates}</TableCell>
                        <TableCell className="text-center text-slate-500 font-bold">{totalMarkedForStudent}</TableCell>
                        <TableCell className="text-right pr-6 py-3">
                          <div className="flex items-center justify-end gap-3">
                            <span className={`text-sm font-black ${rate >= 90 ? 'text-emerald-600' : rate >= 75 ? 'text-amber-600' : 'text-rose-600'}`}>
                              {rate}%
                            </span>
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${rate >= 90 ? 'bg-emerald-500' : rate >= 75 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                style={{ width: `${rate}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#F4F7F9]">
      <header className="h-[72px] px-6 sm:px-8 border-b border-slate-200 bg-white shrink-0 flex items-center justify-between z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 w-full">
          <div className="flex items-center justify-between gap-6 flex-1">
            <div className="flex items-center gap-3 shrink-0">
              <div className="p-2.5 bg-[#D8232A]/10 text-[#D8232A] border border-[#D8232A]/20 rounded-2xl shadow-sm">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#D8232A] leading-none">Classroom</span>
                  {activeSection === 'take' && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100/80 border border-slate-200/50 text-slate-500 text-[9px] font-semibold select-none transition-all duration-300">
                      {isSaving ? (
                        <>
                          <div className="w-2.5 h-2.5 border border-[#D8232A] border-t-transparent rounded-full animate-spin" />
                          <span className="text-red-700 font-medium leading-none">Saving...</span>
                        </>
                      ) : saved ? (
                        <>
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                          <span className="text-emerald-700 font-medium leading-none">Saved</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-2.5 h-2.5 text-amber-500 animate-pulse" />
                          <span className="text-amber-700 font-medium leading-none">Unsaved</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none">
                  {activeSection === 'take' ? 'Daily Attendance Roll' : 'Attendance Log & Summary'}
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Section Switcher */}
            {assignedSections && assignedSections.length > 0 && (
              <div className="flex items-center gap-2 bg-[#D8232A]/5 border border-[#D8232A]/15 px-3 py-1 rounded-2xl shadow-3xs hover:bg-[#D8232A]/8 transition-all shrink-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#D8232A] select-none shrink-0">Active Section:</span>
                <Select value={currentSection} onValueChange={setCurrentSection}>
                  <SelectTrigger className="w-[180px] h-8 rounded-xl bg-white border border-slate-250/80 hover:border-[#D8232A]/30 text-xs font-black text-slate-800 shadow-2xs cursor-pointer select-none transition-all duration-200 focus:ring-1 focus:ring-[#D8232A]/10 pl-2.5">
                    <SelectValue placeholder="Select Section">
                      {currentSectionData ? `${currentSectionData.gradeLevel} - ${currentSectionData.name}` : 'Select Section'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {assignedSections.map(sec => (
                      <SelectItem key={sec.sectionId} value={sec.sectionId}>
                        {sec.gradeLevel} - {sec.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Top Level Section Selector */}
            <div className="flex bg-slate-250/50 p-1.5 rounded-2xl w-full sm:w-auto border border-slate-200 relative shrink-0">
              <button
                onClick={() => setActiveSection('take')}
                className={`relative px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer select-none ${activeSection === 'take' ? 'text-[#D8232A]' : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                {activeSection === 'take' && (
                  <motion.div
                    layoutId="active-attendance-section"
                    className="absolute inset-0 bg-white shadow-md rounded-xl border border-slate-200/50"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center justify-center gap-1.5">
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  Take Attendance
                </span>
              </button>
              <button
                onClick={() => setActiveSection('view')}
                className={`relative px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer select-none ${activeSection === 'view' ? 'text-[#D8232A]' : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                {activeSection === 'view' && (
                  <motion.div
                    layoutId="active-attendance-section"
                    className="absolute inset-0 bg-white shadow-md rounded-xl border border-slate-200/50"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center justify-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5" />
                  View Records
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8 w-full">
        {activeSection === 'take' ? (
          <>
            {/* Daily Mark View */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
              <div className="space-y-1">
                <h3 className="font-extrabold text-slate-800 text-lg">Mark Attendance Sheet</h3>
                <p className="text-xs text-slate-400 font-medium leading-relaxed">Select date, type search terms, and confirm student presence for today's classroom.</p>
              </div>

              {/* Date Selector */}
              <div className="flex items-center bg-slate-50 p-2 rounded-2xl shadow-inner border border-slate-200 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-44 flex items-center">
                  <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D8232A] pointer-events-none" />
                  <input
                    type="date"
                    max={todayDate}
                    value={selectedDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      const selectedDay = new Date(val).getDay();
                      if (selectedDay === 0 || selectedDay === 6) {
                        alert('Attendance can only be recorded from Monday to Friday.');
                        return;
                      }
                      if (val > todayDate) {
                        setSelectedDate(todayDate);
                      } else {
                        setSelectedDate(val);
                      }
                    }}
                    className="w-full text-xs font-bold border-none bg-transparent py-2 pl-10 pr-3 outline-none focus:ring-0 text-slate-700 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-fade-up">
              {/* Card 1: Total Enrolled Students */}
              <Card className="lg:col-span-2 bg-gradient-to-br from-slate-50 to-white border border-slate-250/50 p-6 rounded-2xl shadow-sm flex flex-col justify-between min-h-[160px]">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Enrolled</p>
                    <p className="text-4xl font-black text-slate-800">
                      {enrolled.length} <span className="text-xs font-medium text-slate-500">students</span>
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shadow-inner">
                    <Users className="w-6 h-6" />
                  </div>
                </div>
                
                {/* Gender Breakdown Row */}
                <div className="flex items-center gap-6 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                    <span className="text-xs font-bold text-slate-650">Male: <span className="text-slate-800">{maleStudents.length}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-pink-500" />
                    <span className="text-xs font-bold text-slate-650">Female: <span className="text-slate-800">{femaleStudents.length}</span></span>
                  </div>
                </div>
              </Card>

              {/* Card 2: Today's Attendance breakdown graph */}
              <Card className="lg:col-span-3 bg-white border border-slate-250/50 p-5 rounded-2xl shadow-sm flex items-center justify-between min-h-[160px]">
                <div className="flex items-center gap-6 w-full">
                  {/* Donut Chart */}
                  <div className="w-24 h-24 shrink-0 flex items-center justify-center relative">
                    {presentCount + lateCount === 0 && absentCount === 0 ? (
                      <div className="w-[72px] h-[72px] rounded-full border-8 border-slate-100 flex items-center justify-center" />
                    ) : (
                      <PieChart width={96} height={96}>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={28}
                          outerRadius={40}
                          paddingAngle={pieData.length > 1 ? 2 : 0}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    )}
                    {/* Inner Text summary */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Present</span>
                      <span className="text-base font-extrabold text-slate-700 mt-0.5">
                        {Math.round(((presentCount + lateCount) / (enrolled.length || 1)) * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Legend / Metrics */}
                  <div className="flex-1 flex flex-col justify-center space-y-2">
                    <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Attendance Breakdown</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#10b981]" />
                        <span className="text-xs font-bold text-slate-650">Present: <span className="text-slate-800">{presentCount + lateCount}</span></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#ef4444]" />
                        <span className="text-xs font-bold text-slate-650">Absent: <span className="text-slate-800">{absentCount}</span></span>
                      </div>
                      <div className="flex items-center gap-2 col-span-2">
                        <div className="w-2 h-2 rounded-full bg-slate-300" />
                        <span className="text-xs font-semibold text-slate-500">Unmarked: <span className="text-slate-700 font-bold">{enrolled.length - (presentCount + absentCount + lateCount)}</span></span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Daily Roster Sheet Card */}
            <Card className="bg-card border-border rounded-2xl overflow-hidden shadow-md">
              <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white">
                <h3 className="font-bold text-lg text-slate-800">
                  Student Roster
                </h3>
                <div className="flex flex-wrap items-center gap-3">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search by name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-1.5 w-44 text-xs font-medium rounded-xl border border-slate-200 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all text-slate-700 bg-slate-50/50"
                    />
                  </div>

                  {/* Gender Filter */}
                  <select
                    value={genderFilter}
                    onChange={(e) => setGenderFilter(e.target.value as 'All' | 'Male' | 'Female')}
                    className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 outline-none focus:border-primary/50 text-slate-700 bg-white cursor-pointer"
                  >
                    <option value="All">All Genders</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>

                  <button
                    onClick={handleReset}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 text-xs font-semibold bg-rose-50 hover:bg-rose-100 hover:border-rose-300 transition-all duration-150 active:scale-95"
                    title="Clear all daily attendance marks"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset Marks
                  </button>
                  <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider">
                    {filteredEnrolled.length} / {enrolled.length} Enrolled
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto bg-white/50">
                <Table>
                  <TableHeader className="bg-slate-50/80 border-b border-border">
                    <TableRow className="hover:bg-transparent border-none">
                      <TableHead className="font-bold text-slate-700 pl-6 w-16">#</TableHead>
                      <TableHead className="font-bold text-slate-700">Learner Name</TableHead>
                      <TableHead className="font-bold text-slate-700">LRN</TableHead>
                      <TableHead className="font-bold text-slate-700 w-48 text-right pr-6">Daily Attendance status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrolled.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                          No students currently enrolled in this section.
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {maleStudents.length > 0 && (
                          <TableRow className="bg-slate-100 hover:bg-slate-100">
                            <TableCell colSpan={4} className="font-bold text-slate-700 tracking-widest text-xs py-2 pl-6">
                              MALE
                            </TableCell>
                          </TableRow>
                        )}
                        {maleStudents.map((s, idx) => renderStudentRow(s, idx))}

                        {femaleStudents.length > 0 && (
                          <TableRow className="bg-slate-100 hover:bg-slate-100">
                            <TableCell colSpan={4} className="font-bold text-slate-700 tracking-widest text-xs py-2 pl-6">
                              FEMALE
                            </TableCell>
                          </TableRow>
                        )}
                        {femaleStudents.map((s, idx) => renderStudentRow(s, idx))}
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </>
        ) : (
          <>
            {/* View Records View */}
            <div className="space-y-6">


              {/* Render Selected Period Grid */}
              {viewPeriod === 'monthly' && renderMonthlyView()}
              {viewPeriod === 'yearly' && renderYearlyView()}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
