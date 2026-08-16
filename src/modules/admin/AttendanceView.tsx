import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Card } from '../../components/ui/Card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../components/ui/Select';
import { 
  Users, 
  Loader2, 
  CalendarCheck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  ArrowLeft, 
  ChevronRight, 
  School, 
  Filter, 
  GraduationCap,
  Calendar,
  Layers,
  FileSpreadsheet,
  CalendarDays,
  CalendarRange,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { useAdminData, Section } from '../../lib/adminData';
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

export function AttendanceView() {
  const { sections, classrooms, users, assignments, loading: adminLoading } = useAdminData();
  
  const [settings, setSettings] = useState<GlobalSettings | null>(null);

  useEffect(() => {
    getGlobalSettings()
      .then(s => {
        setSettings(s);
        if (s.activeSchoolYear) {
          setSelectedAcademicYear(s.activeSchoolYear);
        }
        if (s.schoolYearStart) {
          const today = new Date().toISOString().split('T')[0];
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
      .catch(err => console.error("Error loading admin settings in Admin AttendanceView:", err));
  }, []);

  const schoolYearStart = settings?.schoolYearStart || '';
  const schoolYearEnd = settings?.schoolYearEnd || '';

  const todayObj = new Date();
  const todayDate = todayObj.toISOString().split('T')[0];
  const currentYearNum = todayObj.getFullYear();
  const currentMonthNum = todayObj.getMonth(); // 0-indexed

  const getInitialDate = () => {
    const today = new Date();
    const day = today.getDay();
    if (day === 0) { // Sunday -> get Friday
      const friday = new Date(today);
      friday.setDate(today.getDate() - 2);
      return friday.toISOString().split('T')[0];
    } else if (day === 6) { // Saturday -> get Friday
      const friday = new Date(today);
      friday.setDate(today.getDate() - 1);
      return friday.toISOString().split('T')[0];
    }
    return today.toISOString().split('T')[0];
  };

  // Main navigation & filters
  const [selectedGrade, setSelectedGrade] = useState<string>('All');
  const [sectionSearchQuery, setSectionSearchQuery] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  // View modes for selected section: 'daily' | 'monthly' | 'yearly'
  const [viewMode, setViewMode] = useState<'daily' | 'monthly' | 'yearly'>('monthly');

  // Time filters
  const [selectedDate, setSelectedDate] = useState(getInitialDate());
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

  // Detail view student data
  const [students, setStudents] = useState<any[]>([]);
  const [allSectionAttendance, setAllSectionAttendance] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  // Map teachers
  const teachers = useMemo(() => {
    return users.filter(u => u.role?.toLowerCase() === 'teacher');
  }, [users]);

  // Filter sections to Grade 1-6 only
  const grade1to6Sections = useMemo(() => {
    return sections
      .filter(s => {
        const num = parseInt((s.gradeLevel || '').toString().replace(/[^0-9]/g, ''), 10);
        return num >= 1 && num <= 6;
      })
      .sort((a, b) => {
        const numA = parseInt((a.gradeLevel || '').toString().replace(/[^0-9]/g, ''), 10) || 0;
        const numB = parseInt((b.gradeLevel || '').toString().replace(/[^0-9]/g, ''), 10) || 0;
        if (numA !== numB) return numA - numB;
        return (a.name || '').localeCompare(b.name || '');
      });
  }, [sections]);

  // Clean Section Display Name
  const getCleanSectionDisplay = (section: any): string => {
    if (!section) return 'Unknown Section';
    const gl = section.gradeLevel ? (section.gradeLevel.toString().startsWith('Grade') ? section.gradeLevel : `Grade ${section.gradeLevel}`) : 'Grade 1';
    const rawName = (section.name || '').trim();
    const cleanName = rawName
      .replace(/^(Grade\s*\d+|G\d+)\s*[-–—:_.]*\s*/i, '')
      .replace(/^Grade\s*\d+\s*/i, '')
      .trim() || rawName;
    return `${gl} - ${cleanName}`;
  };

  // Grade styling palette
  const getGradeTheme = (grade: string) => {
    const num = parseInt((grade || '').replace(/\D/g, '')) || 1;
    switch (num) {
      case 1:
        return { bg: 'bg-blue-500', lightBg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', tag: 'bg-blue-100 text-blue-800' };
      case 2:
        return { bg: 'bg-indigo-500', lightBg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', tag: 'bg-indigo-100 text-indigo-800' };
      case 3:
        return { bg: 'bg-purple-500', lightBg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', tag: 'bg-purple-100 text-purple-800' };
      case 4:
        return { bg: 'bg-emerald-500', lightBg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', tag: 'bg-emerald-100 text-emerald-800' };
      case 5:
        return { bg: 'bg-amber-500', lightBg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', tag: 'bg-amber-100 text-amber-800' };
      case 6:
        return { bg: 'bg-rose-500', lightBg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', tag: 'bg-rose-100 text-rose-800' };
      default:
        return { bg: 'bg-slate-500', lightBg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', tag: 'bg-slate-100 text-slate-800' };
    }
  };

  // Filtered sections list
  const filteredSections = useMemo(() => {
    return grade1to6Sections.filter(s => {
      const gl = s.gradeLevel ? (s.gradeLevel.toString().startsWith('Grade') ? s.gradeLevel : `Grade ${s.gradeLevel}`) : '';
      const matchGrade = selectedGrade === 'All' || gl === selectedGrade;
      const q = sectionSearchQuery.toLowerCase();
      const matchSearch = (s.name || '').toLowerCase().includes(q) || gl.toLowerCase().includes(q);
      return matchGrade && matchSearch;
    });
  }, [grade1to6Sections, selectedGrade, sectionSearchQuery]);

  // Selected Section Object
  const selectedSectionObj = useMemo(() => {
    if (!selectedSectionId) return null;
    return sections.find(s => s.id === selectedSectionId) || null;
  }, [sections, selectedSectionId]);

  // Fetch students for selected section
  useEffect(() => {
    if (!selectedSectionId) {
      setStudents([]);
      return;
    }
    setLoadingStudents(true);
    const q = query(
      collection(db, 'enrollments'),
      where('sectionId', '==', selectedSectionId),
      where('status', 'in', ['Enrolled', 'enrolled'])
    );
    const unsub = onSnapshot(q, (snap) => {
      setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadingStudents(false);
    }, (err) => {
      console.error("Error fetching students:", err);
      setLoadingStudents(false);
    });
    return () => unsub();
  }, [selectedSectionId]);

  // Fetch ALL attendance records for selected section (allows fast instant daily/monthly/yearly filtering in memory)
  useEffect(() => {
    if (!selectedSectionId) {
      setAllSectionAttendance([]);
      return;
    }
    setLoadingAttendance(true);
    const q = query(
      collection(db, 'attendance'),
      where('sectionId', '==', selectedSectionId)
    );
    const unsub = onSnapshot(q, (snap) => {
      setAllSectionAttendance(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadingAttendance(false);
    }, (err) => {
      console.error("Error fetching section attendance:", err);
      setLoadingAttendance(false);
    });
    return () => unsub();
  }, [selectedSectionId]);

  // 1. Daily Records
  const dailyAttendanceRecords = useMemo(() => {
    return allSectionAttendance.filter(a => a.date === selectedDate);
  }, [allSectionAttendance, selectedDate]);

  const getDailyStatus = (studentId: string): 'Present' | 'Absent' | 'Late' | 'Unmarked' => {
    const record = dailyAttendanceRecords.find(a => a.studentId === studentId);
    if (record) return (record.status || (record as any).amStatus || 'Present') as 'Present' | 'Absent' | 'Late' | 'Unmarked';
    return 'Unmarked';
  };

  // 2. Monthly Records & Calculation - Filtered from start of school day date
  const monthlyPrefix = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
  const monthlyAttendanceRecords = useMemo(() => {
    return allSectionAttendance.filter(a => {
      if (!a.date || !a.date.startsWith(monthlyPrefix)) return false;
      if (schoolYearStart && a.date < schoolYearStart) return false;
      if (schoolYearEnd && a.date > schoolYearEnd) return false;
      return true;
    });
  }, [allSectionAttendance, monthlyPrefix, schoolYearStart, schoolYearEnd]);

  const monthlySchoolDays = useMemo(() => {
    const dates = new Set(monthlyAttendanceRecords.map(a => a.date).filter(Boolean));
    return dates.size > 0 ? dates.size : 0;
  }, [monthlyAttendanceRecords]);

  const getStudentMonthlyStats = (studentId: string) => {
    const studentRecords = monthlyAttendanceRecords.filter(a => a.studentId === studentId);
    let present = 0;
    let absent = 0;
    let late = 0;

    studentRecords.forEach(r => {
      const st = r.status || (r as any).amStatus || 'Present';
      if (st === 'Present') present++;
      else if (st === 'Absent') absent++;
      else if (st === 'Late') late++;
    });

    const totalLogged = present + absent + late;
    const rate = totalLogged > 0 ? Math.round(((present + late) / totalLogged) * 100) : (monthlySchoolDays > 0 ? 0 : 100);
    return { present, absent, late, totalLogged, rate };
  };

  const schoolMonths = useMemo(() => {
    return getSchoolMonths(schoolYearStart, schoolYearEnd);
  }, [schoolYearStart, schoolYearEnd]);

  // 3. Yearly Records & Calculation - Filtered from start of school day date
  const yearlyAttendanceRecords = useMemo(() => {
    const [startYearStr, endYearStr] = selectedAcademicYear.split('-');
    const startYr = parseInt(startYearStr, 10) || new Date().getFullYear();
    const endYr = parseInt(endYearStr, 10) || (startYr + 1);
    const startMonthIdx = schoolYearStart ? (parseInt(schoolYearStart.split('-')[1], 10) - 1) : 7; // 0-indexed
    return allSectionAttendance.filter(a => {
      if (!a.date) return false;
      if (schoolYearStart && a.date < schoolYearStart) return false;
      if (schoolYearEnd && a.date > schoolYearEnd) return false;
      const parts = a.date.split('-').map(Number);
      const yr = parts[0];
      const moIdx = parts[1] - 1;
      // Academic year starts from startMonthIdx of startYr and ends before startMonthIdx of endYr
      if (yr === startYr && moIdx >= startMonthIdx) return true;
      if (yr === endYr && moIdx < startMonthIdx) return true;
      return false;
    });
  }, [allSectionAttendance, selectedAcademicYear, schoolYearStart, schoolYearEnd]);

  const getStudentYearlyStats = (studentId: string) => {
    const studentRecords = yearlyAttendanceRecords.filter(a => a.studentId === studentId);
    let present = 0;
    let absent = 0;
    let late = 0;

    // Monthly bucket counts dynamically aligned with school months
    const monthStats: Record<number, { present: number; absent: number; late: number }> = {};
    schoolMonths.forEach(m => {
      monthStats[m.index] = { present: 0, absent: 0, late: 0 };
    });

    studentRecords.forEach(r => {
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

  // Filtered Students list (for table display)
  const filteredStudents = useMemo(() => {
    return students
      .filter(s => {
        const q = studentSearchQuery.toLowerCase();
        const fullName = `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase();
        const lrn = (s.lrn || '').toLowerCase();
        return fullName.includes(q) || lrn.includes(q);
      })
      .sort((a, b) => {
        const nameA = (a.lastName || '').toLowerCase();
        const nameB = (b.lastName || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [students, studentSearchQuery]);

  const maleStudents = useMemo(() => {
    return filteredStudents.filter(s => (s.gender || '').toLowerCase().startsWith('m'));
  }, [filteredStudents]);

  const femaleStudents = useMemo(() => {
    return filteredStudents.filter(s => (s.gender || '').toLowerCase().startsWith('f'));
  }, [filteredStudents]);

  // Overall Section KPIs based on active view mode
  const sectionMetrics = useMemo(() => {
    const total = students.length;
    let present = 0;
    let absent = 0;
    let late = 0;

    if (viewMode === 'daily') {
      students.forEach(s => {
        const st = getDailyStatus(s.id);
        if (st === 'Present') present++;
        else if (st === 'Absent') absent++;
        else if (st === 'Late') late++;
      });
      const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
      return { present, absent, late, rate, title: 'Today’s Attendance Rate' };
    } else if (viewMode === 'monthly') {
      let sumRates = 0;
      let ratedStudents = 0;
      students.forEach(s => {
        const st = getStudentMonthlyStats(s.id);
        present += st.present;
        absent += st.absent;
        late += st.late;
        if (st.totalLogged > 0) {
          sumRates += st.rate;
          ratedStudents++;
        }
      });
      const rate = ratedStudents > 0 ? Math.round(sumRates / ratedStudents) : 0;
      return { present, absent, late, rate, title: `${MONTH_NAMES[selectedMonth]} Average Rate` };
    } else {
      let sumRates = 0;
      let ratedStudents = 0;
      students.forEach(s => {
        const st = getStudentYearlyStats(s.id);
        present += st.present;
        absent += st.absent;
        late += st.late;
        if (st.totalLogged > 0) {
          sumRates += st.rate;
          ratedStudents++;
        }
      });
      const rate = ratedStudents > 0 ? Math.round(sumRates / ratedStudents) : 0;
      return { present, absent, late, rate, title: `S.Y. ${selectedAcademicYear} Average Rate` };
    }
  }, [viewMode, students, dailyAttendanceRecords, monthlyAttendanceRecords, yearlyAttendanceRecords, selectedMonth, selectedAcademicYear]);

  const [isExportingSF2, setIsExportingSF2] = useState(false);

  // =========================================================================
  // EXPORT HANDLER (Official DepEd SF2 Excel - Monthly Only)
  // =========================================================================
  const handleExportSF2Excel = async () => {
    if (!selectedSectionObj || isExportingSF2) return;
    setIsExportingSF2(true);
    const toastId = toast.loading("Generating DepEd School Form 2 (SF2) Excel...");
    try {
      const monthName = MONTH_NAMES[selectedMonth];
      const data = await ReportDataService.getSF2Data(
        selectedAcademicYear,
        selectedSectionObj.id,
        monthName
      );
      await generateSF2(data);
      toast.success(`Exported School Form 2 (SF2) Excel for ${monthName}!`, { id: toastId });
    } catch (error) {
      console.error("Error generating SF2 Excel:", error);
      toast.error("Failed to generate SF2 Excel. Please try again.", { id: toastId });
    } finally {
      setIsExportingSF2(false);
    }
  };

  if (adminLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#D8232A]/20 border-t-[#D8232A]"></div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Attendance Records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      
      {/* 1. Top Header Bar */}
      <header className="h-[72px] px-6 sm:px-8 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-xs sticky top-0 z-30">
        <div className="flex flex-row items-center justify-between gap-4 w-full max-w-[1600px] mx-auto">
          <div className="flex items-center gap-3">
            {selectedSectionId ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedSectionId(null);
                  setStudentSearchQuery('');
                }}
                className="h-9 px-3 rounded-xl border-slate-200 text-slate-700 hover:text-[#D8232A] hover:bg-red-50 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Sections</span>
              </Button>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-[#D8232A] shadow-2xs">
                <CalendarCheck className="w-5 h-5" />
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-slate-900">
                  {selectedSectionObj ? getCleanSectionDisplay(selectedSectionObj) : "Attendance Management"}
                </h1>
                <Badge variant="outline" className="text-[10px] font-extrabold bg-slate-50 border-slate-200 text-slate-600 px-2 py-0.5">
                  S.Y. {getCurrentSchoolYear()}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                {selectedSectionObj 
                  ? `Daily, Monthly, and Yearly Attendance analytics & export for ${getCleanSectionDisplay(selectedSectionObj)}`
                  : "Select a classroom section below to inspect daily, monthly, and yearly attendance summaries"}
              </p>
            </div>
          </div>

          {/* Header Controls for Selected Section (Monthly SF2 Excel Export Only) */}
          {selectedSectionId && viewMode === 'monthly' && (
            <div className="flex items-center gap-2.5 shrink-0">
              <Button
                onClick={handleExportSF2Excel}
                disabled={students.length === 0 || isExportingSF2}
                className="rounded-xl h-9.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 active:scale-95 transition-all"
                title="Export Official DepEd School Form 2 (SF2) Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>{isExportingSF2 ? "Generating SF2 Excel..." : "Export SF2 (Excel)"}</span>
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* 2. Main Body Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto w-full">
        
        {/* ========================================================================= */}
        {/* VIEW 1: SECTIONS LIST OVERVIEW (Shown when NO section is selected)        */}
        {/* ========================================================================= */}
        {!selectedSectionId && (
          <div className="space-y-6">
            
            {/* KPI Metric Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs hover:shadow-md transition-all duration-200 flex items-center gap-4 group">
                <div className="p-3.5 rounded-xl border text-[#D8232A] bg-red-50/80 border-red-100 shrink-0 transition-transform duration-200 group-hover:scale-105">
                  <Layers className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">{grade1to6Sections.length}</p>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Active Sections (Grades 1-6)</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs hover:shadow-md transition-all duration-200 flex items-center gap-4 group">
                <div className="p-3.5 rounded-xl border text-blue-600 bg-blue-50/80 border-blue-100 shrink-0 transition-transform duration-200 group-hover:scale-105">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">6</p>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Grade Levels (1 to 6)</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs hover:shadow-md transition-all duration-200 flex items-center gap-4 group">
                <div className="p-3.5 rounded-xl border text-emerald-600 bg-emerald-50/80 border-emerald-100 shrink-0 transition-transform duration-200 group-hover:scale-105">
                  <CalendarRange className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-slate-900 tracking-tight leading-tight">
                    Monthly &amp; Yearly Reports
                  </p>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">Full DepEd SF2 Compatible</p>
                </div>
              </div>
            </div>

            {/* Controls Bar (Matching UsersView & ClassroomsView) */}
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-slate-50/50 border-b border-slate-200/70">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                  
                  {/* Search input */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search section name or grade..."
                      className="pl-9 h-10 rounded-xl bg-white border-slate-200/80 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-red-500/20 focus:border-[#D8232A] transition-all"
                      value={sectionSearchQuery}
                      onChange={(e) => setSectionSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Grade Level Dropdown Filter */}
                  <div className="flex items-center gap-2">
                    <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                      <SelectTrigger className="w-full sm:w-[170px] h-10 rounded-xl border-slate-200/80 bg-white text-xs font-semibold text-slate-700">
                        <Filter className="h-3.5 w-3.5 mr-2 text-slate-400" />
                        <SelectValue placeholder="Grade Level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">All Grade Levels</SelectItem>
                        {['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'].map(g => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/50">
                  <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                    {filteredSections.length} section(s) available
                  </span>
                </div>
              </div>
            </div>

            {/* Sections Cards Grid */}
            {filteredSections.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-2xs space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <School className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-800">No sections found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {sectionSearchQuery 
                    ? `No sections matching "${sectionSearchQuery}" under ${selectedGrade}.` 
                    : `No active sections found under ${selectedGrade}.`}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredSections.map(section => {
                  const classroom = classrooms.find(c => c.id === section.classroomId);
                  const assignment = assignments.find(a => a.sectionId === section.id);
                  const teacher = assignment ? teachers.find(t => t.id === assignment.teacherId) : null;
                  const theme = getGradeTheme(section.gradeLevel);

                  return (
                    <div
                      key={section.id}
                      onClick={() => setSelectedSectionId(section.id)}
                      className="group bg-white border border-slate-200/90 hover:border-[#D8232A]/40 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-pointer hover:-translate-y-0.5"
                    >
                      <div>
                        {/* Card Top */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-11 h-11 rounded-xl ${theme.lightBg} ${theme.text} flex items-center justify-center font-black text-sm shrink-0 border ${theme.border}`}>
                              <School className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-black text-base text-slate-900 group-hover:text-[#D8232A] transition-colors leading-tight">
                                {getCleanSectionDisplay(section)}
                              </h3>
                              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                                Room: {classroom?.roomName || 'General Classroom'}
                              </p>
                            </div>
                          </div>

                          <Badge variant="outline" className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${theme.tag}`}>
                            {section.gradeLevel || 'Grade 1'}
                          </Badge>
                        </div>

                        {/* Adviser Box */}
                        <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 space-y-1.5 my-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Class Adviser</span>
                            {teacher ? (
                              <span className="font-bold text-slate-800 truncate max-w-[160px]">
                                {teacher.firstName} {teacher.lastName}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">No Adviser Assigned</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Action */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#D8232A]">
                        <span>Inspect Attendance &amp; Reports</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: SELECTED SECTION ATTENDANCE (DAILY, MONTHLY, YEARLY)             */}
        {/* ========================================================================= */}
        {selectedSectionId && selectedSectionObj && (
          <div className="space-y-6">
            
            {/* View Mode Switcher Ribbon (Monthly, Yearly, Daily) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
              
              {/* Tab selector buttons */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl">
                <button
                  onClick={() => setViewMode('monthly')}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2",
                    viewMode === 'monthly'
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <CalendarDays className="w-3.5 h-3.5 text-[#D8232A]" />
                  <span>Monthly Attendance</span>
                </button>

                <button
                  onClick={() => setViewMode('yearly')}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2",
                    viewMode === 'yearly'
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <CalendarRange className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Yearly School Summary</span>
                </button>

                <button
                  onClick={() => setViewMode('daily')}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2",
                    viewMode === 'daily'
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Daily Roster</span>
                </button>
              </div>

              {/* Dynamic Time Filter Selector based on active viewMode */}
              <div className="flex items-center gap-2.5">
                
                {/* 1. Monthly Selector */}
                {viewMode === 'monthly' && (
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

                {/* 2. Yearly Selector */}
                {viewMode === 'yearly' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">School Year:</span>
                    <Select value={selectedAcademicYear} onValueChange={setSelectedAcademicYear}>
                      <SelectTrigger className="w-[150px] h-9.5 rounded-xl border-slate-200 bg-slate-50 text-xs font-bold text-slate-800">
                        <SelectValue placeholder="Academic Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {['2024-2025', '2025-2026', '2026-2027', '2027-2028'].map(sy => (
                          <SelectItem key={sy} value={sy} className="text-xs font-bold">
                            AY {sy}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* 3. Daily Date Input */}
                {viewMode === 'daily' && (
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl">
                    <Calendar className="w-4 h-4 text-slate-400" />
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
                        const maxAllowed = schoolYearEnd ? (schoolYearEnd < todayDate ? schoolYearEnd : todayDate) : todayDate;
                        setSelectedDate(val > maxAllowed ? maxAllowed : val);
                      }}
                      className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
                    />
                  </div>
                )}

              </div>

            </div>

            {/* KPI Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200/70 p-4.5 shadow-xs flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Enrolled Students</p>
                  <p className="text-xl sm:text-2xl font-black text-slate-900">{students.length}</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/70 p-4.5 shadow-xs flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Total Present</p>
                  <p className="text-xl sm:text-2xl font-black text-emerald-700">{sectionMetrics.present}</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/70 p-4.5 shadow-xs flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Total Absent</p>
                  <p className="text-xl sm:text-2xl font-black text-rose-700">{sectionMetrics.absent}</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/70 p-4.5 shadow-xs flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Attendance Rate</p>
                  <p className="text-xl sm:text-2xl font-black text-indigo-700">{sectionMetrics.rate}%</p>
                </div>
              </div>
            </div>

            {/* Attendance Content Table */}
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
              
              {/* Table Search & Status */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-slate-50/50 border-b border-slate-200/70">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search student by name or LRN..."
                    className="pl-9 h-10 rounded-xl bg-white border-slate-200/80 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-red-500/20 focus:border-[#D8232A] transition-all"
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <span>Showing:</span>
                  <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 font-extrabold px-2.5 py-0.5">
                    {viewMode === 'monthly' ? `${MONTH_NAMES[selectedMonth]} ${selectedYear}` : viewMode === 'yearly' ? `S.Y. ${selectedAcademicYear}` : selectedDate}
                  </Badge>
                </div>
              </div>

              {/* Table Body */}
              {loadingStudents || loadingAttendance ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 text-[#D8232A] animate-spin" />
                </div>
              ) : students.length === 0 ? (
                <div className="text-center py-16 text-slate-400 font-medium">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No enrolled students in this section.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  
                  {/* ========================================================= */}
                  {/* TAB 1: MONTHLY VIEW TABLE                                 */}
                  {/* ========================================================= */}
                  {viewMode === 'monthly' && (
                    <>
                      {/* Male Learners */}
                      <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          Male Learners ({maleStudents.length})
                        </h4>
                        <span className="text-[11px] font-bold text-slate-400">{MONTH_NAMES[selectedMonth]} {selectedYear}</span>
                      </div>

                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-slate-50/90 border-b border-slate-200/70 select-none">
                            <TableRow className="hover:bg-transparent border-none h-10">
                              <TableHead className="w-12 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 pl-4">#</TableHead>
                              <TableHead className="w-36 text-[10px] font-bold uppercase tracking-wider text-slate-500">LRN</TableHead>
                              <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Learner Name</TableHead>
                              <TableHead className="w-28 text-center text-[10px] font-bold uppercase tracking-wider text-emerald-700">Days Present</TableHead>
                              <TableHead className="w-28 text-center text-[10px] font-bold uppercase tracking-wider text-rose-700">Days Absent</TableHead>
                              <TableHead className="w-28 text-center text-[10px] font-bold uppercase tracking-wider text-amber-700">Days Late</TableHead>
                              <TableHead className="w-32 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Days</TableHead>
                              <TableHead className="w-36 text-right pr-6 text-[10px] font-bold uppercase tracking-wider text-slate-500">Monthly Rate</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {maleStudents.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={8} className="text-center py-6 text-xs text-slate-400 italic">No male learners found.</TableCell>
                              </TableRow>
                            ) : (
                              maleStudents.map((student, idx) => {
                                const st = getStudentMonthlyStats(student.id);
                                return (
                                  <TableRow key={student.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors h-12">
                                    <TableCell className="text-center font-bold text-slate-400 text-xs pl-4">{idx + 1}</TableCell>
                                    <TableCell className="font-mono font-bold text-slate-600 text-xs">{student.lrn || 'N/A'}</TableCell>
                                    <TableCell className="font-bold text-slate-900 text-xs sm:text-sm">{student.lastName}, {student.firstName}</TableCell>
                                    <TableCell className="text-center font-black text-emerald-700 text-xs">{st.present}</TableCell>
                                    <TableCell className="text-center font-black text-rose-700 text-xs">{st.absent}</TableCell>
                                    <TableCell className="text-center font-black text-amber-700 text-xs">{st.late}</TableCell>
                                    <TableCell className="text-center font-bold text-slate-600 text-xs">{st.totalLogged}</TableCell>
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
                              })
                            )}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Female Learners */}
                      <div className="p-4 bg-slate-50/50 border-b border-slate-100 border-t border-slate-200 flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          Female Learners ({femaleStudents.length})
                        </h4>
                        <span className="text-[11px] font-bold text-slate-400">{MONTH_NAMES[selectedMonth]} {selectedYear}</span>
                      </div>

                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-slate-50/90 border-b border-slate-200/70 select-none">
                            <TableRow className="hover:bg-transparent border-none h-10">
                              <TableHead className="w-12 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 pl-4">#</TableHead>
                              <TableHead className="w-36 text-[10px] font-bold uppercase tracking-wider text-slate-500">LRN</TableHead>
                              <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Learner Name</TableHead>
                              <TableHead className="w-28 text-center text-[10px] font-bold uppercase tracking-wider text-emerald-700">Days Present</TableHead>
                              <TableHead className="w-28 text-center text-[10px] font-bold uppercase tracking-wider text-rose-700">Days Absent</TableHead>
                              <TableHead className="w-28 text-center text-[10px] font-bold uppercase tracking-wider text-amber-700">Days Late</TableHead>
                              <TableHead className="w-32 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Days</TableHead>
                              <TableHead className="w-36 text-right pr-6 text-[10px] font-bold uppercase tracking-wider text-slate-500">Monthly Rate</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {femaleStudents.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={8} className="text-center py-6 text-xs text-slate-400 italic">No female learners found.</TableCell>
                              </TableRow>
                            ) : (
                              femaleStudents.map((student, idx) => {
                                const st = getStudentMonthlyStats(student.id);
                                return (
                                  <TableRow key={student.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors h-12">
                                    <TableCell className="text-center font-bold text-slate-400 text-xs pl-4">{idx + 1}</TableCell>
                                    <TableCell className="font-mono font-bold text-slate-600 text-xs">{student.lrn || 'N/A'}</TableCell>
                                    <TableCell className="font-bold text-slate-900 text-xs sm:text-sm">{student.lastName}, {student.firstName}</TableCell>
                                    <TableCell className="text-center font-black text-emerald-700 text-xs">{st.present}</TableCell>
                                    <TableCell className="text-center font-black text-rose-700 text-xs">{st.absent}</TableCell>
                                    <TableCell className="text-center font-black text-amber-700 text-xs">{st.late}</TableCell>
                                    <TableCell className="text-center font-bold text-slate-600 text-xs">{st.totalLogged}</TableCell>
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
                              })
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}

                  {/* ========================================================= */}
                  {/* TAB 2: YEARLY VIEW TABLE (DepEd Month-by-Month SF2 Grid) */}
                  {/* ========================================================= */}
                  {viewMode === 'yearly' && (
                    <>
                      <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-500" />
                          Annual Attendance Summary (S.Y. {selectedAcademicYear})
                        </h4>
                        <span className="text-[11px] font-bold text-slate-500">Learners: {students.length}</span>
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
                            {filteredStudents.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5 + schoolMonths.length} className="text-center py-8 text-xs text-slate-400 italic">No learners found.</TableCell>
                              </TableRow>
                            ) : (
                              filteredStudents.map((student, idx) => {
                                const st = getStudentYearlyStats(student.id);
                                return (
                                  <TableRow key={student.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors h-12">
                                    <TableCell className="text-center font-bold text-slate-400 text-xs pl-4">{idx + 1}</TableCell>
                                    <TableCell className="font-mono font-bold text-slate-600 text-xs">{student.lrn || 'N/A'}</TableCell>
                                    <TableCell className="font-bold text-slate-900 text-xs sm:text-sm">{student.lastName}, {student.firstName}</TableCell>
                                    <TableCell className="text-center text-xs font-semibold text-slate-500">
                                      {(student.gender || '').toLowerCase().startsWith('m') ? 'M' : 'F'}
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
                                        "font-extrabold text-[11px] px-2 py-0.5",
                                        st.rate >= 90 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                        st.rate >= 75 ? "bg-amber-50 text-amber-700 border-amber-200" :
                                        "bg-rose-50 text-rose-700 border-rose-200"
                                      )}>
                                        {st.rate}%
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}

                  {/* ========================================================= */}
                  {/* TAB 3: DAILY VIEW TABLE                                   */}
                  {/* ========================================================= */}
                  {viewMode === 'daily' && (
                    <>
                      {/* Male Learners */}
                      <div className="p-4 bg-slate-50/40 border-b border-slate-100 flex items-center justify-between">
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
                            <TableHead className="w-36 text-right pr-6 text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {maleStudents.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-6 text-xs text-slate-400 italic">No male learners found.</TableCell>
                            </TableRow>
                          ) : (
                            maleStudents.map((student, idx) => {
                              const status = getDailyStatus(student.id);
                              return (
                                <TableRow key={student.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors h-12">
                                  <TableCell className="text-center font-bold text-slate-400 text-xs pl-4">{idx + 1}</TableCell>
                                  <TableCell className="font-mono font-bold text-slate-600 text-xs">{student.lrn || 'N/A'}</TableCell>
                                  <TableCell className="font-bold text-slate-900 text-xs sm:text-sm">{student.lastName}, {student.firstName}</TableCell>
                                  <TableCell className="text-center text-xs font-semibold text-slate-500">Male</TableCell>
                                  <TableCell className="text-right pr-6">
                                    <span className={cn(
                                      "px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1",
                                      status === 'Present' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                                      status === 'Absent' ? "bg-rose-50 text-rose-700 border border-rose-200" :
                                      status === 'Late' ? "bg-amber-50 text-amber-700 border border-amber-200" :
                                      "bg-slate-100 text-slate-600 border border-slate-200"
                                    )}>
                                      {status === 'Present' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                                      {status === 'Absent' && <XCircle className="w-3 h-3 text-rose-600" />}
                                      {status === 'Late' && <Clock className="w-3 h-3 text-amber-600" />}
                                      {status}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>

                      {/* Female Learners */}
                      <div className="p-4 bg-slate-50/40 border-b border-slate-100 border-t border-slate-200 flex items-center justify-between">
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
                            <TableHead className="w-36 text-right pr-6 text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {femaleStudents.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-6 text-xs text-slate-400 italic">No female learners found.</TableCell>
                            </TableRow>
                          ) : (
                            femaleStudents.map((student, idx) => {
                              const status = getDailyStatus(student.id);
                              return (
                                <TableRow key={student.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors h-12">
                                  <TableCell className="text-center font-bold text-slate-400 text-xs pl-4">{idx + 1}</TableCell>
                                  <TableCell className="font-mono font-bold text-slate-600 text-xs">{student.lrn || 'N/A'}</TableCell>
                                  <TableCell className="font-bold text-slate-900 text-xs sm:text-sm">{student.lastName}, {student.firstName}</TableCell>
                                  <TableCell className="text-center text-xs font-semibold text-slate-500">Female</TableCell>
                                  <TableCell className="text-right pr-6">
                                    <span className={cn(
                                      "px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1",
                                      status === 'Present' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                                      status === 'Absent' ? "bg-rose-50 text-rose-700 border border-rose-200" :
                                      status === 'Late' ? "bg-amber-50 text-amber-700 border border-amber-200" :
                                      "bg-slate-100 text-slate-600 border border-slate-200"
                                    )}>
                                      {status === 'Present' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                                      {status === 'Absent' && <XCircle className="w-3 h-3 text-rose-600" />}
                                      {status === 'Late' && <Clock className="w-3 h-3 text-amber-600" />}
                                      {status}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </>
                  )}

                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
