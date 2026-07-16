import React, { useState } from 'react';
import { db } from '../../lib/firebase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { FileText, Download, CheckCircle2, AlertCircle, IdCard, Calendar, TrendingUp } from 'lucide-react';
import { useAdminData } from '../../lib/adminData';
import { ReportDataService } from '../../lib/services/reportDataService';
import { HealthAnalyticsService, HealthData } from '../../lib/services/healthAnalyticsService';
import { useAuth } from '../../lib/AuthContext';
import { normalizeRole } from '../../lib/roles';
import { generateAdminSF1, generateAdminSF4, generateAdminSF8, generateSF2, generateSF5 } from '../../lib/excelGenerator';
import type { SF1Data, SF4Data } from '../../lib/services/reportDataService';
import { getCurrentSchoolYear } from '../../lib/utils';
import { StudentIdCardDocument } from './StudentIdCardDocument';
import { SF1ReportDocument } from './SF1ReportDocument';
import { SF8ReportDocument } from './SF8ReportDocument';

export function ReportsView() {
  const { schoolYear, classrooms, sections } = useAdminData();

  const sortedSections = React.useMemo(() => {
    return [...sections].sort((a, b) => {
      const getGradeNum = (gl: string) => {
        const match = (gl || '').match(/\d+/);
        return match ? parseInt(match[0], 10) : 999;
      };
      const gradeA = getGradeNum(a.gradeLevel);
      const gradeB = getGradeNum(b.gradeLevel);
      if (gradeA !== gradeB) {
        return gradeA - gradeB;
      }
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [sections]);
  const { role: currentUserRole, userData } = useAuth();
  
  const isSubAdmin = normalizeRole(currentUserRole) === 'subadmin';
  const assignedGrade = isSubAdmin ? (userData?.assignedGrade as string | undefined) : undefined;

  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reportMonth, setReportMonth] = useState('JANUARY');
  const [sf1SectionId, setSf1SectionId] = useState('all');
  const [sf2SectionId, setSf2SectionId] = useState('all');
  const [sf5SectionId, setSf5SectionId] = useState('all');
  const [sf8SectionId, setSf8SectionId] = useState('all');
  const [sf2Month, setSf2Month] = useState('January');
  const [sf4GradeLevel, setSf4GradeLevel] = useState<string>('all');
  const [idCardSectionId, setIdCardSectionId] = useState('all');

  const [sf1SearchQuery, setSf1SearchQuery] = useState('');
  const [sf2SearchQuery, setSf2SearchQuery] = useState('');
  const [sf5SearchQuery, setSf5SearchQuery] = useState('');
  const [sf8SearchQuery, setSf8SearchQuery] = useState('');
  const [idCardSearchQuery, setIdCardSearchQuery] = useState('');

  const [idCardData, setIdCardData] = useState<Awaited<ReturnType<typeof ReportDataService.getStudentIdCardData>> | null>(null);
  const [generatingIdCard, setGeneratingIdCard] = useState(false);

  const [viewingSF1, setViewingSF1] = useState<SF1Data | null>(null);
  const [viewingSF8, setViewingSF8] = useState<any | null>(null);
  const [viewingReportId, setViewingReportId] = useState<string | null>(null);

  const syName = schoolYear?.name ?? getCurrentSchoolYear();

  const handleGenerate = async (reportId: string) => {
    setGenerating(reportId);
    setError(null);
    try {
      if (reportId === 'sf1') {
        if (sf1SectionId === 'all') {
          alert('Please select a specific section to generate School Form 1 (SF1). SF1 is a section-level report and cannot be generated for "All Sections".');
          setGenerating(null);
          return;
        }
        const selectedSection = sections.find(s => s.id === sf1SectionId);
        // If it's a subadmin and they selected "all", we still need to restrict the query to their assignedGrade
        const effectiveGradeLevel = selectedSection?.gradeLevel || assignedGrade;
        
        const data = await ReportDataService.getSF1Data(
          syName,
          effectiveGradeLevel,
          sf1SectionId === 'all' ? undefined : sf1SectionId
        );
        await generateAdminSF1(data);
      } else if (reportId === 'sf2') {
        if (sf2SectionId === 'all') {
          alert('Please select a specific section to generate School Form 2 (SF2).');
          setGenerating(null);
          return;
        }
        const data = await ReportDataService.getSF2Data(syName, sf2SectionId, sf2Month);
        await generateSF2(data);
      } else if (reportId === 'sf5') {
        if (sf5SectionId === 'all') {
          alert('Please select a specific section to generate School Form 5 (SF5). SF5 is a section-level report and cannot be generated for "All Sections".');
          setGenerating(null);
          return;
        }
        const selectedSection = sections.find(s => s.id === sf5SectionId);
        const enrollRef = collection(db, 'enrollments');
        const q = query(enrollRef, where('status', 'in', ['Enrolled', 'enrolled']));
        const snap = await getDocs(q);
        let studentDocs = snap.docs;
        studentDocs = studentDocs.filter(d => d.data().sectionId === sf5SectionId);
        
        const studentsData = studentDocs.map(d => ({ id: d.id, ...d.data() } as any));
        const secName = selectedSection ? `${selectedSection.gradeLevel} - ${selectedSection.name}` : 'Section';
        
        await generateSF5(studentsData, secName, syName);
      } else if (reportId === 'sf4') {
        const effectiveGradeLevel = assignedGrade || (sf4GradeLevel === 'all' ? undefined : sf4GradeLevel);
        const data = await ReportDataService.getSF4Data(
          syName, 
          reportMonth, 
          effectiveGradeLevel,
          undefined // No section filter for SF4
        );
        await generateAdminSF4(data);
      } else if (reportId === 'sf8') {
        const selectedSection = sections.find(s => s.id === sf8SectionId);
        const learners = await HealthAnalyticsService.getHealthData(assignedGrade);
        const filteredLearners = sf8SectionId === 'all' 
          ? learners 
          : learners.filter(l => l.sectionId === sf8SectionId);
          
        const effectiveGradeLevel = selectedSection?.gradeLevel || assignedGrade || 'All';
          
        await generateAdminSF8({
          schoolYear: syName,
          gradeLevel: effectiveGradeLevel,
          section: selectedSection?.name || 'All Sections',
          learners: filteredLearners
        });
      }
    } catch (err) {
      console.error('Report generation error:', err);
      setError('Failed to generate report. Please try again.');
    } finally {
      setGenerating(null);
    }
  };

  const handleViewPrint = async (reportId: string) => {
    setViewingReportId(reportId);
    setError(null);
    try {
      if (reportId === 'sf1') {
        if (sf1SectionId === 'all') {
          alert('Please select a specific section to view School Form 1 (SF1).');
          setViewingReportId(null);
          return;
        }
        const selectedSection = sections.find(s => s.id === sf1SectionId);
        const effectiveGradeLevel = selectedSection?.gradeLevel || assignedGrade;
        const data = await ReportDataService.getSF1Data(
          syName,
          effectiveGradeLevel,
          sf1SectionId === 'all' ? undefined : sf1SectionId
        );
        setViewingSF1(data);
      } else if (reportId === 'sf8') {
        const selectedSection = sections.find(s => s.id === sf8SectionId);
        const learners = await HealthAnalyticsService.getHealthData(assignedGrade);
        const filteredLearners = sf8SectionId === 'all' 
          ? learners 
          : learners.filter(l => l.sectionId === sf8SectionId);
        const effectiveGradeLevel = selectedSection?.gradeLevel || assignedGrade || 'All';
          
        setViewingSF8({
          schoolYear: syName,
          gradeLevel: effectiveGradeLevel,
          section: selectedSection?.name || 'All Sections',
          learners: filteredLearners
        });
      }
    } catch (err) {
      console.error('Report viewing error:', err);
      setError('Failed to load report for viewing. Please try again.');
    } finally {
      setViewingReportId(null);
    }
  };

  const reports = [
    {
      id: 'sf1',
      title: 'School Form 1 (SF1)',
      desc: 'School Register containing learner information, birth details, and parents/guardians.',
      iconClass: 'bg-blue-100 text-blue-600'
    },
    {
      id: 'sf2',
      title: 'School Form 2 (SF2)',
      desc: 'Daily Attendance Report of Learners for the selected month.',
      iconClass: 'bg-teal-100 text-teal-600',
      icon: Calendar
    },
    {
      id: 'sf4',
      title: 'School Form 4 (SF4)',
      desc: 'Monthly Learner Movement and Attendance summary for the entire school.',
      iconClass: 'bg-indigo-100 text-indigo-600'
    },
    {
      id: 'sf5',
      title: 'School Form 5 (SF5)',
      desc: 'Report on Promotion and Level of Progress & Achievement at the end of the school year.',
      iconClass: 'bg-amber-100 text-amber-600',
      icon: TrendingUp
    },
    {
      id: 'sf8',
      title: 'School Form 8 (SF8)',
      desc: "Learner's Basic Health and Nutrition Report containing BMI and nutritional status.",
      iconClass: 'bg-emerald-100 text-emerald-600'
    }
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <header className="px-6 py-8 border-b border-border bg-gradient-to-r from-primary/5 via-primary/10 to-transparent shrink-0">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 max-w-7xl mx-auto w-full">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <FileText className="w-6 h-6" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Official Reports</h1>
            </div>
            <p className="text-sm text-slate-600 max-w-md leading-relaxed">
              Generate and download official DepEd school forms based on live enrollment and attendance data.
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-10">
        {error && (
          <div className="mb-6 flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* ── Official DepEd Forms ─────────────────────────── */}
        <section>
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-800">Official DepEd Forms</h2>
            <p className="text-sm text-slate-500 mt-0.5">Generate and print DepEd-standard school forms from live data.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
          {reports.map((report) => {
            const isGenerating = generating === report.id;

            return (
              <Card
                key={report.id}
                className="bg-white border-slate-200/60 p-6 sm:p-8 shadow-sm rounded-3xl flex flex-col hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-start gap-4 mb-6">
                  <div className={`w-14 h-14 rounded-2xl ${report.iconClass} flex items-center justify-center shrink-0 shadow-inner`}>
                    {report.icon ? <report.icon className="w-7 h-7" /> : <FileText className="w-7 h-7" />}
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <h3 className="font-bold text-xl text-slate-900">{report.title}</h3>
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">{report.desc}</p>
                  </div>
                </div>

                <div className="space-y-4 mb-8 flex-1">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">School Year</label>
                      <Select defaultValue={schoolYear?.id}>
                        <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl">
                          <SelectValue>
                            {schoolYear?.name}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px] overflow-y-auto">
                          {schoolYear && <SelectItem value={schoolYear.id}>{schoolYear.name}</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>

                    {(report.id === 'sf1' || report.id === 'sf2' || report.id === 'sf5' || report.id === 'sf8') && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Section</label>
                        <Select 
                          value={
                            report.id === 'sf1' ? sf1SectionId : 
                            report.id === 'sf2' ? sf2SectionId : 
                            report.id === 'sf5' ? sf5SectionId : 
                            sf8SectionId
                          } 
                          onValueChange={
                            report.id === 'sf1' ? setSf1SectionId : 
                            report.id === 'sf2' ? setSf2SectionId : 
                            report.id === 'sf5' ? setSf5SectionId : 
                            setSf8SectionId
                          }
                        >
                          <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl">
                            <SelectValue placeholder={report.id === 'sf1' || report.id === 'sf2' || report.id === 'sf5' ? "Select Section" : "All Sections"}>
                              {(() => {
                                const activeId = 
                                  report.id === 'sf1' ? sf1SectionId : 
                                  report.id === 'sf2' ? sf2SectionId : 
                                  report.id === 'sf5' ? sf5SectionId : 
                                  sf8SectionId;
                                if (activeId === 'all') {
                                  return report.id === 'sf1' || report.id === 'sf2' || report.id === 'sf5' ? 'Select Section' : 'All Sections';
                                }
                                const sec = sortedSections.find(s => s.id === activeId);
                                return sec ? `${sec.gradeLevel} - ${sec.name}` : activeId;
                              })()}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px] overflow-y-auto">
                            <div className="p-2 sticky top-0 bg-white z-10 border-b border-slate-100">
                              <Input
                                placeholder="Search section or grade..."
                                value={
                                  report.id === 'sf1' ? sf1SearchQuery : 
                                  report.id === 'sf2' ? sf2SearchQuery : 
                                  report.id === 'sf5' ? sf5SearchQuery : 
                                  sf8SearchQuery
                                }
                                onChange={(e) => {
                                  if (report.id === 'sf1') setSf1SearchQuery(e.target.value);
                                  else if (report.id === 'sf2') setSf2SearchQuery(e.target.value);
                                  else if (report.id === 'sf5') setSf5SearchQuery(e.target.value);
                                  else setSf8SearchQuery(e.target.value);
                                }}
                                onKeyDown={(e) => e.stopPropagation()}
                                className="h-8 text-sm"
                              />
                            </div>
                            {report.id !== 'sf1' && report.id !== 'sf2' && report.id !== 'sf5' && <SelectItem value="all">All Sections</SelectItem>}
                            {sortedSections
                              .filter(s => {
                                const q = (
                                  (report.id === 'sf1' ? sf1SearchQuery : 
                                   report.id === 'sf2' ? sf2SearchQuery : 
                                   report.id === 'sf5' ? sf5SearchQuery : 
                                   sf8SearchQuery) || ''
                                ).toLowerCase();
                                return (s.name || '').toLowerCase().includes(q) || (s.gradeLevel || '').toLowerCase().includes(q);
                              })
                              .map((s) => (
                                <SelectItem key={s.id} value={s.id}>{s.gradeLevel || 'Unknown Grade'} - {s.name || 'Unnamed Section'}</SelectItem>
                              ))}
                            {sortedSections.filter(s => {
                              const q = (
                                (report.id === 'sf1' ? sf1SearchQuery : 
                                 report.id === 'sf2' ? sf2SearchQuery : 
                                 report.id === 'sf5' ? sf5SearchQuery : 
                                 sf8SearchQuery) || ''
                              ).toLowerCase();
                              return (s.name || '').toLowerCase().includes(q) || (s.gradeLevel || '').toLowerCase().includes(q);
                            }).length === 0 && (
                              <div className="p-2 text-sm text-center text-slate-500">No sections found.</div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {report.id === 'sf4' && !assignedGrade && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Grade Level</label>
                        <Select value={sf4GradeLevel} onValueChange={setSf4GradeLevel}>
                          <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl">
                            <SelectValue placeholder="Select Grade Level" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px] overflow-y-auto">
                            <SelectItem value="all">All Grades</SelectItem>
                            <SelectItem value="Grade 1">Grade 1</SelectItem>
                            <SelectItem value="Grade 2">Grade 2</SelectItem>
                            <SelectItem value="Grade 3">Grade 3</SelectItem>
                            <SelectItem value="Grade 4">Grade 4</SelectItem>
                            <SelectItem value="Grade 5">Grade 5</SelectItem>
                            <SelectItem value="Grade 6">Grade 6</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {report.id === 'sf4' && assignedGrade && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Grade Level</label>
                        <Input value={assignedGrade} disabled className="bg-slate-50 border-slate-200 rounded-xl" />
                      </div>
                    )}

                    {report.id === 'sf4' && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Report Month</label>
                        <Select value={reportMonth} onValueChange={setReportMonth}>
                          <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl">
                            <SelectValue placeholder="Select Month" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px] overflow-y-auto">
                            {['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'].map(m => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {report.id === 'sf2' && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Report Month</label>
                        <Select value={sf2Month} onValueChange={setSf2Month}>
                          <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl">
                            <SelectValue placeholder="Select Month" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px] overflow-y-auto">
                            {['January','February','March','April','May','June','July','August','September','October','November','December'].map(m => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                  {(report.id === 'sf1' || report.id === 'sf8') && (
                    <Button
                      variant="outline"
                      className="flex-1 rounded-xl h-11 font-semibold transition-all bg-white border-slate-200 shadow-sm"
                      onClick={() => handleViewPrint(report.id)}
                      disabled={isGenerating || viewingReportId === report.id}
                    >
                      {viewingReportId === report.id ? (
                        <><div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin mr-2" />Loading...</>
                      ) : (
                        <><FileText className="w-4 h-4 mr-2" />View & Print</>
                      )}
                    </Button>
                  )}
                  <Button
                    className="flex-1 rounded-xl h-11 font-semibold transition-all bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                    onClick={() => handleGenerate(report.id)}
                    disabled={isGenerating || viewingReportId === report.id}
                  >
                    {isGenerating ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />Generating...</>
                    ) : (
                      <><Download className="w-4 h-4 mr-2" />Export Excel</>
                    )}
                  </Button>
                </div>

                {/* Removed HTML print preview indicators */}
              </Card>
            );
          })}
          </div>
        </section>

        {/* ── Print Templates ──────────────────────────────── */}
        <section>
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-800">Print Templates</h2>
            <p className="text-sm text-slate-500 mt-0.5">Generate custom printable documents like student ID cards.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
            <Card className="bg-white border-slate-200/60 p-6 sm:p-8 shadow-sm rounded-3xl flex flex-col hover:shadow-md transition-all duration-300">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center shrink-0 shadow-inner">
                  <IdCard className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <h3 className="font-bold text-xl text-slate-900">Student ID Cards</h3>
                  <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                    Print standard school ID cards for all enrolled learners with LRN and guardian info.
                  </p>
                </div>
              </div>

              <div className="space-y-4 mb-8 flex-1">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">School Year</label>
                  <Select defaultValue={schoolYear?.id}>
                    <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl">
                      <SelectValue>
                        {schoolYear?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto">
                      {schoolYear && <SelectItem value={schoolYear.id}>{schoolYear.name}</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Section (optional)</label>
                  <Select 
                    value={idCardSectionId} 
                    onValueChange={setIdCardSectionId}
                  >
                    <SelectTrigger className="bg-slate-50 border-slate-200 rounded-xl">
                      <SelectValue placeholder="All Sections">
                        {idCardSectionId === 'all'
                          ? 'All Sections'
                          : (() => {
                              const sec = sortedSections.find(s => s.id === idCardSectionId);
                              return sec ? `${sec.gradeLevel} - ${sec.name}` : idCardSectionId;
                            })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto">
                      <div className="p-2 sticky top-0 bg-white z-10 border-b border-slate-100">
                        <Input
                          placeholder="Search section or grade..."
                          value={idCardSearchQuery}
                          onChange={(e) => setIdCardSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.stopPropagation()}
                          className="h-8 text-sm"
                        />
                      </div>
                      <SelectItem value="all">All Sections</SelectItem>
                      {sortedSections
                        .filter(s => {
                          const q = (idCardSearchQuery || '').toLowerCase();
                          return (s.name || '').toLowerCase().includes(q) || (s.gradeLevel || '').toLowerCase().includes(q);
                        })
                        .map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.gradeLevel || 'Unknown Grade'} - {s.name || 'Unnamed Section'}</SelectItem>
                        ))}
                      {sortedSections.filter(s => {
                        const q = (idCardSearchQuery || '').toLowerCase();
                        return (s.name || '').toLowerCase().includes(q) || (s.gradeLevel || '').toLowerCase().includes(q);
                      }).length === 0 && (
                        <div className="p-2 text-sm text-center text-slate-500">No sections found.</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                className="w-full rounded-xl h-11 font-semibold transition-all bg-violet-600 text-white hover:bg-violet-700 shadow-sm"
                onClick={async () => {
                  setGeneratingIdCard(true);
                  try {
                    const cards = await ReportDataService.getStudentIdCardData(
                      syName,
                      idCardSectionId === 'all' ? undefined : idCardSectionId
                    );
                    setIdCardData(cards);
                  } catch (err) {
                    console.error('ID card generation error:', err);
                  } finally {
                    setGeneratingIdCard(false);
                  }
                }}
                disabled={generatingIdCard}
              >
                {generatingIdCard ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />Generating...</>
                ) : (
                  <><Download className="w-4 h-4 mr-2" />Generate ID Cards</>
                )}
              </Button>
              {idCardData && !generatingIdCard && (
                <p className="mt-2 text-xs text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {idCardData.length} card(s) ready to print
                </p>
              )}
            </Card>
          </div>
        </section>

      </div>

      {/* Removed HTML report preview components */}
      {viewingSF1 && (
        <SF1ReportDocument data={viewingSF1} onClose={() => setViewingSF1(null)} />
      )}
      {viewingSF8 && (
        <SF8ReportDocument data={viewingSF8} onClose={() => setViewingSF8(null)} />
      )}
      {idCardData && (
        <StudentIdCardDocument
          data={idCardData}
          schoolName="Sta. Maria Elementary School"
          onClose={() => setIdCardData(null)}
        />
      )}
    </div>
  );
}