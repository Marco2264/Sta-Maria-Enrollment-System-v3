import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useTeacherData } from '../../lib/teacherData';
import { Heart, Save, CheckCircle2, User, HelpCircle, Award, Shield, Leaf, Flag } from 'lucide-react';

type RatingValue = 'AO' | 'SO' | 'RO' | 'NO' | '';

const coreValuesList = [
  {
    category: '1. Maka-Diyos',
    icon: Shield,
    colorClass: 'text-amber-500 bg-amber-50 border-amber-200/50',
    headerBg: 'bg-amber-50/50 border-amber-100',
    items: [
      { key: 'makaDiyos1', statement: 'Expresses one’s spiritual beliefs while respecting the spiritual beliefs of others.' },
      { key: 'makaDiyos2', statement: 'Shows adherence to ethical principles by upholding truth.' }
    ]
  },
  {
    category: '2. Makatao',
    icon: Heart,
    colorClass: 'text-rose-500 bg-rose-50 border-rose-200/50',
    headerBg: 'bg-rose-50/50 border-rose-100',
    items: [
      { key: 'makatao1', statement: 'Is sensitive to individual, social, and cultural differences.' },
      { key: 'makatao2', statement: 'Demonstrates contributions towards solidarity.' }
    ]
  },
  {
    category: '3. Maka-Kalikasan',
    icon: Leaf,
    colorClass: 'text-emerald-500 bg-emerald-50 border-emerald-200/50',
    headerBg: 'bg-emerald-50/50 border-emerald-100',
    items: [
      { key: 'makakalikasan1', statement: 'Cares for the environment and utilizes resources wisely and economically.' }
    ]
  },
  {
    category: '4. Makabansa',
    icon: Flag,
    colorClass: 'text-blue-500 bg-blue-50 border-blue-200/50',
    headerBg: 'bg-blue-50/50 border-blue-100',
    items: [
      { key: 'makabansa1', statement: 'Demonstrates pride in being a Filipino; exercises rights and duties.' },
      { key: 'makabansa2', statement: 'Demonstrates appropriate behavior in carrying out school/community duties.' }
    ]
  }
];

