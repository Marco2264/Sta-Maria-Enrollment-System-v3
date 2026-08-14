import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../../lib/firebase';
import { doc, updateDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
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
  Settings,
  LockOpen,
  Activity,
  UserCheck,
  Search,
  Scale
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTeacherData } from '../../lib/teacherData';

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

  const allSubjects = Array.from(new Set([...(section.taughtSubjectCodes||[]), ...(section.advisedSubjectCodes||[])]));

  return (
    <Card className="border border-slate-200/60 shadow-2xs hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col bg-white rounded-2xl group">
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4 pb-3.5 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-800 group-hover:text-red-700 transition-colors">{section.gradeLevel} — {section.name}</h3>
          {section.isAdvisor && (
            <Badge className="bg-red-50 text-[#D8232A] hover:bg-red-100 flex items-center gap-1.5 shadow-none border border-red-200/40 text-[10px] font-bold uppercase tracking-wider rounded-lg px-2.5 py-1">
              <Star className="w-3 h-3 fill-current" /> Advisor
            </Badge>
          )}
        </div>

        <div className="mb-6 flex-1">
           <div className="flex items-center gap-2 text-slate-400 mb-3 text-[10px] font-extrabold uppercase tracking-widest">
             <BookOpen className="w-3.5 h-3.5" /> Assigned Subjects
           </div>
           {loadingCard ? (
             <div className="flex gap-2">
               <div className="h-7 w-24 bg-slate-100 rounded-lg animate-pulse" />
               <div className="h-7 w-24 bg-slate-100 rounded-lg animate-pulse" />
             </div>
           ) : (
             <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                {allSubjects.map((code: any) => {
                   const progress = stats.subjectProgress[code] || 0;
                   let progressColor = 'bg-slate-400';
                   if (progress === 100) progressColor = 'bg-emerald-500';
                   else if (progress >= 80) progressColor = 'bg-teal-500';
                   else if (progress >= 40) progressColor = 'bg-amber-500';
                   else progressColor = 'bg-rose-450';

                   return (
                     <div key={code} className="bg-slate-50 border border-slate-200/60 rounded-xl px-2.5 py-1.5 flex items-center gap-2 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-100/50">
                        <div className={`w-1.5 h-1.5 rounded-full ${progressColor}`}></div>
                        {code} <span className="text-[10px] text-slate-400 font-normal">({progress}%)</span>
                     </div>
                   )
                })}
                {allSubjects.length === 0 && (
                   <span className="text-slate-400 text-xs italic">No specific subjects assigned</span>
                )}
             </div>
           )}
        </div>

        <div className="mt-auto pt-4 border-t border-slate-50">
          <div className="flex items-center justify-between text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">
             <span>Overall Progress</span>
             <span className="text-[#D8232A]">{loadingCard ? '-' : stats.progress}%</span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-4">
             <div 
               className="h-full bg-gradient-to-r from-red-500 to-[#D8232A] rounded-full transition-all duration-1000" 
               style={{ width: loadingCard ? '0%' : `${stats.progress}%` }}
             />
          </div>

          <div className="flex items-center justify-between pt-1">
             <span className="text-xs font-bold text-slate-500">
               {loadingCard ? '-' : stats.studentCount} Enrolled Students
             </span>
             <button 
                onClick={onOpen}
                className="text-xs font-bold text-[#D8232A] hover:text-[#b91c22] flex items-center gap-1 transition-colors group/btn cursor-pointer bg-transparent border-none outline-none"
             >
                Open Gradebook <ArrowLeft className="w-3.5 h-3.5 rotate-180 group-hover/btn:translate-x-0.5 transition-transform" />
             </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function GradesView() {
  const { students, attendance, updateDynamicStudentGrade, addGradeColumn, editGradeColumn, deleteGradeColumn, submitGradesToAdviser, requestUnlockGrades, grantUnlockGrades, gradeConfigurations, loading, currentGradeLevel, currentSectionName, isAdvisorForCurrentSection, assignedSections, setCurrentSection, currentSection, allTeachers, subjects, advisorSectionSchedules } = useTeacherData();
  const enrolled = useMemo(() => students.filter((s) => s.status === 'Enrolled'), [students]);

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 25;
  const totalPages = Math.ceil(enrolled.length / rowsPerPage);

  const [isGradebookOpen, setIsGradebookOpen] = useState(false);
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<'Term 1' | 'Term 2' | 'Finals'>('Term 1');
  
  const [localGrades, setLocalGrades] = useState<Record<string, Record<string, string>>>({});
  const [isAttendance, setIsAttendance] = useState(false);
  const [attStartDate, setAttStartDate] = useState('');
  const [attEndDate, setAttEndDate] = useState('');
  
  const [editColIsAttendance, setEditColIsAttendance] = useState(false);
  const [editColStartDate, setEditColStartDate] = useState('');
  const [editColEndDate, setEditColEndDate] = useState('');
  const [saved, setSaved] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Column Add Dialog
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColWeight, setNewColWeight] = useState('');

  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editColName, setEditColName] = useState('');
  const [editColWeight, setEditColWeight] = useState('');

  // Lists of taught/advised codes
  const currentSectionData = assignedSections.find(s => s.sectionId === currentSection);
  const taughtSubjects = currentSectionData?.taughtSubjectCodes || [];
  const advisedSubjects = currentSectionData?.advisedSubjectCodes || [];

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

  // Load Firestore grade values into local state and compute attendance values in one shot
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
          // Calculate present count
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

          // If db value differs, queue an update
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

  // Sync scroll selections to prevent empty pages
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedEnrolled = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return enrolled.slice(start, start + rowsPerPage);
  }, [enrolled, currentPage]);

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
    const loadingToast = toast.loading("Saving grades changes...");
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
      toast.success("All grades successfully updated!", { id: loadingToast });
      setSaved(true);
    } catch (err) {
      console.error("Failed to save changes", err);
      toast.error("Failed to save grades. Please try again.", { id: loadingToast });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddColumn = async () => {
    const weight = parseFloat(newColWeight);
    if (!newColName.trim() || !newColWeight || isNaN(weight)) return;
    if (weight > remainingWeight) {
      alert(`The maximum allowed weight for this column is ${remainingWeight}%.`);
      return;
    }
    if (isAttendance && (!attStartDate || !attEndDate)) {
      alert("Please select both start and end dates for the attendance range.");
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
  };

  const handleEditColumn = async () => {
    if (!editingColumnId) return;
    const weight = parseFloat(editColWeight);
    if (!editColName.trim() || !editColWeight || isNaN(weight)) return;
    
    const editingCol = gradeConfigurations.find(c => c.id === editingColumnId);
    const oldWeight = editingCol?.weight || 0;
    const maxWeight = remainingWeight + oldWeight;

    if (weight > maxWeight) {
      alert(`The maximum allowed weight for this column is ${maxWeight}%.`);
      return;
    }

    if (editColIsAttendance && (!editColStartDate || !editColEndDate)) {
      alert("Please select both start and end dates for the attendance range.");
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

  if (!isGradebookOpen) {
    return (
      <div className="flex flex-col h-full bg-[#f8fafc] relative overflow-hidden">
        {/* Soft Ambient Background Glows */}
        <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-red-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[450px] h-[450px] bg-red-500/5 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none" />

        {/* Dashboard Header */}
        <header className="h-[76px] px-6 sm:px-8 border-b border-slate-200 bg-white shrink-0 flex items-center shadow-2xs relative z-10">
          <div className="flex flex-row items-center justify-between gap-6 w-full max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-50 rounded-xl text-[#D8232A] border border-red-100/50 shadow-2xs">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#D8232A] leading-none mb-1">Classroom Management</span>
                <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none">Assigned Grades & Sections</h1>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Sections Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full relative z-10">
          {assignedSections.length === 0 ? (
            <Card className="border border-dashed border-slate-200 shadow-none flex flex-col items-center justify-center p-16 text-center bg-white rounded-2xl w-full mt-4">
              <BookOpen className="w-16 h-16 text-slate-350 mb-4" />
              <h3 className="text-base font-bold text-slate-700">No Assigned Sections</h3>
              <p className="text-xs text-slate-500 mt-2 max-w-md">
                You currently do not have any subjects or sections assigned to you for this academic year. Please contact the administrator to assign your teaching loads.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

  const terms = ['Term 1', 'Term 2', 'Finals'] as const;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex w-full relative">
      {/* Left Sidebar */}
      <div className="w-66 bg-white border-r border-slate-200 shrink-0 flex flex-col hidden md:flex shadow-3xs relative z-10">
        <div className="p-6 border-b border-slate-100">
          <button 
            onClick={() => {
              setIsGradebookOpen(false);
              setSelectedSubjectCode('');
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors group mb-5 cursor-pointer bg-transparent border-none outline-none"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" /> BACK TO LIST
          </button>
          
          <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Selected Section</div>
          <h2 className="text-base font-extrabold text-slate-800 leading-tight">{currentGradeLevel} — {currentSectionName}</h2>
          {isAdvisorForCurrentSection && (
            <Badge className="bg-red-50 text-[#D8232A] border-red-200/50 mt-2.5 shadow-2xs rounded-lg text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 w-fit">
              <Star className="w-3 h-3 mr-1 fill-current" /> Advisor
            </Badge>
          )}
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-6">
          <div>
            <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-3 px-2">Assigned to you</div>
            <div className="space-y-1">
              {taughtSubjects.map(code => (
                <button
                  key={code}
                  onClick={() => setSelectedSubjectCode(code)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer border-none outline-none ${
                    selectedSubjectCode === code 
                    ? 'bg-red-50 text-[#D8232A] shadow-3xs ring-1 ring-red-500/10' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${selectedSubjectCode === code ? 'bg-[#D8232A]' : 'bg-transparent'}`}></div>
                  {code}
                </button>
              ))}
              {taughtSubjects.length === 0 && (
                <div className="px-3 text-xs text-slate-400 italic">None</div>
              )}
            </div>
          </div>

          <div>
            <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-3 px-2">Classroom view only</div>
            <div className="space-y-1">
              {advisedSubjects.map(code => (
                <button
                  key={code}
                  onClick={() => setSelectedSubjectCode(code)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex flex-col gap-1 cursor-pointer border-none outline-none ${
                    selectedSubjectCode === code 
                    ? 'bg-slate-100 text-slate-900 shadow-3xs ring-1 ring-slate-200' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between w-full min-w-0 gap-2">
                    <span className="truncate">{code}</span>
                    <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                  </div>
                </button>
              ))}
              {advisedSubjects.length === 0 && (
                <div className="px-3 text-xs text-slate-400 italic">None</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        <div className="p-6 lg:p-8 flex-1 overflow-y-auto">
          
          {/* Segmented Advisor Banner */}
          {isAdvisorForCurrentSection && (
            <div className="mb-6 bg-red-50/50 border border-red-100 rounded-xl p-4 flex items-start gap-3 shadow-2xs">
              <AlertCircle className="w-5 h-5 text-[#D8232A] shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600 leading-relaxed font-semibold">
                <span className="font-extrabold text-[#D8232A]">Advisor view active</span> — You can see all subjects in {currentGradeLevel} — {currentSectionName}. You can only edit grades for subjects assigned to you: {taughtSubjects.join(', ') || 'None'}.
              </div>
            </div>
          )}

          {/* Segmented view controls */}
          {isAdvisorForCurrentSection && (
            <div className="flex justify-center mb-6">
              <div className="bg-slate-100/80 p-1.5 rounded-2xl inline-flex shadow-inner border border-slate-200/50">
                <button 
                  onClick={() => {
                    if (selectedSubjectCode === 'MASTER_SHEET') {
                      setSelectedSubjectCode(advisedSubjects[0] || taughtSubjects[0] || '');
                    }
                  }}
                  className={`px-8 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border-none outline-none ${
                    selectedSubjectCode !== 'MASTER_SHEET' 
                    ? 'bg-white text-slate-800 shadow-2xs' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  <BookOpen className={`w-4 h-4 ${selectedSubjectCode !== 'MASTER_SHEET' ? 'text-[#D8232A]' : 'text-slate-400'}`} />
                  Subject Gradebook
                </button>
                <button 
                  onClick={() => setSelectedSubjectCode('MASTER_SHEET')}
                  className={`px-8 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border-none outline-none ${
                    selectedSubjectCode === 'MASTER_SHEET' 
                    ? 'bg-white text-[#D8232A] shadow-2xs' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  <Star className={`w-4 h-4 ${selectedSubjectCode === 'MASTER_SHEET' ? 'text-[#D8232A]' : 'text-slate-400'}`} />
                  Master Overview
                </button>
              </div>
            </div>
          )}

          {/* Table Header Section */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">{currentGradeLevel} — {currentSectionName}</span>
              <h1 className="text-xl font-bold tracking-tight text-slate-800 mt-1">
                {selectedSubjectCode === 'MASTER_SHEET' ? 'Master Gradebook Report' : selectedSubjectCode || 'No Subject Selected'}
              </h1>
            </div>
            
            <div className="flex items-center gap-3">
              {selectedSubjectCode === 'MASTER_SHEET' && (
                <Button variant="outline" onClick={() => window.print()} className="gap-2 bg-white border-slate-200 shadow-sm hidden sm:flex font-semibold rounded-xl text-xs h-9">
                  <Printer className="w-4 h-4 text-slate-500" />
                  Print Report
                </Button>
              )}
              {selectedSubjectCode !== 'MASTER_SHEET' && (
                <div className="text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-2xs flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-slate-400" />
                  Term Weight: <span className={`font-mono font-extrabold ${currentTotalWeight === 100 ? "text-emerald-600" : currentTotalWeight > 100 ? "text-rose-600" : "text-amber-600"}`}>{currentTotalWeight}%</span> / 100%
                </div>
              )}
            </div>
          </div>

          {/* Tab Control navigation */}
          {selectedSubjectCode !== 'MASTER_SHEET' && (
            <div className="flex items-center gap-1 border-b border-slate-200 mb-6">
              {terms.map(term => (
                <button
                  key={term}
                  onClick={() => setSelectedTerm(term)}
                  className={`px-6 py-3 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer ${
                    selectedTerm === term 
                    ? 'bg-white border-[#D8232A] text-[#D8232A] shadow-3xs' 
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                  }`}
                >
                  {term}
                </button>
              ))}
            </div>
          )}

          {/* Main Work Grid View */}
          {selectedSubjectCode === 'MASTER_SHEET' ? (
            <Card className="bg-white border border-slate-200/50 shadow-2xs rounded-2xl overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b bg-red-50/20 border-red-100/50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <Star className="w-4 h-4 text-[#D8232A]" />
                  <span>General Weighted Averages (GWA)</span>
                </div>
                <div className="text-xs text-[#D8232A] font-bold">
                  {paginatedEnrolled.length} Enrolled Students
                </div>
              </div>
              <Table>
                <TableHeader className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider">
                  <TableRow>
                    <TableHead className="font-bold py-3 pl-6 min-w-[200px] sticky left-0 bg-slate-50 z-20 shadow-[1px_0_0_0_#e2e8f0]">Student Name</TableHead>
                    {Array.from(new Set([...taughtSubjects, ...advisedSubjects])).map(code => (
                      <TableHead key={code} className="font-bold py-3 text-center min-w-[80px]" title={code}>
                        <div className="truncate px-1">{code}</div>
                      </TableHead>
                    ))}
                    <TableHead className="font-bold text-[#D8232A] py-3 text-center pr-6 min-w-[90px] border-l border-slate-200 sticky right-0 bg-slate-50 z-20 shadow-[-1px_0_0_0_#e2e8f0]">GWA</TableHead>
                  </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedEnrolled.map(s => {
                      const gradeKey = currentGradeLevel ? currentGradeLevel.replace(/Grade /i, 'Grade ') : 'Grade 6';
                      let validSubjects = 0;
                      let totalGWA = 0;
                      
                      const subjGrades = Array.from(new Set([...taughtSubjects, ...advisedSubjects])).map(code => {
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
                        <TableRow key={s.id} className={`hover:bg-slate-50/80 transition-colors border-b border-slate-100 ${isFailing ? 'bg-red-50/20' : 'bg-white'}`}>
                          <TableCell className={`pl-6 py-3.5 sticky left-0 z-20 shadow-[1px_0_0_0_#e2e8f0] ${isFailing ? 'bg-red-50/80' : 'bg-white'}`}>
                            <span className={`font-bold text-[13px] ${isFailing ? 'text-red-700' : 'text-slate-800'} whitespace-nowrap`}>
                              {formatStudentName(s.firstName, s.lastName)}
                            </span>
                          </TableCell>
                          {subjGrades.map(sg => (
                            <TableCell key={sg.code} className={`text-center py-3.5 px-1 font-mono text-xs font-semibold ${sg.isOverride ? 'text-amber-700 bg-amber-50/30 font-bold' : (sg.value !== null && Number(sg.value) < 75 ? 'text-rose-600 font-bold bg-rose-50/30' : 'text-slate-650')}`}>
                              {sg.value !== null ? Number(sg.value).toFixed(1) : '—'}
                            </TableCell>
                          ))}
                          <TableCell className={`text-center pr-6 py-3.5 font-mono font-bold text-[13px] border-l border-slate-100 sticky right-0 z-20 shadow-[-1px_0_0_0_#e2e8f0] ${isFailing ? 'text-rose-700 bg-rose-50/80' : 'text-[#D8232A] bg-red-50/40'}`}>
                            {gwa}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {enrolled.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={Array.from(new Set([...taughtSubjects, ...advisedSubjects])).length + 2} className="text-center py-12 text-slate-400 font-medium">
                          No students enrolled.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
            </Card>
          ) : (
            <Card className="bg-white border border-slate-200/50 shadow-2xs rounded-2xl overflow-hidden flex flex-col">
              {/* Table Toolbar */}
              <div className={`px-5 py-4 border-b flex items-center justify-between flex-wrap gap-4 ${isAuthorized ? 'bg-blue-50/20 border-blue-100/50' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-2">
                  {isAuthorized ? (
                    <>
                      <Edit3 className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold text-blue-800">Editing Mode Enabled</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-bold text-slate-500">Read-Only Mode</span>
                    </>
                  )}
                  <Badge variant="outline" className={`ml-2 text-[9px] font-bold uppercase tracking-wider rounded-lg border-opacity-40 px-2 py-0.5 ${
                    submissionStatus === 'locked' ? 'bg-red-50 text-[#D8232A] border-red-200' :
                    submissionStatus === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {submissionStatus === 'locked' ? 'Locked' : submissionStatus === 'pending' ? 'Approval Pending' : 'Draft'}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  {isAuthorized && (
                    <Button 
                      size="sm" 
                      onClick={() => setIsAddColumnOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-8 border-none"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add Column
                    </Button>
                  )}

                  {taughtSubjects.includes(selectedSubjectCode) && submissionStatus === 'draft' && (
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (!saved) {
                          alert("Please save your changes first.");
                          return;
                        }
                        if (currentTotalWeight !== 100) {
                          alert("Submission is only allowed when overall column weight sum equals exactly 100%.");
                          return;
                        }
                        if (window.confirm("Submit grades for lock and advisor approval? You will lose editing access unless unlocked.")) {
                          const loadingToast = toast.loading("Submitting grades...");
                          try {
                            await submitGradesToAdviser(selectedSubjectCode, selectedTerm);
                            toast.success("Grades successfully submitted to adviser!", { id: loadingToast });
                          } catch (error) {
                            console.error(error);
                            toast.error("Failed to submit grades. Try again.", { id: loadingToast });
                          }
                        }
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs h-8 border-none"
                    >
                      <Send className="w-3.5 h-3.5 mr-1" /> Submit Grades
                    </Button>
                  )}

                  {taughtSubjects.includes(selectedSubjectCode) && submissionStatus === 'pending' && (
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (window.confirm("Recall submission to edit grades again?")) {
                          try {
                            await requestUnlockGrades(selectedSubjectCode, selectedTerm);
                            toast.success("Submission recalled. Editing mode is active.");
                          } catch (error) {
                            toast.error("Failed to recall submission.");
                          }
                        }
                      }}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs h-8 border-none"
                    >
                      <LockOpen className="w-3.5 h-3.5 mr-1" /> Recall Draft
                    </Button>
                  )}

                  {isAdvisorForCurrentSection && submissionStatus === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={async () => {
                          if (window.confirm("Approve and Lock these grades? Subject teacher will lose editing access permanently.")) {
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
                        className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs h-8 border-none"
                      >
                        <Lock className="w-3.5 h-3.5 mr-1" /> Approve & Lock
                      </Button>
                      <Button
                        size="sm"
                        onClick={async () => {
                          if (window.confirm("Unlock and reject these grades to send back to subject teacher?")) {
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
                        variant="outline"
                        className="border-slate-200 text-slate-600 bg-white font-bold rounded-xl text-xs h-8"
                      >
                        Unlock/Reject
                      </Button>
                    </div>
                  )}

                  {isAdvisorForCurrentSection && submissionStatus === 'locked' && (
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (window.confirm("Unlock locked grades for edits? Subject teacher will gain edit permissions.")) {
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
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs h-8 border-none"
                    >
                      <LockOpen className="w-3.5 h-3.5 mr-1" /> Unlock Grades
                    </Button>
                  )}
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider">
                    <TableRow>
                      <TableHead className="font-bold py-3 pl-6 min-w-[200px] sticky left-0 bg-slate-50 z-20 shadow-[1px_0_0_0_#e2e8f0]">Student Name</TableHead>
                      {gradeConfigs.map(col => (
                        <TableHead key={col.id} className="py-3 text-center min-w-[120px] font-bold relative group/th">
                          <div className="flex flex-col items-center">
                            <span className="truncate max-w-[120px] block" title={col.name}>{col.name}</span>
                            <span className="text-[10px] text-slate-400 font-semibold mt-0.5">({col.weight}%)</span>
                          </div>
                          {isAuthorized && (
                            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 hidden group-hover/th:flex items-center gap-1 bg-slate-50 px-1 py-0.5 rounded border border-slate-200 shadow-2xs">
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
                      <TableHead className="font-bold text-[#D8232A] py-3 text-center pr-6 min-w-[90px] border-l border-slate-100 sticky right-0 bg-slate-50 z-20 shadow-[-1px_0_0_0_#e2e8f0]">Term Grade</TableHead>
                    </TableRow>
                    {isAuthorized && gradeConfigs.length > 0 && (
                      <TableRow className="bg-slate-50/40 border-b border-slate-150">
                        <TableCell className="pl-6 py-2.5 font-bold text-xs text-slate-400 uppercase tracking-wider sticky left-0 bg-[#fafafa] z-20 shadow-[1px_0_0_0_#e2e8f0]">Auto Fill Column</TableCell>
                        {gradeConfigs.map(col => (
                          <TableCell key={col.id} className="py-2.5 px-3">
                            <Input
                              type="number"
                              placeholder="Fill All"
                              disabled={col.isAttendance}
                              onChange={(e) => handleAutoFill(col.id, e.target.value)}
                              className="h-8 text-xs font-mono font-semibold text-center border-slate-200 rounded-lg bg-white"
                              max="100"
                              min="0"
                            />
                          </TableCell>
                        ))}
                        <TableCell className="py-2.5 border-l border-slate-150 bg-[#fafafa] sticky right-0 z-20 shadow-[-1px_0_0_0_#e2e8f0]" />
                      </TableRow>
                    )}
                  </TableHeader>
                  <TableBody>
                    {paginatedEnrolled.map(s => {
                      const studentGrades = localGrades[s.id] || {};
                      
                      // Calculate dynamic live term total average
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

                      return (
                        <TableRow key={s.id} className={`hover:bg-slate-50/80 transition-colors border-b border-slate-100 ${isFailing ? 'bg-red-50/10' : 'bg-white'}`}>
                          <TableCell className={`pl-6 py-3 sticky left-0 z-20 shadow-[1px_0_0_0_#e2e8f0] ${isFailing ? 'bg-red-50/80' : 'bg-white'}`}>
                            <span className={`font-bold text-[13px] ${isFailing ? 'text-rose-700' : 'text-slate-800'} whitespace-nowrap`}>
                              {formatStudentName(s.firstName, s.lastName)}
                            </span>
                          </TableCell>
                          {gradeConfigs.map(col => (
                            <TableCell key={col.id} className="py-2.5 px-3">
                              <Input
                                type="number"
                                value={studentGrades[col.id] || ''}
                                disabled={!isAuthorized || col.isAttendance}
                                onChange={(e) => handleCellChange(s.id, col.id, e.target.value)}
                                onBlur={() => {
                                  if (isAuthorized) handleBlur(s.id, col.id, studentGrades[col.id] || '');
                                }}
                                className={`h-8 font-mono text-xs font-semibold text-center rounded-lg border bg-white ${
                                  !isAuthorized ? 'border-slate-100 bg-slate-50 text-slate-500' : 'border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
                                }`}
                                max="100"
                                min="0"
                              />
                            </TableCell>
                          ))}
                          <TableCell className={`text-center pr-6 py-3 font-mono font-bold text-[13px] border-l border-slate-100 sticky right-0 z-20 shadow-[-1px_0_0_0_#e2e8f0] ${isFailing ? 'text-rose-750 bg-rose-50/80' : 'text-slate-700 bg-slate-50/40'}`}>
                            {computedTermGrade !== null ? computedTermGrade.toFixed(1) : '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {enrolled.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={gradeConfigs.length + 2} className="text-center py-12 text-slate-400 font-medium">
                          No students enrolled.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Roster Pages Pagination Footer */}
              {totalPages > 1 && (
                <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-bold">Page {currentPage} of {totalPages}</span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="border-slate-200 text-slate-600 bg-white font-semibold rounded-xl text-xs h-8 px-2.5"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="border-slate-200 text-slate-600 bg-white font-semibold rounded-xl text-xs h-8 px-2.5"
                    >
                      Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Floated Auto-save confirmation indicator */}
          {!saved && selectedSubjectCode !== 'MASTER_SHEET' && isAuthorized && (
            <div className="mt-6 flex justify-end gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
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
                className="border-slate-200 text-slate-600 bg-white font-bold rounded-xl text-xs h-9 px-4"
              >
                Discard Changes
              </Button>
              <Button
                onClick={handleSaveGrades}
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs h-9 px-5 border-none shadow-sm"
              >
                {isSaving ? "Saving Grades..." : "Save Grade Changes"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* dialog modals */}
      <Dialog open={isAddColumnOpen} onOpenChange={setIsAddColumnOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-slate-800">Add Grading Column</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-600">Column Name (e.g., Written Work, Quiz 1)</Label>
              <Input 
                placeholder="Column Name" 
                value={newColName} 
                onChange={e => setNewColName(e.target.value)}
                className="h-9 text-xs rounded-xl border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-600">Weight Percentage (%)</Label>
              <Input 
                type="number" 
                placeholder="40" 
                value={newColWeight} 
                onChange={e => setNewColWeight(e.target.value)}
                max={remainingWeight}
                min="1"
                className="h-9 text-xs rounded-xl border-slate-200"
              />
              <p className="text-[10px] text-slate-400 font-semibold mt-1">Remaining weight for this term: {remainingWeight}%</p>
            </div>

            <div className="flex items-center gap-2 pt-2">
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
                className="w-4 h-4 text-[#D8232A] border-slate-350 rounded focus:ring-[#D8232A]/20"
              />
              <Label htmlFor="isAttendance" className="cursor-pointer select-none font-bold text-slate-700 text-xs">
                This is an Attendance-based column
              </Label>
            </div>

            {isAttendance && (
              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 border border-slate-200/80 rounded-xl animate-in fade-in-50 duration-200">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Start Date</Label>
                  <Input
                    type="date"
                    value={attStartDate}
                    onChange={e => setAttStartDate(e.target.value)}
                    className="h-8 text-xs font-medium bg-white rounded-lg border-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
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
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsAddColumnOpen(false)} className="rounded-xl text-xs h-9 border-slate-250 text-slate-500">Cancel</Button>
            <Button 
              onClick={handleAddColumn} 
              disabled={!newColName.trim() || !newColWeight || isNaN(parseFloat(newColWeight)) || parseFloat(newColWeight) > remainingWeight}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-9 border-none"
            >
              Add Column
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingColumnId} onOpenChange={(open) => !open && setEditingColumnId(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-slate-800">Edit Grading Column</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-600">Column Name (e.g., Written Work, Quiz 1)</Label>
              <Input 
                placeholder="Name" 
                value={editColName} 
                onChange={e => setEditColName(e.target.value)} 
                className="h-9 text-xs rounded-xl border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-600">Weight Percentage (%)</Label>
              <Input 
                type="number" 
                placeholder="40" 
                value={editColWeight} 
                onChange={e => setEditColWeight(e.target.value)} 
                max={remainingWeight + (gradeConfigurations.find(c => c.id === editingColumnId)?.weight || 0)}
                min="1"
                className="h-9 text-xs rounded-xl border-slate-200"
              />
              <p className="text-[10px] text-slate-400 font-semibold mt-1">Remaining weight for this term: {remainingWeight + (gradeConfigurations.find(c => c.id === editingColumnId)?.weight || 0)}%</p>
            </div>

            {editColIsAttendance && (
              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 border border-slate-200/80 rounded-xl animate-in fade-in-50 duration-200">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Start Date</Label>
                  <Input
                    type="date"
                    value={editColStartDate}
                    onChange={e => setEditColStartDate(e.target.value)}
                    className="h-8 text-xs font-medium bg-white rounded-lg border-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
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
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingColumnId(null)} className="rounded-xl text-xs h-9 border-slate-250 text-slate-500">Cancel</Button>
            <Button 
              onClick={handleEditColumn} 
              disabled={!editColName.trim() || !editColWeight || isNaN(parseFloat(editColWeight)) || parseFloat(editColWeight) > remainingWeight + (gradeConfigurations.find(c => c.id === editingColumnId)?.weight || 0)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-9 border-none"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
