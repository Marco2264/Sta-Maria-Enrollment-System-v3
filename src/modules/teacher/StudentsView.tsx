import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../../components/ui/Table';
import { TeacherEditStudentModal } from './TeacherEditStudentModal';
import { Eye, Users, Activity, Scale, Ruler, Trash2, FileEdit, Search, Filter, CalendarDays, Download } from 'lucide-react';
import { useTeacherData } from '../../lib/teacherData';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { HealthAnalyticsService } from '../../lib/services/healthAnalyticsService';
import { useAuth } from '../../lib/AuthContext';
import { generateAdminSF1 } from '../../lib/excelGenerator';

export function StudentsView() {
  const { students, updateStudentBmi, loading, currentGradeLevel, currentSectionName, currentSection, allAssignments, allTeachers, gradeConfigurations, subjects } = useTeacherData();
  const { userData } = useAuth();
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [editBmi, setEditBmi] = useState({ height: '', weight: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('All');

  const getStudentStatusText = (s: any) => {
    const gradeLevelClean = (currentGradeLevel || '').toLowerCase().replace(/grade\s*/g, '').trim();
    const dbSubjects = (subjects || []).filter((sub) => {
      const sGrade = (sub.gradeLevel || '').toLowerCase().replace(/grade\s*/g, '').trim();
      return sGrade === gradeLevelClean;
    });

    let expectedSubjectsList: string[] = [];
    if (dbSubjects.length === 0) {
      expectedSubjectsList = [
        'Filipino',
        'English',
        'Mathematics',
        'Science',
        'Araling Panlipunan (AP)',
        'Edukasyon sa Pagpapakatao (EsP)',
        'EPP/TLE',
        'MAPEH',
        'Music',
        'Arts',
        'PE',
        'Health'
      ];
    } else {
      dbSubjects.forEach((sub) => {
        const name = sub.name || '';
        const lowerName = name.toLowerCase();

        if (lowerName.includes('music') || lowerName.includes('arts') || lowerName.includes('art') || lowerName === 'pe' || lowerName.includes('physical education') || lowerName === 'health') {
          return;
        }

        if (lowerName.includes('mapeh')) {
          expectedSubjectsList.push('MAPEH');
          expectedSubjectsList.push('Music');
          expectedSubjectsList.push('Arts');
          expectedSubjectsList.push('PE');
          expectedSubjectsList.push('Health');
        } else {
          expectedSubjectsList.push(name);
        }
      });
    }

    const subjectRowMap: Record<string, string> = {
      'filipino': 'FILIPINO',
      'english': 'ENGLISH',
      'mathematics': 'MATH',
      'math': 'MATH',
      'science': 'SCIENCE',
      'araling panlipunan': 'AP',
      'ap': 'AP',
      'edukasyon sa pagpapakatao': 'ESP',
      'esp': 'ESP',
      'values education': 'ESP',
      'good manners': 'ESP',
      'gmrc': 'ESP',
      'good manners and right conduct (gmrc)': 'ESP',
      'tle': 'TLE',
      'epp': 'TLE',
      'epp/tle': 'TLE',
      'mapeh': 'MAPEH',
      'music': 'MUSIC',
      'arts': 'ARTS',
      'art': 'ARTS',
      'physical education': 'PE',
      'pe': 'PE',
      'health': 'HEALTH',
      'language': 'LANGUAGE',
      'reading and literacy': 'READING_AND_LITERACY',
      'makabansa': 'MAKABANSA'
    };

    const computeCalculatedGrade = (
      subjectData: any,
      subjectCode: string,
      standardCode: string,
      quarterKey: 'q1' | 'q2' | 'q3'
    ): number | null => {
      if (!subjectData || typeof subjectData !== 'object') return null;

      const directVal = subjectData[quarterKey];
      if (directVal !== undefined && directVal !== null && directVal !== '') {
        const parsed = parseFloat(directVal);
        if (!isNaN(parsed)) return parsed;
      }

      const termAliases: Record<string, string[]> = {
        q1: ['Term 1', '1st Quarter', 'Q1', 'q1', '1st Term'],
        q2: ['Term 2', '2nd Quarter', 'Q2', 'q2', '2nd Term'],
        q3: ['Term 3', 'Finals', '3rd Quarter', 'Q3', 'q3', '3rd Term']
      };
      const possibleTerms = termAliases[quarterKey] || [quarterKey];
      const configs = gradeConfigurations || [];

      for (const termName of possibleTerms) {
        const cols = configs.filter(
          c => (
            c.subjectCode === subjectCode ||
            c.subjectCode === standardCode ||
            (c.subjectCode && subjectCode && c.subjectCode.toLowerCase() === subjectCode.toLowerCase()) ||
            (c.subjectCode && standardCode && c.subjectCode.toLowerCase() === standardCode.toLowerCase())
          ) &&
            c.term === termName &&
            c.type !== 'submission'
        );

        if (cols.length > 0) {
          let termTotal = 0;
          let hasGrade = false;
          const termData = subjectData[termName] || {};
          cols.forEach(col => {
            const val = termData[col.id];
            if (val !== undefined && val !== null && val !== '') {
              const num = parseFloat(val);
              if (!isNaN(num)) {
                termTotal += (num * (col.weight / 100));
                hasGrade = true;
              }
            }
          });
          if (hasGrade) {
            return Math.round(termTotal * 10) / 10;
          }
        }
      }

      for (const termName of possibleTerms) {
        const termData = subjectData[termName];
        if (termData && typeof termData === 'object' && Object.keys(termData).length > 0) {
          const cols = configs.filter(c => c.term === termName && c.type !== 'submission');
          if (cols.length > 0) {
            let termTotal = 0;
            let hasGrade = false;
            cols.forEach(col => {
              const val = termData[col.id];
              if (val !== undefined && val !== null && val !== '') {
                const num = parseFloat(val);
                if (!isNaN(num)) {
                  termTotal += (num * (col.weight / 100));
                  hasGrade = true;
                }
              }
            });
            if (hasGrade) {
              return Math.round(termTotal * 10) / 10;
            }
          }
        }
      }

      return null;
    };

    const getGradeVal = (student: any, colSubjectName: string, term: string) => {
      const gLvl = student.gradeLevel || 'Grade 6';
      const gradeKey = gLvl.toLowerCase().startsWith('grade') ? gLvl : `Grade ${gLvl}`;
      const studentGrades = (student.grades?.[gradeKey] as any) || {};

      const cleanColName = colSubjectName.toLowerCase().replace(/\(ap\)|\(esp\)/g, '').trim();
      const standardCode = subjectRowMap[cleanColName] || subjectRowMap[colSubjectName.toLowerCase().trim()] || (colSubjectName.toUpperCase().replace(/\s+/g, '_'));
      if (!standardCode) return null;

      const matchingSub = (subjects || []).find(sub => {
        const code = sub.code ?? sub.name;
        const subNameLower = (sub.name || '').toLowerCase().trim();
        const sc = subjectRowMap[subNameLower] || subjectRowMap[code.toLowerCase().trim()] || (code.toUpperCase().replace(/\s+/g, '_'));
        return sc === standardCode;
      });

      const dbKey = matchingSub ? (matchingSub.code ?? matchingSub.name) : colSubjectName;
      let gradeData = studentGrades[dbKey] ||
        (matchingSub?.name ? studentGrades[matchingSub.name] : null) ||
        (matchingSub?.code ? studentGrades[matchingSub.code] : null) ||
        studentGrades[standardCode] ||
        studentGrades[colSubjectName];

      if (!gradeData) {
        const keys = Object.keys(studentGrades);
        for (const k of keys) {
          const kClean = k.toLowerCase().trim();
          const kStandard = subjectRowMap[kClean] || (k.toUpperCase().replace(/\s+/g, '_'));
          if (kStandard === standardCode || kClean === dbKey.toLowerCase().trim()) {
            gradeData = studentGrades[k];
            break;
          }
        }
      }

      if (!gradeData) return null;

      const quarterKey = term === '1st Term' ? 'q1' : term === '2nd Term' ? 'q2' : 'q3';
      return computeCalculatedGrade(gradeData, dbKey, standardCode, quarterKey);
    };

    const getMAPEHGrade = (student: any, term: string) => {
      const directMAPEH = getGradeVal(student, 'MAPEH', term);
      if (directMAPEH !== null && directMAPEH !== undefined) return directMAPEH;

      const music = getGradeVal(student, 'Music', term);
      const arts = getGradeVal(student, 'Arts', term);
      const pe = getGradeVal(student, 'PE', term);
      const health = getGradeVal(student, 'Health', term);

      const components = [music, arts, pe, health].filter(v => v !== null && v !== undefined) as number[];
      if (components.length === 0) return null;
      return Math.round(components.reduce((a, b) => a + b, 0) / components.length);
    };

    let allSubjectsAndTermsCompleted = true;
    const finalGrades: number[] = [];
    let passedCount = 0;
    let failedCount = 0;

    expectedSubjectsList.forEach(subjectName => {
      const isComponent = ['music', 'arts', 'art', 'pe', 'health', 'physical education'].includes(subjectName.toLowerCase());
      
      const t1 = subjectName === 'MAPEH' ? getMAPEHGrade(s, '1st Term') : getGradeVal(s, subjectName, '1st Term');
      const t2 = subjectName === 'MAPEH' ? getMAPEHGrade(s, '2nd Term') : getGradeVal(s, subjectName, '2nd Term');
      const t3 = subjectName === 'MAPEH' ? getMAPEHGrade(s, '3rd Term') : getGradeVal(s, subjectName, '3rd Term');

      if (t1 === null || t2 === null || t3 === null) {
        if (!isComponent) {
          allSubjectsAndTermsCompleted = false;
        }
      } else {
        const finalGrade = Math.round((t1 + t2 + t3) / 3);
        if (!isComponent) {
          finalGrades.push(finalGrade);
          if (finalGrade >= 75) {
            passedCount++;
          } else {
            failedCount++;
          }
        }
      }
    });

    if (s.status === 'Transferred Out' || s.status === 'Transferred') {
      return 'Transferred Out (T/O)';
    }
    if (s.status === 'Transferred In') {
      return 'Transferred In (T/I)';
    }
    if (s.status === 'Dropped') {
      return 'Dropped (DRP)';
    }

    if (!allSubjectsAndTermsCompleted || finalGrades.length === 0) {
      return 'Enrolled';
    }

    const generalAverage = finalGrades.reduce((a, b) => a + b, 0) / finalGrades.length;

    if (failedCount === 0) {
      return 'Promoted';
    }

    if (passedCount === 0) {
      return 'Retained';
    }

    if (generalAverage >= 70 && generalAverage <= 74.9) {
      return 'Conditional';
    }

    return 'Enrolled';
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-[#D8232A]/20 border-t-[#D8232A] rounded-full animate-spin"></div>
      </div>
    );
  }

  const formatStudentName = (firstName: string | undefined, lastName: string | undefined) => {
    const first = (firstName || '').trim();
    const last = (lastName || '').trim();
    if (!last) return first || 'Unnamed Student';
    if (!first) return last || 'Unnamed Student';
    return `${last}, ${first}`;
  };

  const enrolled = React.useMemo(() => {
    return students
      .filter((s) => {
        if (s.status === 'Pending' || s.status === 'Rejected') return false;
        if ((s as any).isManualHistory === true) return false;
        
        // Search filter
        const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
        const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || s.lrn.toLowerCase().includes(searchTerm.toLowerCase());
        
        // Gender filter
        const matchesGender = genderFilter === 'All' || s.gender?.toLowerCase() === genderFilter.toLowerCase();
        
        return matchesSearch && matchesGender;
      })
      .sort((a, b) => {
        if (a.gender !== b.gender) {
          if (a.gender === 'Male') return -1;
          if (b.gender === 'Male') return 1;
          if (a.gender === 'Female') return -1;
          if (b.gender === 'Female') return 1;
        }
        const nameA = a.lastName?.toLowerCase() || '';
        const nameB = b.lastName?.toLowerCase() || '';
        return nameA.localeCompare(nameB);
      });
  }, [students, searchTerm, genderFilter]);
  
  const student = selectedStudent ? students.find((s) => s.id === selectedStudent) : null;

  const openProfile = (id: string) => {
    const s = students.find((st) => st.id === id);
    if (s) {
      setEditBmi({
        height: s.medical?.height || '',
        weight: s.medical?.weight || ''
      });
      setSelectedStudent(id);
    }
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
      try {
        await deleteDoc(doc(db, 'enrollments', id));
      } catch (error) {
        console.error("Error deleting student:", error);
        alert("Failed to delete student.");
      }
    }
  };

  const calcBmi = (h?: string, w?: string) => {
    if (!h || !w) return '--';
    const hm = parseFloat(h) / 100;
    const wk = parseFloat(w);
    if (hm > 0 && wk > 0) return (wk / (hm * hm)).toFixed(1);
    return '--';
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    if (enrolled.length === 0) {
      alert("No student records available to export.");
      return;
    }
    setIsExporting(true);
    try {
      const toDate = (timestamp: any): Date | null => {
        if (!timestamp) return null;
        if (timestamp instanceof Date) return timestamp;
        if (typeof timestamp.toDate === 'function') return timestamp.toDate();
        if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
        const parsed = new Date(timestamp);
        return isNaN(parsed.getTime()) ? null : parsed;
      };

      const calcAge = (birthDateStr?: string): number | undefined => {
        if (!birthDateStr) return undefined;
        const birthDate = new Date(birthDateStr);
        if (isNaN(birthDate.getTime())) return undefined;
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        return age;
      };

      const formatBirthDate = (dateStr?: string): string => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
      };

      const learners = enrolled.map(studentItem => {
        const s = studentItem as any;
        const bdate: string | undefined =
          typeof s.birthDate === 'string'
            ? s.birthDate
            : toDate(s.birthDate)?.toISOString().split('T')[0];

        return {
          id: s.id,
          lrn: s.lrn ?? '',
          lastName: s.lastName ?? s.familyName ?? '',
          firstName: s.firstName ?? s.givenName ?? '',
          middleName: s.middleName ?? '',
          gender: s.gender ?? '',
          birthDate: formatBirthDate(bdate),
          age: calcAge(bdate),
          birthCity: s.address?.birthCity ?? s.birthCity ?? '',
          birthProvince: s.address?.birthProvince ?? s.birthProvince ?? '',
          motherTongue: s.additional?.motherTongue ?? s.motherTongue ?? '',
          indigenousGroup:
            s.additional?.isIndigenous
              ? (s.additional?.indigenousGroup ?? '')
              : '',
          religion: s.additional?.religion ?? s.religion ?? '',
          addressStreet: s.address?.street ?? '',
          addressBarangay: s.address?.barangay ?? '',
          addressCity: s.address?.city ?? '',
          addressProvince: s.address?.province ?? '',
          fatherName: s.fatherName ?? '',
          motherName: s.motherName ?? '',
          guardianName: s.medical?.emergencyContact ?? s.guardianName ?? '',
          guardianRelationship: s.guardianRelationship ?? 'Parent',
          contactNumber: s.medical?.emergencyPhone ?? s.contactNumber ?? '',
          remarks: s.remarks ?? '',
        };
      });

      const schoolYear = (enrolled[0] as any)?.schoolYear || "2025-2026";
      const u = userData as any;
      const adviserName = `${u?.firstName || ''} ${u?.lastName || ''}`.trim() || u?.displayName || u?.fullName || "";

      await generateAdminSF1({
        schoolYear,
        gradeLevel: currentGradeLevel || "All Grades",
        section: currentSectionName || "All Sections",
        advisorName: adviserName || undefined,
        learners
      });
    } catch (err) {
      console.error("Failed to export SF1:", err);
      alert("An error occurred while exporting SF1 Excel sheet. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 relative overflow-hidden">
      {/* Soft Ambient Background Glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#D8232A]/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#D8232A]/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />

      <header className="h-[72px] px-6 sm:px-8 border-b border-slate-200 bg-white shrink-0 flex items-center justify-between">
        <div className="flex flex-row items-center justify-between gap-6 w-full">
          <div className="flex flex-col xl:flex-row items-start xl:items-center gap-2 xl:gap-6 flex-1 min-w-0">
            <div className="flex items-center gap-3 shrink-0">
              <div className="p-2 bg-rose-50 rounded-xl text-[#D8232A] shrink-0 border border-rose-100/50 shadow-sm">
                <Users className="w-5 h-5" />
              </div>
              <div className="flex flex-col justify-center">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#D8232A] leading-none mb-1">Classroom</span>
                <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none">Student Profiles</h1>
              </div>
            </div>
            <p className="hidden lg:block text-xs text-slate-500 lg:border-l lg:border-slate-200 lg:pl-5 py-0.5 flex-1 leading-relaxed truncate">
              View and manage your enrolled students' profiles, physical health parameters, and BMI calculations.
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 sm:p-8 lg:p-10 w-full relative">
        <Card className="bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="p-6 border-b border-slate-100 bg-white/50 space-y-4">
            {(() => {
              const currentSectionAssignment = (allAssignments || []).find(a => a.sectionId === currentSection);
              const currentSectionAdvisor = currentSectionAssignment 
                ? (allTeachers || []).find(t => t.id === currentSectionAssignment.teacherId)
                : null;
              const advisorName = currentSectionAdvisor 
                ? `${currentSectionAdvisor.firstName} ${currentSectionAdvisor.lastName}` 
                : 'No Advisor Assigned';

              return (
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2.5">
                      <h3 className="font-bold text-xl text-slate-900">Enrolled Students</h3>
                      {currentSectionName && (
                        <Badge className="bg-[#D8232A]/5 text-[#D8232A] border border-[#D8232A]/15 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-lg select-none">
                          Section: {currentGradeLevel} — {currentSectionName}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Adviser: <span className="font-bold text-slate-700">{advisorName}</span>
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-[#D8232A]/10 text-[#D8232A] uppercase tracking-wider border border-[#D8232A]/20 select-none">
                    {enrolled.length} {enrolled.length === 1 ? 'Record' : 'Records'}
                  </span>
                </div>
              );
            })()}

            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <div className="relative flex-1 sm:max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search student name or LRN..."
                  className="pl-10 h-11 rounded-xl border-slate-200 bg-white shadow-sm hover:border-slate-300 focus:border-[#D8232A] focus:ring-2 focus:ring-[#D8232A]/15 transition-all text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="w-full sm:w-[170px]">
                <Select value={genderFilter} onValueChange={setGenderFilter}>
                  <SelectTrigger className="w-full h-11 rounded-xl border-slate-200 bg-white shadow-sm hover:border-slate-300 focus:ring-2 focus:ring-[#D8232A]/15 focus:border-[#D8232A] transition-all font-medium text-sm text-slate-700">
                    <div className="flex items-center">
                      <Filter className="w-3.5 h-3.5 mr-2 text-slate-400 shrink-0" />
                      <SelectValue placeholder="Gender" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-lg border-slate-200">
                    <SelectItem value="All">All Genders</SelectItem>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleExportExcel}
                disabled={isExporting}
                className="h-11 px-4 bg-[#D8232A] hover:bg-[#b01c22] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm active:scale-95 duration-100 border-none disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                {isExporting ? 'Exporting...' : 'Export Excel'}
              </Button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/70 border-b border-slate-100">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider pl-6 py-4">Learner Name</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider py-4">LRN</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider py-4">Gender</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider py-4">Status</TableHead>
                  <TableHead className="font-bold text-slate-700 text-xs uppercase tracking-wider text-right pr-6 py-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrolled.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-16 text-slate-400 font-medium">
                      No enrolled students found.
                    </TableCell>
                  </TableRow>
                ) : (
                  enrolled.map((s) => {
                    const reqs = (s as any).requirementUploads;
                    let photo = (s as any).photoURL || (s as any).photoUrl || (s as any).profilePicture || (s as any).avatarUrl || (s as any).avatar || (s as any).photo;
                    if (!photo && reqs && typeof reqs === 'object') {
                      for (const key of Object.keys(reqs)) {
                        const lower = key.toLowerCase();
                        if (lower.includes('2x2') || lower.includes('photo') || lower.includes('picture') || lower.includes('avatar')) {
                          const fileUrl = reqs[key]?.fileUrl;
                          if (typeof fileUrl === 'string' && fileUrl.trim()) {
                            photo = fileUrl.trim();
                            break;
                          }
                        }
                      }
                    }
                    return (
                      <TableRow key={s.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <TableCell className="pl-6 py-4">
                          <div className="flex items-center gap-3.5">
                            {photo ? (
                              <img
                                src={photo}
                                alt={s.firstName}
                                className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-2xs shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-red-50/80 text-[#D8232A] font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs border border-red-100/80 uppercase">
                                {s.firstName?.charAt(0) || ''}{s.lastName?.charAt(0) || ''}
                              </div>
                            )}
                            <span className="font-bold text-slate-800 text-sm tracking-tight">
                              {formatStudentName(s.firstName, s.lastName)}
                            </span>
                          </div>
                        </TableCell>
                      <TableCell className="text-slate-500 font-mono text-xs font-medium py-4">
                        {s.lrn}
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge variant="outline" className={`font-semibold text-xs px-2.5 py-0.5 rounded-full border border-opacity-40 ${
                          s.gender === 'Male' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-pink-50 text-pink-700 border-pink-200'
                        }`}>
                          {s.gender}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        {(() => {
                          const status = getStudentStatusText(s);
                          return (
                            <Badge variant="outline" className={`font-semibold text-xs px-2.5 py-0.5 rounded-full border border-opacity-40 uppercase tracking-wider ${
                              status === 'Promoted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              status === 'Retained' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              status === 'Conditional' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              status === 'Transferred Out (T/O)' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                              status === 'Transferred In (T/I)' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              status === 'Dropped (DRP)' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                              {status}
                            </Badge>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="pr-6 py-4 text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 px-3.5 text-[#D8232A] hover:bg-[#D8232A]/10 hover:text-[#D8232A] transition-colors rounded-xl font-bold text-xs inline-flex items-center gap-1.5 active:scale-95 duration-100"
                          onClick={() => openProfile(s.id)}
                        >
                          <FileEdit className="w-3.5 h-3.5" />
                          Edit Profile
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors rounded-xl active:scale-95 duration-100 inline-flex items-center justify-center"
                          onClick={() => handleDeleteStudent(s.id, formatStudentName(s.firstName, s.lastName))}
                          title="Delete Student Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
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

      <TeacherEditStudentModal
        student={student || null}
        isOpen={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
      />
    </div>
  );
}
