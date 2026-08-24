import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/Dialog';
import { cn } from '../../components/ui/utils';
import {
  Users,
  CheckCircle,
  BarChart,
  GraduationCap,
  Clock,
  Award,
  Sparkles,
  BookOpen,
  CalendarClock,
  ShieldAlert,
  CheckCircle2,
  Coffee,
  Moon,
  ChevronRight,
  ListTodo,
  Megaphone,
  FileSpreadsheet,
  Activity,
  CalendarDays
} from 'lucide-react';
import { useTeacherData, Student, AttendanceEntry } from '../../lib/teacherData';
import { useAuth } from '../../lib/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, onSnapshot, limit } from 'firebase/firestore';
import { Schedule } from '../../lib/adminData';
import { getCurrentSchoolYear } from '../../lib/utils';
import { Announcement } from '../../lib/services/announcementsService';

export interface TeacherDashboardViewProps {
  onNavigate?: (view: string, sectionId?: string) => void;
}

interface SubjectGradeDetail {
  subject: string;
  grade: number;
}

interface StudentAcademicSummary {
  student: Student;
  overallAverage: number;
  subjectCount: number;
  subjectsList: SubjectGradeDetail[];
  lowestSubject?: SubjectGradeDetail;
  highestSubject?: SubjectGradeDetail;
  honorsTag?: {
    label: string;
    badgeClass: string;
    level: string;
  };
  interventionStatus?: {
    level: 'critical' | 'warning' | 'monitoring' | 'good';
    label: string;
    badgeClass: string;
  };
}

interface HolisticRiskStudent {
  student: Student;
  riskScore: number; // 0 - 100
  riskFactors: {
    type: 'grades' | 'attendance' | 'requirements' | 'medical';
    title: string;
    severity: 'high' | 'medium' | 'low';
    detail: string;
  }[];
  academicSummary?: StudentAcademicSummary;
}

interface ActiveScheduleStatus {
  isWeekend: boolean;
  dayOfWeek: string;
  currentMins: number;
  activePeriod: {
    schedule: Schedule;
    subjectName: string;
    sectionName: string;
    startTimeFormatted: string;
    endTimeFormatted: string;
    minutesRemaining: number;
    progressPercent: number;
  } | null;
  nextPeriod: {
    schedule: Schedule;
    subjectName: string;
    sectionName: string;
    startTimeFormatted: string;
    endTimeFormatted: string;
    minutesUntilStart: number;
  } | null;
  timeline: Array<{
    schedule: Schedule;
    subjectName: string;
    sectionName: string;
    startTimeFormatted: string;
    endTimeFormatted: string;
    status: 'completed' | 'in-progress' | 'upcoming';
  }>;
  totalClassesToday: number;
}

