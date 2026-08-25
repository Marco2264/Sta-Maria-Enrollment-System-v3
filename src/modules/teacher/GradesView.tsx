import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/Dialog';
import { Label } from '../../components/ui/Label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../../components/ui/Table';
import {
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Plus,
  Star,
  Lock,
  Edit3,
  BookOpen,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Send,
  Printer,
  LockOpen,
  Scale,
  Search,
  Users,
  GraduationCap,
  Sparkles,
  Check,
  RotateCcw,
  BarChart3,
  CalendarDays,
  FileSpreadsheet,
  Award
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTeacherData } from '../../lib/teacherData';
import { cn } from '../../components/ui/utils';

// =========================================================================
// SECTION DASHBOARD CARD (LANDING VIEW)
// =========================================================================
function SectionDashboardCard({ section, onOpen }: { section: any; onOpen: () => void }) {
  const [stats, setStats] = useState({ studentCount: 0, progress: 0, subjectProgress: {} as Record<string, number> });
  const [loadingCard, setLoadingCard] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [enrolledSnap, configsSnap] = await Promise.all([
          getDocs(query(
            collection(db, 'enrollments'),
            where('sectionId', '==', section.sectionId),
            where('status', '==', 'Enrolled')
          )),
          getDocs(query(
            collection(db, 'gradeConfigurations'),
            where('sectionId', '==', section.sectionId)
          ))
        ]);

        const sectionStudents = enrolledSnap.docs.map(d => d.data());
        const configsList = configsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

        let totalExpected = 0;
        let totalEncoded = 0;
        const subjProg: Record<string, number> = {};

        const gradeKey = section.gradeLevel ? section.gradeLevel.trim().replace(/Grade /i, 'Grade ') : 'Grade 6';

        const allSubjects = (section.taughtSubjectCodes && section.taughtSubjectCodes.length > 0)
          ? section.taughtSubjectCodes
          : (section.advisedSubjectCodes || []);

        allSubjects.forEach((code: any) => {
          const terms = ['Term 1', 'Term 2', 'Finals'];
          const activeCols = configsList.filter((c: any) => c.subjectCode === code && terms.includes(c.term) && c.type !== 'submission');

          let expectedForSubj = activeCols.length * sectionStudents.length;
          let encodedForSubj = 0;

          if (expectedForSubj > 0) {
            sectionStudents.forEach(s => {
              const subjData = s.grades?.[gradeKey]?.[code];
              if (subjData && typeof subjData === 'object') {
                if (subjData.finalGradeOverride !== undefined && subjData.finalGradeOverride !== null && subjData.finalGradeOverride !== '') {
                  encodedForSubj += activeCols.length;
                } else {
                  activeCols.forEach(col => {
                    const termData = subjData[col.term];
                    if (termData && typeof termData === 'object') {
                      const val = termData[col.id];
                      if (val !== undefined && val !== null && val !== '') {
                        encodedForSubj++;
                      }
                    }
                  });
                }
              }
            });
          }

          totalExpected += expectedForSubj;
          totalEncoded += encodedForSubj;
          subjProg[code] = expectedForSubj > 0 ? Math.round((encodedForSubj / expectedForSubj) * 100) : 0;
        });

        const overall = totalExpected > 0 ? Math.round((totalEncoded / totalExpected) * 100) : 0;

        setStats({
          studentCount: sectionStudents.length,
          progress: overall,
          subjectProgress: subjProg
        });
      } catch (err) {
        console.error("Error loading stats for section", section.sectionId, err);
      } finally {
        setLoadingCard(false);
      }
    }

    loadStats();
  }, [section]);

  const allSubjects = Array.from(new Set([...(section.taughtSubjectCodes || []), ...(section.advisedSubjectCodes || [])]));

  return (
    <div className="bg-white border border-slate-200/80 hover:border-[#D8232A]/30 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
      {/* Top Section Header */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#D8232A]">Section</span>
            <h3 className="text-base font-extrabold text-slate-900 group-hover:text-[#D8232A] transition-colors leading-tight">
              {section.gradeLevel} — {section.name}
            </h3>
          </div>
          {section.isAdvisor ? (
            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[10px] font-bold uppercase tracking-wider rounded-lg px-2.5 py-0.5 shrink-0">
              <Star className="w-3 h-3 mr-1 fill-current" /> Adviser
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[10px] font-bold uppercase tracking-wider rounded-lg px-2.5 py-0.5 shrink-0">
              Subject Section
            </Badge>
          )}
        </div>

        {/* Subjects List */}
        <div className="mb-5">
          <div className="flex items-center gap-1.5 text-slate-400 mb-2.5 text-[10px] font-bold uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5" /> Assigned Subjects
          </div>

          {loadingCard ? (
            <div className="flex gap-2">
              <div className="h-6 w-20 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-6 w-20 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto pr-1">
              {allSubjects.map((code: any) => {
                const progress = stats.subjectProgress[code] || 0;
                const isTaught = (section.taughtSubjectCodes || []).includes(code);
                
                return (
                  <div
                    key={code}
                    className={cn(
                      "rounded-lg px-2.5 py-1 flex items-center gap-1.5 text-xs font-semibold border transition-all",
                      isTaught
                        ? "bg-slate-50 border-slate-200/70 text-slate-700"
                        : "bg-slate-50/50 border-slate-200/40 text-slate-400"
                    )}
                  >
                    <span className={cn(
                      "w-1.5 h-1.5 rounded-full shrink-0",
                      progress === 100 ? "bg-emerald-500" :
                      progress > 0 ? "bg-amber-500" : "bg-slate-300"
                    )} />
                    <span>{code}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({progress}%)</span>
                  </div>
                );
              })}
              {allSubjects.length === 0 && (
                <span className="text-slate-400 text-xs italic">No specific subjects assigned</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Progress & Bottom Button */}
      <div className="pt-3 border-t border-slate-100 space-y-3">
        <div>
          <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-500 mb-1.5">
            <span className="uppercase tracking-wider text-[10px]">Encoding Progress</span>
            <span className="text-slate-900 font-mono font-extrabold">{loadingCard ? '...' : `${stats.progress}%`}</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                stats.progress === 100 ? "bg-emerald-500" : "bg-[#D8232A]"
              )}
              style={{ width: loadingCard ? '0%' : `${stats.progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs font-medium text-slate-500">
            <span className="font-bold text-slate-800">{loadingCard ? '-' : stats.studentCount}</span> Learners
          </span>
          <Button
            onClick={onOpen}
            size="sm"
            className="h-8 px-3.5 bg-[#D8232A] hover:bg-[#b91c22] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer border-none"
          >
            <span>Open Gradebook</span>
            <ArrowLeft className="w-3 h-3 rotate-180" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// MAIN GRADES VIEW COMPONENT
// =========================================================================
export function GradesView() {
  const { 
    students, 
    attendance, 
    updateDynamicStudentGrade, 
    addGradeColumn, 
    editGradeColumn, 
    deleteGradeColumn, 
    submitGradesToAdviser, 
    requestUnlockGrades, 
    grantUnlockGrades, 
    gradeConfigurations, 
    loading, 
    currentGradeLevel, 
    currentSectionName, 
    isAdvisorForCurrentSection, 
    assignedSections, 
    setCurrentSection, 
    currentSection, 
    allTeachers, 
    subjects 
  } = useTeacherData();

  const enrolled = useMemo(() => students.filter((s) => s.status !== 'Pending' && s.status !== 'Rejected'), [students]);

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 25;
  const totalPages = Math.ceil(enrolled.length / rowsPerPage);

  const [isGradebookOpen, setIsGradebookOpen] = useState(false);
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<'Term 1' | 'Term 2' | 'Finals'>('Term 1');
  const [searchQuery, setSearchQuery] = useState('');

  const [localGrades, setLocalGrades] = useState<Record<string, Record<string, string>>>({});
  const [isAttendance, setIsAttendance] = useState(false);
  const [attStartDate, setAttStartDate] = useState('');
  const [attEndDate, setAttEndDate] = useState('');

  const [editColIsAttendance, setEditColIsAttendance] = useState(false);
  const [editColStartDate, setEditColStartDate] = useState('');
  const [editColEndDate, setEditColEndDate] = useState('');
  const [saved, setSaved] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Column Add & Edit Dialogs
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColWeight, setNewColWeight] = useState('');

  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editColName, setEditColName] = useState('');
  const [editColWeight, setEditColWeight] = useState('');

  // Lists of taught/advised codes
  const currentSectionData = (assignedSections || []).find(s => s.sectionId === currentSection);
  const taughtSubjects = currentSectionData?.taughtSubjectCodes || [];
  const advisedSubjects = currentSectionData?.advisedSubjectCodes || [];
  const isAdvisor = Boolean(isAdvisorForCurrentSection || currentSectionData?.isAdvisor);

  // Active configurations for the selected subject and term
  const activeColumns = useMemo(() => {
    return gradeConfigurations.filter(c => c.subjectCode === selectedSubjectCode && c.term === selectedTerm);
  }, [gradeConfigurations, selectedSubjectCode, selectedTerm]);

  const gradeConfigs = useMemo(() => {
    return activeColumns.filter(c => c.type !== 'submission');
  }, [activeColumns]);

  const submissionStatus = useMemo(() => {
    const subCol = activeColumns.find(c => c.type === 'submission');
    return subCol ? (subCol.status as 'draft' | 'pending' | 'locked') : 'draft';
  }, [activeColumns]);

  const remainingWeight = useMemo(() => {
    const allocated = gradeConfigs.reduce((acc, c) => acc + c.weight, 0);
    return Math.max(0, 100 - allocated);
  }, [gradeConfigs]);

  const currentTotalWeight = useMemo(() => {
    return gradeConfigs.reduce((acc, c) => acc + c.weight, 0);
  }, [gradeConfigs]);

  const isAuthorized = useMemo(() => {
    return taughtSubjects.includes(selectedSubjectCode) && submissionStatus !== 'locked';
  }, [taughtSubjects, selectedSubjectCode, submissionStatus]);

  // Load Firestore grade values into local state and compute attendance values
  useEffect(() => {
    if (loading || !selectedSubjectCode || selectedSubjectCode === 'MASTER_SHEET') return;
    const gradesMap: Record<string, Record<string, string>> = {};
    const gradeKey = currentGradeLevel ? currentGradeLevel.replace(/Grade /i, 'Grade ') : 'Grade 6';
    const updatesToMake: Array<{ studentId: string, columnId: string, val: number }> = [];

    enrolled.forEach(s => {
      const studentGrades = (s.grades as Record<string, any>)?.[gradeKey]?.[selectedSubjectCode]?.[selectedTerm] || {};
      gradesMap[s.id] = {};
      gradeConfigs.forEach(col => {
        if (col.isAttendance && col.startDate && col.endDate) {
          const rangeDates = Array.from(new Set(
            attendance
              .filter(a => a.sectionId === currentSection && a.date >= col.startDate && a.date <= col.endDate)
              .map(a => a.date)
          ));
          const presentDays = attendance.filter(a =>
            a.studentId === s.id &&
            a.date >= col.startDate &&
            a.date <= col.endDate &&
            (a.status === 'Present' || a.status === 'Late' || (a as any).amStatus === 'Present' || (a as any).amStatus === 'Late')
          ).length;
          const score = rangeDates.length > 0 ? (presentDays / rangeDates.length) * 100 : 0;
          const formattedScore = parseFloat(score.toFixed(1));
          gradesMap[s.id][col.id] = formattedScore.toString();

          const dbVal = studentGrades[col.id];
          if (dbVal === undefined || dbVal === null || parseFloat(dbVal.toString()) !== formattedScore) {
            updatesToMake.push({ studentId: s.id, columnId: col.id, val: formattedScore });
          }
        } else {
          gradesMap[s.id][col.id] = (studentGrades[col.id] !== undefined && studentGrades[col.id] !== null) ? studentGrades[col.id].toString() : '';
        }
      });
    });

    setLocalGrades(gradesMap);
    setSaved(true);

    if (updatesToMake.length > 0) {
      Promise.all(updatesToMake.map(up =>
        updateDynamicStudentGrade(up.studentId, selectedSubjectCode, selectedTerm, up.columnId, up.val)
      )).catch(err => console.error("Error auto-updating attendance grades:", err));
    }
  }, [loading, enrolled, selectedSubjectCode, selectedTerm, gradeConfigs, currentGradeLevel, attendance, currentSection]);

  // Filter and pagination
  const filteredEnrolled = useMemo(() => {
    if (!searchQuery.trim()) return enrolled;
    const q = searchQuery.toLowerCase();
    return enrolled.filter(s =>
      `${s.firstName} ${s.lastName} ${s.lrn}`.toLowerCase().includes(q)
    );
  }, [enrolled, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedSubjectCode, selectedTerm]);

  const paginatedEnrolled = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredEnrolled.slice(start, start + rowsPerPage);
  }, [filteredEnrolled, currentPage]);

  const handleCellChange = (studentId: string, columnId: string, val: string) => {
    const rawVal = val.trim();
    if (rawVal !== '') {
      const parsed = parseFloat(rawVal);
      if (isNaN(parsed) || parsed < 0 || parsed > 100) return;
    }
    setLocalGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [columnId]: val
      }
    }));
    setSaved(false);
  };

  const handleAutoFill = (columnId: string, value: string) => {
    const rawVal = value.trim();
    if (rawVal !== '') {
      const parsed = parseFloat(rawVal);
      if (isNaN(parsed) || parsed < 0 || parsed > 100) return;
    }
    const updated = { ...localGrades };
    enrolled.forEach(s => {
      if (!updated[s.id]) updated[s.id] = {};
      updated[s.id][columnId] = value;
    });
    setLocalGrades(updated);
    setSaved(false);
  };

  const handleBlur = async (studentId: string, columnId: string, val: string) => {
    if (!isAuthorized) return;
    const trimmed = (val || '').trim();

    setIsSaving(true);
    setSaved(false);
    try {
      if (trimmed === '') {
        await updateDynamicStudentGrade(studentId, selectedSubjectCode, selectedTerm, columnId, null);
      } else {
        const num = parseFloat(trimmed);
        if (!isNaN(num)) {
          await updateDynamicStudentGrade(studentId, selectedSubjectCode, selectedTerm, columnId, num);
        }
      }
      setSaved(true);
    } catch (err) {
      console.error("Auto-save error:", err);
      setSaved(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveGrades = async () => {
    setIsSaving(true);
    const loadingToast = toast.loading("Saving grades...");
    try {
      const promises: Promise<void>[] = [];
      enrolled.forEach(s => {
        const studentGrades = localGrades[s.id] || {};
        gradeConfigs.forEach(col => {
          const val = studentGrades[col.id];
          const gradeVal = val !== undefined && val !== '' ? parseFloat(val) : null;
          promises.push(
            updateDynamicStudentGrade(s.id, selectedSubjectCode, selectedTerm, col.id, gradeVal)
          );
        });
      });

      await Promise.all(promises);
      toast.success("All grades saved successfully!", { id: loadingToast });
      setSaved(true);
    } catch (err) {
      console.error("Failed to save changes", err);
      toast.error("Failed to save grades.", { id: loadingToast });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddColumn = async () => {
    const weight = parseFloat(newColWeight);
    if (!newColName.trim() || !newColWeight || isNaN(weight)) return;
    if (weight > remainingWeight) {
      toast.error(`Maximum allowed weight for this column is ${remainingWeight}%.`);
      return;
    }
    if (isAttendance && (!attStartDate || !attEndDate)) {
      toast.error("Please select start and end dates for attendance tracking.");
      return;
    }
    await addGradeColumn(
      selectedSubjectCode,
      selectedTerm,
      newColName.trim(),
      weight,
      isAttendance,
      attStartDate,
      attEndDate
    );
    setIsAddColumnOpen(false);
    setNewColName('');
    setNewColWeight('');
    setIsAttendance(false);
    setAttStartDate('');
    setAttEndDate('');
    toast.success("Grading criteria created!");
  };

  const handleEditColumn = async () => {
    if (!editingColumnId) return;
    const weight = parseFloat(editColWeight);
    if (!editColName.trim() || !editColWeight || isNaN(weight)) return;

    const editingCol = gradeConfigurations.find(c => c.id === editingColumnId);
    const oldWeight = editingCol?.weight || 0;
    const maxWeight = remainingWeight + oldWeight;

    if (weight > maxWeight) {
      toast.error(`Maximum allowed weight is ${maxWeight}%.`);
      return;
    }

    if (editColIsAttendance && (!editColStartDate || !editColEndDate)) {
      toast.error("Please select start and end dates.");
      return;
    }

    await editGradeColumn(
      editingColumnId,
      editColName.trim(),
      weight,
      editColIsAttendance ? editColStartDate : undefined,
      editColIsAttendance ? editColEndDate : undefined
    );
    setEditingColumnId(null);
    setEditColIsAttendance(false);
    setEditColStartDate('');
    setEditColEndDate('');
    toast.success("Grading criteria updated!");
  };

  const openEditModal = (col: any) => {
    setEditingColumnId(col.id);
    setEditColName(col.name);
    setEditColWeight(col.weight.toString());
    setEditColIsAttendance(col.isAttendance || false);
    setEditColStartDate(col.startDate || '');
    setEditColEndDate(col.endDate || '');
  };

  const formatStudentName = (firstName: string | undefined, lastName: string | undefined) => {
    const first = (firstName || '').trim();
    const last = (lastName || '').trim();
    if (!last) return first || 'Unnamed Student';
    if (!first) return last || 'Unnamed Student';
    return `${last}, ${first}`;
  };

  // =========================================================================
  // VIEW 1: LANDING SCREEN - ASSIGNED SECTIONS OVERVIEW
  // =========================================================================
  if (!isGradebookOpen) {
    const totalTaughtSubjectsCount = assignedSections.reduce((acc, s) => acc + (s.taughtSubjectCodes?.length || 0), 0);

    return (
      <div className="flex flex-col h-full bg-[#f8fafc]">
        {/* Top Header */}
        <header className="h-[72px] px-6 sm:px-8 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-xs sticky top-0 z-30">
          <div className="flex flex-row items-center justify-between gap-4 w-full max-w-[1600px] mx-auto">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-[#D8232A] shadow-2xs">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-black tracking-tight text-slate-900">
                    Gradebook & Grading Sheets
                  </h1>
                  <Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5">
                    {assignedSections.length} {assignedSections.length === 1 ? 'Section' : 'Sections'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 font-medium hidden sm:block">
                  Select an assigned section below to manage quarterly scores, term criteria, and master averages
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto w-full">
          
          {/* Quick KPI Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/70 p-4.5 shadow-xs flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-red-50 text-[#D8232A] flex items-center justify-center font-bold shrink-0 border border-red-100/50">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Assigned Sections</p>
                <p className="text-xl sm:text-2xl font-black text-slate-900">{assignedSections.length}</p>
                <p className="text-[10.5px] font-semibold text-slate-400">Active class loads</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/70 p-4.5 shadow-xs flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0 border border-blue-100/50">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Teaching Subjects</p>
                <p className="text-xl sm:text-2xl font-black text-blue-700">{totalTaughtSubjectsCount}</p>
                <p className="text-[10.5px] font-semibold text-blue-600">Assigned course subjects</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/70 p-4.5 shadow-xs flex items-center gap-3.5 col-span-2 sm:col-span-1">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0 border border-emerald-100/50">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Active Section</p>
                <p className="text-base sm:text-lg font-black text-slate-900 truncate max-w-[180px]">{currentSectionName || currentGradeLevel || 'Select Section'}</p>
                <p className="text-[10.5px] font-semibold text-emerald-600 truncate">{currentGradeLevel}</p>
              </div>
            </div>
          </div>

          {/* Section Cards Grid */}
          {assignedSections.length === 0 ? (
            <div className="border border-dashed border-slate-200 rounded-2xl p-16 text-center bg-white">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700">No Assigned Sections Found</h3>
              <p className="text-xs text-slate-500 mt-1.5 max-w-md mx-auto">
                You currently do not have any teaching sections assigned for this academic term. Please contact the administrator.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {assignedSections.map(section => (
                <SectionDashboardCard
                  key={section.sectionId}
                  section={section}
                  onOpen={() => {
                    setCurrentSection(section.sectionId);
                    const firstSubj = (section.taughtSubjectCodes && section.taughtSubjectCodes.length > 0)
                      ? section.taughtSubjectCodes[0]
                      : (section.advisedSubjectCodes && section.advisedSubjectCodes.length > 0)
                        ? section.advisedSubjectCodes[0]
                        : '';
                    setSelectedSubjectCode(firstSubj);
                    setIsGradebookOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: ACTIVE GRADEBOOK WORKSPACE
  // =========================================================================
  const terms = ['Term 1', 'Term 2', 'Finals'] as const;
  const allAvailableSubjects = Array.from(new Set([...taughtSubjects, ...advisedSubjects]));

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      
      {/* 1. Header Bar with Section Breadcrumbs, Save Status & Mode Switcher */}
      <header className="h-[72px] px-6 sm:px-8 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-xs sticky top-0 z-30">
        <div className="flex flex-row items-center justify-between gap-4 w-full max-w-[1600px] mx-auto">
          
          {/* Back Button & Section Info */}
          <div className="flex items-center gap-3.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setIsGradebookOpen(false);
                setSelectedSubjectCode('');
              }}
              className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
              title="Back to Assigned Sections"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-slate-900">
                  {currentGradeLevel} — {currentSectionName}
                </h1>
                {isAdvisor ? (
                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5">
                    <Star className="w-3 h-3 mr-1 fill-current" /> Adviser
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5">
                    Subject View
                  </Badge>
                )}

                {/* Auto-save Status Indicator */}
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100/80 border border-slate-200/50 text-[10px] font-bold select-none">
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
                      <span className="text-amber-700">Unsaved Changes</span>
                    </>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                {selectedSubjectCode === 'MASTER_SHEET' 
                  ? 'Master General Weighted Average (GWA) summary matrix across all subjects' 
                  : `Grading Sheet for ${selectedSubjectCode || 'Subject'} • ${selectedTerm}`}
              </p>
            </div>
          </div>

          {/* Right Header Actions (View Mode Switcher + Print) */}
          <div className="flex items-center gap-2.5 shrink-0">
            {isAdvisor && (
              <div className="flex items-center p-1 bg-slate-100/80 rounded-xl border border-slate-200/50">
                <button
                  onClick={() => {
                    if (selectedSubjectCode === 'MASTER_SHEET') {
                      setSelectedSubjectCode(taughtSubjects[0] || advisedSubjects[0] || '');
                    }
                  }}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border-none",
                    selectedSubjectCode !== 'MASTER_SHEET'
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-500 hover:text-slate-800 bg-transparent"
                  )}
                >
                  <BookOpen className="w-3.5 h-3.5 text-[#D8232A]" />
                  <span>Subject Matrix</span>
                </button>
                <button
                  onClick={() => setSelectedSubjectCode('MASTER_SHEET')}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border-none",
                    selectedSubjectCode === 'MASTER_SHEET'
                      ? "bg-white text-[#D8232A] shadow-2xs"
                      : "text-slate-500 hover:text-slate-800 bg-transparent"
                  )}
                >
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>Master GWA</span>
                </button>
              </div>
            )}

            {selectedSubjectCode === 'MASTER_SHEET' && (
              <Button
                variant="outline"
                onClick={() => window.print()}
                className="h-10 px-3.5 rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Print Report</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* 2. Workspace Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-5 max-w-[1600px] mx-auto w-full">
        
        {/* Subject & Term Navigation Bar (Visible in Subject Mode) */}
        {selectedSubjectCode !== 'MASTER_SHEET' && (
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            
            {/* Top Row: Terms & Weight summary */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              {/* Term Pills */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl w-fit">
                {terms.map(term => (
                  <button
                    key={term}
                    onClick={() => setSelectedTerm(term)}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border-none",
                      selectedTerm === term
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-900 bg-transparent"
                    )}
                  >
                    {term}
                  </button>
                ))}
              </div>

              {/* Term Weight Status Pill */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <div className={cn(
                  "px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5",
                  currentTotalWeight === 100 
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                    : currentTotalWeight > 100 
                    ? "bg-rose-50 text-rose-700 border-rose-200" 
                    : "bg-amber-50 text-amber-700 border-amber-200"
                )}>
                  <Scale className="w-3.5 h-3.5" />
                  <span>Term Criteria Weight:</span>
                  <span className="font-mono font-extrabold">{currentTotalWeight}% / 100%</span>
                </div>
              </div>
            </div>

            {/* Bottom Row: Horizontal Subject Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1">Subjects:</span>
              
              {allAvailableSubjects.map(code => {
                const isTaught = taughtSubjects.includes(code);
                const isSelected = selectedSubjectCode === code;

                return (
                  <button
                    key={code}
                    onClick={() => setSelectedSubjectCode(code)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer border",
                      isSelected
                        ? "bg-[#D8232A] text-white border-[#D8232A] shadow-xs"
                        : isTaught
                        ? "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80"
                        : "bg-slate-50/50 hover:bg-slate-100/60 text-slate-400 border-slate-200/50"
                    )}
                  >
                    {!isTaught && <Lock className={cn("w-3 h-3", isSelected ? "text-white/80" : "text-slate-400")} />}
                    <span>{code}</span>
                  </button>
                );
              })}

              {allAvailableSubjects.length === 0 && (
                <span className="text-xs text-slate-400 italic">No subjects configured for this section</span>
              )}
            </div>
          </div>
        )}

        {/* 3. Main View Render: Master Sheet vs Subject Gradebook */}
        {selectedSubjectCode === 'MASTER_SHEET' ? (
          
          /* ========================================================================= */
          /* MASTER SHEET / GWA MATRIX OVERVIEW                                       */
          /* ========================================================================= */
          <div className="space-y-4">
            
            {/* Quick KPI Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200/70 p-4.5 shadow-xs flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-red-50 text-[#D8232A] flex items-center justify-center font-bold shrink-0 border border-red-100/50">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Report Type</p>
                  <p className="text-lg sm:text-xl font-black text-slate-900">Master GWA</p>
                  <p className="text-[10.5px] font-semibold text-slate-400">DepEd Summary Matrix</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/70 p-4.5 shadow-xs flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0 border border-blue-100/50">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Learners Ranked</p>
                  <p className="text-xl sm:text-2xl font-black text-blue-700">{filteredEnrolled.length}</p>
                  <p className="text-[10.5px] font-semibold text-blue-600">Active classroom roster</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/70 p-4.5 shadow-xs flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0 border border-emerald-100/50">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Class Section</p>
                  <p className="text-base sm:text-lg font-black text-slate-900 truncate max-w-[150px]">{currentSectionName || currentGradeLevel || 'N/A'}</p>
                  <p className="text-[10.5px] font-semibold text-emerald-600 truncate">{currentGradeLevel}</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/70 p-4.5 shadow-xs flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0 border border-indigo-100/50">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Grading Terms</p>
                  <p className="text-xl sm:text-2xl font-black text-indigo-700">3 Terms</p>
                  <p className="text-[10.5px] font-semibold text-slate-400">Term 1 • Term 2 • Finals</p>
                </div>
              </div>
            </div>

            {/* Master Sheet Table Container */}
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
              
              {/* Search Header */}
              <div className="p-4 bg-slate-50/50 border-b border-slate-200/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 sm:max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search student by name or LRN..."
                    className="pl-9 h-10 rounded-xl bg-white border-slate-200/80 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-red-500/20 focus:border-[#D8232A] transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-[#D8232A]/10 text-[#D8232A] uppercase tracking-wider border border-[#D8232A]/20 select-none">
                    Total: {enrolled.length} Learners
                  </span>
                </div>
              </div>

              {/* Matrix Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/90 border-b border-slate-200/70 select-none">
                    <TableRow className="hover:bg-transparent border-none h-11">
                      <TableHead className="w-12 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 pl-4">#</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-500 min-w-[220px] sticky left-0 bg-slate-50/90 z-20 shadow-[1px_0_0_0_#e2e8f0]">
                        Learner Name
                      </TableHead>
                      {allAvailableSubjects.map(code => (
                        <TableHead key={code} className="text-center font-bold text-[10px] uppercase tracking-wider text-slate-600 min-w-[90px]" title={code}>
                          <div className="truncate px-1">{code}</div>
                        </TableHead>
                      ))}
                      <TableHead className="font-extrabold text-[10px] uppercase tracking-wider text-[#D8232A] text-center pr-6 min-w-[100px] border-l border-slate-200 sticky right-0 bg-slate-50/90 z-20 shadow-[-1px_0_0_0_#e2e8f0]">
                        General Avg (GWA)
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedEnrolled.map((s, idx) => {
                      const gradeKey = currentGradeLevel ? currentGradeLevel.replace(/Grade /i, 'Grade ') : 'Grade 6';
                      let validSubjects = 0;
                      let totalGWA = 0;

                      const subjGrades = allAvailableSubjects.map(code => {
                        const subjectData = (s.grades as Record<string, any>)?.[gradeKey]?.[code] || {};
                        const finalOverride = subjectData.finalGradeOverride;

                        let subjectFinal: number | null = null;

                        if (finalOverride !== undefined && finalOverride !== null) {
                          subjectFinal = Number(finalOverride);
                        } else {
                          const termGrades = terms.map(term => {
                            const cols = gradeConfigurations.filter(c => c.subjectCode === code && c.term === term && c.type !== 'submission');
                            if (cols.length === 0) return null;
                            let termTotal = 0;
                            let hasGrade = false;
                            const termData = subjectData[term] || {};
                            cols.forEach(col => {
                              const val = termData[col.id];
                              if (val !== undefined && val !== '') {
                                termTotal += (parseFloat(val) * (col.weight / 100));
                                hasGrade = true;
                              }
                            });
                            return hasGrade ? termTotal : null;
                          }).filter(v => v !== null) as number[];

                          if (termGrades.length > 0) {
                            subjectFinal = termGrades.reduce((a, b) => a + b, 0) / termGrades.length;
                          }
                        }

                        if (subjectFinal !== null) {
                          totalGWA += subjectFinal;
                          validSubjects++;
                        }

                        return { code, value: subjectFinal, isOverride: finalOverride !== undefined && finalOverride !== null };
                      });

                      const gwa = validSubjects > 0 ? (totalGWA / validSubjects).toFixed(2) : '—';
                      const isFailing = validSubjects > 0 && (totalGWA / validSubjects) < 75;

                      return (
                        <TableRow key={s.id} className={cn("border-b border-slate-100 hover:bg-slate-50/60 transition-colors h-14", isFailing && "bg-rose-50/20")}>
                          <TableCell className="text-center font-bold text-slate-400 text-xs pl-4">
                            {(currentPage - 1) * rowsPerPage + idx + 1}
                          </TableCell>
                          <TableCell className="sticky left-0 bg-white z-20 shadow-[1px_0_0_0_#e2e8f0] py-3">
                            <p className={cn("font-bold text-xs sm:text-sm", isFailing ? "text-rose-700" : "text-slate-900")}>
                              {formatStudentName(s.firstName, s.lastName)}
                            </p>
                            <p className="text-[10.5px] font-mono text-slate-400">{s.lrn || 'No LRN'}</p>
                          </TableCell>
                          {subjGrades.map(sg => (
                            <TableCell key={sg.code} className="text-center font-mono text-xs font-semibold py-3">
                              {sg.value !== null ? (
                                <span className={cn(
                                  "px-2 py-0.5 rounded-md font-bold",
                                  sg.value < 75 ? "bg-rose-50 text-rose-700" : "text-slate-800"
                                )}>
                                  {Number(sg.value).toFixed(1)}
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </TableCell>
                          ))}
                          <TableCell className="text-center pr-6 py-3 font-mono font-black text-sm border-l border-slate-200 sticky right-0 bg-slate-50/80 z-20 shadow-[-1px_0_0_0_#e2e8f0]">
                            <span className={cn(
                              "px-2.5 py-1 rounded-lg",
                              gwa !== '—' && Number(gwa) >= 75 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                              gwa !== '—' ? "bg-rose-50 text-rose-700 border border-rose-200" : "text-slate-400"
                            )}>
                              {gwa}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-bold">Page {currentPage} of {totalPages}</span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="border-slate-200 text-slate-600 bg-white font-bold rounded-xl text-xs h-8 px-3"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="border-slate-200 text-slate-600 bg-white font-bold rounded-xl text-xs h-8 px-3"
                    >
                      Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (

          /* ========================================================================= */
          /* SUBJECT GRADEBOOK MATRIX                                                  */
          /* ========================================================================= */
          <div className="space-y-4">
            
            {/* Table Container */}
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
              
              {/* Action Toolbar */}
              <div className="p-4 bg-slate-50/50 border-b border-slate-200/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                  <div className="relative flex-1 sm:max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search student by name or LRN..."
                      className="pl-9 h-10 rounded-xl bg-white border-slate-200/80 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-red-500/20 focus:border-[#D8232A] transition-all"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn(
                      "text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full",
                      submissionStatus === 'locked' ? 'bg-red-50 text-[#D8232A] border-red-200' :
                      submissionStatus === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-slate-100 text-slate-600 border-slate-200'
                    )}>
                      {submissionStatus === 'locked' ? 'Locked (Approved)' : submissionStatus === 'pending' ? 'Pending Approval' : 'Draft Mode'}
                    </Badge>
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {isAuthorized && (
                    <Button
                      size="sm"
                      onClick={() => setIsAddColumnOpen(true)}
                      className="h-10 px-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all border-none"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Criteria</span>
                    </Button>
                  )}

                  {taughtSubjects.includes(selectedSubjectCode) && submissionStatus === 'draft' && (
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (!saved) {
                          toast.error("Please save your changes before submitting.");
                          return;
                        }
                        if (currentTotalWeight !== 100) {
                          toast.error("Overall criteria weight must equal exactly 100% before submission.");
                          return;
                        }
                        if (window.confirm("Submit grades for lock and advisor approval? You will lose editing access until unlocked.")) {
                          const loadingToast = toast.loading("Submitting grades...");
                          try {
                            await submitGradesToAdviser(selectedSubjectCode, selectedTerm);
                            toast.success("Grades submitted to adviser!", { id: loadingToast });
                          } catch (error) {
                            toast.error("Failed to submit grades.", { id: loadingToast });
                          }
                        }
                      }}
                      className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all border-none"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Grades</span>
                    </Button>
                  )}

                  {taughtSubjects.includes(selectedSubjectCode) && submissionStatus === 'pending' && (
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (window.confirm("Recall draft submission to edit scores again?")) {
                          try {
                            await requestUnlockGrades(selectedSubjectCode, selectedTerm);
                            toast.success("Draft recalled. You may now edit.");
                          } catch (error) {
                            toast.error("Failed to recall draft.");
                          }
                        }
                      }}
                      className="h-10 px-3.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all border-none"
                    >
                      <LockOpen className="w-3.5 h-3.5" />
                      <span>Recall Draft</span>
                    </Button>
                  )}

                  {isAdvisor && submissionStatus === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={async () => {
                          if (window.confirm("Approve and Lock these grades? Subject teacher will lose editing access.")) {
                            const loadingToast = toast.loading("Locking grades...");
                            try {
                              const submissionCol = activeColumns.find(c => c.type === 'submission');
                              if (submissionCol) {
                                await updateDoc(doc(db, 'gradeConfigurations', submissionCol.id), { status: 'locked' });
                                toast.success("Grades approved and locked!", { id: loadingToast });
                              }
                            } catch (e) {
                              toast.error("Failed to lock.", { id: loadingToast });
                            }
                          }
                        }}
                        className="h-10 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all border-none"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Approve & Lock</span>
                      </Button>
                      <Button
                        size="sm"
                        onClick={async () => {
                          if (window.confirm("Unlock/reject grades back to subject teacher for revisions?")) {
                            const loadingToast = toast.loading("Unlocking grades...");
                            try {
                              const submissionCol = activeColumns.find(c => c.type === 'submission');
                              if (submissionCol) {
                                await updateDoc(doc(db, 'gradeConfigurations', submissionCol.id), { status: 'draft' });
                                toast.success("Grades unlocked for teacher revisions.", { id: loadingToast });
                              }
                            } catch (e) {
                              toast.error("Failed to unlock.", { id: loadingToast });
                            }
                          }
                        }}
                        variant="outline"
                        className="h-10 px-3.5 border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-bold rounded-xl text-xs"
                      >
                        <span>Reject/Unlock</span>
                      </Button>
                    </div>
                  )}

                  {isAdvisor && submissionStatus === 'locked' && (
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (window.confirm("Unlock locked grades? Subject teacher will regain edit permissions.")) {
                          const loadingToast = toast.loading("Unlocking grades...");
                          try {
                            const submissionCol = activeColumns.find(c => c.type === 'submission');
                            if (submissionCol) {
                              await updateDoc(doc(db, 'gradeConfigurations', submissionCol.id), { status: 'draft' });
                              toast.success("Grades unlocked!", { id: loadingToast });
                            }
                          } catch (e) {
                            toast.error("Failed to unlock.", { id: loadingToast });
                          }
                        }
                      }}
                      className="h-10 px-3.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all border-none"
                    >
                      <LockOpen className="w-3.5 h-3.5" />
                      <span>Unlock Grades</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/90 border-b border-slate-200/70 select-none">
                    <TableRow className="hover:bg-transparent border-none h-12">
                      <TableHead className="w-12 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 pl-4">#</TableHead>
                      <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-500 min-w-[220px] sticky left-0 bg-slate-50/90 z-20 shadow-[1px_0_0_0_#e2e8f0]">
                        Learner Name
                      </TableHead>
                      {gradeConfigs.map(col => (
                        <TableHead key={col.id} className="py-3 text-center min-w-[130px] font-bold relative group/th">
                          <div className="flex flex-col items-center">
                            <span className="truncate max-w-[120px] font-bold text-slate-800 text-xs block" title={col.name}>{col.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono font-semibold">({col.weight}%)</span>
                          </div>
                          {isAuthorized && (
                            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 hidden group-hover/th:flex items-center gap-1 bg-white px-1.5 py-1 rounded-lg border border-slate-200 shadow-xs">
                              <button onClick={() => openEditModal(col)} className="text-slate-500 hover:text-blue-600 p-0.5 border-none bg-transparent cursor-pointer">
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={async () => {
                                  if (window.confirm(`Delete grading column "${col.name}"? This removes all scores recorded in this column.`)) {
                                    await deleteGradeColumn(col.id);
                                    toast.success("Column deleted!");
                                  }
                                }}
                                className="text-slate-500 hover:text-rose-600 p-0.5 border-none bg-transparent cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </TableHead>
                      ))}
                      <TableHead className="font-extrabold text-[10px] uppercase tracking-wider text-[#D8232A] text-center pr-6 min-w-[110px] border-l border-slate-200 sticky right-0 bg-slate-50/90 z-20 shadow-[-1px_0_0_0_#e2e8f0]">
                        Term Grade
                      </TableHead>
                    </TableRow>

                    {/* Auto-fill Row */}
                    {isAuthorized && gradeConfigs.length > 0 && (
                      <TableRow className="bg-slate-50/60 border-b border-slate-200/80">
                        <TableCell className="text-center font-bold text-[10px] text-slate-400 pl-4">⚡</TableCell>
                        <TableCell className="pl-6 py-2 font-bold text-[11px] text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50/60 z-20 shadow-[1px_0_0_0_#e2e8f0]">
                          Auto-Fill Column
                        </TableCell>
                        {gradeConfigs.map(col => (
                          <TableCell key={col.id} className="py-2 px-2.5">
                            <Input
                              type="number"
                              placeholder="Fill all"
                              disabled={col.isAttendance}
                              onChange={(e) => handleAutoFill(col.id, e.target.value)}
                              className="h-7.5 text-xs font-mono font-semibold text-center border-slate-200 rounded-lg bg-white shadow-2xs focus:ring-1 focus:ring-blue-500"
                              max="100"
                              min="0"
                            />
                          </TableCell>
                        ))}
                        <TableCell className="border-l border-slate-200 bg-slate-50/60 sticky right-0 z-20 shadow-[-1px_0_0_0_#e2e8f0]" />
                      </TableRow>
                    )}
                  </TableHeader>
                  <TableBody>
                    {paginatedEnrolled.map((s, idx) => {
                      const studentGrades = localGrades[s.id] || {};

                      let termTotal = 0;
                      let hasGrade = false;
                      gradeConfigs.forEach(col => {
                        const val = studentGrades[col.id];
                        if (val !== undefined && val !== '') {
                          termTotal += (parseFloat(val) * (col.weight / 100));
                          hasGrade = true;
                        }
                      });

                      const computedTermGrade = hasGrade ? termTotal : null;
                      const isFailing = computedTermGrade !== null && computedTermGrade < 75;
                      const isInactive = s.status === 'Transferred Out' || s.status === 'Dropped' || s.status === 'Transferred';

                      return (
                        <TableRow key={s.id} className={cn("border-b border-slate-100 hover:bg-slate-50/60 transition-colors h-14", isFailing && "bg-rose-50/15")}>
                          <TableCell className="text-center font-bold text-slate-400 text-xs pl-4">
                            {(currentPage - 1) * rowsPerPage + idx + 1}
                          </TableCell>
                          <TableCell className="sticky left-0 bg-white z-20 shadow-[1px_0_0_0_#e2e8f0] py-3">
                            <div className="flex items-center gap-2">
                              <p className={cn("font-bold text-xs sm:text-sm", isFailing ? "text-rose-700" : "text-slate-900")}>
                                {formatStudentName(s.firstName, s.lastName)}
                              </p>
                              {isInactive && (
                                <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-500 border-slate-200 uppercase">
                                  {s.status === 'Dropped' ? 'DRP' : 'T/O'}
                                </Badge>
                              )}
                            </div>
                            <p className="text-[10.5px] font-mono text-slate-400">{s.lrn || 'No LRN'}</p>
                          </TableCell>
                          {gradeConfigs.map(col => (
                            <TableCell key={col.id} className="py-2 px-2.5 text-center">
                              <Input
                                type="number"
                                value={studentGrades[col.id] || ''}
                                disabled={!isAuthorized || col.isAttendance || isInactive}
                                onChange={(e) => handleCellChange(s.id, col.id, e.target.value)}
                                onBlur={() => {
                                  if (isAuthorized) handleBlur(s.id, col.id, studentGrades[col.id] || '');
                                }}
                                className={cn(
                                  "h-8 font-mono text-xs font-bold text-center rounded-lg border shadow-2xs transition-all",
                                  !isAuthorized 
                                    ? "bg-slate-50 text-slate-400 border-slate-200/60 cursor-not-allowed" 
                                    : "bg-white border-slate-200 focus:border-[#D8232A] focus:ring-2 focus:ring-[#D8232A]/15"
                                )}
                                max="100"
                                min="0"
                              />
                            </TableCell>
                          ))}
                          <TableCell className="text-center pr-6 py-3 font-mono font-black text-sm border-l border-slate-200 sticky right-0 bg-slate-50/80 z-20 shadow-[-1px_0_0_0_#e2e8f0]">
                            <span className={cn(
                              "px-2.5 py-1 rounded-lg",
                              computedTermGrade !== null && computedTermGrade >= 75 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                              computedTermGrade !== null ? "bg-rose-50 text-rose-700 border border-rose-200" : "text-slate-400"
                            )}>
                              {computedTermGrade !== null ? computedTermGrade.toFixed(1) : '—'}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {paginatedEnrolled.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={gradeConfigs.length + 3} className="text-center py-16 text-slate-400 font-medium">
                          No students found matching current filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-bold">Page {currentPage} of {totalPages}</span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="border-slate-200 text-slate-600 bg-white font-bold rounded-xl text-xs h-8 px-3"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="border-slate-200 text-slate-600 bg-white font-bold rounded-xl text-xs h-8 px-3"
                    >
                      Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Save Bar (When Unsaved Changes Exist) */}
            {!saved && isAuthorized && (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-700">
                  <AlertCircle className="w-4 h-4 text-amber-500 animate-pulse" />
                  <span>You have unsaved grade entries. Save to persist changes across sessions.</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (window.confirm("Discard unsaved changes?")) {
                        const gradeKey = currentGradeLevel ? currentGradeLevel.replace(/Grade /i, 'Grade ') : 'Grade 6';
                        const gradesMap: Record<string, Record<string, string>> = {};
                        enrolled.forEach(s => {
                          const studentGrades = (s.grades as Record<string, any>)?.[gradeKey]?.[selectedSubjectCode]?.[selectedTerm] || {};
                          gradesMap[s.id] = {};
                          gradeConfigs.forEach(col => {
                            gradesMap[s.id][col.id] = (studentGrades[col.id] !== undefined && studentGrades[col.id] !== null) ? studentGrades[col.id].toString() : '';
                          });
                        });
                        setLocalGrades(gradesMap);
                        setSaved(true);
                      }
                    }}
                    disabled={isSaving}
                    className="border-slate-200 text-slate-600 bg-white font-bold rounded-xl text-xs h-9 px-3.5"
                  >
                    Discard
                  </Button>
                  <Button
                    onClick={handleSaveGrades}
                    disabled={isSaving}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs h-9 px-4.5 border-none shadow-xs active:scale-95 transition-all"
                  >
                    {isSaving ? "Saving..." : "Save Grades"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* DIALOG: CREATE GRADING COLUMN                                             */}
      {/* ========================================================================= */}
      <Dialog open={isAddColumnOpen} onOpenChange={setIsAddColumnOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6 bg-white shadow-2xl border-slate-100">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-slate-900">Create Grading Criteria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Criteria Name (e.g. Written Work, Performance Task)</Label>
              <Input
                placeholder="e.g. Written Work 1"
                value={newColName}
                onChange={e => setNewColName(e.target.value)}
                className="h-10 text-xs rounded-xl border-slate-200 bg-white focus:ring-2 focus:ring-[#D8232A]/15 focus:border-[#D8232A]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Weight Percentage (%)</Label>
              <Input
                type="number"
                placeholder="e.g. 40"
                value={newColWeight}
                onChange={e => setNewColWeight(e.target.value)}
                max={remainingWeight}
                min="1"
                className="h-10 text-xs rounded-xl border-slate-200 bg-white focus:ring-2 focus:ring-[#D8232A]/15 focus:border-[#D8232A]"
              />
              <p className="text-[10px] text-slate-400 font-semibold">Remaining weight available for this term: <span className="text-slate-700 font-bold">{remainingWeight}%</span></p>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <input
                type="checkbox"
                id="isAttendance"
                checked={isAttendance}
                onChange={e => {
                  setIsAttendance(e.target.checked);
                  if (!e.target.checked) {
                    setAttStartDate('');
                    setAttEndDate('');
                  }
                }}
                className="w-4 h-4 text-[#D8232A] rounded border-slate-300 focus:ring-[#D8232A]/20 cursor-pointer"
              />
              <Label htmlFor="isAttendance" className="cursor-pointer select-none font-bold text-slate-700 text-xs">
                Auto-calculate from Attendance Records
              </Label>
            </div>

            {isAttendance && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200/80 rounded-xl animate-in fade-in-50 duration-200">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Start Date</Label>
                  <Input
                    type="date"
                    value={attStartDate}
                    onChange={e => setAttStartDate(e.target.value)}
                    className="h-8 text-xs font-medium bg-white rounded-lg border-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">End Date</Label>
                  <Input
                    type="date"
                    value={attEndDate}
                    onChange={e => setAttEndDate(e.target.value)}
                    className="h-8 text-xs font-medium bg-white rounded-lg border-slate-200"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsAddColumnOpen(false)} className="rounded-xl text-xs h-9 border-slate-200 text-slate-600">
              Cancel
            </Button>
            <Button
              onClick={handleAddColumn}
              disabled={!newColName.trim() || !newColWeight || isNaN(parseFloat(newColWeight)) || parseFloat(newColWeight) > remainingWeight}
              className="bg-[#D8232A] hover:bg-[#b91c22] text-white font-bold rounded-xl text-xs h-9 border-none shadow-xs"
            >
              Create Criteria
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG: EDIT GRADING COLUMN                                               */}
      {/* ========================================================================= */}
      <Dialog open={!!editingColumnId} onOpenChange={(open) => !open && setEditingColumnId(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6 bg-white shadow-2xl border-slate-100">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-slate-900">Edit Grading Criteria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Criteria Name</Label>
              <Input
                placeholder="Name"
                value={editColName}
                onChange={e => setEditColName(e.target.value)}
                className="h-10 text-xs rounded-xl border-slate-200 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Weight Percentage (%)</Label>
              <Input
                type="number"
                placeholder="40"
                value={editColWeight}
                onChange={e => setEditColWeight(e.target.value)}
                max={remainingWeight + (gradeConfigurations.find(c => c.id === editingColumnId)?.weight || 0)}
                min="1"
                className="h-10 text-xs rounded-xl border-slate-200 bg-white"
              />
            </div>

            {editColIsAttendance && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200/80 rounded-xl animate-in fade-in-50 duration-200">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Start Date</Label>
                  <Input
                    type="date"
                    value={editColStartDate}
                    onChange={e => setEditColStartDate(e.target.value)}
                    className="h-8 text-xs font-medium bg-white rounded-lg border-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">End Date</Label>
                  <Input
                    type="date"
                    value={editColEndDate}
                    onChange={e => setEditColEndDate(e.target.value)}
                    className="h-8 text-xs font-medium bg-white rounded-lg border-slate-200"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditingColumnId(null)} className="rounded-xl text-xs h-9 border-slate-200 text-slate-600">
              Cancel
            </Button>
            <Button
              onClick={handleEditColumn}
              disabled={!editColName.trim() || !editColWeight || isNaN(parseFloat(editColWeight))}
              className="bg-[#D8232A] hover:bg-[#b91c22] text-white font-bold rounded-xl text-xs h-9 border-none shadow-xs"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
