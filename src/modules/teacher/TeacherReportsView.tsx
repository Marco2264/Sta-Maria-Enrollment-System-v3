import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  Download,
  CheckCircle2,
  Heart,
  Award,
  TrendingUp,
  FileText,
  Calendar,
  Printer
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { useTeacherData } from '../../lib/teacherData';
import { generateAdminSF1, generateSF2, generateSF5, generateSF8, generateSF9 } from '../../lib/excelGenerator';
import { useAuth } from '../../lib/AuthContext';
import { SF1ReportDocument } from '../admin/SF1ReportDocument';
import { SF2ReportDocument } from '../admin/SF2ReportDocument';
import { SF8ReportDocument } from '../admin/SF8ReportDocument';
import { SF9ReportDocument } from '../admin/SF9ReportDocument';
import { SF5ReportDocument } from '../admin/SF5ReportDocument';
import { SF10ReportDocument } from '../admin/SF10ReportDocument';
import { ReportDataService } from '../../lib/services/reportDataService';
import { HealthAnalyticsService } from '../../lib/services/healthAnalyticsService';
import { getCurrentSchoolYear } from '../../lib/utils';

export function TeacherReportsView() {
  const { students, subjects, attendance, currentSection, currentGradeLevel, currentSectionName, academicYear: contextAcademicYear, isAdvisorForCurrentSection } = useTeacherData();
  const { userData } = useAuth();

  // Try context academicYear first, then fallback to current year
  const academicYear = contextAcademicYear || getCurrentSchoolYear();
  const sectionDisplayName = currentSectionName ? `${currentGradeLevel} - ${currentSectionName}` : (currentGradeLevel && currentSection ? `${currentGradeLevel} - ${currentSection}` : 'Section');

  const [generating, setGenerating] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [viewingSF1, setViewingSF1] = useState<any | null>(null);
  const [viewingSF2, setViewingSF2] = useState<any | null>(null);
  const [viewingSF8, setViewingSF8] = useState<any | null>(null);
  const [viewingSF9, setViewingSF9] = useState<any | null>(null);
  const [viewingSF5, setViewingSF5] = useState<any | null>(null);
  const [viewingSF10, setViewingSF10] = useState<any | null>(null);
  const [viewingReportId, setViewingReportId] = useState<string | null>(null);
  const [sf2Month, setSf2Month] = useState<string>(new Date().toLocaleString('en-US', { month: 'long' }));

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const handleGenerate = async (id: string) => {
    setGenerating(id);
    try {
      const sectionStudents = students.filter(s => ['Enrolled', 'enrolled'].includes(s.status || '') && s.sectionId === currentSection);
      if (id === 'sf1') {
        const data = await ReportDataService.getSF1Data(academicYear, currentGradeLevel || '', currentSection);
        await generateAdminSF1(data);
      } else if (id === 'sf2') {
        if (!currentSection) {
          alert('Your assigned section has not loaded yet. Please wait a moment and try again.');
          setGenerating(null);
          return;
        }
        if (!isAdvisorForCurrentSection) {
          alert('Only the assigned section adviser can export attendance (SF2) Excel reports.');
          setGenerating(null);
          return;
        }
        const data = await ReportDataService.getSF2Data(academicYear, currentSection, sf2Month);
        await generateSF2(data);
      } else if (id === 'sf5') {
        await generateSF5(sectionStudents, sectionDisplayName, academicYear, (userData?.displayName || userData?.fullName || '') as string);
      } else if (id === 'sf8') {
        await generateSF8(sectionStudents, sectionDisplayName, academicYear, (userData?.displayName || userData?.fullName || '') as string, currentGradeLevel || '');
      } else if (id === 'sf9') {
        const teacherName = userData ? (`${userData.firstName || ''} ${userData.lastName || ''}`.trim() || (typeof userData.displayName === 'string' ? userData.displayName : '')) : '';
        await generateSF9(sectionStudents, sectionDisplayName, academicYear, attendance, subjects, [], teacherName);
      }
      setSuccess(id);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Failed to generate report', error);
      alert('Failed to generate report. Please ensure templates are in public/templates/.');
    } finally {
      setGenerating(null);
    }
  };

  const handleViewPrint = async (id: string) => {
    if (!currentSection) {
      alert('Your assigned section has not loaded yet. Please wait a moment and try again.');
      return;
    }
    setViewingReportId(id);
    try {
      const gradeLvl = currentGradeLevel || '';
      const sectId = currentSection;

      if (id === 'sf1') {
        const data = await ReportDataService.getSF1Data(academicYear, gradeLvl, sectId);
        setViewingSF1(data);
      } else if (id === 'sf2') {
        const data = await ReportDataService.getSF2Data(academicYear, sectId, sf2Month);
        setViewingSF2(data);
      } else if (id === 'sf8') {
        const learners = await HealthAnalyticsService.getHealthData(gradeLvl);
        const filteredLearners = learners.filter(l => l.sectionId === sectId);
        setViewingSF8({
          schoolYear: academicYear,
          gradeLevel: gradeLvl,
          section: sectionDisplayName,
          learners: filteredLearners,
          adviserName: (userData?.displayName || userData?.fullName || '') as string
        });
      } else if (id === 'sf9') {
        const sectionStudents = students.filter(s => ['Enrolled', 'enrolled'].includes(s.status || '') && s.sectionId === sectId);
        const teacherName = userData ? `${userData.firstName || ''} ${userData.lastName || ''}`.trim() : 'Assigned Adviser';
        setViewingSF9({
          schoolYear: academicYear,
          gradeLevel: gradeLvl,
          section: sectionDisplayName,
          students: sectionStudents,
          attendance,
          subjects,
          adviserName: teacherName
        });
      } else if (id === 'sf5') {
        const sectionStudents = students.filter(s => ['Enrolled', 'enrolled'].includes(s.status || '') && s.sectionId === sectId);
        const teacherName = userData ? `${userData.firstName || ''} ${userData.lastName || ''}`.trim() : 'Assigned Adviser';
        setViewingSF5({
          schoolYear: academicYear,
          gradeLevel: gradeLvl,
          section: sectionDisplayName,
          students: sectionStudents,
          adviserName: teacherName
        });
      } else if (id === 'sf10') {
        const sectionStudents = students.filter(s => ['Enrolled', 'enrolled', 'PROMOTED', 'RETAINED', 'IRREGULAR'].includes(s.status || '') && (s.sectionId === sectId || !s.sectionId));
        const teacherName = userData ? `${userData.firstName || ''} ${userData.lastName || ''}`.trim() : 'Assigned Adviser';
        setViewingSF10({
          schoolYear: academicYear,
          gradeLevel: gradeLvl,
          section: sectionDisplayName,
          students: sectionStudents.length > 0 ? sectionStudents : students,
          adviserName: teacherName
        });
      }
    } catch (error) {
      console.error('Failed to load report for viewing', error);
      alert('Failed to load report for viewing.');
    } finally {
      setViewingReportId(null);
    }
  };

  const reports = [
    {
      id: 'sf1',
      title: 'School Form 1 (SF1)',
      subtitle: 'School Register',
      desc: 'School Register containing learner information, birth details, and parents/guardians.',
      icon: FileText,
      iconClass: 'bg-indigo-100 text-indigo-600'
    },
    {
      id: 'sf2',
      title: 'School Form 2 (SF2)',
      subtitle: 'Daily Attendance Report of Learners',
      desc: 'Summary of daily attendance of learners in the school for the selected month.',
      icon: Calendar,
      iconClass: 'bg-teal-100 text-teal-600'
    },
    {
      id: 'sf5',
      title: 'School Form 5 (SF5)',
      subtitle: 'Report on Promotion and Level of Proficiency',
      desc: 'Summary of student promotions, retentions, and academic proficiency levels at the end of the school year.',
      icon: TrendingUp,
      iconClass: 'bg-blue-100 text-blue-600'
    },
    {
      id: 'sf8',
      title: 'School Form 8 (SF8)',
      subtitle: 'Learner Health Record',
      desc: 'Comprehensive health and nutritional status report including BMI, height, weight, and medical conditions for all students.',
      icon: Heart,
      iconClass: 'bg-rose-100 text-rose-600'
    },
    {
      id: 'sf9',
      title: 'School Form 9 (SF9)',
      subtitle: 'Learner Progress Report Card',
      desc: 'Individual student report cards with quarterly grades, attendance summary, and teacher remarks.',
      icon: Award,
      iconClass: 'bg-amber-100 text-amber-600'
    },
    {
      id: 'sf10',
      title: 'School Form 10 (SF10-ES)',
      subtitle: "Learner's Permanent Academic Record",
      desc: "Permanent record of learner's academic progress, general averages, and eligibility across elementary grades.",
      icon: FileText,
      iconClass: 'bg-emerald-100 text-emerald-600'
    }
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <header className="h-[72px] px-6 sm:px-8 border-b border-slate-200 bg-gradient-to-r  shrink-0 flex items-center justify-between">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6  w-full">
          <div className="flex flex-col xl:flex-row items-start xl:items-center gap-2 xl:gap-6 flex-1 min-w-0">
            <div className="flex items-center gap-3 shrink-0">
              <div className="p-2 bg-rose-50 rounded-xl text-[#D8232A] shrink-0 border border-rose-100/50 shadow-sm">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex flex-col justify-center">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#D8232A] leading-none mb-1">Reports</span>
                <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none">School Forms</h1>
              </div>
            </div>
            <p className="hidden lg:block text-xs text-slate-500 lg:border-l lg:border-slate-200 lg:pl-5 py-0.5 flex-1 leading-relaxed truncate">
              Generate official DepEd school forms based on your section's student data.
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8  w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => {
            const isGenerating = generating === report.id;
            const isSuccess = success === report.id;
            return (
              <Card
                key={report.id}
                className="bg-white border-slate-200/60 p-6 sm:p-8 shadow-sm rounded-3xl flex flex-col hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-start gap-4 mb-5">
                  <div className={`w-14 h-14 rounded-2xl ${report.iconClass} flex items-center justify-center shrink-0 shadow-inner`}>
                    <report.icon className="w-7 h-7" />
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <h3 className="font-bold text-lg text-slate-900 leading-tight">{report.title}</h3>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5 uppercase tracking-wide">{report.subtitle}</p>
                  </div>
                </div>

                <p className="hidden md:block text-xs text-slate-500 leading-relaxed mb-6 flex-1">{report.desc}</p>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-400 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                    <span>Section: {sectionDisplayName}</span>
                    <span>{academicYear}</span>
                  </div>
                  {report.id === 'sf2' && (
                    <div className="mt-3">
                      <Select value={sf2Month} onValueChange={setSf2Month}>
                        <SelectTrigger className="w-full bg-white border-slate-200">
                          <SelectValue placeholder="Select Month" />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    {(report.id === 'sf1' || report.id === 'sf2' || report.id === 'sf5' || report.id === 'sf8' || report.id === 'sf9' || report.id === 'sf10') && (
                      <Button
                        variant="outline"
                        className="flex-1 rounded-xl h-11 font-semibold transition-all bg-white border-slate-200 shadow-sm"
                        onClick={() => handleViewPrint(report.id)}
                        disabled={isGenerating || viewingReportId === report.id || isSuccess}
                      >
                        {viewingReportId === report.id ? (
                          <><div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin mr-2" />Wait...</>
                        ) : (
                          <><FileText className="w-4 h-4 mr-1.5" />Preview</>
                        )}
                      </Button>
                    )}
                    {(() => {
                      const isRestricted = report.id === 'sf2' && !isAdvisorForCurrentSection;
                      if (report.id === 'sf10') {
                        return (
                          <Button
                            className="flex-1 rounded-xl h-11 font-semibold transition-all bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                            onClick={() => handleViewPrint('sf10')}
                            disabled={isGenerating || viewingReportId === 'sf10'}
                          >
                            <Printer className="w-4 h-4 mr-1.5" />Print SF10
                          </Button>
                        );
                      }
                      return (
                        <Button
                          className={`flex-1 rounded-xl h-11 font-semibold transition-all ${isSuccess
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : isRestricted
                              ? 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-100 cursor-not-allowed'
                              : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
                            }`}
                          onClick={() => handleGenerate(report.id)}
                          disabled={isGenerating || isSuccess || viewingReportId === report.id || isRestricted}
                          title={isRestricted ? "Restricted: Only the Section Adviser can export attendance reports" : undefined}
                        >
                          {isGenerating ? (
                            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />Wait...</>
                          ) : isSuccess ? (
                            <><CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" />Ready</>
                          ) : isRestricted ? (
                            <span>Advisory Only</span>
                          ) : (
                            <><Download className="w-4 h-4 mr-1.5" />Excel</>
                          )}
                        </Button>
                      );
                    })()}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {viewingSF1 && (
        <SF1ReportDocument data={viewingSF1} onClose={() => setViewingSF1(null)} />
      )}
      {viewingSF2 && (
        <SF2ReportDocument data={viewingSF2} onClose={() => setViewingSF2(null)} />
      )}
      {viewingSF8 && (
        <SF8ReportDocument data={viewingSF8} onClose={() => setViewingSF8(null)} />
      )}
      {viewingSF5 && (
        <SF5ReportDocument data={viewingSF5} onClose={() => setViewingSF5(null)} />
      )}
      {viewingSF9 && (
        <SF9ReportDocument data={viewingSF9} onClose={() => setViewingSF9(null)} />
      )}
      {viewingSF10 && (
        <SF10ReportDocument data={viewingSF10} onClose={() => setViewingSF10(null)} />
      )}
    </div>
  );
}