export function ObservedValuesView() {
  const { students, updateStudentObservedValue, loading, currentGradeLevel, currentSectionName } = useTeacherData();
  const enrolled = useMemo(() => students.filter((s) => s.status === 'Enrolled'), [students]);
  
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedQuarter, setSelectedQuarter] = useState<'q1' | 'q2' | 'q3'>('q1');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(true);

  // Default select first student once loaded
  useEffect(() => {
    if (enrolled.length > 0 && !selectedStudentId) {
      setSelectedStudentId(enrolled[0].id);
    }
  }, [enrolled, selectedStudentId]);

  const selectedStudent = useMemo(() => {
    return enrolled.find(s => s.id === selectedStudentId);
  }, [enrolled, selectedStudentId]);

  const handleRatingChange = async (statementKey: string, val: RatingValue) => {
    if (!selectedStudentId) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const finalVal = val === '' ? null : val;
      await updateStudentObservedValue(selectedStudentId, statementKey, selectedQuarter, finalVal);
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
    const val = (selectedStudent as any).observedValues?.[gradeKey]?.[statementKey]?.[selectedQuarter];
    return (val || '') as RatingValue;
  };

  const formatStudentName = (firstName: string | undefined, lastName: string | undefined) => {
    const first = (firstName || '').trim();
    const last = (lastName || '').trim();
    if (!last) return first || 'Unnamed Student';
    if (!first) return last || 'Unnamed Student';
    return `${last}, ${first}`;
  };

  const currentStudentInitials = useMemo(() => {
    if (!selectedStudent) return 'S';
    return `${selectedStudent.firstName?.charAt(0) || ''}${selectedStudent.lastName?.charAt(0) || ''}`.toUpperCase();
  }, [selectedStudent]);

  return (
    <div className="flex flex-col h-full bg-slate-50/50 relative overflow-hidden">
      {/* Soft Ambient Background Glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

      <header className="relative px-8 py-10 border-b border-slate-200 bg-white/70 backdrop-blur-md shrink-0 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 max-w-7xl mx-auto w-full">
          <div className="space-y-1 text-left">
            <div className="flex flex-wrap items-center gap-3 text-slate-800">
              <div className="p-2.5 bg-rose-50 rounded-2xl text-rose-500 shadow-sm border border-rose-100">
                <Heart className="w-6 h-6 fill-current" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Observed Values</h1>
              
              {/* Sync status indicator */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100/80 border border-slate-200/50 text-slate-500 text-xs font-semibold select-none transition-all duration-300">
                {isSaving ? (
                  <>
                    <Save className="w-3.5 h-3.5 animate-spin text-primary" />
                    <span className="text-primary font-bold">Saving...</span>
                  </>
                ) : saveSuccess ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 fill-emerald-50" />
                    <span className="text-emerald-600 font-bold">Saved to Cloud</span>
                  </>
                ) : (
                  <>
                    <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-amber-600 font-bold">Saving failed</span>
                  </>
                )}
              </div>
            </div>
            <p className="text-sm text-slate-500 pl-1">
              Rate the behavior and character traits of students in your class based on DepEd Core Values.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/50 shrink-0 self-start md:self-auto shadow-inner">
            {(['q1', 'q2', 'q3'] as const).map((q) => (
              <button
                key={q}
                onClick={() => setSelectedQuarter(q)}
                className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all duration-200 ${
                  selectedQuarter === q
                    ? 'bg-white text-slate-800 shadow-sm border border-slate-200/30'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {q === 'q1' ? '1st Term' : q === 'q2' ? '2nd Term' : '3rd Term'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-primary rounded-full animate-spin mb-4" />
          <p className="text-sm font-medium text-slate-500">Loading student records...</p>
        </div>
      ) : enrolled.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
          <div className="p-4 bg-slate-100 rounded-full text-slate-400 mb-4 border">
            <Heart className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">No Enrolled Students</h2>
          <p className="text-sm text-slate-500 mt-1">
            There are no enrolled students in {currentGradeLevel} - {currentSectionName} to rate.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden w-full max-w-7xl mx-auto">
          {/* Sidebar Student List */}
          <aside className="w-80 border-r border-slate-200 bg-white/50 backdrop-blur-sm flex flex-col shrink-0">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Class List ({enrolled.length} Enrolled)
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {enrolled.map((s) => {
                const active = s.id === selectedStudentId;
                const hasRatings = coreValuesList.every(cv => 
                  cv.items.every(item => {
                    const gradeKey = currentGradeLevel || 'Grade 6';
                    return !!(s as any).observedValues?.[gradeKey]?.[item.key]?.[selectedQuarter];
                  })
                );

                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStudentId(s.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                      active
                        ? 'bg-white shadow-sm border border-slate-200 text-slate-800 font-semibold'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                      active ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {formatStudentName(s.firstName, s.lastName).charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate font-medium">
                        {formatStudentName(s.firstName, s.lastName)}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate tracking-wide">
                        LRN: {s.lrn || 'No LRN'}
                      </p>
                    </div>
                    {hasRatings && (
                      <Badge className="bg-emerald-50 text-emerald-600 hover:bg-emerald-50/80 border-emerald-100 font-extrabold text-[9px] px-1.5 py-0">
                        Done
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Main Encoding Sheet */}
          <main className="flex-1 overflow-y-auto p-8 space-y-6">
            {selectedStudent ? (
              <div className="space-y-6 max-w-4xl">
                {/* Profile Card */}
                <Card className="p-6 bg-white border border-slate-200/80 shadow-sm flex items-center gap-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-xl pointer-events-none" />
                  <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center text-rose-500 font-extrabold text-lg shadow-sm">
                    {currentStudentInitials}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 leading-tight">
                      {formatStudentName(selectedStudent.firstName, selectedStudent.lastName)}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      {currentGradeLevel} - {currentSectionName} | Gender: <span className="font-semibold text-slate-700">{selectedStudent.gender}</span> | LRN: <span className="font-semibold text-slate-700">{selectedStudent.lrn || 'No LRN'}</span>
                    </p>
                  </div>
                </Card>

                {/* Rating scale explainer */}
                <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-100/60 rounded-2xl border border-slate-200/40 text-xs text-slate-500 font-medium justify-center sm:justify-start">
                  <span className="font-bold text-slate-600 uppercase text-[10px] tracking-wider shrink-0 mr-1">Rating scale:</span>
                  <span className="px-2 py-0.5 rounded bg-white border border-slate-200/60 font-semibold"><span className="text-amber-500 font-bold">AO</span> Always Observed</span>
                  <span className="px-2 py-0.5 rounded bg-white border border-slate-200/60 font-semibold"><span className="text-rose-500 font-bold">SO</span> Sometimes Observed</span>
                  <span className="px-2 py-0.5 rounded bg-white border border-slate-200/60 font-semibold"><span className="text-emerald-500 font-bold">RO</span> Rarely Observed</span>
                  <span className="px-2 py-0.5 rounded bg-white border border-slate-200/60 font-semibold"><span className="text-blue-500 font-bold">NO</span> Not Observed</span>
                </div>

                {/* Observed Values Criteria Cards */}
                <div className="space-y-6">
                  {coreValuesList.map((cv, cvIdx) => {
                    const Icon = cv.icon;
                    return (
                      <Card key={cvIdx} className="overflow-hidden border border-slate-200 bg-white shadow-sm hover:border-slate-300 transition-colors">
                        <div className={`px-6 py-4 border-b flex items-center gap-3 ${cv.headerBg}`}>
                          <div className={`p-1.5 rounded-lg border shadow-sm ${cv.colorClass}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="font-extrabold text-slate-800 text-sm tracking-wide">
                            {cv.category}
                          </span>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {cv.items.map((item, itemIdx) => {
                            const val = getRatingValue(item.key);
                            return (
                              <div key={itemIdx} className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/50 hover:bg-slate-50/30 transition-colors">
                                <p className="text-slate-600 text-sm font-medium leading-relaxed max-w-xl">
                                  {item.statement}
                                </p>
                                <select
                                  value={val}
                                  onChange={(e) => handleRatingChange(item.key, e.target.value as RatingValue)}
                                  className="w-48 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all cursor-pointer"
                                >
                                  <option value="">-- No Rating --</option>
                                  <option value="AO">Always Observed (AO)</option>
                                  <option value="SO">Sometimes Observed (SO)</option>
                                  <option value="RO">Rarely Observed (RO)</option>
                                  <option value="NO">Not Observed (NO)</option>
                                </select>
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
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <Heart className="w-12 h-12 text-slate-300 mb-2" />
                <p className="text-sm font-medium text-slate-500">Select a student from the list to begin rating.</p>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
