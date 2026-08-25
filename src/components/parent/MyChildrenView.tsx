import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '../ui/Dialog';

import {
  CheckCircle2,
  CircleDashed,
  XCircle,
  ChevronRight,
  Users,
  GraduationCap,
  Trash2,
  Search,
  ArrowRight,
  User,
  Eye,
  FileText,
  Lock,
  AlertTriangle,
  LayoutGrid,
  List,
  PlusCircle,
  CalendarCheck,
  BarChart3,
  Award,
  Calendar,
  Sparkles,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { useParentData } from '../../lib/parentData';
import { db } from '../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { cn } from '../../lib/utils';

interface MyChildrenViewProps {
  onSelectChild: (id: string) => void;
  onNavigate?: (view: string) => void;
}

export function MyChildrenView({
  onSelectChild,
  onNavigate
}: MyChildrenViewProps) {
  const parentData = useParentData();
  const children = parentData?.children || [];
  const loading = parentData?.loading || false;
  const deleteChild = parentData?.deleteChild;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ENROLLED' | 'PENDING'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [childToDelete, setChildToDelete] = useState<any | null>(null);
  const [sectionsMap, setSectionsMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchSections = async () => {
      try {
        const snap = await getDocs(collection(db, 'sections'));
        const map: Record<string, string> = {};
        snap.docs.forEach(doc => {
          map[doc.id] = doc.data().name || doc.data().sectionName || doc.id;
        });
        setSectionsMap(map);
      } catch (err) {
        console.error('Error fetching sections for parent view:', err);
      }
    };
    fetchSections();
  }, []);

  // Compute stats
  const enrolledCount = useMemo(() => {
    return children.filter(c => c.status === 'Enrolled' || c.status === 'Approved' || (c.status as string) === 'Active').length;
  }, [children]);

  const pendingCount = useMemo(() => {
    return children.filter(c => c.status === 'Pending' || !c.status).length;
  }, [children]);

  // General Average calculation
  // DepEd Performance Descriptor Helper
  const getAcademicStandingBadge = (avgStr: string) => {
    const num = parseFloat(avgStr);
    if (isNaN(num)) return null;
    if (num >= 90) return { label: 'Outstanding', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (num >= 85) return { label: 'Very Satisfactory', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    if (num >= 80) return { label: 'Satisfactory', color: 'bg-teal-50 text-teal-700 border-teal-200' };
    if (num >= 75) return { label: 'Fairly Satisfactory', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { label: 'Did Not Meet Expectations', color: 'bg-rose-50 text-rose-700 border-rose-200' };
  };

  // Real-time Today Attendance Status Helper
  const getTodayAttendanceStatus = (child: any) => {
    const today = new Date();
    const isoToday = today.toISOString().split('T')[0];
    const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const todayEntry = child.attendance?.find((a: any) => {
      if (!a.date) return false;
      const dStr = typeof a.date === 'string' ? a.date.split('T')[0] : '';
      return dStr === isoToday || dStr === localToday;
    });

    if (!todayEntry || !todayEntry.status || todayEntry.status === 'Unmarked') {
      return {
        status: 'Unmarked',
        badgeTitle: 'Attendance Not Yet Taken',
        description: 'Awaiting roll call from adviser',
        badgeColor: 'bg-slate-100 text-slate-600 border-slate-200',
        dotColor: 'bg-slate-400',
        isTaken: false
      };
    }

    if (todayEntry.status === 'Present') {
      return {
        status: 'Present',
        badgeTitle: 'Marked Present Today',
        description: 'Present in class roll call',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dotColor: 'bg-emerald-500',
        isTaken: true
      };
    }

    if (todayEntry.status === 'Late') {
      return {
        status: 'Late',
        badgeTitle: 'Marked Late / Tardy Today',
        description: 'Late arrival recorded',
        badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
        dotColor: 'bg-amber-500',
        isTaken: true
      };
    }

    if (todayEntry.status === 'Absent') {
      return {
        status: 'Absent',
        badgeTitle: 'Marked Absent Today',
        description: 'Absence recorded by adviser',
        badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
        dotColor: 'bg-rose-500',
        isTaken: true
      };
    }

    return {
      status: 'Unmarked',
      badgeTitle: 'Attendance Not Yet Taken',
      description: 'Awaiting roll call from adviser',
      badgeColor: 'bg-slate-100 text-slate-600 border-slate-200',
      dotColor: 'bg-slate-400',
      isTaken: false
    };
  };

  // Child Attendance Monthly Rates
  const getAttendanceStats = (child: any) => {
    const records = child.attendance || [];
    if (records.length === 0) {
      return { present: 0, late: 0, absent: 0, rate: '100%' };
    }
    const present = records.filter((r: any) => r.status === 'Present').length;
    const late = records.filter((r: any) => r.status === 'Late').length;
    const absent = records.filter((r: any) => r.status === 'Absent').length;
    const total = present + late + absent;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 100;
    return { present, late, absent, rate: `${rate}%` };
  };

  // Child Grades Summary & Analytics across T1, T2, T3
  const getChildGradesSummary = (c: any) => {
    if (!c || !c.grades) {
      return {
        average: 'N/A',
        standing: null,
        quarters: [
          { name: 'T1', grade: '--' },
          { name: 'T2', grade: '--' },
          { name: 'T3', grade: '--' }
        ],
        subjectCount: 0
      };
    }

    const gLvl = c.gradeLevel || 'Grade 6';
    const normalizedGLvl = gLvl.toString().toLowerCase().replace(/\s+/g, '').replace(/grade/i, '');
    const matchedKey = Object.keys(c.grades).find(k => k.toLowerCase().replace(/\s+/g, '').replace(/grade/i, '') === normalizedGLvl) || Object.keys(c.grades)[0];
    const studentGrades = matchedKey ? c.grades[matchedKey] : null;

    if (!studentGrades || typeof studentGrades !== 'object') {
      return {
        average: 'N/A',
        standing: null,
        quarters: [
          { name: 'T1', grade: '--' },
          { name: 'T2', grade: '--' },
          { name: 'T3', grade: '--' }
        ],
        subjectCount: 0
      };
    }

    const t1Scores: number[] = [];
    const t2Scores: number[] = [];
    const t3Scores: number[] = [];
    const finalGrades: number[] = [];
    let subjectCount = 0;

    const extractTermVal = (subjVal: any, termNames: string[], directKeys: string[]) => {
      if (!subjVal || typeof subjVal !== 'object') return null;

      // Direct property keys
      for (const k of directKeys) {
        if (subjVal[k] !== undefined && subjVal[k] !== null && subjVal[k] !== '' && typeof subjVal[k] !== 'object') {
          const num = parseFloat(subjVal[k]);
          if (!isNaN(num)) return num;
        }
      }

      // Term object keys
      for (const tName of termNames) {
        const termData = subjVal[tName];
        if (termData !== undefined && termData !== null) {
          if (typeof termData === 'number') return termData;
          if (typeof termData === 'string') {
            const num = parseFloat(termData);
            if (!isNaN(num)) return num;
          }
          if (typeof termData === 'object') {
            const vals: number[] = [];
            Object.values(termData).forEach((v: any) => {
              if (v !== undefined && v !== null && v !== '' && typeof v !== 'object') {
                const num = parseFloat(v);
                if (!isNaN(num)) vals.push(num);
              }
            });
            if (vals.length > 0) {
              return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
            }
          }
        }
      }
      return null;
    };

    Object.entries(studentGrades).forEach(([subjCode, subjVal]: [string, any]) => {
      if (!subjVal || typeof subjVal !== 'object') return;
      subjectCount++;

      const t1 = extractTermVal(subjVal, ['Term 1', 'Quarter 1', 'T1', 'Q1'], ['t1', 'q1']);
      const t2 = extractTermVal(subjVal, ['Term 2', 'Quarter 2', 'T2', 'Q2'], ['t2', 'q2']);
      const t3 = extractTermVal(subjVal, ['Term 3', 'Finals', 'Quarter 3', 'T3', 'Q3'], ['t3', 'q3']);

      if (t1 !== null) t1Scores.push(t1);
      if (t2 !== null) t2Scores.push(t2);
      if (t3 !== null) t3Scores.push(t3);

      let subjectFinal: number | null = null;
      if (subjVal.finalGradeOverride !== undefined && subjVal.finalGradeOverride !== null && subjVal.finalGradeOverride !== '') {
        const num = parseFloat(subjVal.finalGradeOverride);
        if (!isNaN(num)) subjectFinal = num;
      }
      if (subjectFinal === null) {
        const activeTerms = [t1, t2, t3].filter((v): v is number => v !== null);
        if (activeTerms.length > 0) {
          subjectFinal = activeTerms.reduce((a, b) => a + b, 0) / activeTerms.length;
        }
      }
      if (subjectFinal !== null) {
        finalGrades.push(subjectFinal);
      }
    });

    const t1Avg = t1Scores.length > 0 ? (t1Scores.reduce((a, b) => a + b, 0) / t1Scores.length).toFixed(1) : '--';
    const t2Avg = t2Scores.length > 0 ? (t2Scores.reduce((a, b) => a + b, 0) / t2Scores.length).toFixed(1) : '--';
    const t3Avg = t3Scores.length > 0 ? (t3Scores.reduce((a, b) => a + b, 0) / t3Scores.length).toFixed(1) : '--';

    let generalAvg = 'N/A';
    if (finalGrades.length > 0) {
      generalAvg = (finalGrades.reduce((a, b) => a + b, 0) / finalGrades.length).toFixed(1);
    } else {
      const activeAverages = [t1Avg, t2Avg, t3Avg].filter(v => v !== '--').map(v => parseFloat(v));
      if (activeAverages.length > 0) {
        generalAvg = (activeAverages.reduce((a, b) => a + b, 0) / activeAverages.length).toFixed(1);
      }
    }

    return {
      average: generalAvg,
      standing: generalAvg !== 'N/A' ? getAcademicStandingBadge(generalAvg) : null,
      quarters: [
        { name: 'T1', grade: t1Avg },
        { name: 'T2', grade: t2Avg },
        { name: 'T3', grade: t3Avg }
      ],
      subjectCount
    };
  };

  // Helper for Student Subject Average (legacy compat)
  const getStudentAverage = (c: any): string => {
    return getChildGradesSummary(c).average;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Enrolled':
      case 'Approved':
      case 'Active':
        return (
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-extrabold rounded-full border border-emerald-200/80 inline-flex items-center gap-1.5 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Officially Enrolled
          </span>
        );
      case 'Pending':
        return (
          <span className="px-3 py-1 bg-amber-50 text-amber-700 text-[11px] font-extrabold rounded-full border border-amber-200/80 inline-flex items-center gap-1.5 shadow-2xs">
            <CircleDashed className="w-3.5 h-3.5 text-amber-500 animate-spin-slow" /> Pending Evaluation
          </span>
        );
      case 'Rejected':
        return (
          <span className="px-3 py-1 bg-rose-50 text-rose-700 text-[11px] font-extrabold rounded-full border border-rose-200/80 inline-flex items-center gap-1.5 shadow-2xs">
            <XCircle className="w-3.5 h-3.5 text-rose-500" /> Rejected
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 bg-amber-50 text-amber-700 text-[11px] font-extrabold rounded-full border border-amber-200/80 inline-flex items-center gap-1.5 shadow-2xs">
            <CircleDashed className="w-3.5 h-3.5 text-amber-500 animate-spin-slow" /> Pending
          </span>
        );
    }
  };

  const filteredChildren = useMemo(() => {
    let list = children || [];

    // Status Filter
    if (statusFilter === 'ENROLLED') {
      list = list.filter(c => c.status === 'Enrolled' || c.status === 'Approved' || (c.status as string) === 'Active');
    } else if (statusFilter === 'PENDING') {
      list = list.filter(c => c.status === 'Pending' || !c.status);
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => {
        if (!c) return false;
        const fullName = `${c.firstName || ''} ${c.middleName || ''} ${c.lastName || ''}`.toLowerCase();
        const lrn = (c.lrn || '').toLowerCase();
        const grade = `grade ${c.gradeLevel || ''}`.toLowerCase();
        return fullName.includes(q) || lrn.includes(q) || grade.includes(q);
      });
    }

    return list;
  }, [children, searchQuery, statusFilter]);

  const handleDeleteConfirm = async () => {
    if (!childToDelete || !deleteChild) return;
    try {
      await deleteChild(childToDelete.id);
      setChildToDelete(null);
    } catch (err) {
      console.error('Error deleting child:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="w-9 h-9 border-4 border-[#D8232A]/20 border-t-[#D8232A] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#F4F7F9] font-sans">
      {/* ── 1. DESKTOP HEADER SECTION (Hidden on mobile) ── */}
      <header className="hidden lg:flex px-6 sm:px-8 py-5 border-b border-slate-200/80 bg-white items-center justify-between gap-4 shrink-0 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 bg-red-50 rounded-2xl flex items-center justify-center text-[#D8232A] border border-red-100/80 shadow-inner">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">My Students</h1>
            <p className="text-xs text-slate-500 font-medium">Manage student profiles, monitor homeroom attendance, and review academic performance.</p>
          </div>
        </div>

        {/* Action Button: Register Learner */}
        {onNavigate && (
          <div className="flex items-center gap-2.5">
            <Button
              onClick={() => onNavigate('enrollment')}
              className="h-10 px-4 bg-[#D8232A] hover:bg-[#b91c22] text-white text-xs font-bold rounded-xl shadow-2xs transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Register Learner</span>
            </Button>
          </div>
        )}
      </header>

      {/* ── 2. FILTER & CONTROLS TOOLBAR ── */}
      <div className="px-3.5 sm:px-6 lg:px-8 pt-3.5 sm:pt-6 pb-2 shrink-0 space-y-3 sm:space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs">

          {/* Status Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0" style={{ scrollbarWidth: 'none' }}>
            <button
              onClick={() => setStatusFilter('ALL')}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                statusFilter === 'ALL'
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              )}
            >
              All ({children.length})
            </button>
            <button
              onClick={() => setStatusFilter('ENROLLED')}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                statusFilter === 'ENROLLED'
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              )}
            >
              Enrolled ({enrolledCount})
            </button>
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                statusFilter === 'PENDING'
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              )}
            >
              Pending ({pendingCount})
            </button>
          </div>

          {/* Search & View Mode Switcher */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search student or LRN..."
                className="pl-9 pr-3 py-1.5 bg-slate-50 border-slate-200/80 rounded-xl text-xs font-medium focus:bg-white transition-all w-full"
              />
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0 border border-slate-200/60">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-1.5 rounded-lg transition-all cursor-pointer",
                  viewMode === 'grid' ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                )}
                title="Cards Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={cn(
                  "p-1.5 rounded-lg transition-all cursor-pointer",
                  viewMode === 'table' ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                )}
                title="List / Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. MAIN STUDENT LIST / CARDS CONTAINER ── */}
      <div className="flex-1 overflow-y-auto px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-4 space-y-4 sm:space-y-6">
        {filteredChildren.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-12 text-center space-y-4 max-w-md mx-auto my-8">
            <div className="w-16 h-16 bg-red-50 text-[#D8232A] rounded-3xl flex items-center justify-center mx-auto border border-red-100">
              <Users className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-800">
                {children.length === 0 ? "No Registered Students Found" : "No Matching Students"}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {children.length === 0
                  ? "You have not registered any children yet. Register a new or returning student to monitor attendance and grades."
                  : "No students matched your search criteria. Try searching with a different name or LRN."}
              </p>
            </div>
            {children.length === 0 && onNavigate ? (
              <Button
                onClick={() => onNavigate('enrollment')}
                className="h-10 px-5 bg-[#D8232A] hover:bg-[#b91c22] text-white text-xs font-bold rounded-xl shadow-2xs"
              >
                <PlusCircle className="w-4 h-4 mr-1.5" /> Register Student
              </Button>
            ) : searchQuery ? (
              <Button
                onClick={() => setSearchQuery('')}
                variant="outline"
                className="h-9 px-4 rounded-xl text-xs font-bold"
              >
                Clear Search
              </Button>
            ) : null}
          </div>
        ) : viewMode === 'grid' ? (
          /* ── CARDS GRID VIEW ── */
          <div className="grid gap-5 sm:gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {filteredChildren.map((child) => {
              const todayStatus = getTodayAttendanceStatus(child);
              const stats = getAttendanceStats(child);
              const gradesSummary = getChildGradesSummary(child);
              const displayGrade = (child.gradeLevel || '').toString().toLowerCase().startsWith('grade')
                ? child.gradeLevel
                : `Grade ${child.gradeLevel || 'Level'}`;
              const actualSectionName = child.sectionId ? (sectionsMap[child.sectionId] || child.section) : child.section;
              const displaySection = (child.status === 'Enrolled' || child.status === 'Approved')
                ? (actualSectionName
                  ? (actualSectionName.toString().toLowerCase().startsWith('section') ? actualSectionName : `Section ${actualSectionName}`)
                  : 'Section TBA')
                : 'Section Assignment Pending';
              const studentId = child.lrn || 'LRN Pending';

              return (
                <div
                  key={child.id}
                  className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between gap-5 group"
                >
                  {/* Card Header: Avatar, Name, LRN & Standing */}
                  <div className="space-y-3.5">
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-13 h-13 rounded-2xl bg-red-100 text-[#D8232A] font-black flex items-center justify-center text-sm border border-red-200 shrink-0 overflow-hidden shadow-inner group-hover:scale-105 transition-transform">
                          {(() => {
                            const photoFields = [child.photoURL, (child as any).photoUrl, (child as any).profilePicture, (child as any).avatarUrl, (child as any).avatar, (child as any).photo];
                            const photo = photoFields.find((p): p is string => typeof p === 'string' && p.trim().length > 0) || null;
                            return photo ? (
                              <img src={photo} alt={child.firstName} className="w-full h-full object-cover" />
                            ) : (
                              <>{child.firstName?.[0]}{child.lastName?.[0]}</>
                            );
                          })()}
                        </div>

                        <div className="min-w-0">
                          <h4 className="font-black text-slate-900 text-sm sm:text-base leading-tight uppercase truncate group-hover:text-[#D8232A] transition-colors">
                            {child.firstName} {child.middleName ? `${child.middleName.charAt(0)}. ` : ''}{child.lastName}
                          </h4>
                          <p className="text-xs font-bold text-slate-600 truncate mt-0.5">
                            {displayGrade} • {displaySection}
                          </p>
                          <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                            LRN: <span className="font-bold text-slate-600">{studentId}</span>
                          </p>
                        </div>
                      </div>

                      {/* Enrollment Badge */}
                      <div className="shrink-0">
                        {getStatusBadge(child.status)}
                      </div>
                    </div>

                    {/* Today Attendance & Academic Performance Snapshot */}
                    <div className="space-y-3.5">
                      {/* Attendance Block */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                            <CalendarCheck className="w-3.5 h-3.5 text-[#D8232A]" />
                            Today's Attendance
                          </span>
                          <span className="text-[11px] font-bold text-slate-500">
                            {stats.rate} Presence
                          </span>
                        </div>

                        <div className={cn("p-2.5 rounded-2xl border flex items-center justify-between gap-2 transition-colors", todayStatus.badgeColor)}>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={cn("w-2 h-2 rounded-full shrink-0", todayStatus.dotColor, todayStatus.isTaken && "animate-pulse")} />
                            <p className="text-xs font-extrabold truncate">
                              {todayStatus.badgeTitle}
                            </p>
                          </div>
                          <span className="text-[10px] opacity-75 font-medium shrink-0">
                            {todayStatus.isTaken ? 'Recorded by Adviser' : 'Pending'}
                          </span>
                        </div>
                      </div>

                      {/* Grades Block */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                            <BarChart3 className="w-3.5 h-3.5 text-[#D8232A]" />
                            Academic Grades
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-slate-900">
                              {gradesSummary.average !== 'N/A' ? `Avg: ${gradesSummary.average}%` : 'Avg: --'}
                            </span>
                            {gradesSummary.standing && (
                              <span className={cn("px-2 py-0.5 rounded-lg text-[9px] font-extrabold border uppercase tracking-wider", gradesSummary.standing.color)}>
                                {gradesSummary.standing.label}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 3 Terms Strip */}
                        <div className="grid grid-cols-3 gap-1.5">
                          {gradesSummary.quarters.map((q) => (
                            <div key={q.name} className="p-1.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                              <p className="text-[9px] font-extrabold text-slate-400 uppercase">{q.name}</p>
                              <p className="text-xs font-black text-slate-800 mt-0.5">{q.grade}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom / Action Buttons */}
                  <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Button
                      onClick={() => onSelectChild(child.id)}
                      className="flex-1 h-9 bg-[#D8232A] hover:bg-[#b91c22] text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>View Full Profile</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </Button>

                    {/* Delete button (enabled only for pending / non-enrolled) */}
                    {!(child.status === 'Enrolled' || child.status === 'Approved') && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer shrink-0"
                        onClick={() => setChildToDelete(child)}
                        title="Delete unconfirmed registration"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── COMPACT TABLE VIEW ── */
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full min-w-[700px] text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-5 w-12 text-center">#</th>
                    <th className="py-3.5 px-5">STUDENT PROFILE</th>
                    <th className="py-3.5 px-5">GRADE & SECTION</th>
                    <th className="py-3.5 px-5">TODAY'S ATTENDANCE</th>
                    <th className="py-3.5 px-5">GENERAL AVERAGE</th>
                    <th className="py-3.5 px-5">STATUS</th>
                    <th className="py-3.5 px-5 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredChildren.map((child, index) => {
                    const todayStatus = getTodayAttendanceStatus(child);
                    const gradesSummary = getChildGradesSummary(child);
                    const displayGrade = (child.gradeLevel || '').toString().toLowerCase().startsWith('grade')
                      ? child.gradeLevel
                      : `Grade ${child.gradeLevel || 'Level'}`;
                    const actualSectionName = child.sectionId ? (sectionsMap[child.sectionId] || child.section) : child.section;
                    const displaySection = (child.status === 'Enrolled' || child.status === 'Approved')
                      ? (actualSectionName
                        ? (actualSectionName.toString().toLowerCase().startsWith('section') ? actualSectionName : `Section ${actualSectionName}`)
                        : 'TBA')
                      : 'TBA';
                    const studentId = child.lrn || 'LRN Pending';

                    return (
                      <tr key={child.id} className="hover:bg-slate-50/60 transition-colors group">
                        <td className="py-4 px-5 text-slate-400 font-bold text-center">
                          {index + 1}
                        </td>
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-red-100 text-[#D8232A] font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                              {child.photoURL ? (
                                <img src={child.photoURL} alt={child.firstName} className="w-full h-full object-cover rounded-xl" />
                              ) : (
                                <span>{child.firstName?.[0]}{child.lastName?.[0]}</span>
                              )}
                            </div>
                            <div>
                              <p className="font-extrabold text-slate-900 uppercase text-xs">
                                {child.lastName}, {child.firstName} {child.middleName ? `${child.middleName.charAt(0)}.` : ''}
                              </p>
                              <p className="text-[11px] text-slate-400 font-medium">
                                LRN: {studentId}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <p className="font-bold text-slate-900 text-xs">{displayGrade}</p>
                          <p className="text-[11px] font-medium text-slate-400">{displaySection}</p>
                        </td>
                        <td className="py-4 px-5">
                          <span className={cn("px-2.5 py-1 rounded-xl text-[10px] font-extrabold border inline-flex items-center gap-1.5", todayStatus.badgeColor)}>
                            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", todayStatus.dotColor)} />
                            {todayStatus.badgeTitle}
                          </span>
                        </td>
                        <td className="py-4 px-5 font-black text-slate-900 text-xs">
                          {gradesSummary.average !== 'N/A' ? `${gradesSummary.average}%` : '--'}
                        </td>
                        <td className="py-4 px-5">
                          {getStatusBadge(child.status)}
                        </td>
                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              onClick={() => onSelectChild(child.id)}
                              className="h-8 px-3.5 bg-[#D8232A] hover:bg-[#b91c22] text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer"
                            >
                              View Profile <ChevronRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                            {!(child.status === 'Enrolled' || child.status === 'Approved') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                onClick={() => setChildToDelete(child)}
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Delete Modal Confirmation */}
      {childToDelete && (
        <Dialog open={!!childToDelete} onOpenChange={() => setChildToDelete(null)}>
          <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 text-center space-y-4">
            <DialogHeader className="space-y-2">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <DialogTitle className="text-lg font-black text-slate-900">Delete Student Record?</DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-medium">
                Are you sure you want to remove <span className="font-bold text-slate-900">{childToDelete.firstName} {childToDelete.lastName}</span>? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 sm:justify-center pt-2">
              <Button variant="outline" onClick={() => setChildToDelete(null)} className="rounded-xl text-xs font-bold">
                Cancel
              </Button>
              <Button onClick={handleDeleteConfirm} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold">
                Delete Record
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default MyChildrenView;
