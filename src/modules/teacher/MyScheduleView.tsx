import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/Dialog';
import {
  CalendarClock,
  Clock,
  BookOpen,
  Users,
  Calendar,
  Sparkles,
  ChevronRight,
  Coffee,
  Moon,
  CheckCircle2,
  ListFilter,
  Layers,
  MapPin,
  CalendarDays,
  Timer,
  GraduationCap,
  Star
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { useTeacherData } from '../../lib/teacherData';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { Schedule } from '../../lib/adminData';
import { getCurrentSchoolYear } from '../../lib/utils';
import { cn } from '../../components/ui/utils';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;

const timeToMinutes = (time: string) => {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

const formatTime12h = (time24: string): string => {
  if (!time24) return '';
  const parts = time24.split(':');
  const h = parseInt(parts[0], 10);
  const m = parts[1] || '00';
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${period}`;
};

const CALENDAR_START_MINS = 7 * 60; // 07:00 AM
const CALENDAR_HOURS = Array.from({ length: 11 }, (_, i) => i + 7); // 7 AM to 5 PM
const PIXELS_PER_MINUTE = 84 / 60; // 84px per hour

// Color Palette generator for subjects
const SUBJECT_COLORS: Record<string, { bg: string; border: string; text: string; lightBg: string; pill: string }> = {
  'math': { bg: 'bg-indigo-600', border: 'border-indigo-200', text: 'text-indigo-900', lightBg: 'bg-indigo-50/80', pill: 'bg-indigo-100 text-indigo-800' },
  'mathematics': { bg: 'bg-indigo-600', border: 'border-indigo-200', text: 'text-indigo-900', lightBg: 'bg-indigo-50/80', pill: 'bg-indigo-100 text-indigo-800' },
  'english': { bg: 'bg-sky-600', border: 'border-sky-200', text: 'text-sky-900', lightBg: 'bg-sky-50/80', pill: 'bg-sky-100 text-sky-800' },
  'language': { bg: 'bg-sky-600', border: 'border-sky-200', text: 'text-sky-900', lightBg: 'bg-sky-50/80', pill: 'bg-sky-100 text-sky-800' },
  'science': { bg: 'bg-emerald-600', border: 'border-emerald-200', text: 'text-emerald-900', lightBg: 'bg-emerald-50/80', pill: 'bg-emerald-100 text-emerald-800' },
  'filipino': { bg: 'bg-amber-600', border: 'border-amber-200', text: 'text-amber-900', lightBg: 'bg-amber-50/80', pill: 'bg-amber-100 text-amber-800' },
  'reading': { bg: 'bg-amber-600', border: 'border-amber-200', text: 'text-amber-900', lightBg: 'bg-amber-50/80', pill: 'bg-amber-100 text-amber-800' },
  'araling panlipunan': { bg: 'bg-purple-600', border: 'border-purple-200', text: 'text-purple-900', lightBg: 'bg-purple-50/80', pill: 'bg-purple-100 text-purple-800' },
  'ap': { bg: 'bg-purple-600', border: 'border-purple-200', text: 'text-purple-900', lightBg: 'bg-purple-50/80', pill: 'bg-purple-100 text-purple-800' },
  'makabansa': { bg: 'bg-purple-600', border: 'border-purple-200', text: 'text-purple-900', lightBg: 'bg-purple-50/80', pill: 'bg-purple-100 text-purple-800' },
  'esp': { bg: 'bg-teal-600', border: 'border-teal-200', text: 'text-teal-900', lightBg: 'bg-teal-50/80', pill: 'bg-teal-100 text-teal-800' },
  'values': { bg: 'bg-teal-600', border: 'border-teal-200', text: 'text-teal-900', lightBg: 'bg-teal-50/80', pill: 'bg-teal-100 text-teal-800' },
  'gmrc': { bg: 'bg-teal-600', border: 'border-teal-200', text: 'text-teal-900', lightBg: 'bg-teal-50/80', pill: 'bg-teal-100 text-teal-800' },
  'mapeh': { bg: 'bg-rose-600', border: 'border-rose-200', text: 'text-rose-900', lightBg: 'bg-rose-50/80', pill: 'bg-rose-100 text-rose-800' },
  'music': { bg: 'bg-rose-600', border: 'border-rose-200', text: 'text-rose-900', lightBg: 'bg-rose-50/80', pill: 'bg-rose-100 text-rose-800' },
  'arts': { bg: 'bg-pink-600', border: 'border-pink-200', text: 'text-pink-900', lightBg: 'bg-pink-50/80', pill: 'bg-pink-100 text-pink-800' },
  'pe': { bg: 'bg-orange-600', border: 'border-orange-200', text: 'text-orange-900', lightBg: 'bg-orange-50/80', pill: 'bg-orange-100 text-orange-800' },
  'health': { bg: 'bg-red-600', border: 'border-red-200', text: 'text-red-900', lightBg: 'bg-red-50/80', pill: 'bg-red-100 text-red-800' },
  'tle': { bg: 'bg-emerald-700', border: 'border-emerald-200', text: 'text-emerald-950', lightBg: 'bg-emerald-50/80', pill: 'bg-emerald-100 text-emerald-800' },
  'epp': { bg: 'bg-emerald-700', border: 'border-emerald-200', text: 'text-emerald-950', lightBg: 'bg-emerald-50/80', pill: 'bg-emerald-100 text-emerald-800' }
};

const getSubjectStyle = (name: string) => {
  const clean = (name || '').toLowerCase().trim();
  for (const [key, val] of Object.entries(SUBJECT_COLORS)) {
    if (clean.includes(key)) return val;
  }
  return {
    bg: 'bg-[#D8232A]',
    border: 'border-red-200',
    text: 'text-slate-900',
    lightBg: 'bg-slate-50',
    pill: 'bg-slate-100 text-slate-700'
  };
};

export function MyScheduleView() {
  const { user } = useAuth();
  const { assignedSections, academicYear } = useTeacherData();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View Mode: 'calendar' | 'agenda' | 'sections'
  const [viewMode, setViewMode] = useState<'calendar' | 'agenda' | 'sections'>('calendar');
  const [selectedDay, setSelectedDay] = useState<string>('Monday');

  // Selected schedule popover inspection
  const [selectedSchedule, setSelectedSchedule] = useState<{
    schedule: Schedule;
    subjectName: string;
    sectionName: string;
    gradeLevel: string;
    isAdvisor: boolean;
    startTimeFormatted: string;
    endTimeFormatted: string;
    durationMins: number;
  } | null>(null);

  // Live timer tick every 10s
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const syName = academicYear || getCurrentSchoolYear();

  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    const fetchReferences = async () => {
      try {
        const [subSnap, secSnap] = await Promise.all([
          getDocs(collection(db, 'subjects')),
          getDocs(collection(db, 'sections'))
        ]);
        if (!isMounted) return;
        setSubjects(subSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setSections(secSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Error fetching references in MyScheduleView:", error);
      }
    };

    fetchReferences();

    const q = query(
      collection(db, 'schedules'),
      where('teacherId', '==', user.uid),
      where('academicYear', '==', syName)
    );

    const unsub = onSnapshot(q, (snap) => {
      if (!isMounted) return;
      setSchedules(snap.docs.map(d => ({ id: d.id, ...d.data() } as Schedule)));
      setLoading(false);
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, [user, syName]);

  const teacherSchedules = useMemo(() => {
    return schedules.filter(s => !s.status || s.status === 'published');
  }, [schedules]);

  // Summary Metrics
  const totalMinutesPerWeek = useMemo(() => {
    return teacherSchedules.reduce((acc, s) => {
      const start = timeToMinutes(s.startTime);
      const end = timeToMinutes(s.endTime);
      return acc + Math.max(0, end - start);
    }, 0);
  }, [teacherSchedules]);

  const distinctSectionsCount = useMemo(() => {
    const sIds = new Set(teacherSchedules.map(s => s.sectionId).filter(Boolean));
    return sIds.size;
  }, [teacherSchedules]);

interface TodayScheduleStatus {
  isWeekend: boolean;
  dayOfWeek: string;
  totalClassesToday: number;
  active: {
    schedule: Schedule;
    subjectName: string;
    sectionName: string;
    startTimeFormatted: string;
    endTimeFormatted: string;
    minutesRemaining: number;
    progressPercent: number;
  } | null;
  next: {
    schedule: Schedule;
    subjectName: string;
    sectionName: string;
    startTimeFormatted: string;
    endTimeFormatted: string;
    minutesUntilStart: number;
  } | null;
}

  // Live Teaching Status for Today
  const todayStatus = useMemo<TodayScheduleStatus>(() => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = dayNames[currentTime.getDay()];
    const isWeekend = currentTime.getDay() === 0 || currentTime.getDay() === 6;
    const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();

    const todaySchedules = teacherSchedules
      .filter(s => s.dayOfWeek === dayOfWeek)
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    let active: TodayScheduleStatus['active'] = null;
    let next: TodayScheduleStatus['next'] = null;

    todaySchedules.forEach(sch => {
      const start = timeToMinutes(sch.startTime);
      const end = timeToMinutes(sch.endTime);
      const sub = subjects.find(s => s.id === sch.subjectId);
      const sec = sections.find(s => s.id === sch.sectionId);
      const subName = sub?.name || 'Assigned Subject';
      const secName = sec ? `${sec.gradeLevel || ''} - ${sec.name || ''}`.trim() : 'Assigned Section';

      if (currentMins >= start && currentMins < end) {
        const elapsed = currentMins - start;
        const total = Math.max(1, end - start);
        active = {
          schedule: sch,
          subjectName: subName,
          sectionName: secName,
          startTimeFormatted: formatTime12h(sch.startTime),
          endTimeFormatted: formatTime12h(sch.endTime),
          minutesRemaining: Math.max(0, end - currentMins),
          progressPercent: Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)))
        };
      } else if (currentMins < start && !next) {
        next = {
          schedule: sch,
          subjectName: subName,
          sectionName: secName,
          startTimeFormatted: formatTime12h(sch.startTime),
          endTimeFormatted: formatTime12h(sch.endTime),
          minutesUntilStart: start - currentMins
        };
      }
    });

    return {
      isWeekend,
      dayOfWeek,
      totalClassesToday: todaySchedules.length,
      active,
      next
    };
  }, [currentTime, teacherSchedules, subjects, sections]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#D8232A]/20 border-t-[#D8232A] rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] overflow-y-auto custom-scrollbar">

      {/* 1. Header Hero Banner */}
      <header className="px-6 sm:px-8 py-5 bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#D8232A] to-[#9E171D] text-white flex items-center justify-center shadow-md shadow-red-500/20 shrink-0">
              <CalendarClock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-slate-900">
                  Teaching Schedule & Timetable
                </h1>
                <Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-600 font-extrabold text-[10px] px-2 py-0.5">
                  S.Y. {syName}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Official DepEd weekly class schedule, subject period allocations, and live session tracker.
              </p>
            </div>
          </div>

            {/* Top Actions: View Switcher */}
            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
                <button
                  onClick={() => setViewMode('calendar')}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                    viewMode === 'calendar'
                      ? "bg-white text-slate-900 shadow-2xs font-black"
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  <Calendar className="w-3.5 h-3.5 text-[#D8232A]" />
                  <span>Weekly Grid</span>
                </button>

                <button
                  onClick={() => setViewMode('agenda')}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                    viewMode === 'agenda'
                      ? "bg-white text-slate-900 shadow-2xs font-black"
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  <ListFilter className="w-3.5 h-3.5 text-blue-600" />
                  <span>Daily Agenda</span>
                </button>

                <button
                  onClick={() => setViewMode('sections')}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                    viewMode === 'sections'
                      ? "bg-white text-slate-900 shadow-2xs font-black"
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  <Layers className="w-3.5 h-3.5 text-purple-600" />
                  <span>By Section</span>
                </button>
              </div>
            </div>

        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full space-y-6">

        {/* 2. Executive Metric Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-[#D8232A] flex items-center justify-center font-bold shrink-0">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Classes</p>
              <p className="text-xl sm:text-2xl font-black text-slate-900">{teacherSchedules.length} Periods</p>
              <p className="text-[11px] text-slate-400 font-semibold">Weekly load</p>
            </div>
          </Card>

          <Card className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
              <Timer className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Teaching Hours</p>
              <p className="text-xl sm:text-2xl font-black text-slate-900">
                {(totalMinutesPerWeek / 60).toFixed(1)} hrs
              </p>
              <p className="text-[11px] text-slate-400 font-semibold">{totalMinutesPerWeek} mins / week</p>
            </div>
          </Card>

          <Card className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Sections Handled</p>
              <p className="text-xl sm:text-2xl font-black text-slate-900">{distinctSectionsCount} Sections</p>
              <p className="text-[11px] text-slate-400 font-semibold">Active advisory & loads</p>
            </div>
          </Card>

          <Card className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Today's Schedule</p>
              <p className="text-xl sm:text-2xl font-black text-slate-900">{todayStatus.totalClassesToday} Classes</p>
              <p className="text-[11px] text-emerald-600 font-bold">{todayStatus.dayOfWeek}</p>
            </div>
          </Card>
        </div>

        {/* 3. Live Session Highlight Strip */}
        <Card className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#D8232A] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Real-Time Class Status
                </span>
                {todayStatus.active ? (
                  <Badge className="bg-emerald-500 text-white font-black text-[9px] px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    CLASS IN PROGRESS
                  </Badge>
                ) : todayStatus.isWeekend ? (
                  <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[9px] font-bold">
                    WEEKEND BREAK
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 text-[9px] font-bold">
                    FACULTY PREPARATION / BREAK
                  </Badge>
                )}
              </div>

              {todayStatus.active ? (
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    {todayStatus.active.subjectName} with {todayStatus.active.sectionName}
                  </h2>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">
                    Period: <strong>{todayStatus.active.startTimeFormatted} - {todayStatus.active.endTimeFormatted}</strong> • <span className="text-emerald-600 font-bold">{todayStatus.active.minutesRemaining} mins remaining</span>
                  </p>
                </div>
              ) : todayStatus.next ? (
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    Up Next: <span className="text-[#D8232A] font-black">{todayStatus.next.subjectName}</span> ({todayStatus.next.sectionName})
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Starts at <strong>{todayStatus.next.startTimeFormatted}</strong> (in {todayStatus.next.minutesUntilStart} mins).
                  </p>
                </div>
              ) : (
                <div>
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>No further classes scheduled for today.</span>
                  </h2>
                  <p className="text-xs text-slate-400 font-medium">
                    You're all clear with your teaching schedule.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 bg-slate-50 px-3.5 py-2 rounded-2xl border border-slate-100 text-xs font-bold text-slate-700 shrink-0">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>{currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
              <span className="text-slate-300 mx-1">•</span>
              <span className="text-slate-500">{currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
            </div>
          </div>
        </Card>

        {/* ------------------------------------------------------------- */}
        {/* VIEW 1: WEEKLY TIMETABLE CALENDAR GRID */}
        {/* ------------------------------------------------------------- */}
        {viewMode === 'calendar' && (
          <Card className="bg-white border border-slate-200/80 rounded-3xl shadow-xs overflow-hidden flex flex-col">
            
            {/* Day Column Headers */}
            <div className="grid grid-cols-6 border-b border-slate-200 bg-slate-50/80 sticky top-0 z-20">
              <div className="p-3 text-center border-r border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5" />
              </div>
              {DAYS_OF_WEEK.map(day => (
                <div key={day} className="p-3 text-center border-r last:border-r-0 border-slate-200">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">{day}</span>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {teacherSchedules.filter(s => s.dayOfWeek === day).length} Classes
                  </span>
                </div>
              ))}
            </div>

            {/* Scrollable Schedule Body */}
            <div className="overflow-x-auto">
              <div className="relative min-w-[800px] h-[924px] bg-[length:100%_84px]" style={{ backgroundImage: 'linear-gradient(to bottom, transparent 83px, #f1f5f9 84px)' }}>
                
                {/* Time Ruler (Y-Axis) */}
                <div className="absolute left-0 top-0 bottom-0 w-[16.666%] border-r border-slate-200 bg-slate-50/50 pointer-events-none">
                  {CALENDAR_HOURS.map(hour => (
                    <div key={hour} className="h-[84px] p-2 text-right pr-3 border-b border-slate-100/60 box-border">
                      <span className="text-[10px] font-bold text-slate-400 font-mono">
                        {hour > 12 ? `${hour - 12}:00 PM` : hour === 12 ? '12:00 PM' : `${hour}:00 AM`}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Day Columns */}
                <div className="absolute left-[16.666%] right-0 top-0 bottom-0 grid grid-cols-5">
                  {DAYS_OF_WEEK.map((day, dIdx) => (
                    <div key={day} className="relative border-r last:border-r-0 border-slate-200/60 h-full">
                      {teacherSchedules.filter(s => s.dayOfWeek === day).map(schedule => {
                        const subject = subjects.find(s => s.id === schedule.subjectId);
                        const section = sections.find(s => s.id === schedule.sectionId);
                        const isAdviser = assignedSections.some(as => as.sectionId === schedule.sectionId && as.isAdvisor);
                        
                        const subName = subject?.name || 'Assigned Subject';
                        const secName = section ? `${section.gradeLevel} - ${section.name}` : 'Section';
                        const style = getSubjectStyle(subName);

                        const startMins = timeToMinutes(schedule.startTime);
                        const endMins = timeToMinutes(schedule.endTime);
                        const top = Math.max(0, startMins - CALENDAR_START_MINS) * PIXELS_PER_MINUTE;
                        const height = Math.max(30, (endMins - startMins) * PIXELS_PER_MINUTE);

                        return (
                          <div
                            key={schedule.id}
                            onClick={() => {
                              setSelectedSchedule({
                                schedule,
                                subjectName: subName,
                                sectionName: secName,
                                gradeLevel: section?.gradeLevel || 'Grade',
                                isAdvisor: isAdviser,
                                startTimeFormatted: formatTime12h(schedule.startTime),
                                endTimeFormatted: formatTime12h(schedule.endTime),
                                durationMins: Math.max(0, endMins - startMins)
                              });
                            }}
                            className={cn(
                              "absolute left-1 right-1 rounded-2xl border p-2.5 overflow-hidden transition-all cursor-pointer shadow-2xs hover:shadow-md hover:scale-[1.01] z-10 hover:z-30 flex flex-col justify-between",
                              style.lightBg,
                              style.border
                            )}
                            style={{ top: `${top}px`, height: `${height}px` }}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-md font-mono", style.pill)}>
                                {formatTime12h(schedule.startTime)}
                              </span>
                              {isAdviser && (
                                <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[8px] px-1 py-0 font-extrabold">
                                  Adv
                                </Badge>
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className={cn("font-black text-xs leading-tight line-clamp-1", style.text)}>
                                {subName}
                              </p>
                              {height >= 55 && (
                                <p className="text-[10px] font-bold text-slate-500 truncate mt-0.5">
                                  {secName}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

              </div>
            </div>
          </Card>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 2: DAILY AGENDA (LIST VIEW) */}
        {/* ------------------------------------------------------------- */}
        {viewMode === 'agenda' && (
          <div className="space-y-6">
            
            {/* Day Selector Pill Tabs */}
            <div className="flex items-center gap-2 p-1.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-x-auto">
              {DAYS_OF_WEEK.map(day => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 select-none",
                    selectedDay === day
                      ? "bg-[#D8232A] text-white shadow-md shadow-red-500/20 font-black"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  )}
                >
                  <span>{day}</span>
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 border-0 font-extrabold", selectedDay === day ? "bg-red-700 text-white" : "bg-slate-100 text-slate-500")}>
                    {teacherSchedules.filter(s => s.dayOfWeek === day).length}
                  </Badge>
                </button>
              ))}
            </div>

            {/* Agenda Class Cards */}
            <div className="space-y-3.5">
              {teacherSchedules
                .filter(s => s.dayOfWeek === selectedDay)
                .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
                .map((schedule, idx) => {
                  const subject = subjects.find(s => s.id === schedule.subjectId);
                  const section = sections.find(s => s.id === schedule.sectionId);
                  const isAdviser = assignedSections.some(as => as.sectionId === schedule.sectionId && as.isAdvisor);
                  const subName = subject?.name || 'Assigned Subject';
                  const secName = section ? `${section.gradeLevel} - ${section.name}` : 'Section';
                  const style = getSubjectStyle(subName);
                  const startMins = timeToMinutes(schedule.startTime);
                  const endMins = timeToMinutes(schedule.endTime);
                  const duration = Math.max(0, endMins - startMins);

                  return (
                    <Card key={schedule.id} className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white shrink-0 shadow-sm", style.bg)}>
                          <BookOpen className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-base font-black text-slate-900">{subName}</span>
                            {isAdviser && (
                              <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-black uppercase">
                                <Star className="w-3 h-3 mr-1 fill-amber-500" /> Advisory Section
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                            <span>Section: <strong>{secName}</strong></span>
                            <span>•</span>
                            <span>Room: {section?.roomNumber || 'Assigned Classroom'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <div className="text-right">
                          <p className="text-xs sm:text-sm font-black font-mono text-slate-900">
                            {formatTime12h(schedule.startTime)} – {formatTime12h(schedule.endTime)}
                          </p>
                          <p className="text-[11px] font-semibold text-slate-400">{duration} minutes</p>
                        </div>
                      </div>
                    </Card>
                  );
                })}

              {teacherSchedules.filter(s => s.dayOfWeek === selectedDay).length === 0 && (
                <Card className="p-16 text-center bg-white rounded-3xl border border-dashed border-slate-200 shadow-none">
                  <Coffee className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <h3 className="text-base font-black text-slate-800">No Classes Scheduled for {selectedDay}</h3>
                  <p className="text-xs text-slate-400 mt-1">Use this day for faculty development, grading, and lesson preparation.</p>
                </Card>
              )}
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 3: BY SECTION GROUPED */}
        {/* ------------------------------------------------------------- */}
        {viewMode === 'sections' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assignedSections.map(sec => {
              const secSchedules = teacherSchedules.filter(s => s.sectionId === sec.sectionId);
              const totalSecMins = secSchedules.reduce((acc, s) => {
                return acc + Math.max(0, timeToMinutes(s.endTime) - timeToMinutes(s.startTime));
              }, 0);

              return (
                <Card key={sec.sectionId} className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <span className="text-[10px] font-black uppercase text-[#D8232A] bg-red-50 px-2.5 py-0.5 rounded-md border border-red-100/60">
                          {sec.gradeLevel}
                        </span>
                        <h3 className="text-base font-black text-slate-900 mt-1">
                          {sec.name || 'Section'}
                        </h3>
                      </div>
                      {sec.isAdvisor && (
                        <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-black">
                          Advisory
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs font-semibold text-slate-500">
                      {secSchedules.length} Teaching periods • {(totalSecMins / 60).toFixed(1)} hours/week
                    </p>

                    <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                      {secSchedules.map(sch => {
                        const sub = subjects.find(s => s.id === sch.subjectId);
                        return (
                          <div key={sch.id} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50 border border-slate-100">
                            <div className="font-bold text-slate-800">{sub?.name || 'Subject'}</div>
                            <div className="text-[11px] font-mono font-semibold text-slate-500">
                              {sch.dayOfWeek.slice(0, 3)} {formatTime12h(sch.startTime)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

      </div>

      {/* Popover Inspection Modal */}
      {selectedSchedule && (
        <Dialog open={!!selectedSchedule} onOpenChange={() => setSelectedSchedule(null)}>
          <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 shadow-xl space-y-4">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-red-50 text-[#D8232A] border-red-200 text-[10px] font-black">
                  {selectedSchedule.schedule.dayOfWeek}
                </Badge>
                {selectedSchedule.isAdvisor && (
                  <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-black">
                    ⭐ Advisory Section
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-lg font-black text-slate-900">
                {selectedSchedule.subjectName}
              </DialogTitle>
            </DialogHeader>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Section:</span>
                <span className="font-black text-slate-900">{selectedSchedule.sectionName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Period Time:</span>
                <span className="font-mono font-black text-slate-900">{selectedSchedule.startTimeFormatted} – {selectedSchedule.endTimeFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Duration:</span>
                <span className="font-bold text-slate-700">{selectedSchedule.durationMins} minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Academic Year:</span>
                <span className="font-bold text-slate-700">{syName}</span>
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={() => setSelectedSchedule(null)}
                className="w-full rounded-xl h-10 bg-slate-900 text-white font-bold text-xs"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
