import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useTeacherData } from '../../lib/teacherData';
import {
  Heart,
  Save,
  CheckCircle2,
  User,
  HelpCircle,
  Award,
  Shield,
  Leaf,
  Flag,
  Search,
  Users,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  Layers,
  Info,
  Check
} from 'lucide-react';
import { cn } from '../../components/ui/utils';

type RatingValue = 'AO' | 'SO' | 'RO' | 'NO' | '';

interface CoreValueCategory {
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  badgeBg: string;
  headerBg: string;
  items: { key: string; statement: string }[];
}

const coreValuesList: CoreValueCategory[] = [
  {
    category: '1. Maka-Diyos',
    icon: Shield,
    colorClass: 'text-amber-600 bg-amber-50 border-amber-200/80',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
    headerBg: 'bg-amber-50/60 border-amber-100',
    items: [
      { key: 'makaDiyos1', statement: 'Expresses one’s spiritual beliefs while respecting the spiritual beliefs of others.' },
      { key: 'makaDiyos2', statement: 'Shows adherence to ethical principles by upholding truth and honesty.' }
    ]
  },
  {
    category: '2. Makatao',
    icon: Heart,
    colorClass: 'text-rose-600 bg-rose-50 border-rose-200/80',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
    headerBg: 'bg-rose-50/60 border-rose-100',
    items: [
      { key: 'makatao1', statement: 'Is sensitive to individual, social, and cultural differences.' },
      { key: 'makatao2', statement: 'Demonstrates contributions towards solidarity and teamwork.' }
    ]
  },
  {
    category: '3. Maka-Kalikasan',
    icon: Leaf,
    colorClass: 'text-emerald-600 bg-emerald-50 border-emerald-200/80',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    headerBg: 'bg-emerald-50/60 border-emerald-100',
    items: [
      { key: 'makakalikasan1', statement: 'Cares for the environment and utilizes resources wisely and economically.' }
    ]
  },
  {
    category: '4. Makabansa',
    icon: Flag,
    colorClass: 'text-blue-600 bg-blue-50 border-blue-200/80',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    headerBg: 'bg-blue-50/60 border-blue-100',
    items: [
      { key: 'makabansa1', statement: 'Demonstrates pride in being a Filipino; exercises rights and duties.' },
      { key: 'makabansa2', statement: 'Demonstrates appropriate behavior in carrying out school and community duties.' }
    ]
  }
];

const RATING_OPTIONS: { val: RatingValue; label: string; desc: string; color: string; activeColor: string }[] = [
  { val: 'AO', label: 'AO', desc: 'Always Observed', color: 'text-emerald-700 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/70', activeColor: 'bg-emerald-600 text-white border-emerald-600 shadow-xs' },
  { val: 'SO', label: 'SO', desc: 'Sometimes Observed', color: 'text-blue-700 border-blue-200 bg-blue-50/50 hover:bg-blue-100/70', activeColor: 'bg-blue-600 text-white border-blue-600 shadow-xs' },
  { val: 'RO', label: 'RO', desc: 'Rarely Observed', color: 'text-amber-700 border-amber-200 bg-amber-50/50 hover:bg-amber-100/70', activeColor: 'bg-amber-600 text-white border-amber-600 shadow-xs' },
  { val: 'NO', label: 'NO', desc: 'Not Observed', color: 'text-rose-700 border-rose-200 bg-rose-50/50 hover:bg-rose-100/70', activeColor: 'bg-rose-600 text-white border-rose-600 shadow-xs' }
];

