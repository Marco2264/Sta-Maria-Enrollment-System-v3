import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { PieChart, Pie, Cell } from 'recharts';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
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
import { 
  CheckCircle2, 
  CalendarDays, 
  UserCheck, 
  UserX, 
  Clock, 
  AlertCircle, 
  RotateCcw, 
  Search, 
  BarChart3, 
  ClipboardCheck, 
  Users, 
  X, 
  CalendarRange, 
  FileSpreadsheet, 
  Filter, 
  Sparkles,
  School,
  Calendar,
  Check
} from 'lucide-react';
import { useTeacherData } from '../../lib/teacherData';
import { getCurrentSchoolYear } from '../../lib/utils';
import { cn } from '../../components/ui/utils';
import { generateSF2 } from '../../lib/excelGenerator';
import { ReportDataService } from '../../lib/services/reportDataService';
import { getGlobalSettings, GlobalSettings } from '../../lib/services/settingsService';
import toast from 'react-hot-toast';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const ALL_MONTHS = [
  { index: 0, name: 'Jan', fullName: 'January' },
  { index: 1, name: 'Feb', fullName: 'February' },
  { index: 2, name: 'Mar', fullName: 'March' },
  { index: 3, name: 'Apr', fullName: 'April' },
  { index: 4, name: 'May', fullName: 'May' },
  { index: 5, name: 'Jun', fullName: 'June' },
  { index: 6, name: 'Jul', fullName: 'July' },
  { index: 7, name: 'Aug', fullName: 'August' },
  { index: 8, name: 'Sep', fullName: 'September' },
  { index: 9, name: 'Oct', fullName: 'October' },
  { index: 10, name: 'Nov', fullName: 'November' },
  { index: 11, name: 'Dec', fullName: 'December' },
];

const getSchoolMonths = (schoolYearStart?: string, schoolYearEnd?: string) => {
  if (!schoolYearStart) {
    const defaultStartMonth = 7; // August default
    const result = [];
    for (let i = 0; i < 12; i++) {
      const idx = (defaultStartMonth + i) % 12;
      result.push(ALL_MONTHS[idx]);
    }
    return result;
  }

  const startParts = schoolYearStart.split('-').map(Number);
  const startMonth = (startParts[1] || 8) - 1; // 0-indexed
  
  let numMonths = 12;
  if (schoolYearEnd) {
    const endParts = schoolYearEnd.split('-').map(Number);
    const startYear = startParts[0];
    const endYear = endParts[0];
    const endMonth = (endParts[1] || 5) - 1;
    
    const span = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
    if (span >= 1 && span <= 12) {
      numMonths = span;
    }
  }

  const result = [];
  for (let i = 0; i < numMonths; i++) {
    const idx = (startMonth + i) % 12;
    result.push(ALL_MONTHS[idx]);
  }
  return result;
};

const getAvailableYears = (schoolYearStart?: string, schoolYearEnd?: string) => {
  const currentYearNum = new Date().getFullYear();
  if (!schoolYearStart) {
    return [currentYearNum - 1, currentYearNum, currentYearNum + 1];
  }
  const startYr = parseInt(schoolYearStart.split('-')[0], 10);
  const endYr = schoolYearEnd ? parseInt(schoolYearEnd.split('-')[0], 10) : startYr + 1;
  const years: number[] = [];
  for (let y = startYr; y <= endYr; y++) {
    years.push(y);
  }
  return years.length > 0 ? years : [currentYearNum];
};

const getAvailableMonthsForYear = (year: number, schoolYearStart?: string, schoolYearEnd?: string) => {
  if (!schoolYearStart) {
    return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  }
  const startParts = schoolYearStart.split('-').map(Number);
  const startYr = startParts[0];
  const startMo = (startParts[1] || 1) - 1; // 0-indexed

  let endYr = startYr + 1;
  let endMo = (startMo === 0 ? 11 : startMo - 1);
  if (schoolYearEnd) {
    const endParts = schoolYearEnd.split('-').map(Number);
    endYr = endParts[0];
    endMo = (endParts[1] || 12) - 1;
  }

  let minMo = 0;
  let maxMo = 11;

  if (year === startYr && year === endYr) {
    minMo = startMo;
    maxMo = endMo;
  } else if (year === startYr) {
    minMo = startMo;
    maxMo = 11;
  } else if (year === endYr) {
    minMo = 0;
    maxMo = endMo;
  } else if (year < startYr || year > endYr) {
    minMo = 0;
    maxMo = 11;
  }

  const months: number[] = [];
  for (let m = minMo; m <= maxMo; m++) {
    months.push(m);
  }
  return months.length > 0 ? months : [startMo];
};

