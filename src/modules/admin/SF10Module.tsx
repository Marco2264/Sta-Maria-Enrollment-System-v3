import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { SF10ReportDocument } from './SF10ReportDocument';
import { FileText, Plus, Edit, Save, X, Printer, Search, ChevronDown, CheckCircle2, CornerDownRight, Trash2 } from 'lucide-react';
import { getGlobalSettings } from '../../lib/services/settingsService';

interface SF10ModuleProps {
  students?: any[];
  sections?: any[];
  currentUserRole?: string;
  currentUserId?: string;
  isAdmin?: boolean;
}

interface SubjectGradeRow {
  id: string;
  subjectName: string;
  isSubSubject?: boolean;
  q1: string;
  q2: string;
  q3: string;
  q4: string;
  t1: string;
  t2: string;
  t3: string;
}

const validateSchoolYear = (sy: string): { isValid: boolean; error?: string } => {
  if (!sy || !sy.trim()) {
    return { isValid: false, error: 'School Year is required (e.g. 2024-2025).' };
  }
  const clean = sy.trim();
  const match = clean.match(/^(\d{4})-(\d{4})$/);
  if (!match) {
    return { isValid: false, error: 'Invalid School Year format. Please use the YYYY-YYYY format (e.g. 2024-2025).' };
  }

  const startYear = parseInt(match[1], 10);
  const endYear = parseInt(match[2], 10);

  if (endYear !== startYear + 1) {
    return {
      isValid: false,
      error: `Invalid School Year range (${clean}). The second year must be exactly 1 year after the first year (e.g. ${startYear}-${startYear + 1}).`
    };
  }

  return { isValid: true };
};

const isThreeTermYear = (sy: string) => {
  if (!sy) return false;
  const match = sy.match(/\d{4}/);
  if (!match) return false;
  const startYear = parseInt(match[0], 10);
  return startYear >= 2026;
};

const isMatchingGrade = (g1: string, g2: string) => {
  if (!g1 || !g2) return false;
  const str1 = String(g1).toLowerCase().trim();
  const str2 = String(g2).toLowerCase().trim();
  if (str1 === str2) return true;

  if (str1.includes('kinder') && str2.includes('kinder')) return true;

  const match1 = str1.match(/(?:grade|gr|g)?\s*([1-9]|1[0-2])\b/i) || str1.match(/\b([1-9]|1[0-2])\b/);
  const match2 = str2.match(/(?:grade|gr|g)?\s*([1-9]|1[0-2])\b/i) || str2.match(/\b([1-9]|1[0-2])\b/);

  if (match1 && match2) {
    return match1[1] === match2[1];
  }

  return str1 === str2;
};

const hasGradesData = (rec: any, gradeLvl: string) => {
  if (!rec) return false;
  let studentGrades = rec.grades || {};
  if (!studentGrades || typeof studentGrades !== 'object' || Array.isArray(studentGrades)) {
    return false;
  }

  const matchedGradeKey = Object.keys(studentGrades).find(k => isMatchingGrade(k, gradeLvl));
  if (matchedGradeKey) {
    studentGrades = studentGrades[matchedGradeKey];
  }
  if (!studentGrades || typeof studentGrades !== 'object' || Array.isArray(studentGrades)) {
    return false;
  }

  const subjects = Object.keys(studentGrades).filter(sub => sub && isNaN(Number(sub)));
  if (subjects.length > 0) {
    return subjects.some(subCode => {
      const gd = studentGrades[subCode] || {};
      if (typeof gd !== 'object' || Array.isArray(gd) || gd === null) return false;
      return Object.values(gd).some(val => val !== undefined && val !== null && val !== '');
    });
  }
  return rec.isManualHistory === true;
};

const findBestRecordForGrade = (historyList: any[], gradeLvl: string) => {
  if (!Array.isArray(historyList) || historyList.length === 0) return null;
  const matches = historyList.filter(h => isMatchingGrade(h?.gradeLevel || '', gradeLvl));
  if (matches.length === 0) return null;

  const manualWithGrades = matches.find(h => h.isManualHistory === true && hasGradesData(h, gradeLvl));
  if (manualWithGrades) return manualWithGrades;

  const activeWithGrades = matches.find(h => h.isManualHistory !== true && hasGradesData(h, gradeLvl));
  if (activeWithGrades) return activeWithGrades;

  const manual = matches.find(h => h.isManualHistory === true);
  if (manual) return manual;

  return matches[0];
};

const gradeLevels = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];

const subjectRowMap: Record<string, string> = {
  'filipino': 'FILIPINO',
  'english': 'ENGLISH',
  'mathematics': 'MATH',
  'math': 'MATH',
  'science': 'SCIENCE',
  'araling panlipunan': 'AP',
  'ap': 'AP',
  'good manners and right conduct (gmrc)': 'ESP',
  'gmrc': 'ESP',
  'edukasyon sa pagpapakatao': 'ESP',
  'esp': 'ESP',
  'epp': 'EPP_TLE',
  'tle': 'EPP_TLE',
  'epp/tle': 'EPP_TLE',
  'epp/tle (epp)': 'EPP_TLE',
  'epp/tle (tle)': 'EPP_TLE',
  'music & arts': 'MAPEH',
  'music and arts': 'MAPEH',
  'music': 'MUSIC',
  'arts': 'ARTS',
  'pe & health': 'PE_HEALTH',
  'pe and health': 'PE_HEALTH',
  'physical education': 'PE',
  'health': 'HEALTH',
  'mapeh': 'MAPEH',
  'language': 'LANGUAGE',
  'reading': 'READING',
  'literacy': 'LITERACY',
  'makabansa': 'MAKABANSA'
};

const subjectDisplayNames: Record<string, string> = {
  'FILIPINO': 'Filipino',
  'ENGLISH': 'English',
  'MATH': 'Mathematics',
  'SCIENCE': 'Science',
  'AP': 'Araling Panlipunan',
  'ESP': 'Good Manners and Right Conduct (GMRC)',
  'EPP_TLE': 'Technology and Livelihood Education (TLE)',
  'TLE': 'Technology and Livelihood Education (TLE)',
  'MUSIC': 'Music',
  'ARTS': 'Arts',
  'PE': 'Physical Education',
  'HEALTH': 'Health',
  'PE_HEALTH': 'PE & Health',
  'MAPEH': 'MAPEH',
  'LANGUAGE': 'Language',
  'READING': 'Reading',
  'LITERACY': 'Literacy',
  'READING_AND_LITERACY': 'Reading and Literacy',
  'MAKABANSA': 'Makabansa'
};

const getNormalizedSubjectCode = (nameOrCode: string): string => {
  const clean = nameOrCode.toLowerCase().trim();
  if (clean === 'filipino') return 'FILIPINO';
  if (clean === 'english') return 'ENGLISH';
  if (clean === 'mathematics' || clean === 'math') return 'MATH';
  if (clean === 'science') return 'SCIENCE';
  if (clean === 'araling panlipunan' || clean === 'ap' || clean === 'ap/makabansa' || clean === 'makabansa') return 'MAKABANSA';
  if (clean === 'good manners and right conduct (gmrc)' || clean === 'gmrc' || clean === 'edukasyon sa pagpapakatao' || clean === 'esp') return 'ESP';
  if (clean === 'epp' || clean === 'tle' || clean === 'epp/tle' || clean === 'technology and livelihood education (tle)') return 'TLE';
  if (clean === 'music') return 'MUSIC';
  if (clean === 'arts') return 'ARTS';
  if (clean === 'physical education' || clean === 'pe') return 'PE';
  if (clean === 'health') return 'HEALTH';
  if (clean === 'language') return 'LANGUAGE';
  if (clean === 'reading and literacy' || clean === 'reading') return 'READING_AND_LITERACY';
  return nameOrCode.toUpperCase().replace(/\s+/g, '_');
};

const isSameSubject = (key: string, targetCode: string) => {
  const normKey = getNormalizedSubjectCode(key);
  const normTarget = getNormalizedSubjectCode(targetCode);

  if (normKey === normTarget) return true;
  if ((normKey === 'AP' || normKey === 'MAKABANSA') && (normTarget === 'AP' || normTarget === 'MAKABANSA')) return true;
  if ((normKey === 'TLE' || normKey === 'EPP_TLE') && (normTarget === 'TLE' || normTarget === 'EPP_TLE')) return true;
  return false;
};

const parseGradeValue = (val: any): number | null => {
  if (val === undefined || val === null || String(val).trim() === '') return null;
  const num = parseFloat(String(val));
  return isNaN(num) ? null : num;
};

interface SubjectRow {
  name: string;
  isSubSubject: boolean;
  q1: number | string;
  q2: number | string;
  q3: number | string;
  q4: number | string;
  final: number | string;
}

const resolveTermGrade = (subjectGrades: any, term: string, subjectCode: string, sectionId: string, gradeConfigs: any[]) => {
  if (!subjectGrades || typeof subjectGrades !== 'object') return '';

  // 1. Direct manual inputs
  const termKeyMap: Record<string, string[]> = {
    'Term 1': ['t1', 'q1'],
    'Term 2': ['t2', 'q2'],
    'Term 3': ['t3', 'q3'],
    'Quarter 1': ['q1', 't1'],
    'Quarter 2': ['q2', 't2'],
    'Quarter 3': ['q3', 't3'],
    'Quarter 4': ['q4']
  };

  const keysToCheck = termKeyMap[term] || [];
  for (const k of keysToCheck) {
    if (subjectGrades[k] !== undefined && subjectGrades[k] !== null && subjectGrades[k] !== '') {
      return parseFloat(subjectGrades[k]);
    }
  }

  return '';
};

