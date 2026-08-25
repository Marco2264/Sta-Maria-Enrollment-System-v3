import React, { useState, useMemo } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../ui/Table';
import { TeacherEditStudentModal } from './TeacherEditStudentModal';
import { TeacherStudentDetailView } from '../../modules/teacher/TeacherStudentDetailView';
import { 
  Eye, 
  Users, 
  Trash2, 
  Search, 
  Filter, 
  CalendarDays, 
  AlertTriangle, 
  FileSpreadsheet, 
  CheckCircle2, 
  GraduationCap, 
  UserCheck, 
  School 
} from 'lucide-react';
import { useTeacherData } from '../../lib/teacherData';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { useAuth } from '../../lib/AuthContext';
import { generateAdminSF1 } from '../../lib/excelGenerator';
import { cn } from '../ui/utils';

export function StudentsView() {
  const { 
    students, 
    loading, 
    currentGradeLevel, 
    currentSectionName, 
    currentSection, 
    setCurrentSection, 
    assignedSections, 
    isAdvisorForCurrentSection, 
    allAssignments, 
    allTeachers, 
    gradeConfigurations, 
    subjects 
  } = useTeacherData();
  const { userData } = useAuth();
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [editBmi, setEditBmi] = useState({ height: '', weight: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState<'All' | 'Male' | 'Female'>('All');

  const currentSectionData = (assignedSections || []).find(s => s.sectionId === currentSection);
  const isAdvisor = Boolean(isAdvisorForCurrentSection || currentSectionData?.isAdvisor);

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
          if (hasGrade) return Math.round(termTotal);
        }
      }

      return null;
    };

    const getGradeVal = (student: any, colSubjectName: string, term: '1st Term' | '2nd Term' | '3rd Term'): number | null => {
      const gLvl = currentGradeLevel || 'Grade 1';
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

    const getMAPEHGrade = (student: any, term: '1st Term' | '2nd Term' | '3rd Term') => {
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

    if (s.status === 'Transferred Out' || s.status === 'Transferred') return 'Transferred Out (T/O)';
    if (s.status === 'Transferred In') return 'Transferred In (T/I)';
    if (s.status === 'Dropped') return 'Dropped (DRP)';

    if (!allSubjectsAndTermsCompleted || finalGrades.length === 0) return 'Enrolled';

    const generalAverage = finalGrades.reduce((a, b) => a + b, 0) / finalGrades.length;

    if (failedCount === 0) return 'Promoted';
    if (passedCount === 0) return 'Retained';
    if (generalAverage >= 70 && generalAverage <= 74.9) return 'Conditional';

    return 'Enrolled';
  };
  
  const [studentToRemove, setStudentToRemove] = useState<{ id: string, name: string } | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const getStudentPhoto = (s: any): string | null => {
    if (!s) return null;
    if (typeof s.photoURL === 'string' && s.photoURL.trim()) return s.photoURL.trim();
    if (typeof s.photoUrl === 'string' && s.photoUrl.trim()) return s.photoUrl.trim();
    if (typeof s.profilePicture === 'string' && s.profilePicture.trim()) return s.profilePicture.trim();
    if (typeof s.avatarUrl === 'string' && s.avatarUrl.trim()) return s.avatarUrl.trim();
    if (typeof s.avatar === 'string' && s.avatar.trim()) return s.avatar.trim();
    if (typeof s.photo === 'string' && s.photo.trim()) return s.photo.trim();

    const reqs = s.requirementUploads;
    if (reqs && typeof reqs === 'object') {
      for (const key of Object.keys(reqs)) {
        const lower = key.toLowerCase();
        if (lower.includes('2x2') || lower.includes('photo') || lower.includes('picture') || lower.includes('avatar')) {
          const fileUrl = reqs[key]?.fileUrl;
          if (typeof fileUrl === 'string' && fileUrl.trim()) return fileUrl.trim();
        }
      }
    }
    return null;
  };

  const formatStudentName = (firstName: string | undefined, lastName: string | undefined) => {
    const first = (firstName || '').trim();
    const last = (lastName || '').trim();
    if (!last) return first || 'Unnamed Student';
    if (!first) return last || 'Unnamed Student';
    return `${last}, ${first}`;
  };

  const allSectionStudents = useMemo(() => {
    return (students || []).filter((s) => {
      const st = (s.status as string) || '';
      if (st === 'Pending' || st === 'Rejected') return false;
      if ((s as any).isManualHistory === true) return false;
      return true;
    });
  }, [students]);

  const totalStudentsCount = allSectionStudents.length;
  const totalMaleInClass = allSectionStudents.filter(s => s.gender?.toLowerCase() === 'male').length;
  const totalFemaleInClass = allSectionStudents.filter(s => s.gender?.toLowerCase() === 'female').length;

  const filteredStudents = useMemo(() => {
    return allSectionStudents.filter((s) => {
      const fullName = `${s.firstName} ${s.lastName} ${s.middleName || ''}`.toLowerCase();
      const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || (s.lrn || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGender = genderFilter === 'All' || s.gender?.toLowerCase() === genderFilter.toLowerCase();
      return matchesSearch && matchesGender;
    });
  }, [allSectionStudents, searchTerm, genderFilter]);

  const maleStudents = useMemo(() => {
    return filteredStudents
      .filter((s) => s.gender?.toLowerCase() === 'male')
      .sort((a, b) => {
        const nameA = a.lastName?.toLowerCase() || '';
        const nameB = b.lastName?.toLowerCase() || '';
        return nameA.localeCompare(nameB);
      });
  }, [filteredStudents]);

  const femaleStudents = useMemo(() => {
    return filteredStudents
      .filter((s) => s.gender?.toLowerCase() === 'female')
      .sort((a, b) => {
        const nameA = a.lastName?.toLowerCase() || '';
        const nameB = b.lastName?.toLowerCase() || '';
        return nameA.localeCompare(nameB);
      });
  }, [filteredStudents]);
  
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

  const handleRemoveStudentClick = (id: string, name: string) => {
    setStudentToRemove({ id, name });
  };

  const confirmRemoveStudent = async () => {
    if (!studentToRemove) return;
    try {
      setIsRemoving(true);
      await updateDoc(doc(db, 'enrollments', studentToRemove.id), {
        sectionId: null,
        section: null,
        status: 'Pending'
      });
      setStudentToRemove(null);
    } catch (error) {
      console.error("Error removing student:", error);
      alert("Failed to remove student.");
    } finally {
      setIsRemoving(false);
    }
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    if (allSectionStudents.length === 0) {
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
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        return age;
      };

      const formatBirthDate = (dateStr?: string): string => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
      };

      const learners = allSectionStudents.map(studentItem => {
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
          indigenousGroup: s.additional?.isIndigenous ? (s.additional?.indigenousGroup ?? '') : '',
          religion: s.additional?.religion ?? s.religion ?? '',
          addressStreet: s.address?.street ?? '',
          addressBarangay: s.address?.barangay ?? '',
          addressCity: s.address?.city ?? '',
          addressProvince: s.address?.province ?? '',
          fatherName: s.fatherName ?? '',
          motherName: s.motherName ?? '',
          guardianName: s.medical?.emergencyContact ?? s.guardianName ?? '',
          guardianRelationship: s.medical?.emergencyRelationship ?? s.guardianRelationship ?? '',
          contactNumber: s.medical?.emergencyPhone ?? s.contactNumber ?? '',
          remarks: s.remarks ?? '',
        };
      });

      const sectionAssignment = (allAssignments || []).find(a => a.sectionId === currentSection);
      const sectionAdvisor = sectionAssignment ? (allTeachers || []).find(t => t.id === sectionAssignment.teacherId) : null;

      await generateAdminSF1({
        schoolYear: '2024-2025',
        gradeLevel: currentSectionData?.gradeLevel || currentGradeLevel || 'Grade 1',
        section: currentSectionData?.name || currentSectionName || 'Section',
        advisorName: sectionAdvisor ? `${sectionAdvisor.lastName}, ${sectionAdvisor.firstName}` : String((userData as any)?.name || (userData as any)?.displayName || 'ADVISER NAME'),
        learners
      });
    } catch (err) {
      console.error("Failed to export SF1:", err);
      alert("An error occurred while exporting SF1.");
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#D8232A]/20 border-t-[#D8232A] rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Classroom Students...</p>
        </div>
      </div>
    );
  }

  if (selectedStudent) {
    return (
      <TeacherStudentDetailView 
        studentId={selectedStudent} 
        onBack={() => setSelectedStudent(null)} 
      />
    );
  }

  const currentSectionAssignment = (allAssignments || []).find(a => a.sectionId === currentSection);
  const currentSectionAdvisor = currentSectionAssignment ? (allTeachers || []).find(t => t.id === currentSectionAssignment.teacherId) : null;
  const advisorName = currentSectionAdvisor ? `${currentSectionAdvisor.firstName} ${currentSectionAdvisor.lastName}` : 'No Advisor Assigned';

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      <header className="h-[72px] px-6 sm:px-8 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-xs sticky top-0 z-30">
        <div className="flex flex-row items-center justify-between gap-4 w-full max-w-[1600px] mx-auto">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-[#D8232A] shadow-2xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-slate-900">
                  {currentSectionData ? `${currentSectionData.gradeLevel} - ${currentSectionData.name}` : (currentGradeLevel ? `${currentGradeLevel} - ${currentSectionName || 'Learners'}` : 'Classroom Students')}
                </h1>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-[10px] font-extrabold px-2 py-0.5",
                    isAdvisor ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-600"
                  )}
                >
                  {isAdvisor ? "Advisory Section" : "Subject Section"}
                </Badge>
                <div className="hidden sm:flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100/80 border border-slate-200/50 text-[10px] font-bold text-slate-600 select-none">
                  <span>Adviser:</span>
                  <span className="text-slate-900 font-extrabold">{advisorName}</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                View and manage learner records, profile credentials, and export official DepEd SF1 rosters
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button
              onClick={handleExportExcel}
              disabled={allSectionStudents.length === 0 || isExporting}
              className="rounded-xl h-10 px-4 text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:border disabled:border-slate-200 disabled:cursor-not-allowed"
              title="Export DepEd School Form 1 (SF1) Learner Profile Excel Sheet"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{isExporting ? "Generating SF1..." : "Export SF1 (Excel)"}</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto w-full">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/70 p-4.5 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-red-50 text-[#D8232A] flex items-center justify-center font-bold shrink-0 border border-red-100/50">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Total Enrolled</p>
              <p className="text-xl sm:text-2xl font-black text-slate-900">{totalStudentsCount}</p>
              <p className="text-[10.5px] font-semibold text-slate-400">Active section learners</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/70 p-4.5 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0 border border-blue-100/50">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Male Learners</p>
              <p className="text-xl sm:text-2xl font-black text-blue-700">{totalMaleInClass}</p>
              <p className="text-[10.5px] font-semibold text-blue-600">{totalStudentsCount > 0 ? `${Math.round((totalMaleInClass / totalStudentsCount) * 100)}% of class` : '0%'}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/70 p-4.5 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0 border border-rose-100/50">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Female Learners</p>
              <p className="text-xl sm:text-2xl font-black text-rose-700">{totalFemaleInClass}</p>
              <p className="text-[10.5px] font-semibold text-rose-600">{totalStudentsCount > 0 ? `${Math.round((totalFemaleInClass / totalStudentsCount) * 100)}% of class` : '0%'}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/70 p-4.5 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0 border border-emerald-100/50">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Class Section</p>
              <p className="text-base sm:text-lg font-black text-slate-900 truncate max-w-[150px]">{currentSectionName || currentGradeLevel || 'N/A'}</p>
              <p className="text-[10.5px] font-semibold text-emerald-600 truncate">{currentGradeLevel}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-slate-50/50 border-b border-slate-200/70">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search student by name or LRN..."
                  className="pl-9 h-10 rounded-xl bg-white border-slate-200/80 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-red-500/20 focus:border-[#D8232A] transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Select value={genderFilter} onValueChange={(v) => setGenderFilter(v as 'All' | 'Male' | 'Female')}>
                  <SelectTrigger className="w-[140px] h-10 rounded-xl border-slate-200/80 bg-white text-xs font-semibold text-slate-700">
                    <Filter className="h-3.5 w-3.5 mr-2 text-slate-400" />
                    <SelectValue placeholder="Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Genders</SelectItem>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-[#D8232A]/10 text-[#D8232A] uppercase tracking-wider border border-[#D8232A]/20 select-none">
                Total: {totalStudentsCount} {totalStudentsCount === 1 ? 'Student' : 'Students'}
              </span>
              {(searchTerm || genderFilter !== 'All') && (
                <span className="text-[11px] font-semibold px-2.5 py-1.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 select-none">
                  Showing {filteredStudents.length}
                </span>
              )}
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="text-center py-16 text-slate-400 font-medium">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No learners found matching current filters.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {(genderFilter === 'All' || genderFilter === 'Male') && (
                <div>
                  <div className="p-3.5 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      Male Learners ({maleStudents.length})
                    </h4>
                    <span className="text-[11px] font-bold text-slate-400">
                      {totalStudentsCount > 0 ? `${Math.round((maleStudents.length / totalStudentsCount) * 100)}% of class` : '0%'}
                    </span>
                  </div>
                  {maleStudents.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 font-medium">No male learners match your filter.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-slate-50/90 border-b border-slate-200/70 select-none">
                          <TableRow className="hover:bg-transparent border-none h-10">
                            <TableHead className="w-12 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 pl-4">#</TableHead>
                            <TableHead className="w-44 text-[10px] font-bold uppercase tracking-wider text-slate-500">LRN</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Learner Name</TableHead>
                            <TableHead className="w-28 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">Gender</TableHead>
                            <TableHead className="w-36 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">Academic Status</TableHead>
                            <TableHead className="w-48 text-right pr-6 text-[10px] font-bold uppercase tracking-wider text-slate-500">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {maleStudents.map((s, idx) => {
                            const photo = getStudentPhoto(s);
                            const status = getStudentStatusText(s);
                            return (
                              <TableRow key={s.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors h-14">
                                <TableCell className="text-center font-bold text-slate-400 text-xs pl-4">{idx + 1}</TableCell>
                                <TableCell className="font-mono font-bold text-slate-600 text-xs">{s.lrn || 'N/A'}</TableCell>
                                <TableCell className="py-3">
                                  <div className="flex items-center gap-3">
                                    {photo ? (
                                      <img src={photo} alt={s.firstName} className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-2xs shrink-0" />
                                    ) : (
                                      <div className="w-9 h-9 rounded-full border border-blue-100 bg-blue-50 text-blue-700 flex items-center justify-center text-xs font-bold shadow-2xs shrink-0">
                                        {s.firstName?.charAt(0) || ''}{s.lastName?.charAt(0) || ''}
                                      </div>
                                    )}
                                    <p className="font-bold text-slate-900 text-xs sm:text-sm">{formatStudentName(s.firstName, s.lastName)}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="outline" className="font-bold text-[11px] px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border-blue-200">Male</Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="outline" className={`font-semibold text-xs px-2.5 py-0.5 rounded-full border border-opacity-40 uppercase tracking-wider ${
                                    status === 'Promoted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    status === 'Retained' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                    status === 'Conditional' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                    status === 'Transferred Out (T/O)' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                    status === 'Transferred In (T/I)' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                    status === 'Dropped (DRP)' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                    'bg-blue-50 text-blue-700 border-blue-200'
                                  }`}>{status}</Badge>
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <Button variant="ghost" size="sm" className="h-8 px-3 text-[#D8232A] hover:bg-[#D8232A]/10 hover:text-[#D8232A] transition-colors rounded-xl font-bold text-xs inline-flex items-center gap-1.5 active:scale-95 duration-100" onClick={() => openProfile(s.id)}>
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>Profile</span>
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors rounded-xl active:scale-95 duration-100 inline-flex items-center justify-center" onClick={() => handleRemoveStudentClick(s.id, formatStudentName(s.firstName, s.lastName))} title="Remove Student from Class">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
              {(genderFilter === 'All' || genderFilter === 'Female') && (
                <div>
                  <div className="p-3.5 bg-slate-50/50 border-b border-slate-100 border-t border-slate-200 flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      Female Learners ({femaleStudents.length})
                    </h4>
                    <span className="text-[11px] font-bold text-slate-400">
                      {totalStudentsCount > 0 ? `${Math.round((femaleStudents.length / totalStudentsCount) * 100)}% of class` : '0%'}
                    </span>
                  </div>
                  {femaleStudents.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 font-medium">No female learners match your filter.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-slate-50/90 border-b border-slate-200/70 select-none">
                          <TableRow className="hover:bg-transparent border-none h-10">
                            <TableHead className="w-12 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 pl-4">#</TableHead>
                            <TableHead className="w-44 text-[10px] font-bold uppercase tracking-wider text-slate-500">LRN</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Learner Name</TableHead>
                            <TableHead className="w-28 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">Gender</TableHead>
                            <TableHead className="w-36 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">Academic Status</TableHead>
                            <TableHead className="w-48 text-right pr-6 text-[10px] font-bold uppercase tracking-wider text-slate-500">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {femaleStudents.map((s, idx) => {
                            const photo = getStudentPhoto(s);
                            const status = getStudentStatusText(s);
                            return (
                              <TableRow key={s.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors h-14">
                                <TableCell className="text-center font-bold text-slate-400 text-xs pl-4">{idx + 1}</TableCell>
                                <TableCell className="font-mono font-bold text-slate-600 text-xs">{s.lrn || 'N/A'}</TableCell>
                                <TableCell className="py-3">
                                  <div className="flex items-center gap-3">
                                    {photo ? (
                                      <img src={photo} alt={s.firstName} className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-2xs shrink-0" />
                                    ) : (
                                      <div className="w-9 h-9 rounded-full border border-pink-100 bg-pink-50 text-pink-700 flex items-center justify-center text-xs font-bold shadow-2xs shrink-0">
                                        {s.firstName?.charAt(0) || ''}{s.lastName?.charAt(0) || ''}
                                      </div>
                                    )}
                                    <p className="font-bold text-slate-900 text-xs sm:text-sm">{formatStudentName(s.firstName, s.lastName)}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="outline" className="font-bold text-[11px] px-2.5 py-0.5 rounded-full bg-pink-50 text-pink-700 border-pink-200">Female</Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="outline" className={`font-semibold text-xs px-2.5 py-0.5 rounded-full border border-opacity-40 uppercase tracking-wider ${
                                    status === 'Promoted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    status === 'Retained' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                    status === 'Conditional' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                    status === 'Transferred Out (T/O)' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                    status === 'Transferred In (T/I)' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                    status === 'Dropped (DRP)' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                    'bg-blue-50 text-blue-700 border-blue-200'
                                  }`}>{status}</Badge>
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <Button variant="ghost" size="sm" className="h-8 px-3 text-[#D8232A] hover:bg-[#D8232A]/10 hover:text-[#D8232A] transition-colors rounded-xl font-bold text-xs inline-flex items-center gap-1.5 active:scale-95 duration-100" onClick={() => openProfile(s.id)}>
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>Profile</span>
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors rounded-xl active:scale-95 duration-100 inline-flex items-center justify-center" onClick={() => handleRemoveStudentClick(s.id, formatStudentName(s.firstName, s.lastName))} title="Remove Student from Class">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <TeacherEditStudentModal
        student={student || null}
        isOpen={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
      />
      {studentToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300" onClick={() => !isRemoving && setStudentToRemove(null)} />
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 transform transition-all scale-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-[#D8232A] shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 flex-1">
                <h3 className="text-base font-bold text-slate-950">Remove Student</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Are you sure you want to remove <span className="font-semibold text-slate-800">{studentToRemove.name}</span> from this class? Their status will be set back to <span className="font-semibold text-slate-800">Pending</span>.
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <Button variant="ghost" onClick={() => setStudentToRemove(null)} disabled={isRemoving} className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-200/80 transition-colors">Cancel</Button>
              <Button onClick={confirmRemoveStudent} disabled={isRemoving} className="px-4 py-2 text-xs font-bold text-white bg-[#D8232A] hover:bg-[#b01c22] rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 duration-100 flex items-center gap-1.5">
                {isRemoving ? 'Removing...' : 'Confirm Remove'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}