const toLocalYYYYMMDD = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export function AttendanceView() {
  const {
    students,
    attendance,
    updateAttendance,
    loading,
    currentSection,
    setCurrentSection,
    assignedSections,
    isAdvisorForCurrentSection
  } = useTeacherData();

  const [settings, setSettings] = useState<GlobalSettings | null>(null);

  useEffect(() => {
    getGlobalSettings()
      .then(s => {
        setSettings(s);
        if (s.activeSchoolYear) {
          setSelectedAcademicYear(s.activeSchoolYear);
        }
        if (s.schoolYearStart) {
          const today = toLocalYYYYMMDD(new Date());
          if (today < s.schoolYearStart) {
            setSelectedDate(s.schoolYearStart);
            const startParts = s.schoolYearStart.split('-');
            if (startParts.length >= 2) {
              setSelectedYear(parseInt(startParts[0], 10));
              setSelectedMonth(parseInt(startParts[1], 10) - 1);
            }
          } else if (s.schoolYearEnd && today > s.schoolYearEnd) {
            setSelectedDate(s.schoolYearEnd);
            const endParts = s.schoolYearEnd.split('-');
            if (endParts.length >= 2) {
              setSelectedYear(parseInt(endParts[0], 10));
              setSelectedMonth(parseInt(endParts[1], 10) - 1);
            }
          } else {
            const now = new Date();
            const curYr = now.getFullYear();
            const curMo = now.getMonth();
            const validYears = getAvailableYears(s.schoolYearStart, s.schoolYearEnd);
            const targetYr = validYears.includes(curYr) ? curYr : validYears[0];
            const validMonths = getAvailableMonthsForYear(targetYr, s.schoolYearStart, s.schoolYearEnd);
            setSelectedYear(targetYr);
            setSelectedMonth(validMonths.includes(curMo) ? curMo : validMonths[0]);
          }
        }
      })
      .catch(err => console.error("Error loading admin settings in AttendanceView:", err));
  }, []);

  const schoolYearStart = settings?.schoolYearStart || '';
  const schoolYearEnd = settings?.schoolYearEnd || '';

  const currentSectionData = useMemo(() => {
    return (assignedSections || []).find(s => s.sectionId === currentSection);
  }, [assignedSections, currentSection]);

  // Main navigation tabs: 'take' | 'monthly' | 'yearly'
  const [activeTab, setActiveTab] = useState<'take' | 'monthly' | 'yearly'>('take');

  // Date filters
  const todayObj = new Date();
  const todayDate = useMemo(() => toLocalYYYYMMDD(new Date()), []);
  const currentYearNum = todayObj.getFullYear();
  const currentMonthNum = todayObj.getMonth();

  const isWeekendHelper = (dateStr: string) => {
    if (!dateStr) return false;
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const [selectedDate, setSelectedDate] = useState(todayDate);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthNum);
  const [selectedYear, setSelectedYear] = useState<number>(currentYearNum);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(getCurrentSchoolYear());

  const availableYears = useMemo(() => {
    return getAvailableYears(schoolYearStart, schoolYearEnd);
  }, [schoolYearStart, schoolYearEnd]);

  const availableMonths = useMemo(() => {
    return getAvailableMonthsForYear(selectedYear, schoolYearStart, schoolYearEnd);
  }, [selectedYear, schoolYearStart, schoolYearEnd]);

  const handleYearChange = (newYear: number) => {
    setSelectedYear(newYear);
    const validMonths = getAvailableMonthsForYear(newYear, schoolYearStart, schoolYearEnd);
    if (!validMonths.includes(selectedMonth)) {
      setSelectedMonth(validMonths[0] ?? 0);
    }
  };

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'All' | 'Male' | 'Female'>('All');

  // Weekend modal state
  const [isWeekendModalOpen, setIsWeekendModalOpen] = useState(() => isWeekendHelper(todayDate));
  const [weekendSelectedDateStr, setWeekendSelectedDateStr] = useState(() => {
    if (isWeekendHelper(todayDate)) {
      const d = new Date();
      const dayName = d.getDay() === 0 ? 'Sunday' : 'Saturday';
      const formatted = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      return `${dayName}, ${formatted}`;
    }
    return '';
  });

  // Local Daily attendance state
  const [localAttendance, setLocalAttendance] = useState<Record<string, 'Present' | 'Absent' | 'Late' | 'Unmarked'>>({});
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingSF2, setIsExportingSF2] = useState(false);

  const isInactiveStudentStatus = (status?: string) => {
    if (!status) return false;
    const s = status.toLowerCase().trim();
    return (
      s === 'transferred out' ||
      s === 'dropped' ||
      s === 'transferred' ||
      s === 'withdrawn' ||
      s === 'inactive' ||
      s === 'archived' ||
      s === 'pending' ||
      s === 'rejected'
    );
  };

  // Enrolled active learners sorted alphabetically and by gender (excluding dropped & transferred out)
  const enrolled = useMemo(() => {
    return students
      .filter((s) => {
        // Exclude dropped, transferred out, inactive, pending, or rejected learners
        if (isInactiveStudentStatus(s.status)) return false;

        // Handle Transferred In learners: only active on or after transfer date
        if (s.status === 'Transferred In') {
          const tInDate = (s.transferredInDate || s.enrollmentDate || '').trim();
          if (tInDate && selectedDate < tInDate) return false;
        }

        // Handle enrollment date if specified
        if (s.enrollmentDate && selectedDate < s.enrollmentDate) return false;

        return true;
      })
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

  const filteredEnrolled = useMemo(() => {
    return enrolled.filter((s) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = q === '' ||
        `${s.firstName} ${s.lastName} ${s.lrn}`.toLowerCase().includes(q);
      const matchesGender = genderFilter === 'All' || s.gender === genderFilter;
      return matchesSearch && matchesGender;
    });
  }, [enrolled, searchQuery, genderFilter]);

  const maleStudents = useMemo(() => {
    return filteredEnrolled.filter(s => (s.gender || '').toLowerCase().startsWith('m'));
  }, [filteredEnrolled]);

  const femaleStudents = useMemo(() => {
    return filteredEnrolled.filter(s => (s.gender || '').toLowerCase().startsWith('f'));
  }, [filteredEnrolled]);

  // Synchronize local daily state
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

  // Status counts for selected date
  const presentCount = Object.values(localAttendance).filter((s) => s === 'Present').length;
  const absentCount = Object.values(localAttendance).filter((s) => s === 'Absent').length;
  const lateCount = Object.values(localAttendance).filter((s) => s === 'Late').length;
  const unmarkedCount = enrolled.length - (presentCount + absentCount + lateCount);
  const attendanceRateToday = enrolled.length > 0 ? Math.round(((presentCount + lateCount) / enrolled.length) * 100) : 0;

  const pieData = useMemo(() => {
    return [
      { name: 'Present', value: presentCount + lateCount, color: '#10b981' },
      { name: 'Absent', value: absentCount, color: '#ef4444' },
      { name: 'Unmarked', value: Math.max(0, unmarkedCount), color: '#e2e8f0' }
    ].filter(d => d.value > 0);
  }, [presentCount, lateCount, absentCount, unmarkedCount]);

  const isWeekend = (dateStr: string) => {
    if (!dateStr) return false;
    const parts = dateStr.split('-');
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    const day = d.getDay();
    return day === 0 || day === 6;
  };

  const isCurrentDateWeekend = isWeekend(selectedDate);
  const isBeforeSchoolYear = Boolean(schoolYearStart && selectedDate < schoolYearStart);
  const isAfterSchoolYear = Boolean(schoolYearEnd && selectedDate > schoolYearEnd);
  const isDateLocked = isCurrentDateWeekend || isBeforeSchoolYear || isAfterSchoolYear;

  // Mark all present handler
  const handleMarkAllPresent = async () => {
    if (enrolled.length === 0 || isSaving) return;
    if (isBeforeSchoolYear) {
      toast.error(`Cannot record attendance before the school year start date (${schoolYearStart}).`);
      return;
    }
    if (isAfterSchoolYear) {
      toast.error(`Cannot record attendance after the school year end date (${schoolYearEnd}).`);
      return;
    }
    if (isCurrentDateWeekend) {
      const d = new Date(selectedDate);
      const dayName = d.getDay() === 0 ? 'Sunday' : 'Saturday';
      const formatted = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      setWeekendSelectedDateStr(`${dayName}, ${formatted}`);
      setIsWeekendModalOpen(true);
      toast.error("Attendance cannot be recorded on weekends (Monday to Friday only).");
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading("Marking all active learners present...");
    try {
      const promises = enrolled.map(s => updateAttendance(s.id, selectedDate, 'Present'));
      await Promise.all(promises);

      const newConfirmed: Record<string, boolean> = {};
      const newAttendance: Record<string, 'Present' | 'Absent' | 'Late' | 'Unmarked'> = {};
      enrolled.forEach(s => {
        newConfirmed[s.id] = true;
        newAttendance[s.id] = 'Present';
      });
      setConfirmed(newConfirmed);
      setLocalAttendance(newAttendance);
      setSaved(true);
      toast.success("All learners marked Present!", { id: toastId });
    } catch (err) {
      console.error("Error marking all present:", err);
      toast.error("Failed to mark all present.", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset daily attendance
  const handleReset = async () => {
    if (isBeforeSchoolYear) {
      toast.error(`Cannot modify attendance before the school year start date (${schoolYearStart}).`);
      return;
    }
    if (isCurrentDateWeekend) {
      toast.error("Cannot modify attendance on weekends.");
      return;
    }
    if (!window.confirm("Are you sure you want to reset all attendance marks for this day?")) return;
    setIsSaving(true);
    try {
      const promises = enrolled.map(s => updateAttendance(s.id, selectedDate, 'Unmarked'));
      await Promise.all(promises);
      setConfirmed({});
      const resetMap: Record<string, 'Present' | 'Absent' | 'Late' | 'Unmarked'> = {};
      enrolled.forEach(s => { resetMap[s.id] = 'Unmarked'; });
      setLocalAttendance(resetMap);
      setSaved(true);
      toast.success("Attendance reset for today.");
    } catch (error) {
      console.error("Error resetting attendance", error);
      toast.error("Failed to reset attendance.");
    } finally {
      setIsSaving(false);
    }
  };

  // Confirm student presence
  const handleConfirm = useCallback((studentId: string, status: 'Present' | 'Absent' = 'Present') => {
    if (schoolYearStart && selectedDate < schoolYearStart) {
      toast.error(`Attendance tracking starts on ${schoolYearStart} (Admin Settings).`);
      return;
    }
    if (isWeekend(selectedDate)) {
      const d = new Date(selectedDate);
      const dayName = d.getDay() === 0 ? 'Sunday' : 'Saturday';
      const formatted = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      setWeekendSelectedDateStr(`${dayName}, ${formatted}`);
      setIsWeekendModalOpen(true);
      toast.error("Attendance cannot be recorded on weekends.");
      return;
    }

    setConfirmed(prev => ({ ...prev, [studentId]: true }));
    setLocalAttendance(prev => ({ ...prev, [studentId]: status }));
    setIsSaving(true);
    updateAttendance(studentId, selectedDate, status)
      .then(() => setSaved(true))
      .catch(err => {
        console.error("Auto-save failed", err);
        setSaved(false);
      })
      .finally(() => setIsSaving(false));
  }, [selectedDate, schoolYearStart, updateAttendance]);

  // School Day Helpers for Monthly View - Strictly starts from the start of school day date (schoolYearStart)
  const monthDays = useMemo(() => {
    const date = new Date(selectedYear, selectedMonth, 1);
    const days: string[] = [];
    while (date.getMonth() === selectedMonth) {
      const day = date.getDay();
      const dateStr = toLocalYYYYMMDD(date);
      const isWeekday = day !== 0 && day !== 6; // Mon-Fri
      const isAfterOrOnStart = !schoolYearStart || dateStr >= schoolYearStart;
      const isBeforeOrOnEnd = !schoolYearEnd || dateStr <= schoolYearEnd;
      if (isWeekday && isAfterOrOnStart && isBeforeOrOnEnd) {
        days.push(dateStr);
      }
      date.setDate(date.getDate() + 1);
    }
    return days;
  }, [selectedYear, selectedMonth, schoolYearStart, schoolYearEnd]);

  const getStatusForDate = useCallback((studentId: string, dateStr: string) => {
    const record = attendance.find(a => a.studentId === studentId && a.date === dateStr);
    if (!record) return 'Unmarked';
    return (record.status || (record as any).amStatus || 'Unmarked') as 'Present' | 'Absent' | 'Late' | 'Unmarked';
  }, [attendance]);

  const getStudentMonthlyStats = (studentId: string) => {
    let present = 0;
    let absent = 0;
    let late = 0;
    monthDays.forEach(day => {
      const st = getStatusForDate(studentId, day);
      if (st === 'Present') present++;
      else if (st === 'Absent') absent++;
      else if (st === 'Late') late++;
    });
    const totalLogged = present + absent + late;
    const rate = totalLogged > 0 ? Math.round(((present + late) / totalLogged) * 100) : (monthDays.length > 0 ? 0 : 100);
    return { present, absent, late, totalLogged, rate };
  };

  const schoolMonths = useMemo(() => {
    return getSchoolMonths(schoolYearStart, schoolYearEnd);
  }, [schoolYearStart, schoolYearEnd]);

  // Yearly helpers - Strictly considers attendance records within the active school year
  const markedDates = useMemo(() => {
    const dates = new Set(
      attendance
        .filter(a => (!schoolYearStart || a.date >= schoolYearStart) && (!schoolYearEnd || a.date <= schoolYearEnd))
        .map(a => a.date)
        .filter(Boolean)
    );
    return Array.from(dates).sort();
  }, [attendance, schoolYearStart, schoolYearEnd]);

  const getStudentYearlyStats = (studentId: string) => {
    let present = 0;
    let absent = 0;
    let late = 0;

    const monthStats: Record<number, { present: number; absent: number; late: number }> = {};
    schoolMonths.forEach(m => {
      monthStats[m.index] = { present: 0, absent: 0, late: 0 };
    });

    attendance
      .filter(a => a.studentId === studentId && (!schoolYearStart || a.date >= schoolYearStart) && (!schoolYearEnd || a.date <= schoolYearEnd))
      .forEach(r => {
        const st = r.status || (r as any).amStatus || 'Present';
        const mo = r.date ? (parseInt(r.date.split('-')[1], 10) - 1) : -1;
        if (st === 'Present') present++;
        else if (st === 'Absent') absent++;
        else if (st === 'Late') late++;

        if (monthStats[mo] !== undefined) {
          if (st === 'Present') monthStats[mo].present++;
          else if (st === 'Absent') monthStats[mo].absent++;
          else if (st === 'Late') monthStats[mo].late++;
        }
      });

    const totalLogged = present + absent + late;
    const rate = totalLogged > 0 ? Math.round(((present + late) / totalLogged) * 100) : 0;
    return { present, absent, late, totalLogged, rate, monthStats };
  };

  const isAdvisor = Boolean(isAdvisorForCurrentSection || currentSectionData?.isAdvisor);

  // Export DepEd SF2 Excel (.xlsx) handler
  const handleExportSF2 = async () => {
    if (!currentSection || isExportingSF2) return;
    if (!isAdvisor) {
      toast.error("Only the assigned advisory teacher can export attendance Excel (SF2) for this section.");
      return;
    }
    setIsExportingSF2(true);
    const toastId = toast.loading("Generating DepEd School Form 2 (SF2) Excel...");
    try {
      const monthName = MONTH_NAMES[selectedMonth];
      const data = await ReportDataService.getSF2Data(
        selectedAcademicYear,
        currentSection,
        monthName
      );
      await generateSF2(data);
      toast.success(`Exported School Form 2 (SF2) for ${monthName}!`, { id: toastId });
    } catch (error) {
      console.error("Error generating SF2 Excel:", error);
      toast.error("Failed to generate SF2 Excel.", { id: toastId });
    } finally {
      setIsExportingSF2(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#D8232A]/20 border-t-[#D8232A] rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Classroom Attendance...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      
      {/* 1. Header Bar */}
      <header className="h-[72px] px-6 sm:px-8 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-xs sticky top-0 z-30">
        <div className="flex flex-row items-center justify-between gap-4 w-full max-w-[1600px] mx-auto">
          
          {/* Title & Section Tag */}
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-[#D8232A] shadow-2xs">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-slate-900">
                  {currentSectionData ? `${currentSectionData.gradeLevel} - ${currentSectionData.name}` : 'Classroom Attendance'}
                </h1>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-[10px] font-extrabold px-2 py-0.5",
                    isAdvisor 
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                      : "bg-slate-50 border-slate-200 text-slate-600"
                  )}
                >
                  {isAdvisor ? "Advisory Section" : "Subject Section"}
                </Badge>
                {/* Auto-save status badge */}
                <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100/80 border border-slate-200/50 text-[10px] font-bold select-none">
                  {isSaving ? (
                    <>
                      <div className="w-2 h-2 border border-[#D8232A] border-t-transparent rounded-full animate-spin" />
                      <span className="text-red-700">Saving...</span>
                    </>
                  ) : saved ? (
                    <>
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                      <span className="text-emerald-700">Saved</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-2.5 h-2.5 text-amber-500 animate-pulse" />
                      <span className="text-amber-700">Unsaved</span>
                    </>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                {isAdvisor
                  ? "Take daily roll call, inspect monthly registers, and export official DepEd SF2 reports"
                  : "Take daily roll call and inspect attendance (SF2 export is available for Advisory section only)"}
              </p>
            </div>
          </div>

          {/* Top Actions & Section Switcher */}
          <div className="flex items-center gap-3 shrink-0">
            {assignedSections && assignedSections.length > 0 && (
              <Select value={currentSection} onValueChange={setCurrentSection}>
                <SelectTrigger className="w-[190px] h-10 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 shadow-2xs">
                  <SelectValue placeholder="Select Section">
                    {currentSectionData ? `${currentSectionData.gradeLevel} - ${currentSectionData.name}` : 'Select Section'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {assignedSections.map(sec => (
                    <SelectItem key={sec.sectionId} value={sec.sectionId} className="text-xs font-bold">
                      {sec.gradeLevel} - {sec.name} {sec.isAdvisor ? "★ (Advisory)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Monthly SF2 Export Button */}
            {activeTab === 'monthly' && (
              <Button
                onClick={handleExportSF2}
                disabled={enrolled.length === 0 || isExportingSF2 || !isAdvisor}
                className={cn(
                  "rounded-xl h-10 px-4 text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all",
                  isAdvisor
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 cursor-pointer"
                    : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                )}
                title={
                  !isAdvisor 
                    ? "Export is restricted: Only the assigned section adviser can export attendance Excel reports." 
                    : "Export Official DepEd School Form 2 (SF2) Excel (.xlsx)"
                }
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>
                  {isExportingSF2 
                    ? "Generating SF2..." 
                    : isAdvisor 
                    ? "Export SF2 (Excel)" 
                    : "Advisory Only"}
                </span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* 2. Main Body Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto w-full">
        
        {/* Navigation Tabs Switcher Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
          
          {/* Tab buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl">
            <button
              onClick={() => setActiveTab('take')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2",
                activeTab === 'take'
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <ClipboardCheck className="w-3.5 h-3.5 text-[#D8232A]" />
              <span>Take Attendance</span>
            </button>

            <button
              onClick={() => setActiveTab('monthly')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2",
                activeTab === 'monthly'
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
              <span>Monthly Matrix</span>
            </button>

            <button
              onClick={() => setActiveTab('yearly')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2",
                activeTab === 'yearly'
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <CalendarRange className="w-3.5 h-3.5 text-indigo-600" />
              <span>Yearly Summary</span>
            </button>
          </div>

          {/* Time Picker Controls based on Tab */}
          <div className="flex items-center gap-2.5">
            {activeTab === 'take' && (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
                <Calendar className="w-4 h-4 text-slate-500" />
                <input
                  type="date"
                  min={schoolYearStart || undefined}
                  max={schoolYearEnd || todayDate}
                  value={selectedDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    if (schoolYearStart && val < schoolYearStart) {
                      toast.error(`Attendance starts on official school day date: ${schoolYearStart}`);
                      setSelectedDate(schoolYearStart);
                      return;
                    }
                    const parts = val.split('-');
                    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                    const selectedDay = d.getDay();
                    if (selectedDay === 0 || selectedDay === 6) {
                      const dayName = selectedDay === 0 ? 'Sunday' : 'Saturday';
                      const formatted = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                      setWeekendSelectedDateStr(`${dayName}, ${formatted}`);
                      setIsWeekendModalOpen(true);
                      return;
                    }
                    const maxAllowed = schoolYearEnd ? (schoolYearEnd < todayDate ? schoolYearEnd : todayDate) : todayDate;
                    setSelectedDate(val > maxAllowed ? maxAllowed : val);
                  }}
                  className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                />
              </div>
            )}

            {activeTab === 'monthly' && (
              <div className="flex items-center gap-2">
                <Select 
                  value={MONTH_NAMES[selectedMonth]} 
                  onValueChange={(v) => {
                    const idx = MONTH_NAMES.indexOf(v);
                    if (idx !== -1) setSelectedMonth(idx);
                  }}
                >
                  <SelectTrigger className="w-[145px] h-9.5 rounded-xl border-slate-200 bg-slate-50 text-xs font-bold text-slate-800">
                    <SelectValue placeholder="Month">{MONTH_NAMES[selectedMonth]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {availableMonths.map((mIdx) => (
                      <SelectItem key={MONTH_NAMES[mIdx]} value={MONTH_NAMES[mIdx]} className="text-xs font-bold">
                        {MONTH_NAMES[mIdx]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedYear.toString()} onValueChange={(v) => handleYearChange(parseInt(v, 10))}>
                  <SelectTrigger className="w-[100px] h-9.5 rounded-xl border-slate-200 bg-slate-50 text-xs font-bold text-slate-800">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map(yr => (
                      <SelectItem key={yr} value={yr.toString()} className="text-xs font-bold">
                        {yr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {activeTab === 'yearly' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">School Year:</span>
                <Select value={selectedAcademicYear} onValueChange={setSelectedAcademicYear}>
                  <SelectTrigger className="w-[150px] h-9.5 rounded-xl border-slate-200 bg-slate-50 text-xs font-bold text-slate-800">
                    <SelectValue placeholder="Academic Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {['2024-2025', '2025-2026', '2026-2027', '2027-2028'].map(sy => (
                      <SelectItem key={sy} value={sy} className="text-xs font-bold">AY {sy}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Quick KPI Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/70 p-4.5 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Total Enrolled</p>
              <p className="text-xl sm:text-2xl font-black text-slate-900">{enrolled.length}</p>
              <p className="text-[10.5px] font-semibold text-slate-400">M: {maleStudents.length} • F: {femaleStudents.length}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/70 p-4.5 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Present</p>
              <p className="text-xl sm:text-2xl font-black text-emerald-700">{presentCount}</p>
              <p className="text-[10.5px] font-semibold text-emerald-600">Active in class</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/70 p-4.5 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Absent / Late</p>
              <p className="text-xl sm:text-2xl font-black text-rose-700">{absentCount} <span className="text-sm font-bold text-amber-600">({lateCount} late)</span></p>
              <p className="text-[10.5px] font-semibold text-slate-400">{unmarkedCount} unmarked</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/70 p-4.5 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Attendance Rate</p>
              <p className="text-xl sm:text-2xl font-black text-indigo-700">{attendanceRateToday}%</p>
              <p className="text-[10.5px] font-semibold text-slate-400">{selectedDate}</p>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: TAKE ATTENDANCE (DAILY MARKING SHEET)                              */}
        {/* ========================================================================= */}
        {activeTab === 'take' && (
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
            
            {/* Before School Year Alert Banner */}
            {isBeforeSchoolYear && (
              <div className="bg-red-50 border-b border-red-200 px-5 py-3.5 flex items-center justify-between gap-3 text-red-900">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-100 border border-red-300 text-[#D8232A] flex items-center justify-center shrink-0">
                    <Calendar className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <p className="text-xs font-black">Before Official School Year Start ({schoolYearStart})</p>
                    <p className="text-[11px] font-medium text-red-700">Official attendance tracking starts on the school opening date configured in Admin Settings.</p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-red-100 border-red-300 text-red-800 text-[10px] font-black uppercase px-2.5 py-1">
                  Starts: {schoolYearStart}
                </Badge>
              </div>
            )}

            {/* Weekend Alert Notification Banner */}
            {isCurrentDateWeekend && !isBeforeSchoolYear && (
              <div className="bg-amber-50 border-b border-amber-200 px-5 py-3.5 flex items-center justify-between gap-3 text-amber-900">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <p className="text-xs font-black">Weekend Date Selected — Attendance Taking Locked</p>
                    <p className="text-[11px] font-medium text-amber-700">Official DepEd attendance is recorded only on school weekdays (Monday to Friday).</p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-amber-100 border-amber-300 text-amber-800 text-[10px] font-black uppercase px-2.5 py-1">
                  Weekend
                </Badge>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-slate-50/50 border-b border-slate-200/70">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search student by name or LRN..."
                    className="pl-9 h-10 rounded-xl bg-white border-slate-200/80 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-red-500/20 focus:border-[#D8232A] transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Select value={genderFilter} onValueChange={(v) => setGenderFilter(v as 'All' | 'Male' | 'Female')}>
                    <SelectTrigger className="w-[140px] h-10 rounded-xl border-slate-200/80 bg-white text-xs font-semibold text-slate-700">
                      <Filter className="h-3.5 w-3.5 mr-2 text-slate-400" />
                      <SelectValue placeholder="Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Genders</SelectItem>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Quick Batch Actions */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleMarkAllPresent}
                  disabled={isSaving || enrolled.length === 0 || isDateLocked}
                  className="rounded-xl h-10 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>Mark All Present</span>
                </Button>
                <Button
                  onClick={handleReset}
                  disabled={isSaving || enrolled.length === 0 || isDateLocked}
                  variant="outline"
                  className="rounded-xl h-10 px-3 border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold shadow-2xs flex items-center gap-1.5"
                  title="Reset daily marks"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </Button>
              </div>
            </div>

            {/* Students Table */}
            {filteredEnrolled.length === 0 ? (
              <div className="text-center py-16 text-slate-400 font-medium">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No learners found matching current filters.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                
                {/* Male Learners */}
                <div className="p-3.5 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Male Learners ({maleStudents.length})
                  </h4>
                  <span className="text-[11px] font-bold text-slate-400">{selectedDate}</span>
                </div>

                <Table>
                  <TableHeader className="bg-slate-50/90 border-b border-slate-200/70 select-none">
                    <TableRow className="hover:bg-transparent border-none h-10">
                      <TableHead className="w-12 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 pl-4">#</TableHead>
                      <TableHead className="w-40 text-[10px] font-bold uppercase tracking-wider text-slate-500">LRN</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Learner Name</TableHead>
                      <TableHead className="w-28 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">Gender</TableHead>
                      <TableHead className="w-64 text-right pr-6 text-[10px] font-bold uppercase tracking-wider text-slate-500">Attendance Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maleStudents.map((s, idx) => {
                      const status = localAttendance[s.id] || 'Unmarked';
                      const isConfirmed = confirmed[s.id];

                      return (
                        <TableRow key={s.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors h-14">
                          <TableCell className="text-center font-bold text-slate-400 text-xs pl-4">{idx + 1}</TableCell>
                          <TableCell className="font-mono font-bold text-slate-600 text-xs">{s.lrn || 'N/A'}</TableCell>
                          <TableCell className="font-bold text-slate-900 text-xs sm:text-sm">{s.lastName}, {s.firstName}</TableCell>
                          <TableCell className="text-center text-xs font-semibold text-slate-500">Male</TableCell>
                          <TableCell className="text-right pr-6">
                            {isDateLocked ? (
                              <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-300 font-extrabold text-[11px] px-3 py-1 rounded-full uppercase tracking-wider">
                                {isBeforeSchoolYear ? 'Locked (Before S.Y.)' : isAfterSchoolYear ? 'Locked (After S.Y.)' : 'Locked (Weekend)'}
                              </Badge>
                            ) : !isConfirmed ? (
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  disabled={isSaving}
                                  onClick={() => handleConfirm(s.id, 'Present')}
                                  className="h-8 px-3 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 text-xs font-bold transition-all"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Present
                                </Button>
                                <Button
                                  size="sm"
                                  disabled={isSaving}
                                  onClick={() => handleConfirm(s.id, 'Absent')}
                                  className="h-8 px-3 rounded-full bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white border border-rose-200 text-xs font-bold transition-all"
                                >
                                  <UserX className="w-3.5 h-3.5 mr-1" /> Absent
                                </Button>
                              </div>
                            ) : (
                              <Select
                                disabled={isSaving}
                                value={status === 'Unmarked' ? 'Present' : status}
                                onValueChange={(val) => {
                                  if (val === 'Unmarked') {
                                    setConfirmed(prev => ({ ...prev, [s.id]: false }));
                                  }
                                  setLocalAttendance(prev => ({ ...prev, [s.id]: val as any }));
                                  setIsSaving(true);
                                  updateAttendance(s.id, selectedDate, val as any)
                                    .then(() => setSaved(true))
                                    .finally(() => setIsSaving(false));
                                }}
                              >
                                <SelectTrigger className={cn(
                                  "w-[130px] h-8.5 ml-auto text-xs font-bold rounded-full",
                                  status === 'Present' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                  status === 'Absent' ? "bg-rose-50 text-rose-700 border-rose-200" :
                                  status === 'Late' ? "bg-amber-50 text-amber-700 border-amber-200" :
                                  "bg-slate-100 text-slate-600 border-slate-200"
                                )}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Present" className="text-xs font-bold text-emerald-700">Present</SelectItem>
                                  <SelectItem value="Late" className="text-xs font-bold text-amber-700">Late</SelectItem>
                                  <SelectItem value="Absent" className="text-xs font-bold text-rose-700">Absent</SelectItem>
                                  <SelectItem value="Unmarked" className="text-xs font-bold text-slate-500">Unmarked (Reset)</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {/* Female Learners */}
                <div className="p-3.5 bg-slate-50/50 border-b border-slate-100 border-t border-slate-200 flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Female Learners ({femaleStudents.length})
                  </h4>
                  <span className="text-[11px] font-bold text-slate-400">{selectedDate}</span>
                </div>

                <Table>
                  <TableHeader className="bg-slate-50/90 border-b border-slate-200/70 select-none">
                    <TableRow className="hover:bg-transparent border-none h-10">
                      <TableHead className="w-12 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 pl-4">#</TableHead>
                      <TableHead className="w-40 text-[10px] font-bold uppercase tracking-wider text-slate-500">LRN</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Learner Name</TableHead>
                      <TableHead className="w-28 text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">Gender</TableHead>
                      <TableHead className="w-64 text-right pr-6 text-[10px] font-bold uppercase tracking-wider text-slate-500">Attendance Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {femaleStudents.map((s, idx) => {
                      const status = localAttendance[s.id] || 'Unmarked';
                      const isConfirmed = confirmed[s.id];

                      return (
                        <TableRow key={s.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors h-14">
                          <TableCell className="text-center font-bold text-slate-400 text-xs pl-4">{idx + 1}</TableCell>
                          <TableCell className="font-mono font-bold text-slate-600 text-xs">{s.lrn || 'N/A'}</TableCell>
                          <TableCell className="font-bold text-slate-900 text-xs sm:text-sm">{s.lastName}, {s.firstName}</TableCell>
                          <TableCell className="text-center text-xs font-semibold text-slate-500">Female</TableCell>
                          <TableCell className="text-right pr-6">
                            {isDateLocked ? (
                              <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-300 font-extrabold text-[11px] px-3 py-1 rounded-full uppercase tracking-wider">
                                {isBeforeSchoolYear ? 'Locked (Before S.Y.)' : isAfterSchoolYear ? 'Locked (After S.Y.)' : 'Locked (Weekend)'}
                              </Badge>
                            ) : !isConfirmed ? (
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  disabled={isSaving}
                                  onClick={() => handleConfirm(s.id, 'Present')}
                                  className="h-8 px-3 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 text-xs font-bold transition-all"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Present
                                </Button>
                                <Button
                                  size="sm"
                                  disabled={isSaving}
                                  onClick={() => handleConfirm(s.id, 'Absent')}
                                  className="h-8 px-3 rounded-full bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white border border-rose-200 text-xs font-bold transition-all"
                                >
                                  <UserX className="w-3.5 h-3.5 mr-1" /> Absent
                                </Button>
                              </div>
                            ) : (
                              <Select
                                disabled={isSaving}
                                value={status === 'Unmarked' ? 'Present' : status}
                                onValueChange={(val) => {
                                  if (val === 'Unmarked') {
                                    setConfirmed(prev => ({ ...prev, [s.id]: false }));
                                  }
                                  setLocalAttendance(prev => ({ ...prev, [s.id]: val as any }));
                                  setIsSaving(true);
                                  updateAttendance(s.id, selectedDate, val as any)
                                    .then(() => setSaved(true))
                                    .finally(() => setIsSaving(false));
                                }}
                              >
                                <SelectTrigger className={cn(
                                  "w-[130px] h-8.5 ml-auto text-xs font-bold rounded-full",
                                  status === 'Present' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                  status === 'Absent' ? "bg-rose-50 text-rose-700 border-rose-200" :
                                  status === 'Late' ? "bg-amber-50 text-amber-700 border-amber-200" :
                                  "bg-slate-100 text-slate-600 border-slate-200"
                                )}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Present" className="text-xs font-bold text-emerald-700">Present</SelectItem>
                                  <SelectItem value="Late" className="text-xs font-bold text-amber-700">Late</SelectItem>
                                  <SelectItem value="Absent" className="text-xs font-bold text-rose-700">Absent</SelectItem>
                                  <SelectItem value="Unmarked" className="text-xs font-bold text-slate-500">Unmarked (Reset)</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

              </div>
            )}

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MONTHLY MATRIX REGISTER TABLE (Grouped Mon-Fri by Week)           */}
        {/* ========================================================================= */}
        {activeTab === 'monthly' && (() => {
          // Group month school days into Mon-Fri weeks
          const weeks: { weekNum: number; days: { dateStr: string; dayNum: number; dayName: string; isMonday: boolean; isFriday: boolean }[] }[] = [];
          let currentWeek: { weekNum: number; days: { dateStr: string; dayNum: number; dayName: string; isMonday: boolean; isFriday: boolean }[] } | null = null;
          let weekCounter = 1;

          monthDays.forEach((dayStr) => {
            const d = new Date(dayStr);
            const dayOfWeek = d.getDay(); // 1 = Mon ... 5 = Fri
            const dayNum = d.getDate();
            const dayNameMap = ['', 'M', 'T', 'W', 'TH', 'F', ''];
            const dayName = dayNameMap[dayOfWeek] || 'D';

            if (!currentWeek || dayOfWeek === 1) {
              if (currentWeek) {
                weeks.push(currentWeek);
                weekCounter++;
              }
              currentWeek = {
                weekNum: weekCounter,
                days: []
              };
            }

            currentWeek.days.push({
              dateStr: dayStr,
              dayNum,
              dayName,
              isMonday: dayOfWeek === 1,
              isFriday: dayOfWeek === 5
            });
          });

          if (currentWeek && (currentWeek as any).days.length > 0) {
            weeks.push(currentWeek);
          }

          return (
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50/50 border-b border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Monthly Attendance Matrix • {MONTH_NAMES[selectedMonth]} {selectedYear}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Monday to Friday school days grouped by week with daily status log</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="bg-white text-slate-700 border-slate-200 font-bold text-xs px-3 py-1">
                    {weeks.length} Weeks ({monthDays.length} Days)
                  </Badge>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table className="min-w-[900px] border-collapse">
                  <TableHeader className="select-none bg-slate-50/90">
                    
                    {/* Top Tier Header: Week Groups */}
                    <TableRow className="hover:bg-transparent border-b border-slate-200 h-9">
                      <TableHead className="font-black text-slate-700 pl-6 sticky left-0 bg-slate-100/95 z-20 min-w-[210px] border-r-2 border-slate-300 text-xs shadow-xs align-middle">
                        Learner Name
                      </TableHead>
                      {weeks.map((week) => (
                        <TableHead
                          key={`week-${week.weekNum}`}
                          colSpan={week.days.length}
                          className="text-center font-black text-[11px] py-1 text-slate-700 border-l-2 border-slate-300 bg-slate-100/80 uppercase tracking-wider"
                        >
                          Week {week.weekNum} (M–F)
                        </TableHead>
                      ))}
                      <TableHead colSpan={3} className="text-center font-black text-xs text-slate-700 border-l-2 border-slate-300 bg-slate-100/80 uppercase tracking-wider">
                        Monthly Summary
                      </TableHead>
                    </TableRow>

                    {/* Second Tier Header: Day Numbers & Weekday (M, T, W, TH, F) */}
                    <TableRow className="hover:bg-transparent border-b border-slate-200/90 h-10">
                      <TableHead className="sticky left-0 bg-slate-50 z-20 border-r-2 border-slate-300 pl-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Student List
                      </TableHead>
                      {weeks.map((week) =>
                        week.days.map((day) => (
                          <TableHead
                            key={day.dateStr}
                            className={cn(
                              "text-center px-1 py-1.5 min-w-[36px] transition-colors",
                              day.isMonday ? "border-l-2 border-slate-300" : "border-l border-slate-200/60",
                              week.weekNum % 2 === 0 ? "bg-slate-50/60" : "bg-white"
                            )}
                          >
                            <div className="font-black text-slate-800 text-[11px] leading-tight">{day.dayNum}</div>
                            <div className="text-[9px] font-black text-slate-500 uppercase leading-none mt-0.5">{day.dayName}</div>
                          </TableHead>
                        ))
                      )}
                      <TableHead className="font-bold text-emerald-700 text-center text-xs min-w-[55px] border-l-2 border-slate-300 bg-emerald-50/40">Present</TableHead>
                      <TableHead className="font-bold text-rose-700 text-center text-xs min-w-[55px] border-l border-slate-200 bg-rose-50/40">Absent</TableHead>
                      <TableHead className="font-bold text-slate-700 text-right pr-6 text-xs min-w-[75px] border-l border-slate-200">Rate</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredEnrolled.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={monthDays.length + 4} className="text-center py-12 text-slate-400 italic">
                          No students found matching current filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEnrolled.map((s, sIdx) => {
                        const st = getStudentMonthlyStats(s.id);
                        return (
                          <TableRow key={s.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors h-11">
                            <TableCell className="pl-6 font-bold text-slate-800 text-xs sm:text-sm sticky left-0 bg-white z-10 border-r-2 border-slate-300 shadow-xs">
                              <span className="text-slate-400 text-xs mr-2">{sIdx + 1}.</span>
                              {s.lastName}, {s.firstName}
                            </TableCell>
                            {weeks.map((week) =>
                              week.days.map((day) => {
                                const stat = getStatusForDate(s.id, day.dateStr);
                                return (
                                  <TableCell
                                    key={day.dateStr}
                                    className={cn(
                                      "text-center p-0.5",
                                      day.isMonday ? "border-l-2 border-slate-300" : "border-l border-slate-200/50",
                                      week.weekNum % 2 === 0 ? "bg-slate-50/30" : "bg-white"
                                    )}
                                  >
                                    {stat === 'Present' ? (
                                      <span className="inline-block w-5 h-5 leading-5 rounded-md bg-emerald-100 text-emerald-800 font-black text-[10px] border border-emerald-300 shadow-2xs">
                                        ✓
                                      </span>
                                    ) : stat === 'Absent' ? (
                                      <span className="inline-block w-5 h-5 leading-5 rounded-md bg-rose-100 text-rose-800 font-black text-[10px] border border-rose-300 shadow-2xs">
                                        x
                                      </span>
                                    ) : stat === 'Late' ? (
                                      <span className="inline-block w-5 h-5 leading-5 rounded-md bg-amber-100 text-amber-800 font-black text-[10px] border border-amber-300 shadow-2xs">
                                        L
                                      </span>
                                    ) : (
                                      <span className="text-slate-300 text-xs font-semibold">-</span>
                                    )}
                                  </TableCell>
                                );
                              })
                            )}
                            <TableCell className="text-center font-black text-emerald-700 text-xs border-l-2 border-slate-300 bg-emerald-50/20">{st.present}</TableCell>
                            <TableCell className="text-center font-black text-rose-700 text-xs border-l border-slate-200 bg-rose-50/20">{st.absent}</TableCell>
                            <TableCell className="text-right pr-6 border-l border-slate-200">
                              <span className={cn(
                                "font-extrabold text-xs px-2 py-0.5 rounded-md",
                                st.rate >= 90 ? "bg-emerald-50 text-emerald-700" :
                                st.rate >= 75 ? "bg-amber-50 text-amber-700" :
                                "bg-rose-50 text-rose-700"
                              )}>
                                {st.rate}%
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          );
        })()}

        {/* ========================================================================= */}
        {/* TAB 3: YEARLY SUMMARY TABLE                                               */}
        {/* ========================================================================= */}
        {activeTab === 'yearly' && (
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/50 border-b border-slate-200/70 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Annual Attendance Summary • S.Y. {selectedAcademicYear}
                </h3>
                <p className="text-xs text-slate-500 font-medium">Month-by-month present day tallies and annual percentage</p>
              </div>
              <Badge variant="outline" className="bg-white text-slate-700 border-slate-200 font-bold text-xs px-3 py-1">
                {enrolled.length} Active Learners
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHeader className="bg-slate-50/90 border-b border-slate-200/70 select-none">
                  <TableRow className="hover:bg-transparent border-none h-10">
                    <TableHead className="w-12 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 pl-4">#</TableHead>
                    <TableHead className="w-36 text-[10px] font-bold uppercase tracking-wider text-slate-500">LRN</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-500 min-w-[160px]">Learner Name</TableHead>
                    <TableHead className="w-16 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">Gender</TableHead>
                    {schoolMonths.map(m => (
                      <TableHead key={m.name} className="w-12 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 px-1">
                        {m.name}
                      </TableHead>
                    ))}
                    <TableHead className="w-20 text-center text-[10px] font-bold uppercase tracking-wider text-emerald-700">Total Present</TableHead>
                    <TableHead className="w-20 text-center text-[10px] font-bold uppercase tracking-wider text-rose-700">Total Absent</TableHead>
                    <TableHead className="w-24 text-right pr-6 text-[10px] font-bold uppercase tracking-wider text-slate-500">Annual Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEnrolled.map((s, idx) => {
                    const st = getStudentYearlyStats(s.id);
                    return (
                      <TableRow key={s.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors h-12">
                        <TableCell className="text-center font-bold text-slate-400 text-xs pl-4">{idx + 1}</TableCell>
                        <TableCell className="font-mono font-bold text-slate-600 text-xs">{s.lrn || 'N/A'}</TableCell>
                        <TableCell className="font-bold text-slate-900 text-xs sm:text-sm">{s.lastName}, {s.firstName}</TableCell>
                        <TableCell className="text-center text-xs font-semibold text-slate-500">
                          {(s.gender || '').toLowerCase().startsWith('m') ? 'M' : 'F'}
                        </TableCell>
                        {schoolMonths.map(m => {
                          const moPresent = st.monthStats[m.index]?.present || 0;
                          return (
                            <TableCell key={m.name} className="text-center text-xs font-bold text-slate-600 px-1">
                              {moPresent > 0 ? (
                                <span className="text-emerald-700 font-extrabold">{moPresent}</span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center font-black text-emerald-700 text-xs">{st.present}</TableCell>
                        <TableCell className="text-center font-black text-rose-700 text-xs">{st.absent}</TableCell>
                        <TableCell className="text-right pr-6">
                          <Badge variant="outline" className={cn(
                            "font-extrabold text-[11px] px-2.5 py-0.5",
                            st.rate >= 90 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            st.rate >= 75 ? "bg-amber-50 text-amber-700 border-amber-200" :
                            "bg-rose-50 text-rose-700 border-rose-200"
                          )}>
                            {st.rate}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

      </div>

      {/* Weekend Warning Dialog */}
      {isWeekendModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-black text-slate-900 text-base">Weekend Selected</h3>
              <p className="text-xs text-slate-500 font-medium">
                {weekendSelectedDateStr} is a weekend. School attendance is recorded on regular weekdays (Monday to Friday).
              </p>
            </div>
            <Button
              onClick={() => setIsWeekendModalOpen(false)}
              className="w-full rounded-xl bg-[#D8232A] hover:bg-[#b01b21] text-white font-bold text-xs"
            >
              Got it
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