export function ObservedValuesView() {
  const {
    students,
    updateStudentObservedValue,
    loading,
    currentGradeLevel,
    currentSectionName,
    assignedSections,
    currentSection,
    setCurrentSection
  } = useTeacherData();

  const safeStudents = useMemo(() => (Array.isArray(students) ? students.filter(Boolean) : []), [students]);
  const enrolled = useMemo(() => safeStudents.filter((s) => s && s.status !== 'Pending' && s.status !== 'Rejected'), [safeStudents]);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedQuarter, setSelectedQuarter] = useState<'q1' | 'q2' | 'q3'>('q1');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(true);
  const [mobileViewTab, setMobileViewTab] = useState<'list' | 'sheet'>('list');

  // Filtered by search term
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return enrolled;
    const q = searchQuery.toLowerCase().trim();
    return enrolled.filter((s) => {
      if (!s) return false;
      const fName = (s.firstName || '').toLowerCase();
      const lName = (s.lastName || '').toLowerCase();
      const lrn = (s.lrn ?? '').toString().toLowerCase();
      return fName.includes(q) || lName.includes(q) || lrn.includes(q);
    });
  }, [enrolled, searchQuery]);

  // Default select first student once loaded
  useEffect(() => {
    if (enrolled.length > 0) {
      if (!selectedStudentId || !enrolled.some(s => s && s.id === selectedStudentId)) {
        setSelectedStudentId(enrolled[0].id);
      }
    }
  }, [enrolled, selectedStudentId]);

  const selectedStudent = useMemo(() => {
    return enrolled.find(s => s && s.id === selectedStudentId) || (enrolled.length > 0 ? enrolled[0] : null);
  }, [enrolled, selectedStudentId]);

  const isSelectedInactive = selectedStudent?.status === 'Transferred Out' || selectedStudent?.status === 'Dropped' || selectedStudent?.status === 'Transferred';

  const handleRatingChange = async (statementKey: string, val: RatingValue) => {
    if (!selectedStudent || !selectedStudent.id || isSelectedInactive) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const finalVal = val === '' ? null : val;
      await updateStudentObservedValue(selectedStudent.id, statementKey, selectedQuarter, finalVal);
      setSaveSuccess(true);
    } catch (err) {
      console.error('Error saving observed values:', err);
      setSaveSuccess(false);
    } finally {
      setIsSaving(false);
    }
  };

  const getRatingValue = (statementKey: string): RatingValue => {
    if (!selectedStudent) return '';
    const gradeKey = currentGradeLevel || 'Grade 6';
    const cleanGLvl = gradeKey.toString().replace(/grade\s*/i, '').trim();

    const obs = (selectedStudent as any)?.observedValues;
    if (!obs || typeof obs !== 'object') return '';

    const val = obs[gradeKey]?.[statementKey]?.[selectedQuarter]
      || obs[`Grade ${cleanGLvl}`]?.[statementKey]?.[selectedQuarter]
      || obs[cleanGLvl]?.[statementKey]?.[selectedQuarter];

    return (val || '') as RatingValue;
  };

  const formatStudentName = (firstName: string | undefined, lastName: string | undefined) => {
    const first = (firstName || '').toString().trim();
    const last = (lastName || '').toString().trim();
    if (!last) return first || 'Unnamed Student';
    if (!first) return last || 'Unnamed Student';
    return `${last}, ${first}`;
  };

  const currentStudentInitials = useMemo(() => {
    if (!selectedStudent) return 'S';
    const first = (selectedStudent.firstName || 'S').toString().charAt(0).toUpperCase();
    const last = (selectedStudent.lastName || '').toString().charAt(0).toUpperCase();
    return `${first}${last}` || 'S';
  }, [selectedStudent]);

  const getStudentPhoto = (s: any): string | null => {
    if (!s) return null;
    const fields = [s.photoURL, s.photoUrl, s.profilePicture, s.avatarUrl, s.avatar, s.photo];
    const direct = fields.find((p): p is string => typeof p === 'string' && p.trim().length > 0);
    if (direct) return direct.trim();
    const reqs = s.requirementUploads;
    if (reqs && typeof reqs === 'object') {
      for (const key of Object.keys(reqs)) {
        if (!key) continue;
        const lower = key.toString().toLowerCase();
        if (lower.includes('2x2') || lower.includes('photo') || lower.includes('picture') || lower.includes('avatar')) {
          const fileUrl = reqs[key]?.fileUrl;
          if (typeof fileUrl === 'string' && fileUrl.trim()) return fileUrl.trim();
        }
      }
    }
    return null;
  };

  // Completion stats for entire class
  const classStats = useMemo(() => {
    let ratedCount = 0;
    enrolled.forEach((s) => {
      const isComplete = coreValuesList.every((cv) =>
        cv.items.every((item) => {
          const gradeKey = currentGradeLevel || 'Grade 6';
          const cleanGLvl = gradeKey.toString().replace(/grade\s*/i, '').trim();
          const obs = (s as any)?.observedValues;
          if (!obs || typeof obs !== 'object') return false;
          const val = obs[gradeKey]?.[item.key]?.[selectedQuarter]
            || obs[`Grade ${cleanGLvl}`]?.[item.key]?.[selectedQuarter]
            || obs[cleanGLvl]?.[item.key]?.[selectedQuarter];
          return !!val;
        })
      );
      if (isComplete) ratedCount++;
    });
    return {
      rated: ratedCount,
      total: enrolled.length,
      percent: enrolled.length > 0 ? Math.round((ratedCount / enrolled.length) * 100) : 0
    };
  }, [enrolled, selectedQuarter, currentGradeLevel]);

  // Completion calculation for currently selected student
  const completedCount = useMemo(() => {
    if (!selectedStudent) return 0;
    let count = 0;
    coreValuesList.forEach(cv => {
      cv.items.forEach(item => {
        if (getRatingValue(item.key)) count++;
      });
    });
    return count;
  }, [selectedStudent, selectedQuarter, currentGradeLevel]);

  const totalQuestions = 7;
  const progressPercent = Math.round((completedCount / totalQuestions) * 100);

  return (
    <div className="flex flex-col h-full bg-[#F4F7F9] font-sans relative overflow-hidden">
      {/* ── 1. TOP HEADER BAR ── */}
      <header className="h-[72px] px-4 sm:px-8 border-b border-slate-200/80 bg-white shrink-0 flex items-center justify-between shadow-2xs z-10">
        <div className="flex items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-[#D8232A] flex items-center justify-center shrink-0 border border-rose-200/60 shadow-inner">
              <Heart className="w-5 h-5 fill-current" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#D8232A]">
                  Values Assessment
                </span>
                {/* Live Sync Status Pill */}
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200/60 text-[9px] font-bold select-none">
                  {isSaving ? (
                    <>
                      <Save className="w-2.5 h-2.5 animate-spin text-[#D8232A]" />
                      <span className="text-[#D8232A]">Saving...</span>
                    </>
                  ) : saveSuccess ? (
                    <>
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                      <span className="text-emerald-700">Saved</span>
                    </>
                  ) : (
                    <>
                      <HelpCircle className="w-2.5 h-2.5 text-amber-600" />
                      <span className="text-amber-700">Unsaved</span>
                    </>
                  )}
                </div>
              </div>
              <h1 className="text-sm sm:text-base font-black text-slate-900 leading-tight truncate">
                Learner Observed Values
              </h1>
            </div>
          </div>

          {/* Term Selector Strip */}
          <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/70 shrink-0">
            {(['q1', 'q2', 'q3'] as const).map((q) => (
              <button
                key={q}
                onClick={() => setSelectedQuarter(q)}
                className={cn(
                  "px-3 sm:px-4 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer",
                  selectedQuarter === q
                    ? "bg-white text-[#D8232A] shadow-xs border border-slate-200/50"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                {q === 'q1' ? '1st Term' : q === 'q2' ? '2nd Term' : '3rd Term'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── 2. MOBILE TAB SELECTOR (Visible only on < lg screens) ── */}
      <div className="lg:hidden bg-white border-b border-slate-200/80 px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileViewTab('list')}
            className={cn(
              "px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5",
              mobileViewTab === 'list'
                ? "bg-[#D8232A] text-white shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Class List ({enrolled.length})</span>
          </button>

          <button
            onClick={() => setMobileViewTab('sheet')}
            className={cn(
              "px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5",
              mobileViewTab === 'sheet'
                ? "bg-[#D8232A] text-white shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Evaluation Form</span>
          </button>
        </div>

        {selectedStudent && (
          <span className="text-[11px] font-bold text-slate-500 truncate max-w-[140px]">
            {selectedStudent.lastName}
          </span>
        )}
      </div>

      {/* ── 3. BODY CONTENT ── */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-3">
          <div className="w-10 h-10 border-4 border-[#D8232A]/20 border-t-[#D8232A] rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-500">Loading student records...</p>
        </div>
      ) : enrolled.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto space-y-3">
          <div className="w-14 h-14 rounded-3xl bg-rose-50 text-[#D8232A] flex items-center justify-center mx-auto border border-rose-100 shadow-inner">
            <Heart className="w-7 h-7" />
          </div>
          <h2 className="text-base font-black text-slate-800">No Enrolled Students</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            There are no enrolled students in {currentGradeLevel || 'this grade'} {currentSectionName ? `— ${currentSectionName}` : ''} ready to rate.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden w-full min-h-0">
          
          {/* ── LEFT PANE: STUDENT CLASS ROSTER SIDEBAR ── */}
          <aside className={cn(
            "w-full lg:w-84 border-r border-slate-200/80 bg-white flex flex-col shrink-0 overflow-hidden h-full z-10 transition-all",
            mobileViewTab === 'sheet' ? "hidden lg:flex" : "flex"
          )}>
            {/* Sidebar Top: Section Info & Class Progress */}
            <div className="p-3.5 border-b border-slate-100 bg-slate-50/60 space-y-3 shrink-0">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#D8232A]" />
                    Class Roster
                  </span>
                  <p className="text-xs font-black text-slate-800 truncate mt-0.5">
                    {currentGradeLevel || 'Grade'} • {currentSectionName || 'Section'}
                  </p>
                </div>

                {/* Section Selector Dropdown if multiple sections assigned */}
                {Array.isArray(assignedSections) && assignedSections.length > 1 && (
                  <select
                    value={currentSection}
                    onChange={(e) => setCurrentSection(e.target.value)}
                    className="text-[11px] font-bold bg-white border border-slate-200 rounded-xl px-2 py-1 text-slate-700 shadow-2xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#D8232A]"
                  >
                    {assignedSections.map((sec) => (
                      <option key={sec.sectionId} value={sec.sectionId}>
                        {sec.name || sec.gradeLevel || sec.sectionId}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Class Rated Progress Bar */}
              <div className="bg-white p-2.5 rounded-2xl border border-slate-200/70 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-600">Quarter Completion:</span>
                  <span className="font-black text-[#D8232A]">{classStats.rated} / {classStats.total} ({classStats.percent}%)</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-300"
                    style={{ width: `${classStats.percent}%` }}
                  />
                </div>
              </div>

              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search student or LRN..."
                  className="h-8.5 pl-8.5 pr-8 text-xs rounded-xl bg-white border-slate-200 focus:bg-white"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer border-0 bg-transparent"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Student Items */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {filteredStudents.length === 0 ? (
                <div className="py-8 text-center px-4 space-y-2">
                  <Users className="w-7 h-7 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">No students match search</p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-[11px] text-[#D8232A] font-bold hover:underline cursor-pointer border-0 bg-transparent"
                  >
                    Clear search filter
                  </button>
                </div>
              ) : (
                filteredStudents.map((s) => {
                  if (!s) return null;
                  const active = s.id === selectedStudent?.id;
                  const hasRatings = coreValuesList.every(cv =>
                    cv.items.every(item => {
                      const gradeKey = currentGradeLevel || 'Grade 6';
                      const cleanGLvl = gradeKey.toString().replace(/grade\s*/i, '').trim();
                      const obs = (s as any)?.observedValues;
                      if (!obs || typeof obs !== 'object') return false;
                      const val = obs[gradeKey]?.[item.key]?.[selectedQuarter]
                        || obs[`Grade ${cleanGLvl}`]?.[item.key]?.[selectedQuarter]
                        || obs[cleanGLvl]?.[item.key]?.[selectedQuarter];
                      return !!val;
                    })
                  );

                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedStudentId(s.id);
                        setMobileViewTab('sheet');
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 p-2.5 rounded-2xl transition-all text-left cursor-pointer border relative group",
                        active
                          ? "bg-red-50/90 border-red-200/90 text-slate-900 shadow-2xs font-bold"
                          : "bg-white border-transparent text-slate-600 hover:bg-slate-50/80 hover:text-slate-900"
                      )}
                    >
                      {/* Active Indicator Left Pill */}
                      {active && (
                        <div className="absolute left-0 top-2 bottom-2 w-1 bg-[#D8232A] rounded-r-full shadow-xs" />
                      )}

                      {(() => {
                        const photo = getStudentPhoto(s);
                        const fInit = (s.firstName || 'S').toString().charAt(0).toUpperCase();
                        const lInit = (s.lastName || '').toString().charAt(0).toUpperCase();
                        return photo ? (
                          <img src={photo} alt={s.firstName || 'Student'} className="w-8.5 h-8.5 rounded-xl object-cover shrink-0 border border-slate-200" />
                        ) : (
                          <div className={cn(
                            "w-8.5 h-8.5 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-transform group-hover:scale-105",
                            active ? "bg-[#D8232A] text-white shadow-2xs" : "bg-red-100 text-[#D8232A]"
                          )}>
                            {fInit}{lInit}
                          </div>
                        );
                      })()}

                      <div className="flex-1 min-w-0">
                        <p className={cn("text-xs truncate uppercase font-bold", active && "font-black text-[#D8232A]")}>
                          {formatStudentName(s.firstName, s.lastName)}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                          LRN: {(s.lrn ?? 'No LRN').toString()}
                        </p>
                      </div>

                      {hasRatings ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-black text-[9px] rounded-lg shrink-0 flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> Done
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-300 font-medium shrink-0 group-hover:text-slate-400">
                          Pending
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* ── RIGHT PANE: ENCODING SHEET ── */}
          <main className={cn(
            "flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-5 bg-[#F4F7F9] min-h-0 custom-scrollbar",
            mobileViewTab === 'list' ? "hidden lg:block" : "block"
          )}>
            {selectedStudent ? (
              <div className="space-y-5 max-w-4xl mx-auto w-full pb-12">
                
                {/* Mobile Back Button */}
                <div className="lg:hidden flex items-center justify-between">
                  <button
                    onClick={() => setMobileViewTab('list')}
                    className="flex items-center gap-1 text-xs font-bold text-[#D8232A] hover:underline cursor-pointer border-0 bg-transparent py-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back to Student Roster</span>
                  </button>
                </div>

                {/* 1. Student Header Card */}
                <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    {(() => {
                      const photo = getStudentPhoto(selectedStudent);
                      return photo ? (
                        <img
                          src={photo}
                          alt={selectedStudent.firstName || 'Student'}
                          className="w-13 h-13 rounded-2xl object-cover border border-rose-200/60 shadow-inner shrink-0"
                        />
                      ) : (
                        <div className="w-13 h-13 bg-red-100 text-[#D8232A] font-black text-base rounded-2xl flex items-center justify-center shrink-0 border border-red-200 shadow-inner">
                          {currentStudentInitials}
                        </div>
                      );
                    })()}
                    <div className="min-w-0">
                      <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight uppercase truncate">
                        {formatStudentName(selectedStudent.firstName, selectedStudent.lastName)}
                      </h2>
                      <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                        {currentGradeLevel || 'Grade Level'} {currentSectionName ? `• Section ${currentSectionName}` : ''} • LRN: <span className="font-bold text-slate-700">{(selectedStudent.lrn ?? 'No LRN').toString()}</span>
                      </p>
                    </div>
                  </div>

                  {/* Progress Indicator */}
                  <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-100 shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase">Assessment Progress</p>
                      <p className="text-xs font-black text-slate-800">{completedCount} of {totalQuestions} Items Rated</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-black text-xs text-[#D8232A] shadow-2xs">
                      {progressPercent}%
                    </div>
                  </div>
                </div>

                {/* 2. Rating Scale Guide Bar */}
                <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-black text-slate-700 uppercase text-[10px] tracking-wider shrink-0 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-[#D8232A]" />
                    DepEd Rating Scale:
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {RATING_OPTIONS.map((opt) => (
                      <span key={opt.val} className={cn("px-2 py-0.5 rounded-lg border text-[11px] font-extrabold inline-flex items-center gap-1", opt.color)}>
                        <span className="font-black">{opt.label}</span>
                        <span className="text-[10px] font-normal opacity-85">— {opt.desc}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* 3. DepEd Core Values Question Categories */}
                <div className="space-y-4">
                  {coreValuesList.map((cv, cvIdx) => {
                    const Icon = cv.icon;
                    return (
                      <Card key={cvIdx} className="overflow-hidden border border-slate-200/90 bg-white rounded-3xl shadow-2xs">
                        <div className={cn("px-5 py-3.5 border-b flex items-center gap-3", cv.headerBg)}>
                          <div className={cn("p-1.5 rounded-xl border shadow-2xs", cv.colorClass)}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="font-black text-slate-900 text-xs sm:text-sm tracking-wide uppercase">
                            {cv.category}
                          </span>
                        </div>

                        <div className="divide-y divide-slate-100">
                          {cv.items.map((item, itemIdx) => {
                            const val = getRatingValue(item.key);
                            return (
                              <div
                                key={itemIdx}
                                className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 hover:bg-slate-50/40 transition-colors"
                              >
                                <p className="text-slate-700 text-xs sm:text-sm font-semibold leading-relaxed max-w-xl">
                                  {item.statement}
                                </p>

                                {/* Rating Radio / Pill Selectors */}
                                <div className="flex items-center gap-1.5 shrink-0 self-start md:self-auto">
                                  {RATING_OPTIONS.map((opt) => {
                                    const isSelected = val === opt.val;
                                    return (
                                      <button
                                        key={opt.val}
                                        type="button"
                                        onClick={() => handleRatingChange(item.key, isSelected ? '' : opt.val)}
                                        title={opt.desc}
                                        className={cn(
                                          "px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer",
                                          isSelected
                                            ? opt.activeColor
                                            : "bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100"
                                        )}
                                      >
                                        {opt.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-2">
                <Heart className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-500">Select a student from the left panel to begin assessment.</p>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
