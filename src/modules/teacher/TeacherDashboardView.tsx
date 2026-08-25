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
  Heart,
  CalendarDays
} from 'lucide-react';
import { useTeacherData, Student, AttendanceEntry } from '../../lib/teacherData';
import { useAuth } from '../../lib/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, onSnapshot, limit } from 'firebase/firestore';
import { Schedule } from '../../lib/adminData';
import { getCurrentSchoolYear } from '../../lib/utils';
import { Announcement } from '../../lib/services/announcementsService';
import { NotificationBell } from '../../components/shared/NotificationBell';

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
  const teacherFullName = userData?.firstName ? `${userData.firstName} ${userData.lastName || ''}`.trim() : 'Teacher User';

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
    <div className="flex flex-col h-full bg-[#f8fafc] overflow-y-auto custom-scrollbar font-sans">
      
      {/* 1. Header Bar */}
      <header className="h-[72px] px-6 sm:px-8 border-b border-slate-200/80 bg-white sticky top-0 z-30 shadow-2xs flex items-center justify-between shrink-0">
        <div className="flex items-center justify-between gap-4 max-w-[1600px] mx-auto w-full">
          
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D8232A] to-[#9E171D] text-white flex items-center justify-center shadow-md shadow-red-500/15 shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none">
                  Teacher Homepage
                </h1>
                <Badge variant="outline" className="hidden sm:inline-flex bg-red-50 text-[#D8232A] border-red-200 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full">
                  S.Y. {syName}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-none mt-1 hidden md:block">
                Quick access to your daily teaching tools, classroom records, and schedule.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {advisorySection && (
              <Badge className="hidden xl:inline-flex bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[11px] font-black uppercase tracking-wider py-1.5 px-3 rounded-xl items-center gap-1.5 select-none shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Advisory: {advisorySection.gradeLevel} - {advisorySection.name}</span>
              </Badge>
            )}

            {/* Live Clock / Date */}
            <div className="hidden lg:flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80 text-xs font-bold text-slate-700">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">{currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            </div>

            {/* Notification Bell */}
            <NotificationBell onNavigate={onNavigate ? (v) => onNavigate(v) : undefined} />

            {/* Quick Profile Summary Badge */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              {typeof userData?.photoURL === 'string' && userData.photoURL.length > 0 ? (
                <img src={userData.photoURL} alt="Avatar" className="w-8 h-8 rounded-full object-cover shadow-inner border border-slate-200" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#D8232A] to-[#f87171] text-white flex items-center justify-center font-bold text-xs shadow-inner">
                  {teacherFullName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">
                  {teacherFullName}
                </span>
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#D8232A] leading-tight">
                  Faculty Teacher
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-[1600px] mx-auto w-full">

        {/* ── 2. CLEAN & PROFESSIONAL WELCOME CARD (WITH LIVE SCHEDULE & ACTIONS) ── */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 leading-tight">
              Good {currentTime.getHours() < 12 ? 'Morning' : currentTime.getHours() < 18 ? 'Afternoon' : 'Evening'}, Teacher {String(teacherFirstName)}! 👋
            </h2>
            
            {activeScheduleStatus.activePeriod ? (
              <div className="flex items-center gap-2 flex-wrap text-sm">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  IN SESSION NOW
                </span>
                <span className="font-bold text-slate-800">
                  {activeScheduleStatus.activePeriod.startTimeFormatted} – {activeScheduleStatus.activePeriod.endTimeFormatted}
                </span>
                <span className="text-slate-300">•</span>
                <span className="font-extrabold text-[#D8232A]">
                  {activeScheduleStatus.activePeriod.sectionName}
                </span>
                <span className="font-semibold text-slate-600">
                  ({activeScheduleStatus.activePeriod.subjectName})
                </span>
                <span className="text-xs text-emerald-700 font-bold bg-emerald-50/80 px-2 py-0.5 rounded-md">
                  {activeScheduleStatus.activePeriod.minutesRemaining}m remaining
                </span>
              </div>
            ) : activeScheduleStatus.nextPeriod ? (
              <div className="flex items-center gap-2 flex-wrap text-sm">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold">
                  NEXT UP
                </span>
                <span className="font-bold text-slate-800">
                  {activeScheduleStatus.nextPeriod.startTimeFormatted} – {activeScheduleStatus.nextPeriod.endTimeFormatted}
                </span>
                <span className="text-slate-300">•</span>
                <span className="font-extrabold text-[#D8232A]">
                  {activeScheduleStatus.nextPeriod.sectionName}
                </span>
                <span className="font-semibold text-slate-600">
                  ({activeScheduleStatus.nextPeriod.subjectName})
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  starts in {activeScheduleStatus.nextPeriod.minutesUntilStart}m
                </span>
              </div>
            ) : activeScheduleStatus.isWeekend ? (
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                It's the weekend! Take time to rest and recharge.
              </p>
            ) : (
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                All scheduled teaching periods for today are completed.
              </p>
            )}
          </div>

          {/* Action Buttons Integrated Right in the Hero */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <Button
              onClick={() => onNavigate?.('attendance', activeScheduleStatus.activePeriod?.schedule.sectionId || activeScheduleStatus.nextPeriod?.schedule.sectionId)}
              className="h-9 sm:h-10 px-4 rounded-xl bg-[#D8232A] hover:bg-[#b91c22] text-white text-xs font-bold shadow-2xs transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Take Attendance</span>
            </Button>
            <Button
              onClick={() => onNavigate?.('grades', activeScheduleStatus.activePeriod?.schedule.sectionId || activeScheduleStatus.nextPeriod?.schedule.sectionId)}
              variant="outline"
              className="h-9 sm:h-10 px-4 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-slate-500" />
              <span>Open Gradebook</span>
            </Button>
            <Button
              onClick={() => onNavigate?.('schedule')}
              variant="ghost"
              className="h-9 sm:h-10 px-3 rounded-xl text-slate-600 hover:text-[#D8232A] hover:bg-red-50 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <CalendarClock className="w-4 h-4" />
              <span>Full Schedule</span>
            </Button>
          </div>
        </div>

        {/* ── 4. SECONDARY QUICK SHORTCUTS ── */}
        <div>
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Additional Modules</h3>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {/* Shortcut A: Class Students */}
            <div
              onClick={() => onNavigate?.('students')}
              className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer group flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 group-hover:text-[#D8232A] transition-colors truncate">Class Students</p>
                <p className="text-[11px] text-slate-400 font-medium truncate">Roster & Profiles</p>
              </div>
            </div>

            {/* Shortcut B: School Forms */}
            <div
              onClick={() => onNavigate?.('reports')}
              className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer group flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 group-hover:text-[#D8232A] transition-colors truncate">School Forms</p>
                <p className="text-[11px] text-slate-400 font-medium truncate">SF2, SF9 & SF10</p>
              </div>
            </div>

            {/* Shortcut C: Observed Values */}
            <div
              onClick={() => onNavigate?.('observed-values')}
              className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer group flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                <Award className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 group-hover:text-[#D8232A] transition-colors truncate">Observed Values</p>
                <p className="text-[11px] text-slate-400 font-medium truncate">Core Values</p>
              </div>
            </div>

            {/* Shortcut D: Health & Nutrition */}
            <div
              onClick={() => onNavigate?.('health')}
              className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer group flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                <Heart className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 group-hover:text-[#D8232A] transition-colors truncate">Health & Nutrition</p>
                <p className="text-[11px] text-slate-400 font-medium truncate">BMI & Wellness</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── 5. TODAY'S SCHEDULE OVERVIEW (FULL-WIDTH CONSOLE) ── */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-5 sm:p-7 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-[#D8232A] flex items-center justify-center shrink-0 border border-red-100 shadow-2xs">
                  <CalendarClock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">Today's Class Schedule</h3>
                  <p className="text-xs text-slate-500 font-medium">Complete daily timetable, periods, and room assignments</p>
                </div>
              </div>

              <Button
                onClick={() => onNavigate?.('schedule')}
                variant="ghost"
                className="text-xs font-bold text-[#D8232A] hover:bg-red-50 h-8 px-3 rounded-xl cursor-pointer"
              >
                Full Schedule <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            </div>

            {activeScheduleStatus.timeline.length > 0 ? (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto custom-scrollbar">
                {activeScheduleStatus.timeline.map((item, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "p-3.5 rounded-2xl border flex items-center justify-between gap-4 transition-all",
                      item.status === 'in-progress'
                        ? "bg-red-50/70 border-red-200 text-slate-900 shadow-xs"
                        : item.status === 'completed'
                        ? "bg-slate-50/60 border-slate-200/60 text-slate-500"
                        : "bg-white border-slate-200/80 text-slate-800 hover:border-slate-300"
                    )}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <span className="text-xs font-bold text-slate-500 shrink-0 w-28">
                        {item.startTimeFormatted} – {item.endTimeFormatted}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {item.subjectName}
                        </p>
                        <p className="text-xs text-slate-500 font-medium truncate">
                          {item.sectionName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      {item.status === 'in-progress' ? (
                        <Badge className="bg-[#D8232A] text-white font-extrabold text-[10px] px-2.5 py-0.5 animate-pulse">
                          In Session
                        </Badge>
                      ) : item.status === 'completed' ? (
                        <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200 text-[10px]">
                          Completed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-white text-slate-600 border-slate-200 text-[10px]">
                          Upcoming
                        </Badge>
                      )}

                      <Button
                        onClick={() => onNavigate?.('attendance', item.schedule.sectionId)}
                        variant="outline"
                        className="h-8 px-3 text-xs font-bold text-slate-700 hover:text-[#D8232A] hover:bg-white rounded-xl border-slate-200"
                      >
                        Take Attendance
                      </Button>
                      <Button
                        onClick={() => onNavigate?.('grades', item.schedule.sectionId)}
                        variant="outline"
                        className="h-8 px-3 text-xs font-bold text-slate-700 hover:text-[#D8232A] hover:bg-white rounded-xl border-slate-200"
                      >
                        Gradebook
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400">
                <Coffee className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No scheduled classes right now</p>
                <p className="text-xs text-slate-400">Your timetable is clear for today.</p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 mt-4">
            <span>Daily Timetable Console</span>
            <span className="font-bold text-slate-700">{activeScheduleStatus.totalClassesToday} Classes Scheduled Today • S.Y. {syName}</span>
          </div>
        </div>

      </div>

    </div>
  );
}