export function SF10Module({ students = [], sections = [], isAdmin = false }: SF10ModuleProps) {
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [allSections, setAllSections] = useState<any[]>([]);

  // Fetch sections based on role
  useEffect(() => {
    if (isAdmin) {
      const unsub = onSnapshot(collection(db, 'sections'), (snap) => {
        setAllSections(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsub();
    } else {
      const advisoryOnly = (sections || []).filter(s => s.isAdvisor === true || s.isAdvisor === 'true' || s.isAdvisor === 1);
      setAllSections(advisoryOnly);
    }
  }, [isAdmin, sections]);

  // Fetch students based on role
  useEffect(() => {
    if (isAdmin) {
      const q = query(
        collection(db, 'enrollments'),
        where('status', 'in', ['Enrolled', 'enrolled', 'PROMOTED', 'RETAINED', 'IRREGULAR'])
      );
      const unsub = onSnapshot(q, (snap) => {
        const activeOnly = snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((s: any) => s.isManualHistory !== true);
        setAllStudents(activeOnly);
      });
      return () => unsub();
    } else {
      // For Teacher: fetch students strictly from ADVISORY sections ONLY
      const advisorySections = (sections || []).filter(s => s.isAdvisor === true || s.isAdvisor === 'true' || s.isAdvisor === 1);
      const advisorySectionIds = advisorySections.map(s => s.id || s.sectionId).filter(Boolean);

      if (advisorySectionIds.length === 0) {
        if (students && students.length > 0) {
          const advisoryStudents = students.filter(s => advisorySectionIds.includes(s.sectionId));
          setAllStudents(advisoryStudents.filter((s: any) => s.isManualHistory !== true));
        } else {
          setAllStudents([]);
        }
        return;
      }

      const querySectionIds = advisorySectionIds.slice(0, 30);
      const q = query(
        collection(db, 'enrollments'),
        where('sectionId', 'in', querySectionIds),
        where('status', 'in', ['Enrolled', 'enrolled', 'PROMOTED', 'RETAINED', 'IRREGULAR'])
      );
      const unsub = onSnapshot(q, (snap) => {
        const docs = snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((s: any) => s.isManualHistory !== true);
        if (docs.length > 0) {
          setAllStudents(docs);
        } else if (students && students.length > 0) {
          const advisoryStudents = students.filter(s => advisorySectionIds.includes(s.sectionId));
          setAllStudents(advisoryStudents.filter((s: any) => s.isManualHistory !== true));
        } else {
          setAllStudents([]);
        }
      }, (err) => {
        console.error("Error loading teacher's advisory students:", err);
        if (students && students.length > 0) {
          const advisoryStudents = students.filter(s => advisorySectionIds.includes(s.sectionId));
          setAllStudents(advisoryStudents.filter((s: any) => s.isManualHistory !== true));
        }
      });
      return () => unsub();
    }
  }, [isAdmin, sections, students]);

  // Normalize sections
  const normalizedSections = useMemo(() => {
    return allSections.map(s => {
      const id = s.id || s.sectionId || '';
      const name = s.name || s.sectionName || 'Unnamed Section';
      const gradeLevel = s.gradeLevel || 'Unknown Grade';
      const isAdvisor = isAdmin ? true : (s.isAdvisor === true || s.isAdvisor === 'true' || s.isAdvisor === 1);
      return { id, name, gradeLevel, isAdvisor };
    });
  }, [allSections, isAdmin]);

  // Sorting section list
  const sortedSections = useMemo(() => {
    // Show all assigned sections for the teacher
    return [...normalizedSections].sort((a, b) => {
      const gA = a.gradeLevel || '';
      const gB = b.gradeLevel || '';
      return gA.localeCompare(gB);
    });
  }, [normalizedSections]);

  const [selectedSectionId, setSelectedSectionId] = useState<string>('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isSectionSelectorOpen, setIsSectionSelectorOpen] = useState(false);
  const [sectionSearchQuery, setSectionSearchQuery] = useState('');

  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [editingGradeLevel, setEditingGradeLevel] = useState<string | null>(null);
  const [isViewingPreview, setIsViewingPreview] = useState(false);

  const [users, setUsers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [activeSchoolYearName, setActiveSchoolYearName] = useState('');

  const [gradeConfigs, setGradeConfigs] = useState<any[]>([]);

  // Fetch users, assignments, and school years from Firestore
  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubAssignments = onSnapshot(collection(db, 'assignments'), (snap) => {
      setAssignments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubSchoolYears = onSnapshot(collection(db, 'school_years'), (snap) => {
      const active = snap.docs.find(d => d.data().isActive);
      if (active) {
        setActiveSchoolYearName(active.data().name);
      } else {
        const match = new Date().getFullYear();
        setActiveSchoolYearName(`${match}-${match + 1}`);
      }
    });
    const unsubGradeConfigs = onSnapshot(collection(db, 'gradeConfigurations'), (snap) => {
      setGradeConfigs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => {
      unsubUsers();
      unsubAssignments();
      unsubSchoolYears();
      unsubGradeConfigs();
    };
  }, []);

  const getAdviserNameForSection = (sectionId: string) => {
    if (!sectionId) return '';
    const assignment = assignments.find(a => a.sectionId === sectionId);
    if (assignment) {
      const teacher = users.find(u => u.id === assignment.teacherId);
      if (teacher) {
        return `${teacher.firstName} ${teacher.lastName}`.trim();
      }
    }
    return '';
  };

  // Form Editing State
  const [formSchoolName, setFormSchoolName] = useState('Sta. Maria CS SPED Center');
  const [formSchoolId, setFormSchoolId] = useState('199006');
  const [formDivision, setFormDivision] = useState('Zamboanga City');

  useEffect(() => {
    getGlobalSettings().then(settings => {
      if (settings.schoolName) setFormSchoolName(settings.schoolName);
      if (settings.schoolId) setFormSchoolId(settings.schoolId);
      if (settings.division) setFormDivision(settings.division);
    }).catch(console.error);
  }, []);
  const [formAcademicYear, setFormAcademicYear] = useState('');
  const [formSectionName, setFormSectionName] = useState('');
  const [formAdviserName, setFormAdviserName] = useState('');
  const [formStatus, setFormStatus] = useState('PROMOTED');
  const [formGrades, setFormGrades] = useState<SubjectGradeRow[]>([]);
  const [formHasRemedial, setFormHasRemedial] = useState(false);
  const [formRemedialFrom, setFormRemedialFrom] = useState('');
  const [formRemedialTo, setFormRemedialTo] = useState('');
  const [formRemedialRows, setFormRemedialRows] = useState<any[]>([
    { id: 'rem-1', subjectName: '', finalRating: '', remedialMark: '', recomputedGrade: '', remarks: '' },
    { id: 'rem-2', subjectName: '', finalRating: '', remedialMark: '', recomputedGrade: '', remarks: '' },
    { id: 'rem-3', subjectName: '', finalRating: '', remedialMark: '', recomputedGrade: '', remarks: '' }
  ]);

  // Dynamically calculate parent grades as the average of their children sub-subjects
  const computedFormGrades = useMemo(() => {
    const computed = [...formGrades];
    for (let i = 0; i < computed.length; i++) {
      const row = computed[i];
      if (!row.isSubSubject) {
        const children: SubjectGradeRow[] = [];
        for (let j = i + 1; j < computed.length; j++) {
          const nextRow = computed[j];
          if (nextRow.isSubSubject) {
            children.push(nextRow);
          } else {
            break;
          }
        }
        if (children.length > 0) {
          const avgForField = (field: 'q1' | 'q2' | 'q3' | 'q4' | 't1' | 't2' | 't3') => {
            const vals = children
              .map(c => c[field])
              .filter(v => v !== undefined && v !== null && v !== '' && !isNaN(Number(v)))
              .map(Number);
            if (vals.length === 0) return '';
            return String(Math.round(vals.reduce((a, b) => a + b, 0) / vals.length));
          };
          computed[i] = {
            ...row,
            q1: avgForField('q1'),
            q2: avgForField('q2'),
            q3: avgForField('q3'),
            q4: avgForField('q4'),
            t1: avgForField('t1'),
            t2: avgForField('t2'),
            t3: avgForField('t3'),
          };
        }
      }
    }
    return computed;
  }, [formGrades]);

  // Dynamically calculate the General Average of computedFormGrades
  // Dynamically calculate the General Average of computedFormGrades
  const formGeneralAverage = useMemo(() => {
    const isThreeTerm = isThreeTermYear(formAcademicYear);
    const mainSubjects = computedFormGrades.filter(r => !r.isSubSubject && r.subjectName.trim() !== '');
    if (mainSubjects.length === 0) return '';

    const finals: number[] = [];
    mainSubjects.forEach(row => {
      if (isThreeTerm) {
        const t1 = row.t1 !== '' && row.t1 !== undefined && row.t1 !== null ? parseFloat(row.t1) : '';
        const t2 = row.t2 !== '' && row.t2 !== undefined && row.t2 !== null ? parseFloat(row.t2) : '';
        const t3 = row.t3 !== '' && row.t3 !== undefined && row.t3 !== null ? parseFloat(row.t3) : '';
        const active = [t1, t2, t3].filter(v => v !== '' && !isNaN(Number(v))) as number[];
        if (active.length === 3) {
          finals.push(Math.round(active.reduce((a, b) => a + b, 0) / 3));
        }
      } else {
        const q1 = row.q1 !== '' && row.q1 !== undefined && row.q1 !== null ? parseFloat(row.q1) : '';
        const q2 = row.q2 !== '' && row.q2 !== undefined && row.q2 !== null ? parseFloat(row.q2) : '';
        const q3 = row.q3 !== '' && row.q3 !== undefined && row.q3 !== null ? parseFloat(row.q3) : '';
        const q4 = row.q4 !== '' && row.q4 !== undefined && row.q4 !== null ? parseFloat(row.q4) : '';
        const active = [q1, q2, q3, q4].filter(v => v !== '' && !isNaN(Number(v))) as number[];
        if (active.length === 4) {
          finals.push(Math.round(active.reduce((a, b) => a + b, 0) / 4));
        }
      }
    });

    if (finals.length === 0 || finals.length < mainSubjects.length) return '';
    return Math.round(finals.reduce((a, b) => a + b, 0) / finals.length);
  }, [computedFormGrades, formAcademicYear]);

  // Dynamically calculate and automate Action Taken dropdown status based on failed subjects count
  useEffect(() => {
    if (editingGradeLevel === null) return;

    const isThreeTerm = isThreeTermYear(formAcademicYear);
    const mainSubjects = computedFormGrades.filter(r => !r.isSubSubject && r.subjectName.trim() !== '');
    if (mainSubjects.length === 0) return;

    let failedCount = 0;
    let completedSubjectsCount = 0;

    mainSubjects.forEach(row => {
      let finalVal: number | null = null;
      if (isThreeTerm) {
        const t1 = row.t1 !== '' && row.t1 !== undefined && row.t1 !== null ? parseFloat(row.t1) : '';
        const t2 = row.t2 !== '' && row.t2 !== undefined && row.t2 !== null ? parseFloat(row.t2) : '';
        const t3 = row.t3 !== '' && row.t3 !== undefined && row.t3 !== null ? parseFloat(row.t3) : '';
        const active = [t1, t2, t3].filter(v => v !== '' && !isNaN(Number(v))) as number[];
        if (active.length === 3) {
          finalVal = Math.round(active.reduce((a, b) => a + b, 0) / 3);
        }
      } else {
        const q1 = row.q1 !== '' && row.q1 !== undefined && row.q1 !== null ? parseFloat(row.q1) : '';
        const q2 = row.q2 !== '' && row.q2 !== undefined && row.q2 !== null ? parseFloat(row.q2) : '';
        const q3 = row.q3 !== '' && row.q3 !== undefined && row.q3 !== null ? parseFloat(row.q3) : '';
        const q4 = row.q4 !== '' && row.q4 !== undefined && row.q4 !== null ? parseFloat(row.q4) : '';
        const active = [q1, q2, q3, q4].filter(v => v !== '' && !isNaN(Number(v))) as number[];
        if (active.length === 4) {
          finalVal = Math.round(active.reduce((a, b) => a + b, 0) / 4);
        }
      }

      if (finalVal !== null && !isNaN(finalVal)) {
        completedSubjectsCount++;
        if (finalVal < 75) {
          failedCount++;
        }
      }
    });

    if (completedSubjectsCount > 0 && completedSubjectsCount === mainSubjects.length) {
      if (formStatus === 'DROPPED') {
        return;
      }
      if (failedCount === 0) {
        setFormStatus('PROMOTED');
      } else if (failedCount === 1 || failedCount === 2) {
        setFormStatus('IRREGULAR');
      } else {
        setFormStatus('RETAINED');
      }
    }
  }, [computedFormGrades, formAcademicYear, editingGradeLevel]);

  // Filter students by section
  const sectionStudents = useMemo(() => {
    if (selectedSectionId === 'all') return allStudents;
    return allStudents.filter(s => s.sectionId === selectedSectionId);
  }, [allStudents, selectedSectionId]);

  // Sorted students alphabetical
  const sortedStudents = useMemo(() => {
    return [...sectionStudents].sort((a, b) => {
      const aName = `${a.lastName || ''}, ${a.firstName || ''}`.toLowerCase();
      const bName = `${b.lastName || ''}, ${b.firstName || ''}`.toLowerCase();
      return aName.localeCompare(bName);
    });
  }, [sectionStudents]);

  // Filtered dropdown student selection
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return sortedStudents;
    const q = searchQuery.toLowerCase();
    return sortedStudents.filter(s =>
      `${s.firstName} ${s.lastName} ${s.lrn}`.toLowerCase().includes(q)
    );
  }, [sortedStudents, searchQuery]);

  const selectedStudent = useMemo(() => {
    return allStudents.find(s => s.id === selectedStudentId);
  }, [allStudents, selectedStudentId]);

  const studentSectionName = useMemo(() => {
    if (!selectedStudent?.sectionId) return '—';
    const foundSec = normalizedSections.find(sec => sec.id === selectedStudent.sectionId);
    return foundSec ? foundSec.name : '—';
  }, [selectedStudent?.sectionId, normalizedSections]);

  // Build subject rows from enrollment data in the order they were saved
  const getSubjectRows = (enrollment: any, gradeLevelName: string): SubjectRow[] => {
    const rows: SubjectRow[] = [];

    if (!enrollment) {
      // Return exactly 8 empty rows by default
      return Array.from({ length: 8 }).map(() => ({
        name: '',
        isSubSubject: false,
        q1: '', q2: '', q3: '', q4: '', final: ''
      }));
    }

    // Support both manual flat structures and active enrollment nested structures
    let studentGrades = enrollment.grades || {};
    const gradeLevelKey = enrollment.gradeLevel;
    const matchedGradeKey = Object.keys(studentGrades).find(k => isMatchingGrade(k, gradeLevelKey || ''));
    if (matchedGradeKey) {
      studentGrades = studentGrades[matchedGradeKey];
    }
    if (!studentGrades || typeof studentGrades !== 'object') {
      studentGrades = {};
    }

    const academicYear = enrollment.academicYear || '';
    const threeTerm = isThreeTermYear(academicYear);
    const sectionId = enrollment.sectionId || (isMatchingGrade(gradeLevelName, selectedStudent?.gradeLevel) ? selectedStudent?.sectionId : '') || '';

    const entries = Object.entries(studentGrades);
    entries.sort((a: [string, any], b: [string, any]) => {
      const orderA = typeof a[1]?.order === 'number' ? a[1].order : 999;
      const orderB = typeof b[1]?.order === 'number' ? b[1].order : 999;
      return orderA - orderB;
    });

    entries.forEach(([subName, gd]: [string, any]) => {
      if (!subName.trim()) return;

      const subNameUpper = subName.toUpperCase();
      const displayName = subjectDisplayNames[subNameUpper] || subName;

      if (threeTerm) {
        const t1 = resolveTermGrade(gd, 'Term 1', subName, sectionId, gradeConfigs);
        const t2 = resolveTermGrade(gd, 'Term 2', subName, sectionId, gradeConfigs);
        const t3 = resolveTermGrade(gd, 'Term 3', subName, sectionId, gradeConfigs);
        const active = [t1, t2, t3].filter(v => v !== '' && !isNaN(Number(v))) as number[];
        const final = active.length === 3 ? Math.round(active.reduce((a, b) => a + b, 0) / 3) : '';
        rows.push({ name: displayName, isSubSubject: gd?.isSubSubject || false, q1: t1, q2: t2, q3: t3, q4: '', final });
      } else {
        const q1 = resolveTermGrade(gd, 'Quarter 1', subName, sectionId, gradeConfigs);
        const q2 = resolveTermGrade(gd, 'Quarter 2', subName, sectionId, gradeConfigs);
        const q3 = resolveTermGrade(gd, 'Quarter 3', subName, sectionId, gradeConfigs);
        const q4 = resolveTermGrade(gd, 'Quarter 4', subName, sectionId, gradeConfigs);
        const active = [q1, q2, q3, q4].filter(v => v !== '' && !isNaN(Number(v))) as number[];
        const final = active.length === 4 ? Math.round(active.reduce((a, b) => a + b, 0) / 4) : '';
        rows.push({ name: displayName, isSubSubject: gd?.isSubSubject || false, q1: q1, q2: q2, q3: q3, q4: q4, final });
      }
    });

    // Pad to at least 8 rows if empty or short (for manual encoder default blank height)
    while (rows.length < 8) {
      rows.push({
        name: '',
        isSubSubject: false,
        q1: '', q2: '', q3: '', q4: '', final: ''
      });
    }

    return rows;
  };

  const visibleGradeLevels = useMemo(() => {
    const allGrades = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];
    if (!selectedStudent?.gradeLevel) return allGrades;

    const currentGrade = String(selectedStudent.gradeLevel).toLowerCase();
    const match = currentGrade.match(/(?:grade|gr|g)?\s*([1-9]|1[0-2])\b/i) || currentGrade.match(/\b([1-9]|1[0-2])\b/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= 1 && num <= 6) {
        return allGrades.slice(0, num);
      }
    }

    return allGrades;
  }, [selectedStudent?.gradeLevel]);

  // Fetch student history by LRN
  useEffect(() => {
    const rawLrn = selectedStudent?.lrn;
    if (rawLrn === undefined || rawLrn === null || String(rawLrn).trim() === '') {
      setHistory([]);
      setLoadingHistory(false);
      return;
    }
    setLoadingHistory(true);

    const strLrn = String(rawLrn).trim();
    const numLrn = !isNaN(Number(strLrn)) ? Number(strLrn) : null;
    const lrnTargets = Array.from(new Set([strLrn, numLrn].filter(v => v !== null && v !== '')));

    const q = query(
      collection(db, 'enrollments'),
      where('lrn', 'in', lrnTargets)
    );
    const unsub = onSnapshot(q, (snap) => {
      const records = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistory(records);
      setLoadingHistory(false);
    }, (err) => {
      console.error("Error loading SF10 history:", err);
      setLoadingHistory(false);
    });
    return () => unsub();
  }, [selectedStudent?.lrn]);

  // Determine standard subject list per grade level
  const getSubjectsForGradeLevel = (gradeLevelName: string) => {
    const isGrade1 = gradeLevelName.includes('1');
    const isGrade2 = gradeLevelName.includes('2');
    const isGrade3 = gradeLevelName.includes('3');
    const isGrade4 = gradeLevelName.includes('4');
    const isGrade5 = gradeLevelName.includes('5');
    const isGrade6 = gradeLevelName.includes('6');

    if (isGrade1) {
      return [
        { code: 'LANGUAGE', name: 'Language' },
        { code: 'READING_AND_LITERACY', name: 'Reading and Literacy' },
        { code: 'MATH', name: 'Mathematics' },
        { code: 'MAKABANSA', name: 'AP/Makabansa' },
        { code: 'ESP', name: 'GMRC' }
      ];
    }
    if (isGrade2) {
      return [
        { code: 'ENGLISH', name: 'English' },
        { code: 'FILIPINO', name: 'Filipino' },
        { code: 'MATH', name: 'Mathematics' },
        { code: 'MAKABANSA', name: 'AP/Makabansa' },
        { code: 'ESP', name: 'GMRC' }
      ];
    }
    if (isGrade3) {
      return [
        { code: 'ENGLISH', name: 'English' },
        { code: 'FILIPINO', name: 'Filipino' },
        { code: 'MATH', name: 'Mathematics' },
        { code: 'SCIENCE', name: 'Science' },
        { code: 'MAKABANSA', name: 'AP/Makabansa' },
        { code: 'ESP', name: 'GMRC' }
      ];
    }
    // Grades 4, 5, 6
    return [
      { code: 'ENGLISH', name: 'English' },
      { code: 'FILIPINO', name: 'Filipino' },
      { code: 'MATH', name: 'Mathematics' },
      { code: 'SCIENCE', name: 'Science' },
      { code: 'AP', name: 'AP/Makabansa' },
      { code: 'TLE', name: 'EPP/TLE' },
      { code: 'MUSIC', name: 'Music' },
      { code: 'ARTS', name: 'Arts' },
      { code: 'PE', name: 'Physical Education' },
      { code: 'HEALTH', name: 'Health' },
      { code: 'ESP', name: 'GMRC' }
    ];
  };

  // Add a manually typed subject row
  const handleAddSubjectRow = () => {
    setFormGrades(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substring(7),
        subjectName: '',
        q1: '',
        q2: '',
        q3: '',
        q4: '',
        t1: '',
        t2: '',
        t3: '',
      }
    ]);
  };

  // Add a sub-subject row directly nested below its parent subject
  const handleAddSubSubjectRow = (parentRowId: string) => {
    setFormGrades(prev => {
      const parentIdx = prev.findIndex(r => r.id === parentRowId);
      if (parentIdx === -1) return prev;

      const newSubRow: SubjectGradeRow = {
        id: Math.random().toString(36).substring(7),
        subjectName: '',
        isSubSubject: true,
        q1: '', q2: '', q3: '', q4: '',
        t1: '', t2: '', t3: ''
      };

      let insertIdx = parentIdx + 1;
      while (insertIdx < prev.length && prev[insertIdx].isSubSubject) {
        insertIdx++;
      }

      const copy = [...prev];
      copy.splice(insertIdx, 0, newSubRow);
      return copy;
    });
  };

  // Remove a manual subject row and cascade delete child sub-subjects if it is a parent
  const handleRemoveSubjectRow = (id: string) => {
    setFormGrades(prev => {
      const idx = prev.findIndex(r => r.id === id);
      if (idx === -1) return prev;

      const rowToDelete = prev[idx];
      if (rowToDelete.isSubSubject) {
        return prev.filter(r => r.id !== id);
      }

      const copy = [...prev];
      let deleteCount = 1;
      for (let i = idx + 1; i < copy.length; i++) {
        if (copy[i].isSubSubject) {
          deleteCount++;
        } else {
          break;
        }
      }
      copy.splice(idx, deleteCount);
      return copy;
    });
  };

  // Handle updates to specific cells in a manual subject row
  const handleRowChange = (id: string, field: keyof SubjectGradeRow, value: any) => {
    setFormGrades(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  // Delete permanent record block for a single grade level
  const handleDeleteRecordBlock = async (recordId: string, gradeLevel: string, isManualHistory?: boolean) => {
    const isManual = isManualHistory === true && recordId !== selectedStudent?.id;
    const message = isManual
      ? `Are you sure you want to permanently delete the ${gradeLevel} permanent record? This action cannot be undone.`
      : `Are you sure you want to clear all grades and inputs for the active ${gradeLevel} record? This will NOT delete the student's active enrollment from the class lists.`;

    const confirmDelete = window.confirm(message);
    if (!confirmDelete) return;

    try {
      if (isManual) {
        await deleteDoc(doc(db, 'enrollments', recordId));
        alert(`${gradeLevel} record deleted successfully.`);
      } else {
        // Active enrollment document: only clear grades, status, and remedial
        await updateDoc(doc(db, 'enrollments', recordId), {
          grades: {},
          remedial: null,
          status: 'Enrolled'
        });
        alert(`${gradeLevel} active grades cleared successfully.`);
      }
    } catch (err) {
      console.error('Failed to delete/clear permanent record block:', err);
      alert('Failed to delete/clear record block. Please try again.');
    }
  };

  // Launch Encoding Panel
  const handleStartEncode = (gradeLevelName: string, existingRecord?: any) => {
    setEditingGradeLevel(gradeLevelName);

    if (!existingRecord) {
      getGlobalSettings().then(settings => {
        setFormSchoolName(settings.schoolName || 'Sta. Maria CS SPED Center');
        setFormSchoolId(settings.schoolId || '199006');
        setFormDivision(settings.division || 'Zamboanga City');
      }).catch(() => {
        setFormSchoolName('Sta. Maria CS SPED Center');
        setFormSchoolId('199006');
        setFormDivision('Zamboanga City');
      });
      setFormAcademicYear('');
      setFormSectionName('');
      setFormAdviserName('');
    } else {
      // Resolve fallback metadata for active enrollment
      const resolvedSchool = existingRecord.schoolName || 'Sta. Maria CS SPED Center';
      const resolvedDivision = existingRecord.division || 'Zamboanga City';
      const resolvedSY = existingRecord.academicYear || existingRecord.schoolYear || activeSchoolYearName;
      const resolvedSection = existingRecord.sectionName || studentSectionName;
      const resolvedAdviser = existingRecord.adviserName || getAdviserNameForSection(existingRecord.sectionId || selectedStudent?.sectionId);

      setFormSchoolName(resolvedSchool);
      setFormSchoolId(existingRecord.schoolId || '199006');
      setFormDivision(resolvedDivision);
      setFormAcademicYear(resolvedSY);
      setFormSectionName(resolvedSection);
      setFormAdviserName(resolvedAdviser);
    }

    // Resolve grades
    let recordGrades = existingRecord?.grades || {};
    const gradeKey = existingRecord?.gradeLevel;
    const matchedGradeKey = Object.keys(recordGrades).find(k => isMatchingGrade(k, gradeKey || gradeLevelName));
    if (matchedGradeKey) {
      recordGrades = recordGrades[matchedGradeKey];
    }
    if (!recordGrades || typeof recordGrades !== 'object') {
      recordGrades = {};
    }

    // Resolve promotion status dynamically if it is currently 'ENROLLED'
    let statusVal = existingRecord?.status || 'PROMOTED';
    if (statusVal.toUpperCase() === 'ENROLLED' && existingRecord) {
      let failedCount = 0;
      const subjectRows = getSubjectRows(existingRecord, gradeLevelName);
      subjectRows.forEach(row => {
        if (row.isSubSubject) return;
        const finalVal = typeof row.final === 'number' ? row.final : parseFloat(String(row.final));
        if (finalVal !== null && !isNaN(finalVal) && finalVal < 75) {
          failedCount++;
        }
      });
      if (failedCount === 0) statusVal = 'PROMOTED';
      else if (failedCount <= 2) statusVal = 'IRREGULAR';
      else statusVal = 'RETAINED';
    }
    setFormStatus(statusVal);

    const initialRows: SubjectGradeRow[] = [];
    const populatedCodes = new Set<string>();

    const sectionId = existingRecord?.sectionId || '';

    if (!existingRecord || !recordGrades || Object.keys(recordGrades).length === 0) {
      // If there is no record for this grade level in the system, leave learning areas blank (8 blank rows)
      for (let i = 0; i < 8; i++) {
        initialRows.push({
          id: Math.random().toString(36).substring(7),
          subjectName: '',
          isSubSubject: false,
          q1: '', q2: '', q3: '', q4: '',
          t1: '', t2: '', t3: ''
        });
      }
    } else {
      // Resolve subjects and grades dynamically from database
      Object.entries(recordGrades).forEach(([subName, gd]: [string, any]) => {
        if (!subName.trim()) return;
        const subNameUpper = subName.toUpperCase();
        const displayName = subjectDisplayNames[subNameUpper] || subName;

        const t1Val = resolveTermGrade(gd, 'Term 1', subName, sectionId, gradeConfigs);
        const t2Val = resolveTermGrade(gd, 'Term 2', subName, sectionId, gradeConfigs);
        const t3Val = resolveTermGrade(gd, 'Term 3', subName, sectionId, gradeConfigs);
        const q1Val = resolveTermGrade(gd, 'Quarter 1', subName, sectionId, gradeConfigs);
        const q2Val = resolveTermGrade(gd, 'Quarter 2', subName, sectionId, gradeConfigs);
        const q3Val = resolveTermGrade(gd, 'Quarter 3', subName, sectionId, gradeConfigs);
        const q4Val = resolveTermGrade(gd, 'Quarter 4', subName, sectionId, gradeConfigs);

        initialRows.push({
          id: Math.random().toString(36).substring(7),
          subjectName: displayName,
          isSubSubject: gd.isSubSubject || false,
          q1: q1Val !== '' ? String(q1Val) : '',
          q2: q2Val !== '' ? String(q2Val) : '',
          q3: q3Val !== '' ? String(q3Val) : '',
          q4: q4Val !== '' ? String(q4Val) : '',
          t1: t1Val !== '' ? String(t1Val) : '',
          t2: t2Val !== '' ? String(t2Val) : '',
          t3: t3Val !== '' ? String(t3Val) : '',
        });
      });

      // Pad to at least 8 rows
      while (initialRows.length < 8) {
        initialRows.push({
          id: Math.random().toString(36).substring(7),
          subjectName: '',
          isSubSubject: false,
          q1: '', q2: '', q3: '', q4: '',
          t1: '', t2: '', t3: ''
        });
      }
    }
    // Load Remedial Data
    const remedialData = existingRecord?.remedial;
    setFormHasRemedial(!!remedialData);
    setFormRemedialFrom(remedialData?.from || '');
    setFormRemedialTo(remedialData?.to || '');
    if (remedialData?.classes && Array.isArray(remedialData.classes)) {
      const rows = remedialData.classes.map((c: any, idx: number) => ({
        id: `rem-${idx + 1}`,
        subjectName: c.subjectName || '',
        finalRating: c.finalRating || '',
        remedialMark: c.remedialMark || '',
        recomputedGrade: c.recomputedGrade || '',
        remarks: c.remarks || ''
      }));
      // Pad to exactly 3 rows
      while (rows.length < 3) {
        rows.push({
          id: `rem-${rows.length + 1}`,
          subjectName: '',
          finalRating: '',
          remedialMark: '',
          recomputedGrade: '',
          remarks: ''
        });
      }
      setFormRemedialRows(rows);
    } else {
      setFormRemedialRows([
        { id: 'rem-1', subjectName: '', finalRating: '', remedialMark: '', recomputedGrade: '', remarks: '' },
        { id: 'rem-2', subjectName: '', finalRating: '', remedialMark: '', recomputedGrade: '', remarks: '' },
        { id: 'rem-3', subjectName: '', finalRating: '', remedialMark: '', recomputedGrade: '', remarks: '' }
      ]);
    }

    setFormGrades(initialRows);
  };

  // Save the Encoded Roster block
  const handleSaveBlock = async () => {
    if (!selectedStudent) return;
    const syCheck = validateSchoolYear(formAcademicYear);
    if (!syCheck.isValid) {
      alert(syCheck.error);
      return;
    }

    try {
      const isThreeTerm = isThreeTermYear(formAcademicYear);
      const existingRecord = findBestRecordForGrade(history, editingGradeLevel || '');

      // Determine if we are editing the active student's current enrollment document
      const isEditingActiveDoc = existingRecord
        ? (existingRecord.id === selectedStudent.id)
        : isMatchingGrade(editingGradeLevel || '', selectedStudent.gradeLevel);

      const isManual = !isEditingActiveDoc;

      const targetDocId = isEditingActiveDoc
        ? selectedStudent.id
        : (existingRecord && existingRecord.isManualHistory ? existingRecord.id : null);

      const savedGrades: Record<string, any> = {};
      const finalGrades = { ...(existingRecord?.grades || selectedStudent?.grades || {}) };

      if (isEditingActiveDoc) {
        // Active enrollment: merge grades under editingGradeLevel key
        const gradeLevelKey = editingGradeLevel || selectedStudent.gradeLevel || 'Grade 1';
        if (!finalGrades[gradeLevelKey]) {
          finalGrades[gradeLevelKey] = {};
        }

        computedFormGrades.forEach((row, rowIdx) => {
          if (!row.subjectName.trim()) return;
          const cleanName = row.subjectName.toLowerCase().trim();
          const code = subjectRowMap[cleanName] || row.subjectName.toUpperCase().replace(/\s+/g, '_');

          const existingSubjectData = finalGrades[gradeLevelKey][code] || {};

          if (isThreeTerm) {
            finalGrades[gradeLevelKey][code] = {
              ...existingSubjectData,
              t1: parseGradeValue(row.t1),
              t2: parseGradeValue(row.t2),
              t3: parseGradeValue(row.t3),
              isSubSubject: row.isSubSubject || false,
              order: rowIdx
            };
          } else {
            finalGrades[gradeLevelKey][code] = {
              ...existingSubjectData,
              q1: parseGradeValue(row.q1),
              q2: parseGradeValue(row.q2),
              q3: parseGradeValue(row.q3),
              q4: parseGradeValue(row.q4),
              isSubSubject: row.isSubSubject || false,
              order: rowIdx
            };
          }
        });
      } else {
        // Manual history: save grades flat in savedGrades
        computedFormGrades.forEach((row, rowIdx) => {
          if (!row.subjectName.trim()) return;
          const cleanName = row.subjectName.toLowerCase().trim();
          const code = subjectRowMap[cleanName] || row.subjectName.toUpperCase().replace(/\s+/g, '_');
          if (isThreeTerm) {
            savedGrades[code] = {
              t1: parseGradeValue(row.t1),
              t2: parseGradeValue(row.t2),
              t3: parseGradeValue(row.t3),
              isSubSubject: row.isSubSubject || false,
              order: rowIdx
            };
          } else {
            savedGrades[code] = {
              q1: parseGradeValue(row.q1),
              q2: parseGradeValue(row.q2),
              q3: parseGradeValue(row.q3),
              q4: parseGradeValue(row.q4),
              isSubSubject: row.isSubSubject || false,
              order: rowIdx
            };
          }
        });
      }

      const documentPayload: Record<string, any> = {
        lrn: selectedStudent.lrn || '',
        firstName: selectedStudent.firstName || '',
        lastName: selectedStudent.lastName || '',
        middleName: selectedStudent.middleName || '',
        gender: selectedStudent.gender || '',
        birthDate: selectedStudent.birthDate || '',
        address: selectedStudent.address || '',
        fatherName: selectedStudent.fatherName || '',
        motherName: selectedStudent.motherName || '',
        gradeLevel: isEditingActiveDoc ? (selectedStudent.gradeLevel || editingGradeLevel) : editingGradeLevel,
        schoolName: formSchoolName,
        schoolId: formSchoolId,
        division: formDivision,
        academicYear: formAcademicYear,
        sectionName: formSectionName,
        adviserName: formAdviserName,
        // CRITICAL FIX: Active student doc MUST maintain status: 'Enrolled' so student isn't removed from class list/roster!
        status: isEditingActiveDoc ? (selectedStudent.status && selectedStudent.status.toLowerCase().includes('enrolled') ? selectedStudent.status : 'Enrolled') : formStatus,
        promotionStatus: formStatus,
        actionTaken: formStatus,
        grades: isEditingActiveDoc ? finalGrades : savedGrades,
        remedial: formHasRemedial ? {
          from: formRemedialFrom,
          to: formRemedialTo,
          classes: formRemedialRows.map(r => ({
            subjectName: r.subjectName || '',
            finalRating: r.finalRating || '',
            remedialMark: r.remedialMark || '',
            recomputedGrade: r.recomputedGrade || '',
            remarks: r.remarks || ''
          }))
        } : null
      };

      if (isManual) {
        documentPayload.isManualHistory = true;
      } else {
        documentPayload.isManualHistory = false;
      }

      if (targetDocId) {
        // Update document
        await updateDoc(doc(db, 'enrollments', targetDocId), documentPayload);
      } else {
        // Add new document
        await addDoc(collection(db, 'enrollments'), documentPayload);
      }

      setEditingGradeLevel(null);
    } catch (err) {
      console.error('Failed to save permanent record history block:', err);
      alert('Failed to save record block. Please try again.');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F4F7F9]">
      {/* HEADER */}
      <header className="h-[72px] px-6 sm:px-8 border-b border-slate-200 bg-white shrink-0 flex items-center justify-between z-10">
        <div className="flex items-center gap-3 shrink-0">
          <div className="p-2.5 bg-[#D8232A]/10 text-[#D8232A] border border-[#D8232A]/20 rounded-2xl shadow-sm">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#D8232A] leading-none mb-1">Admin Portal</span>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none">Permanent Academic Record (SF10)</h1>
          </div>
        </div>
        {selectedStudent && (
          <Button
            onClick={() => setIsViewingPreview(true)}
            className="flex items-center gap-2 bg-[#D8232A] text-white rounded-xl shadow hover:bg-[#b91c22] font-semibold text-sm transition-all"
          >
            <FileText className="w-4 h-4" />
            <span>Preview SF10</span>
          </Button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
        <div className="max-w-7xl mx-auto w-full space-y-6">

        {/* Roster & Selector Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Section Picker Card */}
          {(isAdmin || sortedSections.length > 0) && (
            <Card className="p-5 bg-white border border-slate-200/60 rounded-3xl shadow-sm hover:shadow-md transition-shadow space-y-3.5 !overflow-visible">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">1. Filter Section</h3>
              <div className={`relative ${isSectionSelectorOpen ? 'z-50' : 'z-10'}`}>
                <button
                  onClick={() => setIsSectionSelectorOpen(!isSectionSelectorOpen)}
                  className="flex items-center justify-between w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-300 focus:outline-none transition-all shadow-sm"
                >
                  <span className="truncate">
                    {selectedSectionId === 'all'
                      ? 'All Sections'
                      : (() => {
                        const sec = sortedSections.find(s => s.id === selectedSectionId);
                        return sec ? `${sec.gradeLevel} - ${sec.name}` : 'Select Section';
                      })()
                    }
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                </button>

                {isSectionSelectorOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40 bg-transparent"
                      onClick={() => setIsSectionSelectorOpen(false)}
                    />
                    <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                      <div className="p-3 border-b border-slate-100 flex items-center gap-2">
                        <Search className="w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search sections..."
                          value={sectionSearchQuery}
                          onChange={(e) => setSectionSearchQuery(e.target.value)}
                          className="w-full text-xs font-medium border-none outline-none focus:ring-0 bg-transparent text-slate-700"
                        />
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        <button
                          onClick={() => {
                            setSelectedSectionId('all');
                            setSelectedStudentId('');
                            setIsSectionSelectorOpen(false);
                            setSectionSearchQuery('');
                          }}
                          className={`w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-slate-50 border-b border-slate-50 last:border-0 ${selectedSectionId === 'all' ? 'text-[#D8232A] bg-red-50/50' : 'text-slate-700'
                            }`}
                        >
                          All Sections
                        </button>
                        {sortedSections
                          .filter(s => {
                            const q = sectionSearchQuery.toLowerCase();
                            return s.name.toLowerCase().includes(q) || s.gradeLevel.toLowerCase().includes(q);
                          })
                          .map(s => (
                            <button
                              key={s.id}
                              onClick={() => {
                                setSelectedSectionId(s.id);
                                setSelectedStudentId('');
                                setIsSectionSelectorOpen(false);
                                setSectionSearchQuery('');
                              }}
                              className={`w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-slate-50 border-b border-slate-50 last:border-0 ${s.id === selectedSectionId ? 'text-[#D8232A] bg-red-50/50' : 'text-slate-700'
                                }`}
                            >
                              {s.gradeLevel} - {s.name}
                            </button>
                          ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Card>
          )}

          {/* Student Custom Search Selector Card */}
          <Card className={`${(isAdmin || sortedSections.length > 0) ? 'col-span-2' : 'col-span-3'} p-5 bg-white border border-slate-200/60 rounded-3xl shadow-sm hover:shadow-md transition-shadow space-y-3.5 !overflow-visible`}>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">
              {isAdmin ? '2. Select Learner' : 'Select Learner'}
            </h3>
            <div className={`relative ${isSelectorOpen ? 'z-50' : 'z-10'}`}>
              <button
                onClick={() => setIsSelectorOpen(!isSelectorOpen)}
                className="flex items-center justify-between w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-300 focus:outline-none transition-all shadow-sm"
              >
                <span className="truncate">
                  {selectedStudent ? `${selectedStudent.lastName}, ${selectedStudent.firstName} (LRN: ${selectedStudent.lrn})` : 'Select Student'}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
              </button>

              {isSelectorOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => setIsSelectorOpen(false)}
                  />
                  <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                    <div className="p-3 border-b border-slate-100 flex items-center gap-2">
                      <Search className="w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search student or LRN..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full text-xs font-medium border-none outline-none focus:ring-0 bg-transparent text-slate-700"
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {filteredStudents.length > 0 ? (
                        filteredStudents.map((st) => (
                          <button
                            key={st.id}
                            onClick={() => {
                              setSelectedStudentId(st.id);
                              setIsSelectorOpen(false);
                              setSearchQuery('');
                              setEditingGradeLevel(null);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-slate-50 border-b border-slate-50 last:border-0 ${st.id === selectedStudentId ? 'text-[#D8232A] bg-red-50/50' : 'text-slate-700'
                              }`}
                          >
                            <div className="flex justify-between items-center">
                              <span>{st.lastName}, {st.firstName} {st.middleName || ''}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{st.lrn}</span>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-center text-xs text-slate-400 font-medium">
                          No matching students.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>

        </div>

        {/* Main content grid */}
        {selectedStudent ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Sidebar Student Summary Card */}
            <div className="lg:col-span-4 space-y-6">
              <Card className="p-6 bg-white border border-slate-200/60 rounded-3xl shadow-sm space-y-6">
                <div className="flex flex-col items-center text-center pb-4 border-b border-slate-100">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#D8232A] via-[#c41e25] to-[#a01920] text-white flex items-center justify-center font-black text-xl shadow-md mb-3">
                    {selectedStudent.firstName?.[0] || ''}{selectedStudent.lastName?.[0] || ''}
                  </div>
                  <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wide">
                    {selectedStudent.lastName}, {selectedStudent.firstName} {selectedStudent.middleName?.[0] ? `${selectedStudent.middleName[0]}.` : ''}
                  </h3>
                  <span className="text-[10px] font-bold font-mono text-[#D8232A] bg-red-50 px-2.5 py-0.5 rounded-full mt-1.5 shadow-sm">
                    LRN: {selectedStudent.lrn}
                  </span>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
                    <label className="text-[9px] uppercase font-black text-slate-400 block tracking-wider">Gender</label>
                    <span className="font-bold text-slate-700 block mt-1 capitalize">{selectedStudent.gender || '—'}</span>
                  </div>
                  <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
                    <label className="text-[9px] uppercase font-black text-slate-400 block tracking-wider">Advisory Grade & Section</label>
                    <span className="font-bold text-slate-800 block mt-1">
                      {selectedStudent.gradeLevel || '—'} - {studentSectionName}
                    </span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Academic Timeline / Encoding Panels */}
            <div className="lg:col-span-8 space-y-6">
              {loadingHistory ? (
                <div className="flex flex-col items-center justify-center p-12 space-y-3 bg-white border rounded-3xl">
                  <div className="w-8 h-8 border-4 border-[#D8232A] border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-bold text-slate-500">Loading student history blocks...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {visibleGradeLevels.map((gradeLvl) => {
                    const record = findBestRecordForGrade(history, gradeLvl);
                    const hasRecord = record ? (record.isManualHistory === true || hasGradesData(record, gradeLvl)) : false;
                    const isCurrentEditing = editingGradeLevel === gradeLvl;
                    const isCurrentGradeLevel = isMatchingGrade(selectedStudent.gradeLevel, gradeLvl);
                    const canEditBlock = true;

                    return (
                      <Card key={gradeLvl} className="p-6 bg-white border border-slate-200/60 rounded-3xl shadow-sm space-y-4">

                        {/* Block Header */}
                        <div className="flex justify-between items-center pb-2 border-b">
                          <div className="flex items-center gap-2">
                            <span className="bg-red-50 text-[#D8232A] font-black px-3 py-1 rounded-xl text-xs uppercase">
                              {gradeLvl}
                            </span>
                            {hasRecord && (
                              <span className="text-xs font-bold text-slate-400">
                                SY {record.academicYear || '—'}
                              </span>
                            )}
                          </div>

                          {!isCurrentEditing && canEditBlock && (
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleStartEncode(gradeLvl, hasRecord ? record : undefined)}
                                variant="outline"
                                className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold"
                              >
                                {hasRecord ? <Edit className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                                <span>{hasRecord ? 'Edit Record' : 'Encode History'}</span>
                              </Button>
                              {hasRecord && (
                                <Button
                                  onClick={() => handleDeleteRecordBlock(record.id, gradeLvl, record.isManualHistory === true)}
                                  variant="outline"
                                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete</span>
                                </Button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Display Mode / Encoding Form Mode */}
                        {isCurrentEditing ? (
                          <div className="space-y-6 pt-2">

                            {/* Metadata Fields Grouped Container */}
                            <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/50 space-y-4">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-0.5">School & Section Information</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase">School Name</label>
                                  <Input
                                    value={formSchoolName}
                                    onChange={(e) => setFormSchoolName(e.target.value)}
                                    className="h-9 rounded-lg text-xs font-medium focus:ring-2 focus:ring-red-500/20 focus:border-[#D8232A] transition-all bg-white"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase">School ID</label>
                                  <Input
                                    value={formSchoolId}
                                    onChange={(e) => setFormSchoolId(e.target.value)}
                                    className="h-9 rounded-lg text-xs font-medium font-mono focus:ring-2 focus:ring-red-500/20 focus:border-[#D8232A] transition-all bg-white"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase">Division</label>
                                  <Input
                                    value={formDivision}
                                    onChange={(e) => setFormDivision(e.target.value)}
                                    className="h-9 rounded-lg text-xs font-medium focus:ring-2 focus:ring-red-500/20 focus:border-[#D8232A] transition-all bg-white"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase">
                                    School Year <span className="text-rose-500 font-bold ml-0.5">*</span>
                                  </label>
                                  <Input
                                    value={formAcademicYear}
                                    onChange={(e) => {
                                      const inputType = (e.nativeEvent as any).inputType;
                                      const numbers = e.target.value.replace(/\D/g, '');
                                      let formatted = '';
                                      if (numbers.length > 0) {
                                        formatted += numbers.substring(0, 4);
                                      }
                                      if (numbers.length > 4) {
                                        formatted += '-' + numbers.substring(4, 8);
                                      } else if (numbers.length === 4 && inputType !== 'deleteContentBackward') {
                                        formatted += '-';
                                      }
                                      setFormAcademicYear(formatted);
                                    }}
                                    placeholder="e.g. 2024-2025"
                                    className="h-9 rounded-lg text-xs font-medium font-mono focus:ring-2 focus:ring-red-500/20 focus:border-[#D8232A] transition-all bg-white"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase">Section Name</label>
                                  <Input
                                    value={formSectionName}
                                    onChange={(e) => setFormSectionName(e.target.value)}
                                    placeholder="e.g. Section 1"
                                    className="h-9 rounded-lg text-xs font-medium focus:ring-2 focus:ring-red-500/20 focus:border-[#D8232A] transition-all bg-white"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase">Adviser Name</label>
                                  <Input
                                    value={formAdviserName}
                                    onChange={(e) => setFormAdviserName(e.target.value)}
                                    placeholder="Adviser Name"
                                    className="h-9 rounded-lg text-xs font-medium focus:ring-2 focus:ring-red-500/20 focus:border-[#D8232A] transition-all bg-white"
                                  />
                                </div>
                                <div className="space-y-1 sm:col-span-2 md:col-span-3">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase">Action Taken</label>
                                  <Select value={formStatus} onValueChange={setFormStatus}>
                                    <SelectTrigger className="h-9 rounded-lg text-xs font-medium bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D8232A] transition-all">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="PROMOTED">PROMOTED</SelectItem>
                                      <SelectItem value="RETAINED">RETAINED</SelectItem>
                                      <SelectItem value="IRREGULAR">IRREGULAR</SelectItem>
                                      <SelectItem value="DROPPED">DROPPED</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>

                            {/* Grades Table */}
                            {(() => {
                              const isThreeTerm = isThreeTermYear(formAcademicYear);
                              return (
                                <div className="space-y-3.5">
                                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-0.5">Academic Grades & Subjects</h4>
                                  <div className="overflow-hidden border border-slate-200 rounded-2xl shadow-sm bg-white">
                                    <table className="w-full text-center border-collapse text-xs">
                                      <thead>
                                        <tr className="bg-red-50/50 font-bold text-slate-600 border-b border-slate-200">
                                          <th className="p-3 text-left font-extrabold text-[10px] uppercase tracking-wide">Learning Area</th>
                                          {isThreeTerm ? (
                                            <>
                                              <th className="p-3 w-20 font-extrabold text-[10px]">T1</th>
                                              <th className="p-3 w-20 font-extrabold text-[10px]">T2</th>
                                              <th className="p-3 w-20 font-extrabold text-[10px]">T3</th>
                                            </>
                                          ) : (
                                            <>
                                              <th className="p-3 w-20 font-extrabold text-[10px]">Q1</th>
                                              <th className="p-3 w-20 font-extrabold text-[10px]">Q2</th>
                                              <th className="p-3 w-20 font-extrabold text-[10px]">Q3</th>
                                              <th className="p-3 w-20 font-extrabold text-[10px]">Q4</th>
                                            </>
                                          )}
                                          <th className="p-3 w-24 font-extrabold text-[10px]">Action</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {computedFormGrades.map((row, idx) => {
                                          const hasChildren = !row.isSubSubject && computedFormGrades[idx + 1]?.isSubSubject === true;

                                          return (
                                            <tr key={row.id} className="border-b last:border-b-0 hover:bg-slate-50/50">
                                              <td className="p-2 text-left">
                                                <div className="flex items-center gap-1.5">
                                                  {row.isSubSubject && (
                                                    <CornerDownRight className="w-4 h-4 text-slate-400 shrink-0 ml-1.5" />
                                                  )}
                                                  <input
                                                    type="text"
                                                    value={row.subjectName}
                                                    onChange={(e) => handleRowChange(row.id, 'subjectName', e.target.value)}
                                                    placeholder={row.isSubSubject ? "Component (e.g. Music)" : "Subject Name (e.g. MAPEH)"}
                                                    className={`w-full h-8 px-2 text-xs font-semibold border border-slate-200 rounded-lg outline-none focus:border-[#D8232A] bg-white ${row.isSubSubject ? 'italic font-medium text-slate-500 pl-2 bg-slate-50/30 border-dashed border-red-200' : 'text-slate-800'
                                                      }`}
                                                  />
                                                </div>
                                              </td>
                                              {isThreeTerm ? (
                                                ['t1', 't2', 't3'].map((term) => (
                                                  <td key={term} className="p-1">
                                                    <input
                                                      type="number"
                                                      value={row[term as 't1' | 't2' | 't3'] || ''}
                                                      onChange={(e) => handleRowChange(row.id, term as 't1' | 't2' | 't3', e.target.value)}
                                                      disabled={hasChildren}
                                                      className={`w-12 h-8 text-center text-xs font-bold border border-slate-200 rounded-lg outline-none focus:border-[#D8232A] ${hasChildren ? 'bg-red-50/40 text-[#D8232A] border-red-200 cursor-not-allowed select-none font-extrabold' : ''
                                                        }`}
                                                      min="50"
                                                      max="100"
                                                      title={hasChildren ? "Averaged from sub-subjects" : undefined}
                                                    />
                                                  </td>
                                                ))
                                              ) : (
                                                ['q1', 'q2', 'q3', 'q4'].map((quarter) => (
                                                  <td key={quarter} className="p-1">
                                                    <input
                                                      type="number"
                                                      value={row[quarter as 'q1' | 'q2' | 'q3' | 'q4'] || ''}
                                                      onChange={(e) => handleRowChange(row.id, quarter as 'q1' | 'q2' | 'q3' | 'q4', e.target.value)}
                                                      disabled={hasChildren}
                                                      className={`w-12 h-8 text-center text-xs font-bold border border-slate-200 rounded-lg outline-none focus:border-[#D8232A] ${hasChildren ? 'bg-red-50/40 text-[#D8232A] border-red-200 cursor-not-allowed select-none font-extrabold' : ''
                                                        }`}
                                                      min="50"
                                                      max="100"
                                                      title={hasChildren ? "Averaged from sub-subjects" : undefined}
                                                    />
                                                  </td>
                                                ))
                                              )}
                                              <td className="p-1 text-center whitespace-nowrap">
                                                {!row.isSubSubject && (
                                                  <button
                                                    type="button"
                                                    onClick={() => handleAddSubSubjectRow(row.id)}
                                                    className="p-1.5 text-[#D8232A] hover:bg-red-50 rounded-lg transition-all inline-block mr-1"
                                                    title="Add Sub-subject"
                                                  >
                                                    <Plus className="w-3.5 h-3.5" />
                                                  </button>
                                                )}
                                                <button
                                                  type="button"
                                                  onClick={() => handleRemoveSubjectRow(row.id)}
                                                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all inline-block"
                                                  title="Delete Row"
                                                >
                                                  <X className="w-4 h-4" />
                                                </button>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                        {computedFormGrades.length > 0 && (
                                          <tr className="bg-red-50/40 font-bold border-t border-red-100">
                                            <td className="p-2 text-left text-[#D8232A] font-extrabold text-[11px] uppercase tracking-wide">
                                              Calculated General Average
                                            </td>
                                            <td colSpan={isThreeTerm ? 3 : 4} className="p-2"></td>
                                            <td className="p-2 text-center text-[#D8232A] font-black text-sm bg-red-100/50">
                                              {formGeneralAverage || '—'}
                                            </td>
                                          </tr>
                                        )}
                                        {computedFormGrades.length === 0 && (
                                          <tr>
                                            <td colSpan={isThreeTerm ? 5 : 6} className="p-6 text-center text-slate-400 font-semibold italic">
                                              No subjects added yet. Click "Add Subject Row" below to start encoding grades.
                                            </td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                  <div className="flex justify-start">
                                    <Button
                                      type="button"
                                      onClick={handleAddSubjectRow}
                                      variant="outline"
                                      className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-bold text-[#D8232A] border-red-200 hover:bg-red-50/50"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>Add Subject Row</span>
                                    </Button>
                                  </div>

                                  {/* Remedial Classes Section */}
                                  <div className="border border-slate-200 rounded-3xl p-5 bg-white space-y-4">
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        id={`has-remedial-${gradeLvl}`}
                                        checked={formHasRemedial}
                                        onChange={(e) => setFormHasRemedial(e.target.checked)}
                                        className="w-4 h-4 text-[#D8232A] border-slate-300 rounded focus:ring-red-500 cursor-pointer accent-[#D8232A]"
                                      />
                                      <label htmlFor={`has-remedial-${gradeLvl}`} className="text-xs font-bold text-slate-700 uppercase cursor-pointer select-none">
                                        Has Remedial Classes Record
                                      </label>
                                    </div>

                                    {formHasRemedial && (
                                      <div className="space-y-4 pt-1">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                          <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Conducted From</label>
                                            <Input
                                              value={formRemedialFrom}
                                              onChange={(e) => setFormRemedialFrom(e.target.value)}
                                              placeholder="e.g. June 1, 2025"
                                              className="h-9 rounded-lg text-xs font-medium"
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Conducted To</label>
                                            <Input
                                              value={formRemedialTo}
                                              onChange={(e) => setFormRemedialTo(e.target.value)}
                                              placeholder="e.g. July 15, 2025"
                                              className="h-9 rounded-lg text-xs font-medium"
                                            />
                                          </div>
                                        </div>

                                        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                                          <table className="w-full text-center border-collapse text-xs">
                                            <thead>
                                              <tr className="bg-slate-50 font-bold text-slate-500 border-b">
                                                <th className="p-2 text-left">Learning Area</th>
                                                <th className="p-2 w-24">Final Rating</th>
                                                <th className="p-2 w-28">Remedial Class Mark</th>
                                                <th className="p-2 w-32">Recomputed Final Grade</th>
                                                <th className="p-2 w-28">Remarks</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {formRemedialRows.map((row, rIdx) => {
                                                const updateRowField = (field: string, val: string) => {
                                                  setFormRemedialRows(prev =>
                                                    prev.map((r, i) => i === rIdx ? { ...r, [field]: val } : r)
                                                  );
                                                };

                                                return (
                                                  <tr key={row.id} className="border-b last:border-b-0">
                                                    <td className="p-1.5">
                                                      <input
                                                        type="text"
                                                        value={row.subjectName}
                                                        onChange={(e) => updateRowField('subjectName', e.target.value)}
                                                        placeholder="e.g. Mathematics"
                                                        className="w-full h-8 px-2 text-xs font-semibold border border-slate-200 rounded-lg outline-none focus:border-[#D8232A] bg-white text-slate-800"
                                                      />
                                                    </td>
                                                    <td className="p-1.5">
                                                      <input
                                                        type="number"
                                                        value={row.finalRating}
                                                        onChange={(e) => updateRowField('finalRating', e.target.value)}
                                                        className="w-full h-8 text-center text-xs font-bold border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                                                      />
                                                    </td>
                                                    <td className="p-1.5">
                                                      <input
                                                        type="number"
                                                        value={row.remedialMark}
                                                        onChange={(e) => updateRowField('remedialMark', e.target.value)}
                                                        className="w-full h-8 text-center text-xs font-bold border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                                                      />
                                                    </td>
                                                    <td className="p-1.5">
                                                      <input
                                                        type="number"
                                                        value={row.recomputedGrade}
                                                        onChange={(e) => updateRowField('recomputedGrade', e.target.value)}
                                                        className="w-full h-8 text-center text-xs font-bold border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                                                      />
                                                    </td>
                                                    <td className="p-1.5">
                                                      <input
                                                        type="text"
                                                        value={row.remarks}
                                                        onChange={(e) => updateRowField('remarks', e.target.value)}
                                                        placeholder="e.g. PASSED"
                                                        className="w-full h-8 text-center text-xs font-semibold border border-slate-200 rounded-lg outline-none focus:border-indigo-500 bg-white text-slate-800"
                                                      />
                                                    </td>
                                                  </tr>
                                                );
                                              })}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Footer Action buttons */}
                            <div className="flex gap-2.5 justify-end pt-2">
                              <Button
                                onClick={() => setEditingGradeLevel(null)}
                                variant="outline"
                                className="h-9 px-4 rounded-xl text-xs font-semibold border-slate-200"
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={handleSaveBlock}
                                className="h-9 px-4 rounded-xl text-xs font-bold bg-[#D8232A] hover:bg-[#b91c22] text-white shadow"
                              >
                                Save Record
                              </Button>
                            </div>

                          </div>
                        ) : hasRecord ? (
                          /* Record Summary Display Mode */
                          (() => {
                            const isThree = isThreeTermYear(record.academicYear || record.schoolYear || activeSchoolYearName);
                            let recordGrades = record.grades || {};
                            const gradeKey = record.gradeLevel;
                            const matchedGradeKey = Object.keys(recordGrades).find(k => isMatchingGrade(k, gradeKey || gradeLvl));
                            if (matchedGradeKey) {
                              recordGrades = recordGrades[matchedGradeKey];
                            }
                            if (!recordGrades || typeof recordGrades !== 'object') {
                              recordGrades = {};
                            }

                            // Compute dynamic Adviser Name, Section Name, School Year
                            const resolvedSY = record.academicYear || record.schoolYear || activeSchoolYearName || '—';
                            const resolvedSection = record.sectionName || studentSectionName;
                            const resolvedAdviser = record.adviserName || getAdviserNameForSection(record.sectionId || selectedStudent?.sectionId) || '—';
                            const resolvedSchool = record.schoolName || 'Sta. Maria CS SPED Center';
                            const resolvedDivision = record.division || 'Zamboanga City';

                            const statusValue = (() => {
                              const rawStatus = record.status || '';
                              if (rawStatus && rawStatus.toUpperCase() !== 'ENROLLED') {
                                return rawStatus;
                              }
                              const grades = Object.entries(recordGrades);
                              if (grades.length === 0) return 'ENROLLED';

                              let failedCount = 0;
                              let completedCount = 0;
                              grades.forEach(([_, subGrades]: [string, any]) => {
                                if (subGrades?.isSubSubject) return;
                                let finalVal: number | null = null;
                                if (isThree) {
                                  const t1 = subGrades?.t1 !== undefined && subGrades?.t1 !== null ? parseFloat(subGrades.t1) : '';
                                  const t2 = subGrades?.t2 !== undefined && subGrades?.t2 !== null ? parseFloat(subGrades.t2) : '';
                                  const t3 = subGrades?.t3 !== undefined && subGrades?.t3 !== null ? parseFloat(subGrades.t3) : '';
                                  const active = [t1, t2, t3].filter(v => v !== '' && !isNaN(Number(v))) as number[];
                                  if (active.length === 3) finalVal = Math.round(active.reduce((a, b) => a + b, 0) / 3);
                                } else {
                                  const q1 = subGrades?.q1 !== undefined && subGrades?.q1 !== null ? parseFloat(subGrades.q1) : '';
                                  const q2 = subGrades?.q2 !== undefined && subGrades?.q2 !== null ? parseFloat(subGrades.q2) : '';
                                  const q3 = subGrades?.q3 !== undefined && subGrades?.q3 !== null ? parseFloat(subGrades.q3) : '';
                                  const q4 = subGrades?.q4 !== undefined && subGrades?.q4 !== null ? parseFloat(subGrades.q4) : '';
                                  const active = [q1, q2, q3, q4].filter(v => v !== '' && !isNaN(Number(v))) as number[];
                                  if (active.length === 4) finalVal = Math.round(active.reduce((a, b) => a + b, 0) / 4);
                                }
                                if (finalVal !== null && !isNaN(finalVal)) {
                                  completedCount++;
                                  if (finalVal < 75) {
                                    failedCount++;
                                  }
                                }
                              });
                              if (completedCount === 0) return 'ENROLLED';
                              if (failedCount === 0) return 'PROMOTED';
                              if (failedCount <= 2) return 'IRREGULAR';
                              return 'RETAINED';
                            })();

                            return (
                              <div className="space-y-3.5 pt-1 text-xs">
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-slate-600">
                                  <div>
                                    <span className="text-[10px] text-slate-400 uppercase font-bold block">School</span>
                                    <span className="font-bold text-slate-800 block mt-0.5 truncate uppercase">{resolvedSchool}</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Section</span>
                                    <span className="font-bold text-slate-800 block mt-0.5 truncate uppercase">{resolvedSection}</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Adviser</span>
                                    <span className="font-bold text-slate-800 block mt-0.5 truncate uppercase">{resolvedAdviser}</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Division</span>
                                    <span className="font-bold text-slate-800 block mt-0.5 truncate uppercase">{resolvedDivision}</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Action Taken</span>
                                    <span className={`inline-block mt-1 px-2 py-0.5 rounded font-black text-[9px] uppercase ${statusValue === 'PROMOTED' ? 'bg-emerald-100 text-emerald-800' :
                                        statusValue === 'RETAINED' ? 'bg-rose-100 text-rose-800' :
                                          statusValue === 'IRREGULAR' ? 'bg-amber-100 text-amber-800' :
                                            'bg-slate-100 text-slate-600'
                                      }`}>
                                      {statusValue}
                                    </span>
                                  </div>
                                </div>

                                {/* Structured view of all quarterly ratings */}
                                <div className="space-y-4">
                                  <div className="overflow-hidden border border-slate-100 rounded-2xl mt-3.5 bg-slate-50/20">
                                    <table className="w-full text-center border-collapse text-xs">
                                      <thead>
                                        <tr className="bg-slate-50 font-bold text-slate-500 border-b border-slate-150">
                                          <th className="p-2.5 text-left font-bold text-[10px] text-slate-400 uppercase tracking-wide">Learning Area</th>
                                          {isThree ? (
                                            <>
                                              <th className="p-2.5 w-14 font-bold text-[10px] text-slate-400">T1</th>
                                              <th className="p-2.5 w-14 font-bold text-[10px] text-slate-400">T2</th>
                                              <th className="p-2.5 w-14 font-bold text-[10px] text-slate-400">T3</th>
                                            </>
                                          ) : (
                                            <>
                                              <th className="p-2.5 w-14 font-bold text-[10px] text-slate-400">Q1</th>
                                              <th className="p-2.5 w-14 font-bold text-[10px] text-slate-400">Q2</th>
                                              <th className="p-2.5 w-14 font-bold text-[10px] text-slate-400">Q3</th>
                                              <th className="p-2.5 w-14 font-bold text-[10px] text-slate-400">Q4</th>
                                            </>
                                          )}
                                          <th className="p-2.5 w-20 font-extrabold text-[#D8232A] bg-red-50/30 text-[10px] uppercase tracking-wide">Final</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {getSubjectRows(record, gradeLvl).map((subj, sIdx) => {
                                          return (
                                            <tr key={`${subj.name}-${sIdx}`} className="border-b border-slate-100 hover:bg-slate-50/50 last:border-b-0">
                                              <td className={`p-2.5 text-left ${subj.isSubSubject ? 'pl-6 text-slate-500 italic font-semibold' : 'text-slate-800 font-extrabold'}`}>
                                                <div className="flex items-center gap-1.5">
                                                  {subj.isSubSubject && (
                                                    <CornerDownRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                                                  )}
                                                  <span>{subj.name || <>&nbsp;</>}</span>
                                                </div>
                                              </td>
                                              {isThree ? (
                                                <>
                                                  <td className="p-2 text-slate-600 font-bold font-mono">{subj.q1 !== '' ? subj.q1 : '—'}</td>
                                                  <td className="p-2 text-slate-600 font-bold font-mono">{subj.q2 !== '' ? subj.q2 : '—'}</td>
                                                  <td className="p-2 text-slate-600 font-bold font-mono">{subj.q3 !== '' ? subj.q3 : '—'}</td>
                                                </>
                                              ) : (
                                                <>
                                                  <td className="p-2 text-slate-600 font-bold font-mono">{subj.q1 !== '' ? subj.q1 : '—'}</td>
                                                  <td className="p-2 text-slate-600 font-bold font-mono">{subj.q2 !== '' ? subj.q2 : '—'}</td>
                                                  <td className="p-2 text-slate-600 font-bold font-mono">{subj.q3 !== '' ? subj.q3 : '—'}</td>
                                                  <td className="p-2 text-slate-600 font-bold font-mono">{subj.q4 !== '' ? subj.q4 : '—'}</td>
                                                </>
                                              )}
                                              <td className="p-2 font-black text-[#D8232A] bg-red-50/20 font-mono">{subj.final !== '' ? subj.final : '—'}</td>
                                            </tr>
                                          );
                                        })}

                                        {/* Dynamic General Average Row */}
                                        {(() => {
                                          const subjectRows = getSubjectRows(record, gradeLvl);
                                          const mainFinals = subjectRows
                                            .filter(r => !r.isSubSubject && typeof r.final === 'number' && !isNaN(r.final))
                                            .map(r => r.final as number);
                                          if (mainFinals.length > 0) {
                                            const avg = Math.round(mainFinals.reduce((a, b) => a + b, 0) / mainFinals.length);
                                            return (
                                              <tr className="bg-red-50/50 font-bold border-t border-red-100/80">
                                                <td className="p-2.5 text-left text-[#D8232A] font-extrabold text-[10px] uppercase tracking-wider">
                                                  General Average
                                                </td>
                                                <td colSpan={isThree ? 3 : 4} className="p-2"></td>
                                                <td className="p-2.5 text-center text-[#D8232A] font-black bg-red-100/40 font-mono text-sm">
                                                  {avg}
                                                </td>
                                              </tr>
                                            );
                                          }
                                          return null;
                                        })()}
                                      </tbody>
                                    </table>
                                  </div>

                                  {/* Remedial Classes Summary block */}
                                  {record.remedial && record.remedial.classes && record.remedial.classes.some((c: any) => c.subjectName) && (
                                    <div className="border border-amber-100 rounded-2xl overflow-hidden bg-amber-50/10">
                                      <div className="bg-amber-50/50 px-3 py-2 border-b border-amber-100 flex justify-between items-center text-[9px] font-black text-amber-800 uppercase tracking-wider">
                                        <span>Remedial Classes Record</span>
                                        <span className="font-bold text-slate-500 lowercase normal-case">
                                          conducted: {record.remedial.from || '—'} to {record.remedial.to || '—'}
                                        </span>
                                      </div>
                                      <table className="w-full text-center border-collapse text-xs">
                                        <thead>
                                          <tr className="bg-amber-50/20 font-bold text-amber-700/80 border-b border-amber-100/50">
                                            <th className="p-2 text-left font-bold text-[9px] uppercase tracking-wide">Learning Area</th>
                                            <th className="p-2 w-20 font-bold text-[9px]">Final</th>
                                            <th className="p-2 w-24 font-bold text-[9px]">Remedial Mark</th>
                                            <th className="p-2 w-28 font-bold text-[9px]">Recomputed</th>
                                            <th className="p-2 w-24 font-black text-emerald-800 bg-emerald-50/20 text-[9px] uppercase tracking-wide">Remarks</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {record.remedial.classes.map((row: any, rIdx: number) => {
                                            if (!row.subjectName) return null;
                                            return (
                                              <tr key={rIdx} className="border-b border-amber-100/30 hover:bg-amber-50/20 last:border-b-0">
                                                <td className="p-2 text-left font-bold text-slate-700">{row.subjectName}</td>
                                                <td className="p-2 text-slate-600 font-bold font-mono">{row.finalRating || '—'}</td>
                                                <td className="p-2 text-slate-600 font-bold font-mono">{row.remedialMark || '—'}</td>
                                                <td className="p-2 text-slate-600 font-bold font-mono">{row.recomputedGrade || '—'}</td>
                                                <td className="p-2 font-black text-emerald-800 bg-emerald-50/15">{row.remarks || '—'}</td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })()
                        ) : (
                          /* Empty State Display Mode */
                          <div className="flex flex-col items-center justify-center py-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-slate-400 font-semibold">
                            <FileText className="w-7 h-7 text-slate-300 mb-1" />
                            <span className="text-[10px]">No historical record encoded in this system for {gradeLvl}.</span>
                          </div>
                        )}

                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        ) : (
          <Card className="flex flex-col items-center justify-center p-20 text-slate-400 font-semibold bg-slate-50 border border-dashed border-slate-300 rounded-3xl">
            <FileText className="w-12 h-12 text-slate-300 mb-2" />
            <span>Please select a learner above to manage, encode, or view their SF10 permanent academic record.</span>
          </Card>
        )}

        {/* Renders SF10 preview sheet */}
        {isViewingPreview && selectedStudent && (
          <SF10ReportDocument
            onClose={() => setIsViewingPreview(false)}
            data={{
              schoolYear: '',
              gradeLevel: selectedStudent.gradeLevel || '',
              section: studentSectionName === '—' ? '' : studentSectionName,
              students: sectionStudents.length > 0 ? sectionStudents : [selectedStudent],
              initialStudentId: selectedStudent.id,
              adviserName: selectedStudent.adviserName
            }}
          />
        )}

        </div>
      </div>
    </div>
  );
}
