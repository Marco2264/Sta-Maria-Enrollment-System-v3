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
import {
  CheckCircle2,
  FileSpreadsheet,
  Calculator,
  AlertCircle,
  Search,
  X,
  Users,
  ChevronDown,
  GraduationCap,
  BookOpen,
  TrendingUp,
  Filter,
  UserCheck,
  Clock,
  Save
} from 'lucide-react';
import { useTeacherData } from '../../lib/teacherData';

export function GradesView() {
  const { students, subjects, updateStudentGrade, loading, currentGradeLevel, currentSectionName, assignedSubjectCodes } = useTeacherData();
  const enrolled = useMemo(() => students.filter((s) => s.status === 'Enrolled'), [students]);

  const [selectedQuarter, setSelectedQuarter] = useState<'q1' | 'q2' | 'q3'>('q1');
  const [localGrades, setLocalGrades] = useState<Record<string, Record<string, string>>>({});
  const [loadedKey, setLoadedKey] = useState<string>('');
  const [saved, setSaved] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const studentsPerPage = 15;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, genderFilter]);

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
    if (loadedKey === currentKey) return;

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
        setLoadedKey('');
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

  const filteredStudents = useMemo(() => {
    let list = enrolled;

    if (genderFilter === 'male') {
      list = list.filter(s => s.gender?.toLowerCase() === 'male');
    } else if (genderFilter === 'female') {
      list = list.filter(s => s.gender?.toLowerCase() === 'female');
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(s => {
        const fullName = `${s.lastName} ${s.firstName}`.toLowerCase();
        const reverseName = `${s.firstName} ${s.lastName}`.toLowerCase();
        const lrn = (s.lrn || '').toLowerCase();
        return fullName.includes(q) || reverseName.includes(q) || lrn.includes(q);
      });
    }

    return list;
  }, [enrolled, searchQuery, genderFilter]);

  const quarterLabels = {
    q1: '1st Term',
    q2: '2nd Term',
    q3: '3rd Term'
  };

  // Calculate statistics
  const totalStudents = enrolled.length;
  const completedStudents = encodedCount;
  const completionRate = totalStudents > 0 ? Math.round((completedStudents / totalStudents) * 100) : 0;

  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);
  const currentStudents = filteredStudents.slice((currentPage - 1) * studentsPerPage, currentPage * studentsPerPage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            {/* Left: Title and metadata */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
                  <FileSpreadsheet className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                    Grade Encoding
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-medium">
                      {currentGradeLevel}
                    </Badge>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">
                      Section {currentSectionName}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Status and stats */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Save Status */}
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300 ${isSaving
                  ? 'bg-blue-50 border-blue-200'
                  : saved
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-amber-50 border-amber-200'
                }`}>
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm font-medium text-blue-700">Saving...</span>
                  </>
                ) : saved ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium text-emerald-700">All saved</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-amber-500 animate-pulse" />
                    <span className="text-sm font-medium text-amber-700">Unsaved changes</span>
                  </>
                )}
              </div>

              {/* Progress Stats */}
              <div className="flex items-center gap-4 bg-white px-5 py-2.5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <Calculator className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Progress</p>
                    <p className="text-sm font-bold text-slate-900">
                      {completedStudents}/{totalStudents}
                      <span className="text-xs font-normal text-slate-500 ml-1">students</span>
                    </p>
                  </div>
                </div>
                <div className="w-px h-8 bg-slate-200" />
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Completion</p>
                  <p className="text-sm font-bold text-slate-900">{completionRate}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Card */}
        <Card className="bg-white border-0 shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 sm:p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50/50 to-white">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* Quarter Selector Dropdown */}
              <div className="relative shrink-0">
                <select
                  value={selectedQuarter}
                  onChange={(e) => { setSelectedQuarter(e.target.value as 'q1' | 'q2' | 'q3'); setSaved(true); }}
                  className="appearance-none pl-4 pr-9 py-2.5 text-sm font-medium rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer text-slate-700"
                >
                  <option value="q1">1st Term</option>
                  <option value="q2">2nd Term</option>
                  <option value="q3">3rd Term</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>

              {/* Right toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 sm:min-w-[240px]">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-9 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Gender Filter Dropdown */}
                <div className="relative shrink-0">
                  <select
                    value={genderFilter}
                    onChange={(e) => setGenderFilter(e.target.value as 'all' | 'male' | 'female')}
                    className="appearance-none pl-4 pr-9 py-2.5 text-sm font-medium rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer text-slate-700"
                  >
                    <option value="all">All Students</option>
                    <option value="male">♂ Male</option>
                    <option value="female">♀ Female</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>



          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80 border-b border-slate-200">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wider pl-6 py-3.5 w-12 text-center">
                    #
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wider py-3.5 w-72 pl-4">
                    Student
                  </TableHead>
                  {sectionSubjects.length === 0 ? (
                    <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wider py-3.5 text-center">
                      No Subjects Assigned
                    </TableHead>
                  ) : (
                    sectionSubjects.map((sub) => (
                      <TableHead
                        key={sub.code ?? sub.name}
                        className="font-semibold text-slate-600 text-xs uppercase tracking-wider text-center whitespace-nowrap px-3 py-3.5"
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>{sub.name}</span>
                        </div>
                      </TableHead>
                    ))
                  )}
                  <TableHead className="font-semibold text-slate-600 text-xs uppercase tracking-wider text-center pr-6 py-3.5 w-32">
                    <div className="flex items-center justify-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Average</span>
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrolled.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={sectionSubjects.length + 3} className="text-center py-20">
                      <div className="flex flex-col items-center gap-3 text-slate-400">
                        <Users className="w-12 h-12 opacity-30" />
                        <p className="font-medium text-slate-500">No enrolled students</p>
                        <p className="text-sm">This section doesn't have any students yet.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : sectionSubjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-20">
                      <div className="flex flex-col items-center gap-3 text-slate-400">
                        <BookOpen className="w-12 h-12 opacity-30" />
                        <p className="font-medium text-slate-500">No subjects configured</p>
                        <p className="text-sm">Please add subjects for {currentGradeLevel}.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={sectionSubjects.length + 3} className="text-center py-20">
                      <div className="flex flex-col items-center gap-3 text-slate-400">
                        <Search className="w-12 h-12 opacity-30" />
                        <p className="font-medium text-slate-500">No results found</p>
                        <p className="text-sm">No students match "<span className="font-medium text-slate-600">{searchQuery}</span>"</p>
                        <button
                          onClick={() => setSearchQuery('')}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          Clear search
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  currentStudents.map((s, idx) => {
                    const isMale = s.gender === 'Male';
                    const globalIdx = (currentPage - 1) * studentsPerPage + idx + 1;
                    return (
                      <TableRow
                        key={s.id}
                        className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors group"
                      >
                        <TableCell className="pl-6 py-3.5 text-slate-400 font-medium text-xs text-center">
                          {globalIdx}
                        </TableCell>
                        <TableCell className="pl-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold shadow-sm shrink-0 ${isMale
                                ? 'bg-blue-50 text-blue-600 border-blue-200'
                                : 'bg-pink-50 text-pink-600 border-pink-200'
                              }`}>
                              {s.firstName?.charAt(0) || ''}{s.lastName?.charAt(0) || ''}
                            </div>
                            <div className="flex flex-col text-left">
                              <span className="font-semibold text-slate-800 text-sm">
                                {formatStudentName(s.firstName, s.lastName)}
                              </span>
                              <span className="text-xs text-slate-400 font-mono">{s.lrn}</span>
                            </div>
                          </div>
                        </TableCell>
                        {sectionSubjects.map((sub) => {
                          const code = sub.code ?? sub.name;
                          const isAuthorized = assignedSubjectCodes.includes(code);
                          return (
                                <TableCell key={code} className="text-center px-2 py-3.5">
                                  <Input
                                    type="text"
                                    inputMode="decimal"
                                    disabled={!isAuthorized}
                                    className={`w-16 h-10 font-mono text-center mx-auto text-sm transition-all rounded-lg shadow-sm ${
                                      isAuthorized 
                                      ? 'border-slate-200 hover:border-blue-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white' 
                                      : 'border-slate-100 bg-slate-50/50 text-slate-400 cursor-not-allowed opacity-70'
                                    }`}
                                    value={localGrades[s.id]?.[code] || ''}
                                    onChange={(e) => {
                                      if (!isAuthorized) return;
                                      const val = e.target.value;
                                      if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                        if (parseFloat(val) > 100) return;
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
                                    onBlur={() => {
                                      if (isAuthorized) handleBlur(s.id, code, localGrades[s.id]?.[code] || '');
                                    }}
                                    title={!isAuthorized ? "You are not assigned to encode grades for this subject" : ""}
                                  />
                                </TableCell>
                          );
                        })}
                        <TableCell className="text-center pr-6 py-3.5">
                          <Badge className="bg-gradient-to-r from-slate-100 to-slate-50 text-slate-700 font-mono text-sm px-3.5 py-1.5 border border-slate-200 shadow-sm rounded-lg min-w-[48px] inline-flex justify-center">
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

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <UserCheck className="w-4 h-4" />
              <span>
                <strong className="text-slate-700">{filteredStudents.length}</strong> students total
              </span>
              <span className="w-px h-4 bg-slate-300" />
              <span>
                <strong className="text-slate-700">{sectionSubjects.length}</strong> subjects
              </span>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 rounded-lg"
                >
                  Previous
                </Button>
                <span className="text-sm text-slate-600 font-medium px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 rounded-lg"
                >
                  Next
                </Button>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              <span>Auto-save enabled</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}