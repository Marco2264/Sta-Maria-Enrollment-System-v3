import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../../components/ui/Card';
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
import { CheckCircle2, CalendarDays, UserCheck, UserX, Clock, AlertCircle, RotateCcw, Search } from 'lucide-react';
import { useTeacherData } from '../../lib/teacherData';

export function AttendanceView() {
  const {
    students,
    attendance,
    updateAttendance,
    deleteAttendance,
    loading
  } = useTeacherData();

  const [activeTab, setActiveTab] = useState<'am' | 'pm'>(() => {
    const hours = new Date().getHours();
    return hours < 12 ? 'am' : 'pm';
  });

  const todayDate = React.useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState(todayDate);
  const enrolled = React.useMemo(() => {
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

  const filteredEnrolled = React.useMemo(() => {
    return enrolled.filter((s) => {
      const matchesSearch = searchQuery.trim() === '' ||
        `${s.firstName} ${s.lastName} ${s.lrn}`.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGender = genderFilter === 'All' || s.gender === genderFilter;
      return matchesSearch && matchesGender;
    });
  }, [enrolled, searchQuery, genderFilter]);

  const [localAttendance, setLocalAttendance] = useState<Record<string, { am: 'Present' | 'Absent' | 'Late' | 'Unmarked', pm: 'Present' | 'Absent' | 'Late' | 'Unmarked' }>>({});
  // Tracks which cells have been confirmed (button clicked or already saved)
  const [confirmed, setConfirmed] = useState<Record<string, { am: boolean; pm: boolean }>>({});
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isAutoSavingRef = useRef(false);
  const amAutoAbsentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pmAutoAbsentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const localAttendanceRef = useRef(localAttendance);
  const confirmedRef = useRef(confirmed);

  useEffect(() => {
    localAttendanceRef.current = localAttendance;
  }, [localAttendance]);

  useEffect(() => {
    confirmedRef.current = confirmed;
  }, [confirmed]);

  useEffect(() => {
    const existing = attendance.filter((a) => a.date === selectedDate);
    const map: Record<string, { am: 'Present' | 'Absent' | 'Late' | 'Unmarked', pm: 'Present' | 'Absent' | 'Late' | 'Unmarked' }> = {};
    existing.forEach((e) => {
      map[e.studentId] = {
        am: (e.amStatus || e.status || 'Unmarked') as 'Present' | 'Absent' | 'Late' | 'Unmarked',
        pm: (e.pmStatus || e.status || 'Unmarked') as 'Present' | 'Absent' | 'Late' | 'Unmarked'
      };
    });
    // Default logic based on date
    const targetDate = new Date(selectedDate);
    const isAutoDate = targetDate >= new Date('2026-06-08');
    const dayOfWeek = targetDate.getDay();
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

    enrolled.forEach((s) => {
      if (!map[s.id]) {
        // Today defaults to Unmarked (so it displays as buttons). Past dates default to Present/Absent.
        const def = (selectedDate === todayDate)
          ? 'Unmarked'
          : ((isAutoDate && isWeekday) ? 'Present' : 'Absent');
        map[s.id] = { am: def as 'Present' | 'Absent' | 'Late' | 'Unmarked', pm: def as 'Present' | 'Absent' | 'Late' | 'Unmarked' };
      }
    });
    setLocalAttendance(map);
    setSaved(existing.length > 0);
    // Pre-confirm cells that already have a saved record and are not Unmarked
    if (existing.length > 0) {
      const confirmedMap: Record<string, { am: boolean; pm: boolean }> = {};
      existing.forEach((e) => {
        const amVal = e.amStatus || e.status || 'Unmarked';
        const pmVal = e.pmStatus || e.status || 'Unmarked';
        confirmedMap[e.studentId] = {
          am: amVal !== 'Unmarked',
          pm: pmVal !== 'Unmarked'
        };
      });
      setConfirmed(confirmedMap);
    } else {
      setConfirmed({});
    }

    // Auto-record logic: only for PAST dates, not today.
    // Today uses the button-first UI so the teacher must manually mark attendance.
    if (selectedDate !== todayDate && existing.length === 0 && isAutoDate && isWeekday && enrolled.length > 0 && !isAutoSavingRef.current) {
      isAutoSavingRef.current = true;
      const promises = enrolled.map(s => updateAttendance(s.id, selectedDate, map[s.id].am, map[s.id].pm));
      Promise.all(promises).then(() => {
        isAutoSavingRef.current = false;
      }).catch(err => {
        console.error("Auto-save failed", err);
        isAutoSavingRef.current = false;
      });
    }
  }, [selectedDate, enrolled, attendance, updateAttendance]);

  // Auto-mark unconfirmed students as Absent for today's date (AM after 12:00 PM, PM after 4:30 PM)
  useEffect(() => {
    // Clear any existing timers first
    if (amAutoAbsentTimerRef.current) {
      clearTimeout(amAutoAbsentTimerRef.current);
      amAutoAbsentTimerRef.current = null;
    }
    if (pmAutoAbsentTimerRef.current) {
      clearTimeout(pmAutoAbsentTimerRef.current);
      pmAutoAbsentTimerRef.current = null;
    }

    // Only apply to today's date
    if (selectedDate !== todayDate) return;

    const now = new Date();

    // AM Cutoff: 12:00 PM
    const amCutoff = new Date();
    amCutoff.setHours(12, 0, 0, 0);

    // PM Cutoff: 4:30 PM (16:30)
    const pmCutoff = new Date();
    pmCutoff.setHours(16, 30, 0, 0);

    const applyAMAutoAbsent = () => {
      const currentConfirmed = confirmedRef.current;
      const currentAttendance = localAttendanceRef.current;

      const updatedConfirmed = { ...currentConfirmed };
      const updatedAttendance = { ...currentAttendance };
      let anyChanged = false;

      enrolled.forEach(s => {
        const wasConfirmed = currentConfirmed[s.id] || { am: false, pm: false };
        if (!wasConfirmed.am) {
          updatedConfirmed[s.id] = { ...(updatedConfirmed[s.id] || { am: false, pm: false }), am: true };

          const rec = currentAttendance[s.id] || { am: 'Unmarked', pm: 'Unmarked' };
          const amVal = 'Absent';
          const pmVal = rec.pm;

          updatedAttendance[s.id] = { am: amVal, pm: pmVal };
          anyChanged = true;

          updateAttendance(s.id, selectedDate, amVal, pmVal).catch(err =>
            console.error("AM Auto-absent update failed for", s.id, err)
          );
        }
      });

      if (anyChanged) {
        setConfirmed(updatedConfirmed);
        setLocalAttendance(updatedAttendance);
        setSaved(true);
      }
    };

    const applyPMAutoAbsent = () => {
      const currentConfirmed = confirmedRef.current;
      const currentAttendance = localAttendanceRef.current;

      const updatedConfirmed = { ...currentConfirmed };
      const updatedAttendance = { ...currentAttendance };
      let anyChanged = false;

      enrolled.forEach(s => {
        const wasConfirmed = currentConfirmed[s.id] || { am: false, pm: false };
        if (!wasConfirmed.pm) {
          updatedConfirmed[s.id] = { ...(updatedConfirmed[s.id] || { am: false, pm: false }), pm: true };

          const rec = currentAttendance[s.id] || { am: 'Unmarked', pm: 'Unmarked' };
          const amVal = rec.am;
          const pmVal = 'Absent';

          updatedAttendance[s.id] = { am: amVal, pm: pmVal };
          anyChanged = true;

          updateAttendance(s.id, selectedDate, amVal, pmVal).catch(err =>
            console.error("PM Auto-absent update failed for", s.id, err)
          );
        }
      });

      if (anyChanged) {
        setConfirmed(updatedConfirmed);
        setLocalAttendance(updatedAttendance);
        setSaved(true);
      }
    };

    // Check AM state
    if (now >= amCutoff) {
      applyAMAutoAbsent();
    } else {
      const msUntilAmCutoff = amCutoff.getTime() - now.getTime();
      amAutoAbsentTimerRef.current = setTimeout(applyAMAutoAbsent, msUntilAmCutoff);
    }

    // Check PM state
    if (now >= pmCutoff) {
      applyPMAutoAbsent();
    } else {
      const msUntilPmCutoff = pmCutoff.getTime() - now.getTime();
      pmAutoAbsentTimerRef.current = setTimeout(applyPMAutoAbsent, msUntilPmCutoff);
    }

    return () => {
      if (amAutoAbsentTimerRef.current) {
        clearTimeout(amAutoAbsentTimerRef.current);
        amAutoAbsentTimerRef.current = null;
      }
      if (pmAutoAbsentTimerRef.current) {
        clearTimeout(pmAutoAbsentTimerRef.current);
        pmAutoAbsentTimerRef.current = null;
      }
    };
  }, [selectedDate, todayDate, enrolled, updateAttendance]);

  const handleReset = async () => {
    setIsSaving(true);
    try {
      const promises = enrolled.map(s => updateAttendance(s.id, selectedDate, 'Unmarked', 'Unmarked'));
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

  const handleConfirm = useCallback((studentId: string, session: 'am' | 'pm', status: 'Present' | 'Absent' = 'Present') => {
    setConfirmed(prev => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || { am: false, pm: false }), [session]: true }
    }));

    const current = localAttendanceRef.current[studentId] || { am: 'Unmarked', pm: 'Unmarked' };
    const nextAM = session === 'am' ? status : current.am;
    const nextPM = session === 'pm' ? status : current.pm;

    setLocalAttendance(prev => ({
      ...prev,
      [studentId]: { am: nextAM, pm: nextPM }
    }));

    setIsSaving(true);
    updateAttendance(studentId, selectedDate, nextAM, nextPM)
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

  const amPresentCount = Object.values(localAttendance).filter((s) => s.am === 'Present').length;
  const pmPresentCount = Object.values(localAttendance).filter((s) => s.pm === 'Present').length;
  const amAbsentCount = Object.values(localAttendance).filter((s) => s.am === 'Absent').length;
  const pmAbsentCount = Object.values(localAttendance).filter((s) => s.pm === 'Absent').length;
  const amLateCount = Object.values(localAttendance).filter((s) => s.am === 'Late').length;
  const pmLateCount = Object.values(localAttendance).filter((s) => s.pm === 'Late').length;

  const maleStudents = filteredEnrolled.filter(s => s.gender === 'Male');
  const femaleStudents = filteredEnrolled.filter(s => s.gender === 'Female');

  const statusDropdown = (
    studentId: string,
    session: 'am' | 'pm',
    st: { am: 'Present' | 'Absent' | 'Late' | 'Unmarked'; pm: 'Present' | 'Absent' | 'Late' | 'Unmarked' },
    align: 'center' | 'right'
  ) => {
    const value = st[session];
    const isConfirmed = confirmed[studentId]?.[session];

    if (!isConfirmed) {
      // Show "Present" and "Absent" buttons
      return (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => handleConfirm(studentId, session, 'Present')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50/60 text-emerald-700 text-xs font-bold shadow-sm hover:bg-emerald-600 hover:text-white hover:border-emerald-600 hover:shadow-md transition-all duration-200 active:scale-95 cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Present
          </button>
          <button
            onClick={() => handleConfirm(studentId, session, 'Absent')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-rose-200 bg-rose-50/60 text-rose-700 text-xs font-bold shadow-sm hover:bg-rose-600 hover:text-white hover:border-rose-600 hover:shadow-md transition-all duration-200 active:scale-95 cursor-pointer"
          >
            <UserX className="w-3.5 h-3.5" />
            Absent
          </button>
        </div>
      );
    }

    const displayValue = value === 'Unmarked' ? 'Present' : value;

    // Show dropdown after confirmation
    return (
      <Select
        value={displayValue}
        onValueChange={async (v: string) => {
          const newStatus = v as 'Present' | 'Absent' | 'Late' | 'Unmarked';

          if (newStatus === 'Unmarked') {
            setIsSaving(true);
            try {
              const nextAM = session === 'am' ? 'Unmarked' : st.am;
              const nextPM = session === 'pm' ? 'Unmarked' : st.pm;

              await updateAttendance(studentId, selectedDate, nextAM, nextPM);

              setConfirmed(prev => ({
                ...prev,
                [studentId]: { ...(prev[studentId] || { am: false, pm: false }), [session]: false }
              }));

              setLocalAttendance(prev => ({
                ...prev,
                [studentId]: { am: nextAM, pm: nextPM }
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

          const current = localAttendance[studentId] || { am: 'Unmarked', pm: 'Unmarked' };
          const nextAM = session === 'am' ? newStatus : current.am;
          const nextPM = session === 'pm' ? newStatus : current.pm;

          setLocalAttendance(prev => ({
            ...prev,
            [studentId]: { am: nextAM, pm: nextPM }
          }));

          setIsSaving(true);
          updateAttendance(studentId, selectedDate, nextAM, nextPM)
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
    const st = localAttendance[s.id] || { am: 'Unmarked', pm: 'Unmarked' };
    const tabConfirmed = confirmed[s.id]?.[activeTab];

    const rowColors = {
      Present: 'hover:bg-emerald-50/40',
      Absent: 'bg-rose-50/40 hover:bg-rose-50/60',
      Late: 'bg-amber-50/40 hover:bg-amber-50/60'
    };
    const avatarColors = {
      Present: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      Absent: 'bg-rose-100 text-rose-700 border-rose-200',
      Late: 'bg-amber-100 text-amber-700 border-amber-200',
      Unmarked: 'bg-slate-100 text-slate-500 border-slate-200'
    };

    // Avatar reflects selected tab status only after confirmation, else neutral
    const avatarStatus = tabConfirmed ? st[activeTab] : 'Unmarked';

    return (
      <TableRow
        key={s.id}
        className={`border-b border-border/40 transition-colors ${tabConfirmed ? rowColors[st[activeTab]] : 'hover:bg-slate-50/60'
          }`}
      >
        <TableCell className="pl-6 text-slate-400 font-semibold w-16">
          {idx + 1}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-4">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border ${avatarStatus === 'Unmarked' ? avatarColors.Unmarked : avatarColors[avatarStatus as 'Present' | 'Absent' | 'Late']
              }`}>
              {s.firstName?.charAt(0) || ''}{s.lastName?.charAt(0) || ''}
            </div>
            <span className="font-bold text-slate-800 text-sm">
              {s.lastName}, {s.firstName}
            </span>
          </div>
        </TableCell>
        <TableCell className="text-slate-500 font-mono text-sm font-medium">
          {s.lrn}
        </TableCell>
        <TableCell className="pr-6 text-right">
          {statusDropdown(s.id, activeTab, st, 'right')}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <header className="px-6 py-8 border-b border-border bg-gradient-to-r from-primary/5 via-primary/10 to-transparent shrink-0">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 max-w-7xl mx-auto w-full">
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-primary">
              <CalendarDays className="w-6 h-6" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Daily Attendance</h1>

              {/* Subtle sync status indicator */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100/80 border border-slate-200/50 text-slate-500 text-xs font-semibold select-none transition-all duration-300">
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-blue-700 font-medium">Saving...</span>
                  </>
                ) : saved ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-700 font-medium">Saved</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                    <span className="text-amber-700 font-medium">Unsaved changes</span>
                  </>
                )}
              </div>
            </div>
            <p className="text-sm text-slate-600 max-w-md leading-relaxed">
              Manage and track student attendance. Select a date below to view or modify records for that specific day.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* AM/PM Custom Sliding Tabs */}
            <div className="flex bg-slate-200/60 p-1.5 rounded-2xl w-full sm:w-64 border border-slate-200 relative shrink-0">
              <button
                onClick={() => setActiveTab('am')}
                className={`relative flex-1 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer select-none ${activeTab === 'am' ? 'text-primary' : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                {activeTab === 'am' && (
                  <motion.div
                    layoutId="active-attendance-tab"
                    className="absolute inset-0 bg-white shadow-md rounded-xl border border-slate-200/50"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center justify-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  AM Session
                </span>
              </button>
              <button
                onClick={() => setActiveTab('pm')}
                className={`relative flex-1 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer select-none ${activeTab === 'pm' ? 'text-primary' : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                {activeTab === 'pm' && (
                  <motion.div
                    layoutId="active-attendance-tab"
                    className="absolute inset-0 bg-white shadow-md rounded-xl border border-slate-200/50"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center justify-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  PM Session
                </span>
              </button>
            </div>

            {/* Date Selector */}
            <div className="flex items-center bg-card p-1.5 rounded-2xl shadow-sm border border-border w-full sm:w-auto">
              <div className="relative flex-1 sm:w-44">
                <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type="date"
                  max={todayDate}
                  value={selectedDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val > todayDate) {
                      setSelectedDate(todayDate);
                    } else {
                      setSelectedDate(val);
                    }
                  }}
                  className="w-full text-sm font-semibold border-none bg-transparent py-2 pl-10 pr-3 outline-none focus:ring-0 text-slate-700 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200/50 p-5 sm:p-6 rounded-2xl shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-emerald-800 uppercase tracking-wider">Present</p>
                <p className="text-2xl font-extrabold text-emerald-600">
                  {activeTab === 'am' ? amPresentCount : pmPresentCount} <span className="text-sm font-medium text-emerald-700/60">students</span>
                </p>
                <p className="text-xs font-semibold text-emerald-700/70">
                  Session summary: AM: {amPresentCount} | PM: {pmPresentCount}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-200/50 flex items-center justify-center text-emerald-600 shadow-inner">
                <UserCheck className="w-6 h-6" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-rose-50 to-rose-100/50 border-rose-200/50 p-5 sm:p-6 rounded-2xl shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-rose-800 uppercase tracking-wider">Absent</p>
                <p className="text-2xl font-extrabold text-rose-600">
                  {activeTab === 'am' ? amAbsentCount : pmAbsentCount} <span className="text-sm font-medium text-rose-700/60">students</span>
                </p>
                <p className="text-xs font-semibold text-rose-700/70">
                  Session summary: AM: {amAbsentCount} | PM: {pmAbsentCount}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-rose-200/50 flex items-center justify-center text-rose-600 shadow-inner">
                <UserX className="w-6 h-6" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200/50 p-5 sm:p-6 rounded-2xl shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-amber-800 uppercase tracking-wider">Late</p>
                <p className="text-2xl font-extrabold text-amber-600">
                  {activeTab === 'am' ? amLateCount : pmLateCount} <span className="text-sm font-medium text-amber-700/60">students</span>
                </p>
                <p className="text-xs font-semibold text-amber-700/70">
                  Session summary: AM: {amLateCount} | PM: {pmLateCount}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-amber-200/50 flex items-center justify-center text-amber-600 shadow-inner">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </Card>
        </div>

        <Card className="bg-card border-border rounded-2xl overflow-hidden shadow-md">
          <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white">
            <h3 className="font-bold text-lg text-slate-800">
              Student Roster <span className="text-xs font-semibold text-slate-400 capitalize">({activeTab} session)</span>
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
                title="Clear all marks — return all rows to the Mark Present button"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Attendance
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
                  <TableHead className="font-bold text-slate-700 w-48 text-right pr-6">
                    {activeTab === 'am' ? 'AM Attendance Status' : 'PM Attendance Status'}
                  </TableHead>
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
      </div>
    </div>
  );

}