const computeStudentAcademicSummary = (student: Student, gradeLevelStr?: string): StudentAcademicSummary | null => {
  const gKey = gradeLevelStr
    ? (gradeLevelStr.startsWith('Grade') ? gradeLevelStr : `Grade ${gradeLevelStr}`)
    : (student.gradeLevel ? (student.gradeLevel.startsWith('Grade') ? student.gradeLevel : `Grade ${student.gradeLevel}`) : 'Grade 6');

  const gradeObj = (student.grades as any)?.[gKey] || student.grades || {};
  const subjectsList: SubjectGradeDetail[] = [];

  if (typeof gradeObj === 'object' && gradeObj !== null) {
    Object.entries(gradeObj).forEach(([subjKey, val]: [string, any]) => {
      if (subjKey === 'observedValues' || subjKey === 'medical' || subjKey === 'attendance') return;

      let finalMark: number | null = null;

      if (typeof val === 'number') {
        finalMark = val;
      } else if (typeof val === 'object' && val !== null) {
        if (typeof val.final === 'number' && !isNaN(val.final)) {
          finalMark = val.final;
        } else {
          const qVals: number[] = [];
          ['q1', 'q2', 'q3', 'q4', 't1', 't2', 't3'].forEach(k => {
            if (typeof val[k] === 'number' && !isNaN(val[k])) {
              qVals.push(val[k]);
            } else if (typeof val[k] === 'string' && val[k].trim() !== '' && !isNaN(Number(val[k]))) {
              qVals.push(Number(val[k]));
            }
          });

          if (qVals.length > 0) {
            const sum = qVals.reduce((a, b) => a + b, 0);
            finalMark = Math.round(sum / qVals.length);
          }
        }
      }

      if (finalMark !== null && !isNaN(finalMark) && finalMark > 0) {
        const cleanName = subjKey.replace(/_/g, ' ').toUpperCase();
        subjectsList.push({ subject: cleanName, grade: finalMark });
      }
    });
  }

  if (subjectsList.length === 0) return null;

  const total = subjectsList.reduce((acc, curr) => acc + curr.grade, 0);
  const avg = Math.round((total / subjectsList.length) * 10) / 10;

  const sortedSubjs = [...subjectsList].sort((a, b) => a.grade - b.grade);
  const lowest = sortedSubjs[0];
  const highest = sortedSubjs[sortedSubjs.length - 1];

  let honorsTag: { label: string; badgeClass: string; level: string } | undefined = undefined;
  if (avg >= 98 && lowest.grade >= 85) {
    honorsTag = { label: 'With Highest Honors', badgeClass: 'bg-purple-100 text-purple-800 border-purple-200 shadow-2xs font-extrabold', level: 'highest' };
  } else if (avg >= 95 && lowest.grade >= 85) {
    honorsTag = { label: 'With High Honors', badgeClass: 'bg-blue-100 text-blue-800 border-blue-200 shadow-2xs font-extrabold', level: 'high' };
  } else if (avg >= 90 && lowest.grade >= 85) {
    honorsTag = { label: 'With Honors', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200 shadow-2xs font-bold', level: 'honors' };
  } else if (avg >= 85) {
    honorsTag = { label: 'High Achiever', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 font-semibold', level: 'achiever' };
  }

  let interventionStatus: { level: 'critical' | 'warning' | 'monitoring' | 'good'; label: string; badgeClass: string } | undefined = undefined;
  if (avg < 75 || lowest.grade < 75) {
    interventionStatus = {
      level: 'critical',
      label: avg < 75 ? `Average < 75 (${avg}%)` : `Failing in ${lowest.subject} (${lowest.grade}%)`,
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-200 font-extrabold'
    };
  } else if (avg < 80 || lowest.grade < 78) {
    interventionStatus = {
      level: 'warning',
      label: avg < 80 ? `Needs Remediation (${avg}%)` : `Low in ${lowest.subject} (${lowest.grade}%)`,
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-200 font-bold'
    };
  } else if (avg < 83) {
    interventionStatus = {
      level: 'monitoring',
      label: 'Close Monitoring',
      badgeClass: 'bg-yellow-50 text-yellow-800 border-yellow-200'
    };
  } else {
    interventionStatus = {
      level: 'good',
      label: 'Passing',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    };
  }

  return {
    student,
    overallAverage: avg,
    subjectCount: subjectsList.length,
    subjectsList,
    lowestSubject: lowest,
    highestSubject: highest,
    honorsTag,
    interventionStatus
  };
};

const parseTimeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
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

export function TeacherDashboardView({ onNavigate }: TeacherDashboardViewProps) {
  const {
    students,
    attendance,
    loading,
    currentGradeLevel,
    assignedSections,
    academicYear,
    currentSection,
    gradeConfigurations
  } = useTeacherData();
  const { user, userData } = useAuth();
  
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [subjectsMap, setSubjectsMap] = useState<Record<string, string>>({});
  const [sectionsMap, setSectionsMap] = useState<Record<string, string>>({});
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // Live timer tick every 10s
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const syName = academicYear || getCurrentSchoolYear();
  const advisorySection = useMemo(() => (assignedSections || []).find(s => s.isAdvisor), [assignedSections]);
  const todayDate = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Fetch Schedules, Subjects, Sections, and Announcements
  useEffect(() => {
    if (!user) return;
    let unsubSchedule = () => {};
    let unsubAnnouncements = () => {};

    async function loadRefsAndSubs() {
      if (!user) return;
      try {
        const [subSnap, secSnap] = await Promise.all([
          getDocs(collection(db, 'subjects')),
          getDocs(collection(db, 'sections'))
        ]);

        const sMap: Record<string, string> = {};
        subSnap.docs.forEach(d => {
          const dat = d.data();
          sMap[d.id] = dat.name || dat.title || dat.code || 'Subject';
        });
        setSubjectsMap(sMap);

        const secObj: Record<string, string> = {};
        secSnap.docs.forEach(d => {
          const dat = d.data();
          secObj[d.id] = `${dat.gradeLevel || ''} - ${dat.name || dat.sectionName || ''}`.trim();
        });
        setSectionsMap(secObj);

        // Schedule Subscription
        const qSch = query(
          collection(db, 'schedules'),
          where('teacherId', '==', user.uid),
          where('academicYear', '==', syName)
        );
        unsubSchedule = onSnapshot(qSch, (snap) => {
          setSchedules(snap.docs.map(d => ({ id: d.id, ...d.data() } as Schedule)));
        });

        // Announcements Subscription
        const qAnn = query(
          collection(db, 'announcements'),
          limit(10)
        );
        unsubAnnouncements = onSnapshot(qAnn, (snap) => {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement));
          setAnnouncements(list.slice(0, 6));
        });

      } catch (err) {
        console.error("Error loading dashboard data:", err);
      }
    }

    loadRefsAndSubs();
    return () => {
      unsubSchedule();
      unsubAnnouncements();
    };
  }, [user, syName]);

  // Section Filter for Academic Rankings & Assistance: 'all' | 'advisory' | sectionId
  const [academicScopeFilter, setAcademicScopeFilter] = useState<'all' | 'advisory' | string>('all');

  // Enrolled & Pending
  const enrolled = useMemo(() => students.filter(s => s.status === 'Enrolled' || s.status === 'enrolled'), [students]);
  const pending = useMemo(() => students.filter(s => s.status === 'Pending' || s.status === 'pending'), [students]);

  // Scoped Students
  const scopedStudents = useMemo(() => {
    if (academicScopeFilter === 'advisory') {
      if (!advisorySection) return enrolled;
      return enrolled.filter(s => s.sectionId === advisorySection.sectionId);
    }
    if (academicScopeFilter !== 'all') {
      return enrolled.filter(s => s.sectionId === academicScopeFilter);
    }
    return enrolled;
  }, [enrolled, academicScopeFilter, advisorySection]);

  // Compute Academic Summaries for Scoped Students
  const studentAcademicList = useMemo(() => {
    return scopedStudents
      .map(s => computeStudentAcademicSummary(s, currentGradeLevel))
      .filter((res): res is StudentAcademicSummary => res !== null);
  }, [scopedStudents, currentGradeLevel]);

  // Top Ranking Students (Ranked descending)
  const topRankedStudents = useMemo(() => {
    return [...studentAcademicList]
      .sort((a, b) => b.overallAverage - a.overallAverage)
      .slice(0, 8);
  }, [studentAcademicList]);

  // Multi-Factor "Students At Risk" (Low grades, frequent absences, missing docs)
  const holisticAtRiskStudents = useMemo(() => {
    const list: HolisticRiskStudent[] = [];

    scopedStudents.forEach(st => {
      const acad = computeStudentAcademicSummary(st, currentGradeLevel);
      const studentAttendance = attendance.filter(a => a.studentId === st.id);
      const absentCount = studentAttendance.filter(a => (a.status || (a as any).amStatus) === 'Absent').length;
      
      const missingDocs: string[] = [];
      if (!st.requirementUploads?.psaBirthCertificate?.fileUrl) missingDocs.push('PSA Birth Certificate');
      if (!st.medical?.height || !st.medical?.weight) missingDocs.push('Medical / BMI Record');

      const factors: HolisticRiskStudent['riskFactors'] = [];
      let riskScore = 0;

      // Factor 1: Academic Performance
      if (acad) {
        if (acad.overallAverage < 75) {
          riskScore += 45;
          factors.push({
            type: 'grades',
            title: 'Critical Academic Average',
            severity: 'high',
            detail: `Overall Average: ${acad.overallAverage.toFixed(1)}% (Below passing threshold of 75%)`
          });
        } else if (acad.lowestSubject && acad.lowestSubject.grade < 75) {
          riskScore += 30;
          factors.push({
            type: 'grades',
            title: `Failing in ${acad.lowestSubject.subject}`,
            severity: 'high',
            detail: `Mark: ${acad.lowestSubject.grade}% (Requires remediation)`
          });
        } else if (acad.overallAverage < 80) {
          riskScore += 15;
          factors.push({
            type: 'grades',
            title: 'Low Passing Average',
            severity: 'medium',
            detail: `Overall Average: ${acad.overallAverage.toFixed(1)}%`
          });
        }
      }

      // Factor 2: Attendance / Chronic Absenteeism
      if (absentCount >= 5) {
        riskScore += 40;
        factors.push({
          type: 'attendance',
          title: 'Chronic Absenteeism',
          severity: 'high',
          detail: `${absentCount} total unexcused absences recorded`
        });
      } else if (absentCount >= 3) {
        riskScore += 20;
        factors.push({
          type: 'attendance',
          title: 'Irregular Attendance',
          severity: 'medium',
          detail: `${absentCount} absences recorded`
        });
      }

      // Factor 3: Missing Requirements
      if (missingDocs.length > 0) {
        riskScore += 10 * missingDocs.length;
        factors.push({
          type: 'requirements',
          title: 'Incomplete Documentation',
          severity: 'low',
          detail: `Missing: ${missingDocs.join(', ')}`
        });
      }

      if (riskScore >= 25 || factors.some(f => f.severity === 'high')) {
        list.push({
          student: st,
          riskScore: Math.min(100, riskScore),
          riskFactors: factors,
          academicSummary: acad || undefined
        });
      }
    });

    return list.sort((a, b) => b.riskScore - a.riskScore).slice(0, 8);
  }, [scopedStudents, attendance, currentGradeLevel]);

  // General Class Average
  const classGeneralAverage = useMemo(() => {
    if (studentAcademicList.length === 0) return 0;
    const sum = studentAcademicList.reduce((acc, curr) => acc + curr.overallAverage, 0);
    return Math.round((sum / studentAcademicList.length) * 10) / 10;
  }, [studentAcademicList]);

  // Today Attendance Metrics
  const todayAttendance = useMemo(() => {
    return attendance.filter((a) => a.date === todayDate);
  }, [attendance, todayDate]);

  const getDayStatus = (a: AttendanceEntry) => {
    return a.status || (a as any).amStatus || 'Present';
  };

  const presentToday = useMemo(() => {
    return todayAttendance.filter((a) => getDayStatus(a) === 'Present').length;
  }, [todayAttendance]);

  const absentToday = useMemo(() => {
    return todayAttendance.filter((a) => getDayStatus(a) === 'Absent').length;
  }, [todayAttendance]);

  const lateToday = useMemo(() => {
    return todayAttendance.filter((a) => getDayStatus(a) === 'Late').length;
  }, [todayAttendance]);

  const attendanceRate = useMemo(() => {
    if (enrolled.length === 0) return 0;
    const attendees = presentToday + lateToday;
    return Math.min(100, Math.round((attendees / enrolled.length) * 100));
  }, [enrolled.length, presentToday, lateToday]);

  // Dynamic Pending Tasks & Action Items
  const pendingTasks = useMemo(() => {
    const tasks: { id: string; title: string; desc: string; category: 'Attendance' | 'Grades' | 'Enrollment'; priority: 'high' | 'medium' | 'low'; actionLabel: string; view: string; sectionId?: string }[] = [];

    // Task 1: Check Daily Attendance
    const isWeekend = currentTime.getDay() === 0 || currentTime.getDay() === 6;
    if (!isWeekend && todayAttendance.length === 0 && enrolled.length > 0) {
      tasks.push({
        id: 'att-today',
        title: 'Today\'s Attendance Not Recorded',
        desc: `Roll call for ${enrolled.length} learners is still unmarked for today.`,
        category: 'Attendance',
        priority: 'high',
        actionLabel: 'Take Attendance',
        view: 'attendance',
        sectionId: currentSection
      });
    }

    // Task 2: Pending Admissions / Enrollments
    if (pending.length > 0) {
      tasks.push({
        id: 'enr-pending',
        title: `${pending.length} Pending Enrollment Applications`,
        desc: 'Learners awaiting advisory section assignment and enrollment review.',
        category: 'Enrollment',
        priority: 'high',
        actionLabel: 'Review Applicants',
        view: 'enrollments'
      });
    }

    // Task 3: Missing Grade Configurations or Ungraded Subjects
    if (enrolled.length > 0 && gradeConfigurations.length === 0) {
      tasks.push({
        id: 'grades-setup',
        title: 'Gradebook Setup Pending',
        desc: 'Establish subject grading weights and term columns for your section.',
        category: 'Grades',
        priority: 'medium',
        actionLabel: 'Open Gradebook',
        view: 'grades',
        sectionId: currentSection
      });
    }

    return tasks;
  }, [currentTime, todayAttendance, enrolled, pending, gradeConfigurations, currentSection]);

  // Real-Time Schedule Computation: "What class is the teacher in this time"
  const activeScheduleStatus = useMemo<ActiveScheduleStatus>(() => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = dayNames[currentTime.getDay()];
    const isWeekend = currentTime.getDay() === 0 || currentTime.getDay() === 6;
    const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();

    const validTeacherSchedules = schedules.filter(s => !s.status || s.status === 'published');
    const todaySchedules = validTeacherSchedules
      .filter(s => s.dayOfWeek === dayOfWeek)
      .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

    let activePeriod: ActiveScheduleStatus['activePeriod'] = null;
    let nextPeriod: ActiveScheduleStatus['nextPeriod'] = null;

    const timeline = todaySchedules.map(sch => {
      const startMin = parseTimeToMinutes(sch.startTime);
      const endMin = parseTimeToMinutes(sch.endTime);
      const subName = subjectsMap[sch.subjectId] || sch.subjectId || 'Assigned Subject';
      const secName = sectionsMap[sch.sectionId] || sch.sectionId || 'Assigned Section';

      let status: 'completed' | 'in-progress' | 'upcoming' = 'upcoming';
      if (currentMins >= endMin) {
        status = 'completed';
      } else if (currentMins >= startMin && currentMins < endMin) {
        status = 'in-progress';
        const elapsed = currentMins - startMin;
        const total = Math.max(1, endMin - startMin);
        activePeriod = {
          schedule: sch,
          subjectName: subName,
          sectionName: secName,
          startTimeFormatted: formatTime12h(sch.startTime),
          endTimeFormatted: formatTime12h(sch.endTime),
          minutesRemaining: Math.max(0, endMin - currentMins),
          progressPercent: Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)))
        };
      } else if (currentMins < startMin && !nextPeriod) {
        status = 'upcoming';
        nextPeriod = {
          schedule: sch,
          subjectName: subName,
          sectionName: secName,
          startTimeFormatted: formatTime12h(sch.startTime),
          endTimeFormatted: formatTime12h(sch.endTime),
          minutesUntilStart: startMin - currentMins
        };
      }

      return {
        schedule: sch,
        subjectName: subName,
        sectionName: secName,
        startTimeFormatted: formatTime12h(sch.startTime),
        endTimeFormatted: formatTime12h(sch.endTime),
        status
      };
    });

    return {
      isWeekend,
      dayOfWeek,
      currentMins,
      activePeriod,
      nextPeriod,
      timeline,
      totalClassesToday: todaySchedules.length
    };
  }, [currentTime, schedules, subjectsMap, sectionsMap]);

  // Recent Student Activity Feed
  const recentStudentActivities = useMemo(() => {
    const list: { id: string; title: string; subtitle: string; time: string; type: 'attendance' | 'grade' | 'enrollment' | 'info'; iconColor: string }[] = [];

    // Today's attendance events
    todayAttendance.slice(0, 4).forEach((att, idx) => {
      const st = students.find(s => s.id === att.studentId);
      if (st) {
        const stStatus = getDayStatus(att);
        list.push({
          id: `att-${att.id || idx}`,
          title: `${st.lastName}, ${st.firstName}`,
          subtitle: `Roll call marked as ${stStatus}`,
          time: 'Today',
          type: 'attendance',
          iconColor: stStatus === 'Present' ? 'text-emerald-500 bg-emerald-50' : stStatus === 'Late' ? 'text-amber-500 bg-amber-50' : 'text-rose-500 bg-rose-50'
        });
      }
    });

    // Pending enrollments
    pending.slice(0, 3).forEach((st, idx) => {
      list.push({
        id: `enr-${st.id || idx}`,
        title: `${st.lastName}, ${st.firstName}`,
        subtitle: `Enrollment application submitted (${st.gradeLevel || 'Grade 6'})`,
        time: 'Pending Review',
        type: 'enrollment',
        iconColor: 'text-amber-500 bg-amber-50'
      });
    });

    return list.slice(0, 6);
  }, [todayAttendance, students, pending]);

  // Selected Announcement View Modal State
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  const teacherFirstName = userData?.firstName || (typeof userData?.displayName === 'string' ? userData.displayName.split(' ')[0] : 'Teacher');

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#D8232A]/20 border-t-[#D8232A] rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] overflow-y-auto custom-scrollbar">
      
      {/* 1. Header Banner */}
      <header className="px-6 sm:px-8 py-5 border-b border-slate-200/80 bg-white sticky top-0 z-30 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-[1600px] mx-auto w-full">
          
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#D8232A] to-[#9E171D] text-white flex items-center justify-center shadow-md shadow-red-500/20 shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-slate-900">
                  Welcome back, {String(teacherFirstName)}! 👋
                </h1>
                <Badge variant="outline" className="hidden sm:inline-flex bg-slate-50 border-slate-200 text-slate-600 font-extrabold text-[10px] px-2 py-0.5">
                  S.Y. {syName}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Comprehensive academic overview, live teaching schedule, and student assistance monitoring.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {advisorySection && (
              <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-xs font-black uppercase tracking-wider py-1.5 px-3.5 shadow-2xs rounded-xl flex items-center gap-1.5 select-none">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Advisory: {advisorySection.gradeLevel} - {advisorySection.name}</span>
              </Badge>
            )}

            <div className="flex items-center gap-1 bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-200/60 text-xs font-bold text-slate-700">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>{currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">{currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto w-full">

        {/* 2. REAL-TIME TEACHING SCHEDULE HUB ("What class is the teacher in this time") */}
        <Card className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs overflow-hidden relative">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] font-black uppercase tracking-widest text-[#D8232A] flex items-center gap-1.5">
                  <CalendarClock className="w-4 h-4" /> Live Teaching Schedule
                </span>
                
                {activeScheduleStatus.activePeriod ? (
                  <Badge className="bg-emerald-500 text-white font-black text-[10px] tracking-wider px-2.5 py-0.5 rounded-full animate-pulse flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    IN SESSION NOW
                  </Badge>
                ) : activeScheduleStatus.isWeekend ? (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-bold text-[10px]">
                    WEEKEND
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 font-bold text-[10px]">
                    PLANNING / BREAK
                  </Badge>
                )}
              </div>

              {activeScheduleStatus.activePeriod ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-baseline gap-3">
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      {activeScheduleStatus.activePeriod.subjectName}
                    </h2>
                    <span className="text-sm sm:text-base font-extrabold text-[#D8232A] bg-red-50 px-3 py-1 rounded-xl border border-red-100">
                      {activeScheduleStatus.activePeriod.sectionName}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                    <span>Period: <strong>{activeScheduleStatus.activePeriod.startTimeFormatted} - {activeScheduleStatus.activePeriod.endTimeFormatted}</strong></span>
                    <span>•</span>
                    <span className="text-emerald-600 font-bold">{activeScheduleStatus.activePeriod.minutesRemaining} mins remaining</span>
                  </p>
                  
                  <div className="w-full max-w-md h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-1000"
                      style={{ width: `${activeScheduleStatus.activePeriod.progressPercent}%` }}
                    />
                  </div>
                </div>
              ) : activeScheduleStatus.nextPeriod ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Coffee className="w-5 h-5 text-amber-500" />
                    <h2 className="text-lg sm:text-xl font-bold text-slate-800">
                      No Class in Session Right Now
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Up next at <strong>{activeScheduleStatus.nextPeriod.startTimeFormatted}</strong>: <span className="font-bold text-slate-800">{activeScheduleStatus.nextPeriod.subjectName}</span> with <span className="font-bold text-[#D8232A]">{activeScheduleStatus.nextPeriod.sectionName}</span> (in {activeScheduleStatus.nextPeriod.minutesUntilStart} mins).
                  </p>
                </div>
              ) : activeScheduleStatus.isWeekend ? (
                <div className="space-y-1">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Coffee className="w-5 h-5 text-amber-500" /> It's the Weekend!
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Take time to rest and recharge. Your teaching schedule resumes on Monday morning.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Moon className="w-5 h-5 text-indigo-500" /> Classes Completed For Today
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    All scheduled teaching periods for today have finished.
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-2.5 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
              {activeScheduleStatus.activePeriod && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    onClick={() => {
                      if (onNavigate && activeScheduleStatus.activePeriod) {
                        onNavigate('attendance', activeScheduleStatus.activePeriod.schedule.sectionId);
                      }
                    }}
                    className="h-10 px-4 rounded-xl bg-gradient-to-r from-[#D8232A] to-[#b91c22] text-white text-xs font-bold shadow-md shadow-red-500/20 hover:opacity-95 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Take Roll Call</span>
                  </Button>

                  <Button
                    onClick={() => {
                      if (onNavigate && activeScheduleStatus.activePeriod) {
                        onNavigate('grades', activeScheduleStatus.activePeriod.schedule.sectionId);
                      }
                    }}
                    variant="outline"
                    className="h-10 px-4 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold shadow-2xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4 text-slate-600" />
                    <span>Gradebook</span>
                  </Button>
                </div>
              )}

              <Button
                onClick={() => onNavigate?.('schedule')}
                variant="ghost"
                className="text-xs font-bold text-slate-600 hover:text-[#D8232A] hover:bg-red-50 rounded-xl px-3 h-8 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>View Full Schedule ({activeScheduleStatus.totalClassesToday} classes today)</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {activeScheduleStatus.timeline.length > 0 && (
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
                Today's Timeline:
              </span>
              {activeScheduleStatus.timeline.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => onNavigate?.('attendance', item.schedule.sectionId)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 border transition-all cursor-pointer select-none",
                    item.status === 'in-progress'
                      ? "bg-red-50 border-[#D8232A] text-[#D8232A] shadow-xs ring-2 ring-red-500/20"
                      : item.status === 'completed'
                      ? "bg-slate-50 border-slate-200/60 text-slate-400"
                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                  )}
                >
                  <span className="text-[10px] font-medium text-slate-400">{item.startTimeFormatted}</span>
                  <span>{item.subjectName}</span>
                  <span className="text-[10px] font-semibold text-slate-500">({item.sectionName.split(' - ')[1] || item.sectionName})</span>
                  {item.status === 'in-progress' && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />}
                  {item.status === 'completed' && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 3. CORE RECOMMENDED METRIC CARDS (4 Cards) */}
        <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
          
          {/* Card 1: Total Students */}
          <Card className="p-5 rounded-2xl bg-white border border-slate-200/70 shadow-xs space-y-3 hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold bg-slate-50 border-slate-200 text-slate-600">
                {assignedSections.length} Sections
              </Badge>
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Students</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900">{enrolled.length} Students</p>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">
                {pending.length > 0 ? `${pending.length} pending admission` : 'Active enrolled learners'}
              </p>
            </div>
          </Card>

          {/* Card 2: Attendance Overview */}
          <Card className="p-5 rounded-2xl bg-white border border-slate-200/70 shadow-xs space-y-3 hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle className="w-5 h-5" />
              </div>
              <span className="text-xs font-black text-emerald-600">{attendanceRate}% Rate</span>
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Daily Attendance</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-xl sm:text-2xl font-black text-slate-900">
                  {todayAttendance.length > 0 ? presentToday : '--'} Present
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                Present: {presentToday} • Absent: {absentToday} • Late: {lateToday}
              </p>
            </div>
          </Card>

          {/* Card 3: Class Academic Average */}
          <Card className="p-5 rounded-2xl bg-white border border-slate-200/70 shadow-xs space-y-3 hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <BarChart className="w-5 h-5" />
              </div>
              <Badge variant="outline" className="text-[10px] font-bold bg-purple-50 text-purple-700 border-purple-200">
                Academic Avg
              </Badge>
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Class General Average</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900">{classGeneralAverage}%</p>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">
                Overall class academic performance
              </p>
            </div>
          </Card>

          {/* Card 4: Action Items & Alerts */}
          <Card className={cn(
            "p-5 rounded-2xl border shadow-xs space-y-3 transition-all",
            pendingTasks.length > 0
              ? "bg-gradient-to-br from-amber-50/60 to-white border-amber-200"
              : "bg-white border-slate-200/70"
          )}>
            <div className="flex items-center justify-between">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center font-bold",
                pendingTasks.length > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
              )}>
                <ListTodo className="w-5 h-5" />
              </div>
              {pendingTasks.length > 0 ? (
                <Badge className="bg-amber-600 text-white font-extrabold text-[10px] px-2 py-0.5">
                  {pendingTasks.length} Action Items
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border-emerald-200">
                  All Cleared
                </Badge>
              )}
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Action Items</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900">{pendingTasks.length}</p>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                {pendingTasks.length > 0 ? "Items requiring teacher attention" : "No pending items right now"}
              </p>
            </div>
          </Card>
        </div>

        {/* 4. ACTION CENTER & FAST LAUNCH HUB */}
        <div className="grid gap-6 lg:gap-8 grid-cols-1 lg:grid-cols-12">
          
          {/* PENDING TASKS CARD (7 cols) */}
          <Card className="lg:col-span-7 bg-white border border-slate-200/80 rounded-3xl shadow-xs p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <ListTodo className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Action Items & Tasks</h3>
                    <p className="text-xs text-slate-500">Pending grade entries, admissions review, and roll call</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs font-bold bg-slate-50 border-slate-200">
                  {pendingTasks.length} Pending
                </Badge>
              </div>

              {pendingTasks.length > 0 ? (
                <div className="space-y-2.5">
                  {pendingTasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-2xl border border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3 hover:bg-slate-50 transition-all"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            t.priority === 'high' ? "bg-red-500" : "bg-amber-500"
                          )} />
                          <p className="text-xs font-black text-slate-900 truncate">{t.title}</p>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">{t.desc}</p>
                      </div>

                      <Button
                        onClick={() => onNavigate?.(t.view, t.sectionId)}
                        className="h-8 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold shrink-0 cursor-pointer"
                      >
                        {t.actionLabel}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-slate-700">All Tasks Completed</p>
                  <p className="text-[11px] text-slate-400">You're completely up to date with attendance and grading.</p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Automatic system check</span>
              <span className="font-bold text-slate-700">{syName}</span>
            </div>
          </Card>

          {/* QUICK ACTIONS SECTION (5 cols) */}
          <Card className="lg:col-span-5 bg-white border border-slate-200/80 rounded-3xl shadow-xs p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900 mb-1">Quick Actions</h3>
              <p className="text-xs text-slate-500 font-medium mb-3.5">Frequently used shortcuts and teaching modules</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                
                {/* 1. Take Attendance */}
                <button
                  onClick={() => onNavigate?.('attendance')}
                  className="p-3 rounded-2xl bg-slate-50 hover:bg-red-50 hover:border-red-200 border border-slate-100 text-left transition-all group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-red-100 text-[#D8232A] flex items-center justify-center font-bold mb-1.5 group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-black text-slate-900">Attendance</p>
                  <p className="text-[10px] text-slate-400">Daily roll call</p>
                </button>

                {/* 2. Enter Grades */}
                <button
                  onClick={() => onNavigate?.('grades')}
                  className="p-3 rounded-2xl bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-100 text-left transition-all group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold mb-1.5 group-hover:scale-110 transition-transform">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-black text-slate-900">Gradebook</p>
                  <p className="text-[10px] text-slate-400">Encode grades</p>
                </button>

                {/* 3. View Students */}
                <button
                  onClick={() => onNavigate?.('students')}
                  className="p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-100 text-left transition-all group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold mb-1.5 group-hover:scale-110 transition-transform">
                    <Users className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-black text-slate-900">Students</p>
                  <p className="text-[10px] text-slate-400">Roster & profile</p>
                </button>

                {/* 4. Announcements */}
                <button
                  onClick={() => onNavigate?.('announcements')}
                  className="p-3 rounded-2xl bg-slate-50 hover:bg-amber-50 hover:border-amber-200 border border-slate-100 text-left transition-all group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold mb-1.5 group-hover:scale-110 transition-transform">
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-black text-slate-900">Announce</p>
                  <p className="text-[10px] text-slate-400">Post notices</p>
                </button>

                {/* 5. School Forms */}
                <button
                  onClick={() => onNavigate?.('reports')}
                  className="p-3 rounded-2xl bg-slate-50 hover:bg-teal-50 hover:border-teal-200 border border-slate-100 text-left transition-all group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold mb-1.5 group-hover:scale-110 transition-transform">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-black text-slate-900">School Forms</p>
                  <p className="text-[10px] text-slate-400">SF2, SF9, SF10</p>
                </button>

                {/* 6. Schedule */}
                <button
                  onClick={() => onNavigate?.('schedule')}
                  className="p-3 rounded-2xl bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-100 text-left transition-all group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold mb-1.5 group-hover:scale-110 transition-transform">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-black text-slate-900">Schedule</p>
                  <p className="text-[10px] text-slate-400">Timetable</p>
                </button>

              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Quick Launcher</span>
              <span className="font-semibold text-slate-700">6 Core Shortcuts</span>
            </div>
          </Card>
        </div>

        {/* 5. TOP RANKING STUDENTS + MULTI-FACTOR STUDENTS AT RISK */}
        <div className="grid gap-6 lg:gap-8 grid-cols-1 lg:grid-cols-12">
          
          {/* TOP RANKING STUDENTS (7 cols) */}
          <Card className="lg:col-span-7 bg-white border border-slate-200/80 rounded-3xl shadow-xs overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold border border-amber-200/60 shadow-2xs">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Top Ranking Students</h3>
                  <p className="text-xs text-slate-500 font-medium">Honor roll candidates and highest academic performers</p>
                </div>
              </div>

              {/* Scope pill filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setAcademicScopeFilter('all')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-all",
                    academicScopeFilter === 'all' ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  All
                </button>
                {advisorySection && (
                  <button
                    onClick={() => setAcademicScopeFilter('advisory')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg transition-all",
                      academicScopeFilter === 'advisory' ? "bg-white text-emerald-800 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    Advisory
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 sm:p-5 flex-1 overflow-y-auto max-h-[460px]">
              {topRankedStudents.length > 0 ? (
                <div className="space-y-2.5">
                  {topRankedStudents.map((item, index) => {
                    const rank = index + 1;
                    return (
                      <div
                        key={item.student.id}
                        className={cn(
                          "flex items-center justify-between p-3.5 rounded-2xl border transition-all hover:shadow-2xs",
                          rank === 1
                            ? "bg-gradient-to-r from-amber-50/60 via-amber-50/20 to-white border-amber-200"
                            : rank === 2
                            ? "bg-gradient-to-r from-slate-100/60 via-slate-50/20 to-white border-slate-300"
                            : rank === 3
                            ? "bg-gradient-to-r from-orange-50/40 via-orange-50/10 to-white border-orange-200"
                            : "bg-white border-slate-100 hover:border-slate-200"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-2xs",
                            rank === 1 ? "bg-amber-400 text-slate-900 ring-2 ring-amber-300" :
                            rank === 2 ? "bg-slate-300 text-slate-800" :
                            rank === 3 ? "bg-amber-600 text-white" :
                            "bg-slate-100 text-slate-500"
                          )}>
                            {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                          </div>

                          <div className="min-w-0">
                            <p className="text-sm font-black text-slate-900 truncate">
                              {item.student.lastName}, {item.student.firstName}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400">
                              <span>LRN: {item.student.lrn || 'N/A'}</span>
                              <span>•</span>
                              <span>{item.student.gender}</span>
                              {item.highestSubject && (
                                <>
                                  <span>•</span>
                                  <span className="text-emerald-700 font-bold truncate">
                                    Top: {item.highestSubject.subject} ({item.highestSubject.grade}%)
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {item.honorsTag && (
                            <Badge className={cn("hidden sm:inline-flex text-[10px] px-2 py-0.5 rounded-lg", item.honorsTag.badgeClass)}>
                              {item.honorsTag.label}
                            </Badge>
                          )}
                          <div className="text-right">
                            <span className="text-base sm:text-lg font-black text-slate-900">
                              {item.overallAverage.toFixed(1)}%
                            </span>
                            <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
                              {item.subjectCount} Subjects
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-16 text-center text-slate-400">
                  <Award className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">No Grades Recorded Yet</p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                    Encode scores in the Gradebook to automatically calculate class rankings.
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* MULTI-FACTOR "STUDENTS AT RISK" (5 cols) */}
          <Card className="lg:col-span-5 bg-white border border-slate-200/80 rounded-3xl shadow-xs overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 bg-rose-50/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold border border-red-200 shadow-2xs">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Students At Risk</h3>
                  <p className="text-xs text-slate-500 font-medium">Multi-factor risk: grades, absenteeism, missing docs</p>
                </div>
              </div>
              <Badge className="bg-red-100 text-red-800 border-red-200 font-black text-[10px]">
                {holisticAtRiskStudents.length} Flagged
              </Badge>
            </div>

            <div className="p-4 sm:p-5 flex-1 overflow-y-auto max-h-[460px]">
              {holisticAtRiskStudents.length > 0 ? (
                <div className="space-y-3">
                  {holisticAtRiskStudents.map((item) => (
                    <div
                      key={item.student.id}
                      className="p-3.5 rounded-2xl bg-white border border-red-100 hover:border-red-200 hover:shadow-2xs transition-all space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-900 truncate">
                            {item.student.lastName}, {item.student.firstName}
                          </p>
                          <p className="text-[11px] font-semibold text-slate-400">
                            LRN: {item.student.lrn || 'N/A'} • {item.student.gender}
                          </p>
                        </div>
                        <Badge className="bg-rose-100 text-rose-800 border-rose-200 font-extrabold text-[10px]">
                          Risk Score: {item.riskScore}%
                        </Badge>
                      </div>

                      {/* Factor badges */}
                      <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        {item.riskFactors.map((f, fIdx) => (
                          <div key={fIdx} className="flex items-start gap-1.5 text-xs">
                            <span className={cn(
                              "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                              f.severity === 'high' ? 'bg-red-500' : f.severity === 'medium' ? 'bg-amber-500' : 'bg-slate-400'
                            )} />
                            <div>
                              <strong className="text-slate-800">{f.title}:</strong> <span className="text-slate-600">{f.detail}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Action jump */}
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <Button
                          onClick={() => onNavigate?.('grades', item.student.sectionId)}
                          variant="ghost"
                          className="h-7 px-2 text-[11px] font-bold text-[#D8232A] hover:bg-red-50 rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <span>Open Gradebook</span>
                          <ChevronRight className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center text-slate-400">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">No Learners Currently At Risk</p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                    All students are passing, attending regularly, and have complete requirements.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* 6. ANNOUNCEMENTS & RECENT STUDENT ACTIVITY */}
        <div className="grid gap-6 lg:gap-8 grid-cols-1 lg:grid-cols-12">
          
          {/* RECENT ANNOUNCEMENTS (7 cols) */}
          <Card className="lg:col-span-7 bg-white border border-slate-200/80 rounded-3xl shadow-xs p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-red-50 text-[#D8232A] flex items-center justify-center font-bold">
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Recent Announcements</h3>
                    <p className="text-xs text-slate-500">School notices, faculty updates, and academic memos</p>
                  </div>
                </div>

                <Button
                  onClick={() => onNavigate?.('announcements')}
                  variant="ghost"
                  className="text-xs font-bold text-[#D8232A] hover:bg-red-50 h-7 px-2 rounded-lg cursor-pointer"
                >
                  Manage <ChevronRight className="w-3 h-3" />
                </Button>
              </div>

              {announcements.length > 0 ? (
                <div className="space-y-2.5 max-h-[320px] overflow-y-auto">
                  {announcements.map((ann) => (
                    <div
                      key={ann.id}
                      onClick={() => setSelectedAnnouncement(ann)}
                      className="p-3 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-red-50/40 hover:border-red-200 transition-all cursor-pointer space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge className={cn("text-[9px] px-2 py-0 font-bold", ann.category === 'Emergency' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800')}>
                          {ann.category || 'General'}
                        </Badge>
                        {ann.isPinned && (
                          <span className="text-[10px] font-extrabold text-[#D8232A]">📌 Pinned</span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-slate-900 line-clamp-1">{ann.title}</p>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{ann.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center text-slate-400">
                  <Megaphone className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-slate-700">No Announcements</p>
                  <p className="text-[11px] text-slate-400">School bulletins and faculty updates will display here.</p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Sta. Maria Enrollment Portal</span>
              <Button
                onClick={() => onNavigate?.('announcements')}
                variant="ghost"
                className="h-6 p-0 text-xs font-bold text-[#D8232A]"
              >
                Post New Announcement
              </Button>
            </div>
          </Card>

          {/* RECENT STUDENT ACTIVITY (5 cols) */}
          <Card className="lg:col-span-5 bg-white border border-slate-200/80 rounded-3xl shadow-xs p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Recent Student Activity</h3>
                    <p className="text-xs text-slate-500">Attendance marks, enrollment updates, and learner logs</p>
                  </div>
                </div>
                <Clock className="w-4 h-4 text-slate-400" />
              </div>

              {recentStudentActivities.length > 0 ? (
                <div className="space-y-2.5 max-h-[320px] overflow-y-auto">
                  {recentStudentActivities.map((act) => (
                    <div
                      key={act.id}
                      className="p-3 rounded-2xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0", act.iconColor)}>
                          <CheckCircle className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{act.title}</p>
                          <p className="text-[11px] text-slate-500 font-medium truncate">{act.subtitle}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 shrink-0">{act.time}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center text-slate-400">
                  <Clock className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-slate-700">No Recent Activity</p>
                  <p className="text-[11px] text-slate-400">Recorded student actions will list here.</p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Live activity stream</span>
              <span className="font-bold text-slate-700">{recentStudentActivities.length} Events</span>
            </div>
          </Card>
        </div>

      </div>

      {/* MODAL: Read Full Announcement */}
      {selectedAnnouncement && (
        <Dialog open={!!selectedAnnouncement} onOpenChange={() => setSelectedAnnouncement(null)}>
          <DialogContent className="sm:max-w-lg bg-white rounded-3xl p-6 shadow-xl space-y-4">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <Badge className={cn("text-[10px] px-2 py-0.5", selectedAnnouncement.category === 'Emergency' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800')}>
                  {selectedAnnouncement.category || 'General'}
                </Badge>
                {selectedAnnouncement.isPinned && (
                  <span className="text-xs font-bold text-[#D8232A]">📌 Pinned</span>
                )}
              </div>
              <DialogTitle className="text-lg font-black text-slate-900">
                {selectedAnnouncement.title}
              </DialogTitle>
            </DialogHeader>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto">
              {selectedAnnouncement.content}
            </div>

            <DialogFooter>
              <Button
                onClick={() => setSelectedAnnouncement(null)}
                className="rounded-xl h-10 px-5 bg-slate-900 text-white font-bold"
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
