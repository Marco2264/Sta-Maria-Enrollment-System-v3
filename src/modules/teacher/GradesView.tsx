import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
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
import { Save, CheckCircle2, FileSpreadsheet, Calculator, BookOpen, User, GraduationCap, AlertCircle } from 'lucide-react';
import { useTeacherData } from '../../lib/teacherData';

export function GradesView() {
  const { students, subjects, updateStudentGrade, loading, currentGradeLevel, currentSectionName } = useTeacherData();
  const enrolled = useMemo(() => students.filter((s) => s.status === 'Enrolled'), [students]);
  
  const [selectedQuarter, setSelectedQuarter] = useState<'q1' | 'q2' | 'q3' | 'q4'>('q1');
  const [localGrades, setLocalGrades] = useState<Record<string, Record<string, string>>>({});
  const [loadedKey, setLoadedKey] = useState<string>('');
  const [saved, setSaved] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Filter subjects strictly to match teacher's grade level
  const sectionSubjects = useMemo(() => {
    return subjects.filter((sub) => {
      const subGrade = (sub.gradeLevel || '').toLowerCase().replace(/grade\s*/g, '').trim();
      const teacherGrade = (currentGradeLevel || '').toLowerCase().replace(/grade\s*/g, '').trim();
      return subGrade === teacherGrade;
    });
  }, [subjects, currentGradeLevel]);

  useEffect(() => {
    if (loading || sectionSubjects.length === 0) return;
    const currentKey = `${selectedQuarter}_${currentGradeLevel}_${currentSectionName}`;
    if (loadedKey === currentKey) return; // Prevent overwriting unsaved user edits

    const map: Record<string, Record<string, string>> = {};
    const gradeKey = currentGradeLevel || 'Grade 6';
    enrolled.forEach((s) => {
      map[s.id] = {};
      sectionSubjects.forEach((sub) => {
        const code = sub.code ?? sub.name;
        const gradeData = (s.grades as Record<string, any>)?.[gradeKey]?.[code];
        if (typeof gradeData === 'object' && gradeData !== null) {
          map[s.id][code] = gradeData[selectedQuarter]?.toString() || '';
        } else {
          // Check legacy flat grade if we are in q1
          const legacyData = (s.grades as Record<string, any>)?.[code];
          if (legacyData && typeof legacyData !== 'object') {
            map[s.id][code] = selectedQuarter === 'q1' ? legacyData.toString() : '';
          } else {
            map[s.id][code] = '';
          }
        }
      });
    });
    setLocalGrades(map);
    setLoadedKey(currentKey);
  }, [loading, enrolled, sectionSubjects, selectedQuarter, currentGradeLevel, currentSectionName, loadedKey]);



  const handleBlur = async (studentId: string, code: string, val: string) => {
    const trimmed = (val || '').trim();
    const student = enrolled.find(s => s.id === studentId);
    if (!student) return;
    const gradeKey = currentGradeLevel || 'Grade 6';
    const dbGradeObj = (student.grades as Record<string, any>)?.[gradeKey]?.[code];
    let dbValueStr = '';
    
    if (typeof dbGradeObj === 'object' && dbGradeObj !== null) {
      dbValueStr = dbGradeObj[selectedQuarter]?.toString() || '';
    } else {
      const legacyData = (student.grades as Record<string, any>)?.[code];
      if (legacyData && typeof legacyData !== 'object') {
        dbValueStr = selectedQuarter === 'q1' ? legacyData.toString() : '';
      }
    }
    
    if (trimmed !== dbValueStr) {
      setIsSaving(true);
      setSaved(false);
      try {
        if (trimmed === '') {
          await updateStudentGrade(studentId, code, selectedQuarter, null);
        } else {
          const num = parseFloat(trimmed);
          if (!isNaN(num)) {
            await updateStudentGrade(studentId, code, selectedQuarter, num);
          }
        }
        setSaved(true);
        setLoadedKey(''); // Force reload from database to verify and sync
      } catch (err) {
        console.error("Auto-save error:", err);
        setSaved(false);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const getAvg = (studentId: string) => {
    const vals = Object.values(localGrades[studentId] || {})
      .map((v) => parseFloat(v))
      .filter((v) => !isNaN(v));
    return vals.length > 0
      ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)
      : '--';
  };

  const formatStudentName = (firstName: string | undefined, lastName: string | undefined) => {
    const first = (firstName || '').trim();
    const last = (lastName || '').trim();
    if (!last) return first || 'Unnamed Student';
    if (!first) return last || 'Unnamed Student';
    return `${last}, ${first}`;
  };

  const encodedCount = enrolled.filter(s => getAvg(s.id) !== '--').length;

  const quarterLabels = {
    q1: '1st Quarter',
    q2: '2nd Quarter',
    q3: '3rd Quarter',
    q4: '4th Quarter'
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 relative overflow-hidden">
      {/* Soft Ambient Background Glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

      <header className="relative px-8 py-10 border-b border-slate-200 bg-white/70 backdrop-blur-md shrink-0 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 max-w-7xl mx-auto w-full">
          <div className="space-y-1 text-left">
            <div className="flex flex-wrap items-center gap-3 text-slate-800">
              <div className="p-2.5 bg-slate-100 rounded-2xl text-primary shadow-sm border border-slate-200">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Grade Encoding</h1>
              
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
            <p className="text-sm text-slate-500 pl-14">
              Manage student grade sheets grouped by quarter for the subjects assigned to your grade level.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
            <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm w-full sm:w-auto justify-center">
              <Calculator className="w-4 h-4 text-emerald-500 shrink-0" />
              <div className="text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Encoding Progress</p>
                <p className="text-sm font-bold text-slate-700 leading-tight mt-0.5">{encodedCount} / {enrolled.length} Students</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 sm:p-8 lg:p-10 space-y-8 max-w-7xl mx-auto w-full relative">
        <Card className="bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="p-6 border-b border-slate-100 bg-white/50 space-y-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-0.5 text-left">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-xl text-slate-900">Class Gradesheet</h3>
                <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200/60 text-indigo-700 uppercase tracking-wider">
                  {currentGradeLevel}
                </span>
                <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200/60 text-emerald-700 uppercase tracking-wider">
                  Section {currentSectionName}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Select a quarter, update input cells, and save changes.</p>
            </div>

            {/* Quarter selector tabs */}
            <div className="flex gap-1.5 p-1.5 bg-slate-100 rounded-2xl w-fit border border-slate-200/60 self-start md:self-center shrink-0">
              {(['q1', 'q2', 'q3', 'q4'] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => { setSelectedQuarter(q); setSaved(true); }}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                    selectedQuarter === q
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {quarterLabels[q]}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/70 border-b border-slate-100">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider pl-6 py-4 w-12 text-center">#</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider py-4 w-72 pl-4">Learner Name</TableHead>
                  {sectionSubjects.length === 0 ? (
                    <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider py-4 text-center">Subjects</TableHead>
                  ) : (
                    sectionSubjects.map((sub) => (
                      <TableHead
                        key={sub.code ?? sub.name}
                        className="font-bold text-slate-700 text-xs uppercase tracking-wider text-center whitespace-nowrap px-4 py-4"
                      >
                        {sub.name}
                      </TableHead>
                    ))
                  )}
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider text-center whitespace-nowrap pr-6 py-4 w-32">
                    Average ({selectedQuarter.toUpperCase()})
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrolled.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={sectionSubjects.length + 3} className="text-center py-16 text-slate-400 font-medium">
                      No enrolled students found in this section.
                    </TableCell>
                  </TableRow>
                ) : sectionSubjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-16 text-slate-400 font-medium">
                      No subjects configured for {currentGradeLevel} yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  enrolled.map((s, idx) => {
                    const isMale = s.gender === 'Male';
                    return (
                      <TableRow
                        key={s.id}
                        className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                      >
                        <TableCell className="pl-6 py-4 text-slate-400 font-bold text-xs text-center">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="pl-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full border flex items-center justify-center text-xs font-bold shadow-sm shrink-0 ${
                              isMale 
                                ? 'bg-blue-50 text-blue-700 border-blue-100' 
                                : 'bg-pink-50 text-pink-700 border-pink-100'
                            }`}>
                              {s.firstName?.charAt(0) || ''}{s.lastName?.charAt(0) || ''}
                            </div>
                            <div className="flex flex-col text-left">
                              <span className="font-bold text-slate-800 text-sm tracking-tight">
                                {formatStudentName(s.firstName, s.lastName)}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono mt-0.5">{s.lrn}</span>
                            </div>
                          </div>
                        </TableCell>
                        {sectionSubjects.map((sub) => {
                          const code = sub.code ?? sub.name;
                          return (
                            <TableCell key={code} className="text-center px-2 py-4">
                              <Input
                                type="text"
                                inputMode="decimal"
                                className="w-16 h-9 font-mono text-center mx-auto text-sm border-slate-200 hover:border-primary focus:ring-primary/20 transition-all rounded-lg shadow-sm"
                                value={localGrades[s.id]?.[code] || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  // Allow only numbers and one decimal point
                                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                    if (parseFloat(val) > 100) return; // Cap at 100
                                    setLocalGrades({
                                      ...localGrades,
                                      [s.id]: {
                                        ...localGrades[s.id],
                                        [code]: val
                                      }
                                    });
                                    setSaved(false);
                                  }
                                }}
                                onBlur={() => handleBlur(s.id, code, localGrades[s.id]?.[code] || '')}
                              />
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center pr-6 py-4">
                          <Badge
                            variant="secondary"
                            className="bg-slate-50 text-slate-700 font-mono text-xs px-3 py-1 border border-slate-200/80 shadow-sm rounded-lg"
                          >
                            {getAvg(s.id)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}