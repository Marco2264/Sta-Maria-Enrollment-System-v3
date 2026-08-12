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
  Printer
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTeacherData } from '../../lib/teacherData';

function SectionDashboardCard({ section, onOpen }: { section: any; onOpen: () => void }) {
  const [stats, setStats] = useState({ studentCount: 0, progress: 0, subjectProgress: {} as Record<string, number> });
  const [loadingCard, setLoadingCard] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const qEnrolled = query(
          collection(db, 'enrollments'),
          where('sectionId', '==', section.sectionId),
          where('status', '==', 'Enrolled')
        );
        const snap = await getDocs(qEnrolled);
        const sectionStudents = snap.docs.map(d => d.data());

        let totalExpected = 0;
        let totalEncoded = 0;
        const subjProg: Record<string, number> = {};

        const gradeKey = section.gradeLevel ? section.gradeLevel.trim().replace(/Grade /i, 'Grade ') : 'Grade 6';
        
        // For backwards compatibility on dashboard progress, check any encoded grade
        const allSubjects = Array.from(new Set([...(section.taughtSubjectCodes||[]), ...(section.advisedSubjectCodes||[])]));

        allSubjects.forEach((code: any) => {
          let expectedForSubj = sectionStudents.length;
          let encodedForSubj = 0;
          
          sectionStudents.forEach(s => {
             let hasGrade = false;
             const subjData = s.grades?.[gradeKey]?.[code];
             if (subjData && typeof subjData === 'object') {
                if (Object.keys(subjData).length > 0) hasGrade = true;
             }

             if (hasGrade) {
                encodedForSubj++;
                totalEncoded++;
             }
          });

          totalExpected += expectedForSubj;
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
    <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col bg-white rounded-2xl">
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">{section.gradeLevel} — {section.name}</h3>
          {section.isAdvisor && (
            <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 flex items-center gap-1.5 shadow-none border border-indigo-200/50">
              <Star className="w-3.5 h-3.5 fill-current" /> Adviser
            </Badge>
          )}
        </div>

        <div className="mb-6 flex-1">
           <div className="flex items-center gap-2 text-slate-400 mb-3 text-xs font-semibold uppercase tracking-wider">
             <BookOpen className="w-3.5 h-3.5" /> Assigned Subjects
           </div>
           {loadingCard ? (
             <div className="flex gap-2">
               <div className="h-7 w-24 bg-slate-100 rounded-lg animate-pulse" />
               <div className="h-7 w-24 bg-slate-100 rounded-lg animate-pulse" />
             </div>
           ) : (
             <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
               {allSubjects.map((code: any) => {
                  const progress = stats.subjectProgress[code] || 0;
                  let color = 'bg-slate-400';
                  if (progress === 100) color = 'bg-emerald-500';
                  else if (progress >= 80) color = 'bg-teal-500';
                  else if (progress >= 40) color = 'bg-amber-500';
                  else color = 'bg-rose-400';

                  return (
                    <div key={code} className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-xs font-medium text-slate-600">
                       <div className={`w-1.5 h-1.5 rounded-full ${color}`}></div>
                       {code} • {progress}%
                    </div>
                  )
               })}
               {allSubjects.length === 0 && (
                  <span className="text-slate-400 text-sm italic">No specific subjects assigned</span>
               )}
             </div>
           )}
        </div>

        <div className="mt-auto pt-4">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
             <span>Overall Progress</span>
             <span className="text-blue-700">{loadingCard ? '-' : stats.progress}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-6">
             <div className="h-full bg-blue-900 rounded-full transition-all duration-1000" style={{ width: loadingCard ? '0%' : `${stats.progress}%` }}></div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
             <span className="text-sm font-medium text-slate-500">
               {loadingCard ? '-' : stats.studentCount} Students
             </span>
             <button
                onClick={onOpen}
                className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors group"
             >
                Open Gradebook <ArrowLeft className="w-4 h-4 rotate-180 group-hover:translate-x-0.5 transition-transform" />
             </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function GradesView() {
  const { students, updateDynamicStudentGrade, addGradeColumn, editGradeColumn, deleteGradeColumn, submitGradesToAdviser, requestUnlockGrades, grantUnlockGrades, gradeConfigurations, loading, currentGradeLevel, currentSectionName, isAdvisorForCurrentSection, assignedSections, setCurrentSection, currentSection, allTeachers, subjects, advisorSectionSchedules } = useTeacherData();
  const enrolled = useMemo(() => students.filter((s) => s.status === 'Enrolled'), [students]);

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 25;
  const totalPages = Math.ceil(enrolled.length / rowsPerPage);

  const [isGradebookOpen, setIsGradebookOpen] = useState(false);
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<'Term 1' | 'Term 2' | 'Finals'>('Term 1');
  
  const [localGrades, setLocalGrades] = useState<Record<string, Record<string, string>>>({});
  const [saved, setSaved] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Column Add Dialog
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColWeight, setNewColWeight] = useState('');

  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editColName, setEditColName] = useState('');
  const [editColWeight, setEditColWeight] = useState('');

  const currentSectionData = assignedSections.find(s => s.sectionId === currentSection);
  const taughtSubjects = currentSectionData?.taughtSubjectCodes || [];
  const advisedSubjects = currentSectionData?.advisedSubjectCodes || [];

  const getTeacherForAdvisedSubject = (subjectCode: string) => {
    const schedule = advisorSectionSchedules.find(s => {
      if (s.sectionId !== currentSection) return false;
      const subj = subjects.find(sub => sub.id === s.subjectId);
      const code = subj ? (subj.code || subj.name) : (s.subjectCode || 'Unknown');
      return code === subjectCode;
    });

    if (!schedule || !schedule.teacherId) return 'Unassigned';
    
    const teacher = allTeachers.find(t => t.id === schedule.teacherId);
    if (!teacher) return 'Unknown';
    
    return `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || 'Unknown';
  };

  useEffect(() => {
    if (isGradebookOpen && !selectedSubjectCode) {
      if (taughtSubjects.length > 0) setSelectedSubjectCode(taughtSubjects[0]);
      else if (advisedSubjects.length > 0) setSelectedSubjectCode(advisedSubjects[0]);
    }
  }, [isGradebookOpen, selectedSubjectCode, taughtSubjects, advisedSubjects]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSubjectCode, currentSection, selectedTerm]);

  const paginatedEnrolled = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return enrolled.slice(start, start + rowsPerPage);
  }, [enrolled, currentPage]);


  const activeColumns = useMemo(() => {
    return gradeConfigurations.filter(c => c.subjectCode === selectedSubjectCode && c.term === selectedTerm && c.type !== 'submission');
  }, [gradeConfigurations, selectedSubjectCode, selectedTerm]);

  const currentTermSubmission = useMemo(() => {
    return gradeConfigurations.find(c => 
      c.type === 'submission' && 
      c.subjectCode === selectedSubjectCode && 
      c.term === selectedTerm
    );
  }, [gradeConfigurations, selectedSubjectCode, selectedTerm]);

  const submissionStatus = currentTermSubmission?.status;
  const isSubmitted = submissionStatus === 'submitted' || submissionStatus === 'unlock-requested';
  const isAuthorized = taughtSubjects.includes(selectedSubjectCode) && (!isSubmitted || isAdvisorForCurrentSection);

  const toastConfirm = (title: string, message: string, onConfirm: () => void) => {
    toast.custom((t) => (
      <>
        {createPortal(
          <div className={`fixed inset-0 z-[9998] bg-slate-900/40 backdrop-blur-md transition-opacity duration-300 ease-out ${t.visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} />
          , document.body
        )}
        <div 
          className={`relative z-[9999] flex flex-col items-center text-center w-[400px] max-w-[90vw] p-8 rounded-[2rem] bg-white shadow-2xl ring-1 ring-slate-900/5 transition-all duration-300 ease-out overflow-hidden ${t.visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-8'}`}
          style={{ marginTop: 'calc(50vh - 150px)' }}
        >
          {/* Decorative background element */}
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-indigo-50 to-white -z-10" />
          
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner ring-8 ring-white">
            <Send className="w-8 h-8 ml-1" />
          </div>
          
          <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-2">{title}</h3>
          <p className="text-sm font-medium text-slate-500 leading-relaxed mb-8 px-2">{message}</p>
          
          <div className="flex w-full gap-3">
            <Button 
              variant="outline" 
              className="flex-1 h-12 rounded-xl text-sm font-semibold bg-white hover:bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 transition-colors" 
              onClick={() => toast.dismiss(t.id)}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1 h-12 rounded-xl text-sm font-semibold border-0 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all hover:shadow-lg hover:shadow-indigo-600/30 hover:-translate-y-0.5"
              onClick={() => {
                toast.dismiss(t.id);
                onConfirm();
              }}
            >
              Submit Grades
            </Button>
          </div>
        </div>
      </>
    ), { duration: Infinity });
  };

  const handleSubmitToAdviser = () => {
    toastConfirm(
      "Submit Final Grades",
      "Are you sure you want to submit these grades to the adviser? Once submitted, they will be locked and you can no longer edit them.", 
      async () => {
        try {
          await submitGradesToAdviser(selectedSubjectCode, selectedTerm);
          toast.success("Grades submitted to adviser successfully!");
        } catch (err) {
          toast.error("Failed to submit grades.");
        }
      }
    );
  };

  useEffect(() => {
    if (loading || !selectedSubjectCode) return;
    const map: Record<string, Record<string, string>> = {};
    const gradeKey = currentGradeLevel ? currentGradeLevel.replace(/Grade /i, 'Grade ') : 'Grade 6';
    
    enrolled.forEach((s) => {
      map[s.id] = {};
      const termData = (s.grades as Record<string, any>)?.[gradeKey]?.[selectedSubjectCode]?.[selectedTerm] || {};
      activeColumns.forEach(col => {
        map[s.id][col.id] = termData[col.id]?.toString() || '';
      });
    });
    setLocalGrades(map);
  }, [loading, enrolled, selectedSubjectCode, selectedTerm, activeColumns, currentGradeLevel]);

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

  const getFinalGrade = (studentId: string) => {
    let total = 0;
    let incomplete = false;
    activeColumns.forEach(col => {
      const val = localGrades[studentId]?.[col.id];
      if (val === undefined || val === '') {
        incomplete = true;
      } else {
        total += (parseFloat(val) * (col.weight / 100));
      }
    });
    if (activeColumns.length === 0) return '—';
    return { value: total.toFixed(1), incomplete };
  };

  const currentTotalWeight = activeColumns.reduce((sum, col) => sum + (col.weight || 0), 0);
  const remainingWeight = 100 - currentTotalWeight;

  const handleAddColumn = async () => {
    const weight = parseFloat(newColWeight);
    if (!newColName.trim() || !newColWeight || isNaN(weight)) return;
    if (weight > remainingWeight) {
      alert(`The maximum remaining weight for this term is ${remainingWeight}%.`);
      return;
    }
    await addGradeColumn(selectedSubjectCode, selectedTerm, newColName.trim(), weight);
    setIsAddColumnOpen(false);
    setNewColName('');
    setNewColWeight('');
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

    await editGradeColumn(editingColumnId, editColName.trim(), weight);
    setEditingColumnId(null);
  };

  const openEditModal = (col: any) => {
    setEditingColumnId(col.id);
    setEditColName(col.name);
    setEditColWeight(col.weight.toString());
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
      <div className="p-4 sm:p-6 lg:p-8  space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Your Assigned Grades & Sections</h1>
          <p className="text-slate-500 mt-1 text-sm">Select a section below to manage your assigned subjects or view the overall classroom progress.</p>
        </div>

        {assignedSections.length === 0 ? (
          <Card className="border-2 border-dashed border-slate-200 shadow-none flex flex-col items-center justify-center p-16 text-center bg-slate-50/50 rounded-2xl col-span-full w-full mt-4">
            <BookOpen className="w-16 h-16 text-slate-300 mb-4" />
            <h3 className="text-xl font-bold text-slate-700">No Assigned Sections</h3>
            <p className="hidden md:block text-xs text-slate-500 mt-2 max-w-md">
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
                  setIsGradebookOpen(true);
                }} 
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const terms = ['Term 1', 'Term 2', 'Finals'] as const;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Sidebar */}
      <div className="w-64 bg-white border-r border-slate-200 shrink-0 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-slate-200">
          <button 
            onClick={() => {
              setIsGradebookOpen(false);
              setSelectedSubjectCode('');
            }}
            className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors group mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" /> Back
          </button>
          
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Current Section</div>
          <h2 className="text-lg font-bold text-slate-900 leading-tight">{currentGradeLevel} — {currentSectionName}</h2>
          {isAdvisorForCurrentSection && (
            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 mt-2 shadow-sm rounded-md text-xs font-semibold px-2 py-0.5 w-fit">
              <Star className="w-3 h-3 mr-1" /> Adviser
            </Badge>
          )}
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <div className="mb-6">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">Assigned to you</div>
            <div className="space-y-1">
              {taughtSubjects.map(code => (
                <button
                  key={code}
                  onClick={() => setSelectedSubjectCode(code)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    selectedSubjectCode === code 
                    ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-500/20' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${selectedSubjectCode === code ? 'bg-blue-500' : 'bg-transparent'}`}></div>
                  {code}
                </button>
              ))}
              {taughtSubjects.length === 0 && (
                <div className="px-3 text-xs text-slate-400 italic">None</div>
              )}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">Classroom view only</div>
            <div className="space-y-1">
              {advisedSubjects.map(code => (
                <button
                  key={code}
                  onClick={() => setSelectedSubjectCode(code)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-all flex flex-col group ${
                    selectedSubjectCode === code 
                    ? 'bg-slate-100 text-slate-900 shadow-sm ring-1 ring-slate-200' 
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between w-full min-w-0 gap-2">
                    <div className="flex items-center gap-2 text-sm font-medium min-w-0 flex-1">
                      <Lock className={`w-3.5 h-3.5 shrink-0 ${selectedSubjectCode === code ? 'text-slate-500' : 'text-slate-400'}`} />
                      <span className="truncate block w-full">{code}</span>
                    </div>
                    {gradeConfigurations.some(c => c.type === 'submission' && c.subjectCode === code && c.term === selectedTerm && c.status === 'submitted') ? (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-200 bg-emerald-50 text-emerald-600 shrink-0 ml-2 group-hover:border-emerald-300">SUBMITTED</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 border-slate-200 bg-white text-slate-500 shrink-0 ml-2 group-hover:border-slate-300">RO</Badge>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 pl-5 truncate w-full pr-2">
                    Teacher: {getTeacherForAdvisedSubject(code)}
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="p-6 lg:p-8 flex-1 overflow-y-auto">
          
          {/* Banner */}
          {isAdvisorForCurrentSection && (
            <div className="mb-6 bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 leading-relaxed">
                <span className="font-semibold text-blue-900">Adviser view</span> — You can see all subjects in {currentGradeLevel} — {currentSectionName}. You can only <strong>edit grades</strong> for subjects assigned to you: {taughtSubjects.join(', ') || 'None'}.
              </div>
            </div>
          )}

          {/* Segmented Control */}
          {isAdvisorForCurrentSection && (
            <div className="flex justify-center mb-8">
              <div className="bg-slate-100/80 p-1.5 rounded-xl inline-flex shadow-inner border border-slate-200/60">
                <button 
                  onClick={() => {
                    if (selectedSubjectCode === 'MASTER_SHEET') {
                      setSelectedSubjectCode(advisedSubjects[0] || taughtSubjects[0] || '');
                    }
                  }}
                  className={`px-8 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                    selectedSubjectCode !== 'MASTER_SHEET' 
                    ? 'bg-white text-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.1)]' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  <BookOpen className={`w-4 h-4 ${selectedSubjectCode !== 'MASTER_SHEET' ? 'text-blue-500' : 'text-slate-400'}`} />
                  Subject Gradebook
                </button>
                <button 
                  onClick={() => setSelectedSubjectCode('MASTER_SHEET')}
                  className={`px-8 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                    selectedSubjectCode === 'MASTER_SHEET' 
                    ? 'bg-white text-indigo-700 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.1)]' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                >
                  <Star className={`w-4 h-4 ${selectedSubjectCode === 'MASTER_SHEET' ? 'text-indigo-500' : 'text-slate-400'}`} />
                  Master Overview
                </button>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex items-end justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">{selectedSubjectCode === 'MASTER_SHEET' ? 'Master Gradebook Report' : selectedSubjectCode || 'No Subject Selected'}</h1>
              <p className="hidden md:block text-xs text-slate-500 mt-1">{currentGradeLevel} — {currentSectionName}</p>
            </div>
            
            <div className="flex items-center gap-3">
              {selectedSubjectCode === 'MASTER_SHEET' && (
                <Button variant="outline" onClick={() => window.print()} className="gap-2 bg-white border-slate-200 shadow-sm hidden sm:flex">
                  <Printer className="w-4 h-4 text-slate-500" />
                  Print Report
                </Button>
              )}
              {selectedSubjectCode !== 'MASTER_SHEET' && (
                <div className="text-sm font-medium text-slate-500 bg-white border border-slate-200 rounded-lg px-4 py-2 shadow-sm">
                  Term Weight: <span className={currentTotalWeight === 100 ? "text-emerald-600 font-bold" : currentTotalWeight > 100 ? "text-rose-600 font-bold" : "text-amber-600 font-bold"}>{currentTotalWeight}%</span> / 100%
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          {selectedSubjectCode !== 'MASTER_SHEET' && (
            <div className="flex items-center gap-1 border-b border-slate-200 mb-6">
              {terms.map(term => (
                <button
                  key={term}
                  onClick={() => setSelectedTerm(term)}
                  className={`px-6 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${
                    selectedTerm === term 
                    ? 'bg-white border-blue-600 text-blue-700 shadow-[0_-2px_10px_-4px_rgba(0,0,0,0.1)]' 
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                  }`}
                >
                  {term}
                </button>
              ))}
            </div>
          )}

          {/* Table Area */}
          {selectedSubjectCode === 'MASTER_SHEET' ? (
            <Card className="bg-white border shadow-sm rounded-xl overflow-hidden flex flex-col">
              <div className="px-4 py-4 border-b bg-indigo-50/50 border-indigo-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-indigo-600" />
                  <span className="font-semibold text-indigo-900">Master Sheet (General Weighted Average)</span>
                </div>
                <div className="text-sm text-indigo-700 font-medium">
                  {paginatedEnrolled.length} Students
                </div>
              </div>
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider py-3 pl-6 min-w-[200px] sticky left-0 bg-slate-50 z-20 shadow-[1px_0_0_0_#e2e8f0]">Student Name</TableHead>
                    {Array.from(new Set([...taughtSubjects, ...advisedSubjects])).map(code => (
                      <TableHead key={code} className="font-semibold text-slate-600 text-[10px] uppercase tracking-wider py-3 text-center min-w-[70px] w-auto" title={code}>
                        <div className="truncate px-1">{code}</div>
                      </TableHead>
                    ))}
                    <TableHead className="font-bold text-indigo-900 text-xs uppercase tracking-wider py-3 text-center pr-6 min-w-[80px] w-[100px] border-l border-slate-200 sticky right-0 bg-slate-50 z-20 shadow-[-1px_0_0_0_#e2e8f0]">GWA</TableHead>
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
                        <TableRow key={s.id} className={`hover:bg-slate-50/80 transition-colors border-b border-slate-200 ${isFailing ? 'bg-red-50/30' : 'bg-white'}`}>
                          <TableCell className={`pl-6 py-2.5 sticky left-0 z-20 shadow-[1px_0_0_0_#e2e8f0] ${isFailing ? 'bg-red-50/90' : 'bg-white'}`}>
                            <span className={`font-semibold text-[13px] ${isFailing ? 'text-red-700' : 'text-slate-800'} whitespace-nowrap`}>
                              {formatStudentName(s.firstName, s.lastName)}
                            </span>
                          </TableCell>
                          {subjGrades.map(sg => (
                            <TableCell key={sg.code} className={`text-center py-2.5 px-1 font-mono text-xs ${sg.isOverride ? 'text-amber-700 bg-amber-50/50 font-bold' : (sg.value !== null && Number(sg.value) < 75 ? 'text-red-600 font-bold bg-red-50/50' : 'text-slate-600')}`}>
                              {sg.value !== null ? Number(sg.value).toFixed(1) : '—'}
                            </TableCell>
                          ))}
                          <TableCell className={`text-center pr-6 py-2.5 font-mono font-bold text-[13px] border-l border-slate-200 sticky right-0 z-20 shadow-[-1px_0_0_0_#e2e8f0] ${isFailing ? 'text-red-700 bg-red-50/90' : 'text-indigo-900 bg-indigo-50/90'}`}>
                            {gwa}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {enrolled.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={Array.from(new Set([...taughtSubjects, ...advisedSubjects])).length + 2} className="text-center py-12 text-slate-500">
                          No students enrolled.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
            </Card>
          ) : (
            <Card className="bg-white border shadow-sm rounded-xl overflow-hidden flex flex-col">
              {/* Table Toolbar */}
              <div className={`px-4 py-3 border-b flex items-center justify-between ${isAuthorized ? 'bg-blue-50/50 border-blue-100' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-2">
                {isAuthorized ? (
                  <>
                    <Edit3 className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-900">Editing Mode Active</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-semibold text-slate-700">{isSubmitted ? 'Submitted (Read-Only)' : 'Read-Only Mode'}</span>
                  </>
                )}
              </div>
              
              <div className="flex items-center gap-4">
                {/* For Teachers */}
                {taughtSubjects.includes(selectedSubjectCode) && !isAdvisorForCurrentSection && (
                  <div className="flex items-center">
                    {submissionStatus === 'unlock-requested' ? (
                      <Badge className="bg-amber-50 text-amber-700 border-amber-200 mr-2 rounded-md shadow-sm h-7 px-3 flex items-center">
                        <AlertCircle className="w-3.5 h-3.5 mr-1" /> Unlock Requested (Pending)
                      </Badge>
                    ) : submissionStatus === 'submitted' ? (
                      <div className="flex items-center mr-2 gap-2">
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 rounded-md shadow-sm h-7 px-3 flex items-center">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Submitted
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-amber-600 border-amber-200 hover:bg-amber-50 h-7 px-3 bg-white"
                          onClick={() => {
                            toastConfirm(
                              "Request Edit Access",
                              "Are you sure you want to request edit access from the adviser? They will need to approve it.",
                              async () => {
                                try {
                                  await requestUnlockGrades(selectedSubjectCode, selectedTerm);
                                  toast.success("Edit access requested successfully.");
                                } catch (e) {
                                  toast.error("Failed to request edit access.");
                                }
                              }
                            )
                          }}
                        >
                          Request Edit Access
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-amber-600 border-amber-200 hover:bg-amber-50 mr-2 h-7 px-3"
                        onClick={handleSubmitToAdviser}
                      >
                        <Send className="w-3.5 h-3.5 mr-1.5" /> Submit to Adviser
                      </Button>
                    )}
                  </div>
                )}

                {/* For Advisers */}
                {isAdvisorForCurrentSection && submissionStatus === 'unlock-requested' && (
                  <Button
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-600 text-white mr-2 h-7 px-4 shadow-sm border-0"
                    onClick={() => {
                      toastConfirm(
                        "Grant Edit Access",
                        `Are you sure you want to unlock the grades for ${selectedSubjectCode} so the teacher can edit them again?`,
                        async () => {
                          try {
                            await grantUnlockGrades(selectedSubjectCode, selectedTerm);
                            toast.success("Grades unlocked for the teacher.");
                          } catch (e) {
                            toast.error("Failed to unlock grades.");
                          }
                        }
                      )
                    }}
                  >
                    Grant Edit Access
                  </Button>
                )}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border bg-white shadow-sm text-xs font-medium transition-all ${
                  isSaving ? 'border-amber-200 text-amber-600' : saved ? 'border-emerald-200 text-emerald-600' : 'border-amber-200 text-amber-600'
                }`}>
                  {isSaving ? 'Saving...' : saved ? 'Changes autosaved' : 'Unsaved changes'}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wider py-4 w-[280px] pl-6">Student</TableHead>
                    {activeColumns.map(col => (
                      <TableHead key={col.id} className="font-semibold text-slate-600 text-xs uppercase tracking-wider py-4 text-center min-w-[120px] relative group">
                        <div className="flex flex-col items-center justify-center">
                          <span>{col.name}</span>
                          <span className="text-[10px] text-slate-400 font-normal">{col.weight}%</span>
                        </div>
                        {isAuthorized && (
                          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEditModal(col)}
                              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title="Edit Column"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete ${col.name}?`)) {
                                  deleteGradeColumn(col.id);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                              title="Delete Column"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </TableHead>
                    ))}
                    {isAuthorized && (
                      <TableHead className="w-[120px] text-center p-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          disabled={remainingWeight <= 0}
                          className="h-8 text-xs border-dashed text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50"
                          onClick={() => setIsAddColumnOpen(true)}
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" /> Add Column
                        </Button>
                      </TableHead>
                    )}
                    <TableHead className="font-bold text-slate-800 text-xs uppercase tracking-wider py-4 text-center pr-6 min-w-[100px] border-l border-slate-200">
                      Final Grade
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEnrolled.map((s) => {
                    const finalRes = getFinalGrade(s.id);
                    const finalVal = typeof finalRes === 'object' ? finalRes.value : finalRes;
                    const isInc = typeof finalRes === 'object' ? finalRes.incomplete : false;

                    return (
                      <TableRow key={s.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-100">
                        <TableCell className="pl-6 py-4">
                          <div className="flex items-center gap-3">
                            {(() => {
                              const photoFields = [(s as any).photoURL, (s as any).photoUrl, (s as any).profilePicture, (s as any).avatarUrl, (s as any).avatar, (s as any).photo];
                              const photo = photoFields.find((p): p is string => typeof p === 'string' && p.trim().length > 0) || null;
                              return photo ? (
                                <img src={photo} alt={s.firstName} className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-sm shrink-0" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center text-xs font-bold shadow-sm shrink-0">
                                  {s.firstName?.charAt(0) || ''}{s.lastName?.charAt(0) || ''}
                                </div>
                              );
                            })()}
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-800 text-sm">
                                {formatStudentName(s.firstName, s.lastName)}
                              </span>
                              {isInc && (
                                <span className="text-[10px] font-medium text-rose-500 flex items-center gap-1 mt-0.5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Incomplete
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {activeColumns.map(col => (
                          <TableCell key={col.id} className="text-center py-4 px-2">
                            <Input
                              type="text"
                              inputMode="decimal"
                              disabled={!isAuthorized}
                              className={`w-16 h-9 font-mono text-center mx-auto text-sm transition-all rounded-lg ${
                                isAuthorized 
                                ? 'border-transparent bg-transparent hover:border-slate-300 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-none hover:shadow-sm focus:shadow-sm' 
                                : 'border-transparent bg-transparent text-slate-500 cursor-default'
                              }`}
                              value={localGrades[s.id]?.[col.id] || ''}
                              onChange={(e) => {
                                if (!isAuthorized) return;
                                const val = e.target.value;
                                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                  if (parseFloat(val) > 100) return;
                                  setLocalGrades({
                                    ...localGrades,
                                    [s.id]: {
                                      ...localGrades[s.id],
                                      [col.id]: val
                                    }
                                  });
                                  setSaved(false);
                                }
                              }}
                              onBlur={() => {
                                if (isAuthorized) handleBlur(s.id, col.id, localGrades[s.id]?.[col.id] || '');
                              }}
                              placeholder={isAuthorized ? "—" : ""}
                            />
                          </TableCell>
                        ))}

                        {isAuthorized && (
                          <TableCell className="p-2"></TableCell>
                        )}

                        <TableCell className="text-center pr-6 py-4 font-mono font-bold text-sm text-slate-800 border-l border-slate-100 bg-slate-50/30">
                          {finalVal}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {enrolled.length === 0 && (
                     <TableRow>
                       <TableCell colSpan={activeColumns.length + (isAuthorized ? 3 : 2)} className="text-center py-12 text-slate-500">
                         No students enrolled in this section.
                       </TableCell>
                     </TableRow>
                  )}
                  {enrolled.length > 0 && activeColumns.length === 0 && (
                     <TableRow>
                       <TableCell colSpan={isAuthorized ? 3 : 2} className="text-center py-12 text-slate-500">
                         No grade columns configured for this term. {isAuthorized && "Click 'Add Column' to start grading."}
                       </TableCell>
                     </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="text-sm text-slate-500 font-medium">
                Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, enrolled.length)} of {enrolled.length} students
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="text-slate-600 border-slate-200 hover:bg-slate-50"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                </Button>
                <div className="text-sm font-medium text-slate-700 px-2 min-w-[5rem] text-center">
                  Page {currentPage} of {totalPages}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="text-slate-600 border-slate-200 hover:bg-slate-50"
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isAddColumnOpen} onOpenChange={setIsAddColumnOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Grading Column</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Column Name (e.g., Written Work, Quiz 1)</Label>
              <Input 
                placeholder="Name" 
                value={newColName} 
                onChange={e => setNewColName(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Weight Percentage (%)</Label>
              <Input 
                type="number" 
                placeholder={remainingWeight.toString()} 
                value={newColWeight} 
                onChange={e => setNewColWeight(e.target.value)} 
                max={remainingWeight}
                min="1"
              />
              <p className="hidden md:block text-xs text-slate-500 mt-1">Remaining weight for this term: {remainingWeight}%</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddColumnOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleAddColumn} 
              disabled={!newColName.trim() || !newColWeight || isNaN(parseFloat(newColWeight)) || parseFloat(newColWeight) > remainingWeight}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Add Column
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingColumnId} onOpenChange={(open) => !open && setEditingColumnId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Grading Column</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Column Name (e.g., Written Work, Quiz 1)</Label>
              <Input 
                placeholder="Name" 
                value={editColName} 
                onChange={e => setEditColName(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Weight Percentage (%)</Label>
              <Input 
                type="number" 
                placeholder="40" 
                value={editColWeight} 
                onChange={e => setEditColWeight(e.target.value)} 
                max={remainingWeight + (gradeConfigurations.find(c => c.id === editingColumnId)?.weight || 0)}
                min="1"
              />
              <p className="hidden md:block text-xs text-slate-500 mt-1">Remaining weight for this term: {remainingWeight + (gradeConfigurations.find(c => c.id === editingColumnId)?.weight || 0)}%</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingColumnId(null)}>Cancel</Button>
            <Button 
              onClick={handleEditColumn} 
              disabled={!editColName.trim() || !editColWeight || isNaN(parseFloat(editColWeight)) || parseFloat(editColWeight) > remainingWeight + (gradeConfigurations.find(c => c.id === editingColumnId)?.weight || 0)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
