import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  Download,
  CheckCircle2,
  Heart,
  Award,
  TrendingUp,
  FileText,
  Calendar
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { useTeacherData } from '../../lib/teacherData';
import { generateAdminSF1, generateSF2, generateSF5, generateSF8, generateSF9 } from '../../lib/excelGenerator';
import { useAuth } from '../../lib/AuthContext';
import { SF1ReportDocument } from '../admin/SF1ReportDocument';
import { SF8ReportDocument } from '../admin/SF8ReportDocument';
import { ReportDataService } from '../../lib/services/reportDataService';
import { HealthAnalyticsService } from '../../lib/services/healthAnalyticsService';
import { getCurrentSchoolYear } from '../../lib/utils';

export function TeacherReportsView() {
  const { students, currentSection, currentGradeLevel, currentSectionName, academicYear: contextAcademicYear } = useTeacherData();
  const { userData } = useAuth();
  
  // Try context academicYear first, then fallback to current year
  const academicYear = contextAcademicYear || getCurrentSchoolYear();
  const sectionDisplayName = currentSectionName ? `${currentGradeLevel} - ${currentSectionName}` : (currentGradeLevel && currentSection ? `${currentGradeLevel} - ${currentSection}` : 'Section');

  const [generating, setGenerating] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [viewingSF1, setViewingSF1] = useState<any | null>(null);
  const [viewingSF8, setViewingSF8] = useState<any | null>(null);
  const [viewingReportId, setViewingReportId] = useState<string | null>(null);
  const [sf2Month, setSf2Month] = useState<string>(new Date().toLocaleString('en-US', { month: 'long' }));

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const handleGenerate = async (id: string) => {
    setGenerating(id);
    try {
      if (id === 'sf1') {
        const gradeLvl = currentGradeLevel || '';
        const sectId = currentSection || 'all';
        const data = await ReportDataService.getSF1Data(academicYear, gradeLvl, sectId);
        await generateAdminSF1(data);
      } else if (id === 'sf2') {
        const sectId = currentSection || 'all';
        const data = await ReportDataService.getSF2Data(academicYear, sectId, sf2Month);
        await generateSF2(data);
      } else if (id === 'sf5') {
        await generateSF5(students, sectionDisplayName, academicYear);
      } else if (id === 'sf8') {
        await generateSF8(students, sectionDisplayName, academicYear);
      } else if (id === 'sf9') {
        await generateSF9(students, sectionDisplayName, academicYear);
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
    setViewingReportId(id);
    try {
      const gradeLvl = currentGradeLevel || '';
      const sectId = currentSection || 'all';
      
      if (id === 'sf1') {
        const data = await ReportDataService.getSF1Data(academicYear, gradeLvl, sectId);
        setViewingSF1(data);
      } else if (id === 'sf8') {
        const learners = await HealthAnalyticsService.getHealthData(gradeLvl);
        const filteredLearners = learners.filter(l => l.sectionId === sectId);
        setViewingSF8({
          schoolYear: academicYear,
          gradeLevel: gradeLvl,
          section: sectionName,
          learners: filteredLearners
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
    }
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <header className="px-6 py-8 border-b border-border bg-gradient-to-r from-primary/5 via-primary/10 to-transparent shrink-0">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 max-w-7xl mx-auto w-full">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <FileText className="w-6 h-6" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Generate Reports</h1>
            </div>
            <p className="text-sm text-slate-600 max-w-md leading-relaxed">
              Generate official DepEd school forms based on your section's student data.
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
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

                <p className="text-sm text-slate-500 leading-relaxed mb-6 flex-1">{report.desc}</p>

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
                    {(report.id === 'sf1' || report.id === 'sf8') && (
                      <Button
                        variant="outline"
                        className="flex-1 rounded-xl h-11 font-semibold transition-all bg-white border-slate-200 shadow-sm"
                        onClick={() => handleViewPrint(report.id)}
                        disabled={isGenerating || viewingReportId === report.id || isSuccess}
                      >
                        {viewingReportId === report.id ? (
                          <><div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin mr-2" />Wait...</>
                        ) : (
                          <><FileText className="w-4 h-4 mr-1.5" />View & Print</>
                        )}
                      </Button>
                    )}
                    <Button
                      className={`flex-1 rounded-xl h-11 font-semibold transition-all ${
                        isSuccess
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
                      }`}
                      onClick={() => handleGenerate(report.id)}
                      disabled={isGenerating || isSuccess || viewingReportId === report.id}
                    >
                      {isGenerating ? (
                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />Wait...</>
                      ) : isSuccess ? (
                        <><CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" />Ready</>
                      ) : (
                        <><Download className="w-4 h-4 mr-1.5" />Excel</>
                      )}
                    </Button>
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
      {viewingSF8 && (
        <SF8ReportDocument data={viewingSF8} onClose={() => setViewingSF8(null)} />
      )}
    </div>
  );
}