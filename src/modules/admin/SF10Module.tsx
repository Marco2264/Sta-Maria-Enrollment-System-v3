import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, getDocs, deleteDoc, deleteField } from 'firebase/firestore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { SF10ReportDocument } from './SF10ReportDocument';
import { 
  FileText, Plus, Edit, Save, X, Printer, Search, ChevronDown, 
  ChevronLeft, ChevronRight, CheckCircle2, CornerDownRight, Trash2, 
  RotateCcw, BookOpen, User, Calendar, GraduationCap, School, Award, 
  Sparkles, Copy, Check, AlertCircle, Clock, ArrowRight, ShieldCheck, 
  Layers, BarChart3, Sparkle
} from 'lucide-react';
import { getGlobalSettings } from '../../lib/services/settingsService';
import toast from 'react-hot-toast';

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
  const clean = sy.trim().replace(/\s+/g, '').replace(/[\u2010-\u2015\u2212]/g, '-');
  if (clean.match(/^(\d{4})-(\d{4})$/) || clean.match(/^(\d{4})$/)) {
    return { isValid: true };
  }
  return {
    isValid: false,
    error: 'Invalid School Year format. Please use YYYY-YYYY (e.g. 2024-2025).'
  };
};

const sanitizeForFirestore = (obj: any): any => {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore);
  }
  const clean: Record<string, any> = {};
  Object.entries(obj).forEach(([key, val]) => {
    if (val !== undefined) {
      clean[key] = sanitizeForFirestore(val);
    }
  });
  return clean;
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
  'fil': 'FILIPINO',
  'english': 'ENGLISH',
  'eng': 'ENGLISH',
  'mathematics': 'MATH',
  'math': 'MATH',
  'science': 'SCIENCE',
  'sci': 'SCIENCE',
  'araling panlipunan': 'AP',
  'araling panlipunan (ap)': 'AP',
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
  'technology and livelihood education (tle)': 'EPP_TLE',
  'music & arts': 'MAPEH',
  'music and arts': 'MAPEH',
  'music': 'MUSIC',
  'arts': 'ARTS',
  'pe & health': 'PE_HEALTH',
  'pe and health': 'PE_HEALTH',
  'physical education': 'PE',
  'pe': 'PE',
  'health': 'HEALTH',
  'mapeh': 'MAPEH',
  'language': 'LANGUAGE',
  'reading': 'READING_AND_LITERACY',
  'reading and literacy': 'READING_AND_LITERACY',
  'literacy': 'READING_AND_LITERACY',
  'makabansa': 'MAKABANSA',
  'mak': 'MAKABANSA',
  'ap/makabansa': 'MAKABANSA'
};

const subjectDisplayNames: Record<string, string> = {
  'FILIPINO': 'Filipino',
  'FIL': 'Filipino',
  'ENGLISH': 'English',
  'ENG': 'English',
  'MATH': 'Mathematics',
  'SCIENCE': 'Science',
  'SCI': 'Science',
  'AP': 'Araling Panlipunan (AP)',
  'ESP': 'Good Manners and Right Conduct (GMRC)',
  'GMRC': 'Good Manners and Right Conduct (GMRC)',
  'EPP_TLE': 'Technology and Livelihood Education (TLE)',
  'TLE': 'Technology and Livelihood Education (TLE)',
  'EPP': 'Technology and Livelihood Education (TLE)',
  'MUSIC': 'Music',
  'ARTS': 'Arts',
  'PE': 'Physical Education',
  'HEALTH': 'Health',
  'PE_HEALTH': 'PE & Health',
  'MAPEH': 'Music & Arts',
  'LANGUAGE': 'Language',
  'READING': 'Reading and Literacy',
  'LITERACY': 'Reading and Literacy',
  'READING_AND_LITERACY': 'Reading and Literacy',
  'MAKABANSA': 'Makabansa',
  'MAK': 'Makabansa'
};

const getStandardSubjectRowsForGrade = (gradeLevelName: string): SubjectGradeRow[] => {
  const isGrade1 = gradeLevelName.includes('1');
  const isGrade2 = gradeLevelName.includes('2');
  const isGrade3 = gradeLevelName.includes('3');

  if (isGrade1) {
    return [
      { id: Math.random().toString(36).substring(7), subjectName: 'Language', isSubSubject: false, q1: '', q2: '', q3: '', q4: '', t1: '', t2: '', t3: '' },
      { id: Math.random().toString(36).substring(7), subjectName: 'Reading and Literacy', isSubSubject: false, q1: '', q2: '', q3: '', q4: '', t1: '', t2: '', t3: '' },
      { id: Math.random().toString(36).substring(7), subjectName: 'Mathematics', isSubSubject: false, q1: '', q2: '', q3: '', q4: '', t1: '', t2: '', t3: '' },
      { id: Math.random().toString(36).substring(7), subjectName: 'Makabansa', isSubSubject: false, q1: '', q2: '', q3: '', q4: '', t1: '', t2: '', t3: '' },
      { id: Math.random().toString(36).substring(7), subjectName: 'Good Manners and Right Conduct (GMRC)', isSubSubject: false, q1: '', q2: '', q3: '', q4: '', t1: '', t2: '', t3: '' },
    ];
  }
  if (isGrade2) {
    return [
      { id: Math.random().toString(36).substring(7), subjectName: 'English', isSubSubject: false, q1: '', q2: '', q3: '', q4: '', t1: '', t2: '', t3: '' },
      { id: Math.random().toString(36).substring(7), subjectName: 'Filipino', isSubSubject: false, q1: '', q2: '', q3: '', q4: '', t1: '', t2: '', t3: '' },
      { id: Math.random().toString(36).substring(7), subjectName: 'Mathematics', isSubSubject: false, q1: '', q2: '', q3: '', q4: '', t1: '', t2: '', t3: '' },
      { id: Math.random().toString(36).substring(7), subjectName: 'Makabansa', isSubSubject: false, q1: '', q2: '', q3: '', q4: '', t1: '', t2: '', t3: '' },
      { id: Math.random().toString(36).substring(7), subjectName: 'Good Manners and Right Conduct (GMRC)', isSubSubject: false, q1: '', q2: '', q3: '', q4: '', t1: '', t2: '', t3: '' },
    ];
  }
  if (isGrade3) {
    return [
      { id: Math.random().toString(36).substring(7), subjectName: 'English', isSubSubject: false, q1: '', q2: '', q3: '', q4: '', t1: '', t2: '', t3: '' },
      { id: Math.random().toString(36).substring(7), subjectName: 'Filipino', isSubSubject: false, q1: '', q2: '', q3: '', q4: '', t1: '', t2: '', t3: '' },
      { id: Math.random().toString(36).substring(7), subjectName: 'Mathematics', isSubSubject: false, q1: '', q2: '', q3: '', q4: '', t1: '', t2: '', t3: '' },
      { id: Math.random().toString(36).substring(7), subjectName: 'Science', isSubSubject: false, q1: '', q2: '', q3: '', q4: '', t1: '', t2: '', t3: '' },
      { id: Math.random().toString(36).substring(7), subjectName: 'Makabansa', isSubSubject: false, q1: '', q2: '', q3: '', q4: '', t1: '', t2: '', t3: '' },
      { id: Math.random().toString(36).substring(7), subjectName: 'Good Manners and Right Conduct (GMRC)', isSubSubject: false, q1: '', q2: '', q3: '', q4: '', t1: '', t2: '', t3: '' },
    ];
  }
  // Grades 4, 5, 6
  return [
    { id: Math.random().toString(36).substring(7), subjectName: 'Filipino', isSubSubject: false, q1: '', q2: '', q3: '', q4: '', t1: '', t2: '', t3: '' },
    { id: Math.random().toString(36).substring(7), subjectName: 'English', isSubSubject: false, q1: '', q2: '', q3: '', q4: '', t1: '', t2: '', t3: '' },
    { id: Math.random().toString(36).substring(7), subjectName: 'Mathematics', isSubSubject: false, q1: '', q2: '', q3: '', q4: '', t1: '', t2: '', t3: '' },
    { id: Math.random().toString(36).substring(7), subjectName: 'Science', isSubSubject: false, q1: '', q2: '', q3: '', q4: '', t1: '', t2: '', t3: '' },
    { id: Math.random().toString(36).substring(7), subjectName: 'Araling Panlipunan (AP)', isSubSubject: false, q1: '', q2: '', q3: '', q4: '', t1: '', t2: '', t3: '' },
    { id: Math.random().toString(36).substring(7), subjectName: 'Technology and Livelihood Education (TLE)', isSubSubject: false, q1: '', q2: '', q3: '', q4: '', t1: '', t2: '', t3: '' },
    { id: Math.random().toString(36).substring(7), subjectName: 'Music & Arts', isSubSubject: false, q1: '', q2: '', q3: '', q4: '', t1: '', t2: '', t3: '' },
    { id: Math.random().toString(36).substring(7), subjectName: 'Music', isSubSubject: true, q1: '', q2: '', q3: '', q4: '', t1: '', t2: '', t3: '' },
    { id: Math.random().toString(36).substring(7), subjectName: 'Arts', isSubSubject: true, q1: '', q2: '', q3: '', q4: '', t1: '', t2: '', t3: '' },
    { id: Math.random().toString(36).substring(7), subjectName: 'PE & Health', isSubSubject: false, q1: '', q2: '', q3: '', q4: '', t1: '', t2: '', t3: '' },
    { id: Math.random().toString(36).substring(7), subjectName: 'Physical Education', isSubSubject: true, q1: '', q2: '', q3: '', q4: '', t1: '', t2: '', t3: '' },
    { id: Math.random().toString(36).substring(7), subjectName: 'Health', isSubSubject: true, q1: '', q2: '', q3: '', q4: '', t1: '', t2: '', t3: '' },
    { id: Math.random().toString(36).substring(7), subjectName: 'Good Manners and Right Conduct (GMRC)', isSubSubject: false, q1: '', q2: '', q3: '', q4: '', t1: '', t2: '', t3: '' },
  ];
};

const getNormalizedSubjectCode = (nameOrCode: string): string => {
  const clean = nameOrCode.toLowerCase().trim();
  if (clean === 'filipino' || clean === 'fil') return 'FILIPINO';
  if (clean === 'english' || clean === 'eng') return 'ENGLISH';
  if (clean === 'mathematics' || clean === 'math') return 'MATH';
  if (clean === 'science' || clean === 'sci') return 'SCIENCE';
  if (clean === 'araling panlipunan' || clean === 'ap' || clean === 'ap/makabansa' || clean === 'makabansa' || clean === 'mak') return 'MAKABANSA';
  if (clean === 'good manners and right conduct (gmrc)' || clean === 'gmrc' || clean === 'edukasyon sa pagpapakatao' || clean === 'esp') return 'ESP';
  if (clean === 'epp' || clean === 'tle' || clean === 'epp/tle' || clean === 'technology and livelihood education (tle)') return 'TLE';
  if (clean === 'music') return 'MUSIC';
  if (clean === 'arts') return 'ARTS';
  if (clean === 'physical education' || clean === 'pe') return 'PE';
  if (clean === 'health') return 'HEALTH';
  if (clean === 'language') return 'LANGUAGE';
  if (clean === 'reading and literacy' || clean === 'reading' || clean === 'literacy') return 'READING_AND_LITERACY';
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

const resolveTermGrade = (subjectGrades: any, term: string, subjectCode?: string, sectionId?: string, gradeConfigs?: any[]) => {
  if (!subjectGrades) return '';
  if (typeof subjectGrades === 'number') return subjectGrades;

  if (typeof subjectGrades !== 'object') {
    const parsed = parseFloat(String(subjectGrades));
    return isNaN(parsed) ? '' : parsed;
  }

  // Check direct override
  if (term === 'Final' || term === 'final' || term === 'Finals') {
    if (subjectGrades.finalGradeOverride !== undefined && subjectGrades.finalGradeOverride !== null && subjectGrades.finalGradeOverride !== '') {
      const num = parseFloat(String(subjectGrades.finalGradeOverride));
      if (!isNaN(num)) return num;
    }
  }

  const termKeyMap: Record<string, string[]> = {
    'Term 1': ['t1', 'q1', 'Term 1', 'term 1', 'Term1', 'term1', 'Quarter 1', 'quarter 1', 'Quarter1', 'quarter1', 'Q1', 'q1', '1'],
    'Term 2': ['t2', 'q2', 'Term 2', 'term 2', 'Term2', 'term2', 'Quarter 2', 'quarter 2', 'Quarter2', 'quarter2', 'Q2', 'q2', '2'],
    'Term 3': ['t3', 'q3', 'Term 3', 'term 3', 'Term3', 'term3', 'Quarter 3', 'quarter 3', 'Quarter3', 'quarter3', 'Q3', 'q3', '3'],
    'Quarter 1': ['q1', 't1', 'Quarter 1', 'quarter 1', 'Quarter1', 'quarter1', 'Term 1', 'term 1', 'Term1', 'term1', 'Q1', 'q1', '1'],
    'Quarter 2': ['q2', 't2', 'Quarter 2', 'quarter 2', 'Quarter2', 'quarter2', 'Term 2', 'term 2', 'Term2', 'term2', 'Q2', 'q2', '2'],
    'Quarter 3': ['q3', 't3', 'Quarter 3', 'quarter 3', 'Quarter3', 'quarter3', 'Term 3', 'term 3', 'Term3', 'term3', 'Q3', 'q3', '3'],
    'Quarter 4': ['q4', 'Quarter 4', 'quarter 4', 'Quarter4', 'quarter4', 'Q4', 'q4', '4']
  };

  const keysToCheck = termKeyMap[term] || [term, term.toLowerCase()];
  for (const k of keysToCheck) {
    const val = subjectGrades[k];
    if (val !== undefined && val !== null && val !== '') {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const num = parseFloat(val);
        if (!isNaN(num)) return num;
      }
      // If val is an object (Dynamic Gradebook: { col1: score1, col2: score2 })
      if (typeof val === 'object' && val !== null) {
        const columnScores = Object.entries(val).filter(([_, score]) => score !== undefined && score !== null && score !== '' && !isNaN(Number(score)));
        if (columnScores.length > 0) {
          if (Array.isArray(gradeConfigs) && gradeConfigs.length > 0) {
            let totalWeight = 0;
            let weightedSum = 0;
            let unweightedScores: number[] = [];
            columnScores.forEach(([colId, score]) => {
              const numScore = Number(score);
              const conf = gradeConfigs.find(c => c.id === colId);
              if (conf && typeof conf.weight === 'number' && conf.weight > 0) {
                totalWeight += conf.weight;
                weightedSum += numScore * (conf.weight / 100);
              } else {
                unweightedScores.push(numScore);
              }
            });
            if (totalWeight > 0) {
              return Math.round(weightedSum * (100 / totalWeight));
            }
            if (unweightedScores.length > 0) {
              return Math.round(unweightedScores.reduce((a, b) => a + b, 0) / unweightedScores.length);
            }
          } else {
            const nums = columnScores.map(([_, s]) => Number(s));
            return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
          }
        }
      }
    }
  }

  return '';
};

export function SF10Module({ students = [], sections = [], isAdmin = true }: SF10ModuleProps) {
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [allSections, setAllSections] = useState<any[]>([]);

  // Fetch sections based on role
  useEffect(() => {
    if (isAdmin) {
      const unsub = onSnapshot(collection(db, 'sections'), (snap) => {
        const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllSections(fetched);
      }, (err) => {
        console.error("Error loading sections for SF10:", err);
        if (sections && sections.length > 0) {
          setAllSections(sections);
        }
      });
      return () => unsub();
    } else {
      // For Teacher: Load teacher's assigned sections and enrich with Firestore section details
      const assignedIds = new Set((sections || []).map(s => s.id || s.sectionId).filter(Boolean));
      if (assignedIds.size === 0) {
        setAllSections(sections || []);
        return;
      }
      const unsub = onSnapshot(collection(db, 'sections'), (snap) => {
        const matchingSections = snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(s => assignedIds.has(s.id));
        if (matchingSections.length > 0) {
          setAllSections(matchingSections);
        } else {
          setAllSections(sections || []);
        }
      }, () => {
        setAllSections(sections || []);
      });
      return () => unsub();
    }
  }, [isAdmin, sections]);

  // Fetch active students based on role
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
      // For Teacher: strictly load students from the teacher's assigned section(s)
      const mySectionIds = (sections || []).map(s => s.id || s.sectionId).filter(Boolean);

      if (mySectionIds.length === 0) {
        if (students && students.length > 0) {
          setAllStudents(
            students.filter((s: any) =>
              s.isManualHistory !== true &&
              !['Pending', 'pending', 'Rejected', 'rejected', 'Dropped', 'dropped'].includes(s.status)
            )
          );
        } else {
          setAllStudents([]);
        }
        return;
      }

      const q = query(
        collection(db, 'enrollments'),
        where('sectionId', 'in', mySectionIds.slice(0, 30))
      );
      const unsub = onSnapshot(q, (snap) => {
        const docs = snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((s: any) =>
            s.isManualHistory !== true &&
            !['Pending', 'pending', 'Rejected', 'rejected', 'Dropped', 'dropped'].includes(s.status)
          );
        if (docs.length > 0) {
          setAllStudents(docs);
        } else if (students && students.length > 0) {
          setAllStudents(
            students.filter((s: any) =>
              s.isManualHistory !== true &&
              mySectionIds.includes(s.sectionId) &&
              !['Pending', 'pending', 'Rejected', 'rejected', 'Dropped', 'dropped'].includes(s.status)
            )
          );
        } else {
          setAllStudents([]);
        }
      }, (err) => {
        console.error("Error loading teacher's assigned students:", err);
        if (students && students.length > 0) {
          setAllStudents(
            students.filter((s: any) =>
              s.isManualHistory !== true &&
              mySectionIds.includes(s.sectionId) &&
              !['Pending', 'pending', 'Rejected', 'rejected', 'Dropped', 'dropped'].includes(s.status)
            )
          );
        }
      });
      return () => unsub();
    }
  }, [isAdmin, students, sections]);

  // Normalize sections
  const normalizedSections = useMemo(() => {
    return allSections.map(s => {
      const id = s.id || s.sectionId || '';
      const name = s.name || s.sectionName || 'Unnamed Section';
      const gradeLevel = s.gradeLevel || 'Unknown Grade';
      const isAdvisor = true;
      return { id, name, gradeLevel, isAdvisor };
    });
  }, [allSections]);

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

  // Current student index within sorted/filtered list for Next/Previous navigation
  const currentStudentIndex = useMemo(() => {
    if (!selectedStudentId || sortedStudents.length === 0) return -1;
    return sortedStudents.findIndex(s => s.id === selectedStudentId);
  }, [sortedStudents, selectedStudentId]);

  const hasPreviousStudent = currentStudentIndex > 0;
  const hasNextStudent = currentStudentIndex >= 0 && currentStudentIndex < sortedStudents.length - 1;

  const handlePreviousStudent = () => {
    if (hasPreviousStudent) {
      const prevStudent = sortedStudents[currentStudentIndex - 1];
      setSelectedStudentId(prevStudent.id);
      setEditingGradeLevel(null);
    }
  };

  const handleNextStudent = () => {
    if (hasNextStudent) {
      const nextStudent = sortedStudents[currentStudentIndex + 1];
      setSelectedStudentId(nextStudent.id);
      setEditingGradeLevel(null);
    }
  };

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

  // Helper to clamp grade between 1 and 100
  const sanitizeGradeInput = (val: string): string => {
    if (val === '' || val === null || val === undefined) return '';
    const num = parseFloat(val);
    if (isNaN(num)) return '';
    if (num > 100) return '100';
    if (num < 1 && num !== 0) return '1';
    if (num <= 0) return '';
    return String(Math.round(num));
  };

  // Handle updates to specific cells in a manual subject row
  const handleRowChange = (id: string, field: keyof SubjectGradeRow, value: any) => {
    let sanitizedVal = value;
    if (['q1', 'q2', 'q3', 'q4', 't1', 't2', 't3'].includes(field as string)) {
      sanitizedVal = sanitizeGradeInput(value);
    }
    setFormGrades(prev => prev.map(r => r.id === id ? { ...r, [field]: sanitizedVal } : r));
  };

  // Delete permanent record block for a single grade level
  const handleDeleteRecordBlock = async (recordId: string, gradeLevel: string, isManualHistory?: boolean) => {
    const targetDocId = recordId || selectedStudent?.id;
    if (!targetDocId) {
      alert('Unable to identify the record document to delete.');
      return;
    }

    const isManual = isManualHistory === true && targetDocId !== selectedStudent?.id;
    const message = isManual
      ? `Are you sure you want to permanently delete the ${gradeLevel} permanent record? This action cannot be undone.`
      : `Are you sure you want to clear all grades and inputs for the ${gradeLevel} record? This will NOT delete the student's active enrollment from the class lists.`;

    const confirmDelete = window.confirm(message);
    if (!confirmDelete) return;

    try {
      if (isManual) {
        try {
          await deleteDoc(doc(db, 'enrollments', targetDocId));
        } catch (delErr) {
          console.warn('deleteDoc failed, falling back to soft delete / clear:', delErr);
          await updateDoc(doc(db, 'enrollments', targetDocId), {
            isManualHistory: false,
            status: 'DELETED',
            grades: {},
            remedial: deleteField()
          });
        }
        setHistory(prev => prev.filter(h => h.id !== targetDocId));
        toast.success(`${gradeLevel} record deleted successfully.`);
      } else {
        // Active enrollment document: only clear grades, status, and remedial
        const targetDoc = history.find(h => h.id === targetDocId) || selectedStudent;
        const currentGrades = targetDoc?.grades;
        
        // If grades are nested by gradeLevel key (e.g. { 'Grade 1': { ... } })
        if (currentGrades && typeof currentGrades === 'object' && !Array.isArray(currentGrades)) {
          const matchedKey = Object.keys(currentGrades).find(k => isMatchingGrade(k, gradeLevel));
          if (matchedKey && Object.keys(currentGrades).length > 1) {
            await updateDoc(doc(db, 'enrollments', targetDocId), {
              [`grades.${matchedKey}`]: deleteField(),
              remedial: deleteField(),
              status: 'Enrolled'
            });
          } else {
            await updateDoc(doc(db, 'enrollments', targetDocId), {
              grades: {},
              remedial: deleteField(),
              status: 'Enrolled'
            });
          }
        } else {
          await updateDoc(doc(db, 'enrollments', targetDocId), {
            grades: {},
            remedial: deleteField(),
            status: 'Enrolled'
          });
        }

        setHistory(prev => prev.map(h => {
          if (h.id === targetDocId) {
            return { ...h, grades: {}, remedial: null, status: 'Enrolled' };
          }
          return h;
        }));

        toast.success(`${gradeLevel} active grades cleared successfully.`);
      }
    } catch (err) {
      console.error('Failed to delete/clear permanent record block:', err);
      toast.error('Failed to delete/clear record block. Please try again.');
    }
  };

  // Reset or load standard curriculum subjects for the active editing grade level
  const handleResetStandardSubjects = () => {
    if (!editingGradeLevel) return;
    const stdRows = getStandardSubjectRowsForGrade(editingGradeLevel);
    setFormGrades(stdRows);
    toast.success(`Loaded standard DepEd curriculum subjects for ${editingGradeLevel}.`);
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
      setFormAcademicYear(activeSchoolYearName || '');
      setFormSectionName(studentSectionName === '—' ? '' : studentSectionName);
      setFormAdviserName(getAdviserNameForSection(selectedStudent?.sectionId) || '');
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
    const matchedGradeKey = Object.keys(recordGrades).find(k => isMatchingGrade(k, gradeLevelName));
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
    const sectionId = existingRecord?.sectionId || selectedStudent?.sectionId || '';

    if (!existingRecord || !recordGrades || Object.keys(recordGrades).length === 0) {
      // Auto pre-populate standard curriculum learning areas for this grade level
      const stdSubjects = getStandardSubjectRowsForGrade(gradeLevelName);
      initialRows.push(...stdSubjects);
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

      // If less than standard or blank, pad or keep rows
      if (initialRows.length === 0) {
        const stdSubjects = getStandardSubjectRowsForGrade(gradeLevelName);
        initialRows.push(...stdSubjects);
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

  // Helper to parse numerical grade value safely
  const parseGradeValue = (v: any) => {
    if (v === undefined || v === null || v === '') return '';
    const num = parseFloat(v);
    return isNaN(num) ? '' : num;
  };

  // Save the Encoded Roster block
  const handleSaveBlock = async () => {
    if (!selectedStudent) {
      toast.error('Please select a student first.');
      return;
    }

    const syCheck = validateSchoolYear(formAcademicYear);
    if (!syCheck.isValid) {
      toast.error(syCheck.error || 'Please provide a valid School Year (e.g. 2024-2025).');
      return;
    }

    let cleanSY = (formAcademicYear || '').trim().replace(/\s+/g, '').replace(/[\u2010-\u2015\u2212]/g, '-');
    if (cleanSY.match(/^(\d{4})$/)) {
      const yr = parseInt(cleanSY, 10);
      cleanSY = `${yr}-${yr + 1}`;
    }

    try {
      const isThreeTerm = isThreeTermYear(cleanSY);
      const existingRecord = findBestRecordForGrade(history, editingGradeLevel || '');

      // Determine if we are editing the active student's current enrollment document
      const isCurrentStudentGrade = isMatchingGrade(editingGradeLevel || '', selectedStudent.gradeLevel);
      const isEditingActiveDoc = existingRecord
        ? (existingRecord.id === selectedStudent.id)
        : isCurrentStudentGrade;

      const targetDocId = isEditingActiveDoc
        ? selectedStudent.id
        : (existingRecord ? existingRecord.id : null);

      const savedGrades: Record<string, any> = {};
      const finalGrades = { ...(existingRecord?.grades || selectedStudent?.grades || {}) };
      const gradeLevelKey = editingGradeLevel || selectedStudent.gradeLevel || 'Grade 1';

      if (!finalGrades[gradeLevelKey]) {
        finalGrades[gradeLevelKey] = {};
      }

      computedFormGrades.forEach((row, rowIdx) => {
        if (!row.subjectName.trim()) return;
        const cleanName = row.subjectName.toLowerCase().trim();
        const code = subjectRowMap[cleanName] || row.subjectName.toUpperCase().replace(/\s+/g, '_');

        const existingSubjectData = isEditingActiveDoc
          ? (finalGrades[gradeLevelKey]?.[code] || {})
          : (existingRecord?.grades?.[code] || {});

        const rowGradeData: Record<string, any> = {
          ...existingSubjectData,
          isSubSubject: Boolean(row.isSubSubject),
          order: rowIdx
        };

        if (isThreeTerm) {
          rowGradeData.t1 = parseGradeValue(row.t1);
          rowGradeData.t2 = parseGradeValue(row.t2);
          rowGradeData.t3 = parseGradeValue(row.t3);
        } else {
          rowGradeData.q1 = parseGradeValue(row.q1);
          rowGradeData.q2 = parseGradeValue(row.q2);
          rowGradeData.q3 = parseGradeValue(row.q3);
          rowGradeData.q4 = parseGradeValue(row.q4);
        }

        if (isEditingActiveDoc) {
          finalGrades[gradeLevelKey][code] = rowGradeData;
        } else {
          savedGrades[code] = rowGradeData;
        }
      });

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
        gradeLevel: isEditingActiveDoc ? (selectedStudent.gradeLevel || editingGradeLevel || '') : (editingGradeLevel || ''),
        schoolName: formSchoolName || 'Sta. Maria CS SPED Center',
        schoolId: formSchoolId || '199006',
        division: formDivision || 'Zamboanga City',
        academicYear: cleanSY,
        sectionName: formSectionName || '',
        adviserName: formAdviserName || '',
        status: isEditingActiveDoc ? (selectedStudent.status && selectedStudent.status.toLowerCase().includes('enrolled') ? selectedStudent.status : 'Enrolled') : (formStatus || 'PROMOTED'),
        promotionStatus: formStatus || 'PROMOTED',
        actionTaken: formStatus || 'PROMOTED',
        grades: isEditingActiveDoc ? finalGrades : savedGrades,
        isManualHistory: !isEditingActiveDoc
      };

      if (formHasRemedial) {
        documentPayload.remedial = {
          from: formRemedialFrom || '',
          to: formRemedialTo || '',
          classes: (formRemedialRows || []).map(r => ({
            subjectName: r.subjectName || '',
            finalRating: r.finalRating || '',
            remedialMark: r.remedialMark || '',
            recomputedGrade: r.recomputedGrade || '',
            remarks: r.remarks || ''
          }))
        };
      } else if (targetDocId) {
        documentPayload.remedial = deleteField();
      }

      const cleanPayload = sanitizeForFirestore(documentPayload);

      if (targetDocId) {
        // Update document
        await updateDoc(doc(db, 'enrollments', targetDocId), cleanPayload);
        setHistory(prev => {
          const exists = prev.some(h => h.id === targetDocId);
          if (exists) {
            return prev.map(h => h.id === targetDocId ? { ...h, ...cleanPayload } : h);
          }
          return [...prev, { id: targetDocId, ...cleanPayload }];
        });
        if (isEditingActiveDoc) {
          setAllStudents(prev => prev.map(s => s.id === targetDocId ? { ...s, ...cleanPayload } : s));
        }
      } else {
        // Add new document
        const createPayload = { ...cleanPayload };
        if (!formHasRemedial) {
          delete createPayload.remedial;
        }
        const docRef = await addDoc(collection(db, 'enrollments'), createPayload);
        setHistory(prev => [...prev, { id: docRef.id, ...createPayload }]);
      }

      toast.success(`${editingGradeLevel || 'SF10'} permanent record saved successfully!`);
      setEditingGradeLevel(null);
    } catch (err: any) {
      console.error('Failed to save permanent record block:', err);
      toast.error(`Failed to save record: ${err?.message || err || 'Please try again.'}`);
    }
  };

  // Add helper state for redesigned UI
  const [copiedLrn, setCopiedLrn] = useState(false);
  const [activeGradeTab, setActiveGradeTab] = useState<string>('all');

  const handleCopyLrn = (lrn: string) => {
    if (!lrn) return;
    navigator.clipboard.writeText(String(lrn).trim());
    setCopiedLrn(true);
    toast.success('LRN copied to clipboard!');
    setTimeout(() => setCopiedLrn(false), 2000);
  };

  // Compute learner overall stats
  const learnerOverviewStats = useMemo(() => {
    if (!selectedStudent || visibleGradeLevels.length === 0) {
      return { encodedCount: 0, totalGrades: visibleGradeLevels.length, overallAverage: null, latestStatus: 'ENROLLED' };
    }
    let encodedCount = 0;
    const finalAverages: number[] = [];
    let latestStatus = selectedStudent.status || 'ENROLLED';

    visibleGradeLevels.forEach((gradeLvl) => {
      const rec = findBestRecordForGrade(history, gradeLvl);
      const isEncoded = rec ? (rec.isManualHistory === true || hasGradesData(rec, gradeLvl)) : false;
      if (isEncoded) {
        encodedCount++;
        const subjectRows = getSubjectRows(rec, gradeLvl);
        const mainFinals = subjectRows
          .filter(r => !r.isSubSubject && typeof r.final === 'number' && !isNaN(r.final))
          .map(r => r.final as number);
        if (mainFinals.length > 0) {
          const avg = Math.round(mainFinals.reduce((a, b) => a + b, 0) / mainFinals.length);
          finalAverages.push(avg);
        }
        if (rec.promotionStatus || rec.actionTaken) {
          latestStatus = rec.promotionStatus || rec.actionTaken;
        }
      }
    });

    const overallAverage = finalAverages.length > 0
      ? Math.round(finalAverages.reduce((a, b) => a + b, 0) / finalAverages.length)
      : null;

    return {
      encodedCount,
      totalGrades: visibleGradeLevels.length,
      overallAverage,
      latestStatus
    };
  }, [selectedStudent, visibleGradeLevels, history]);

  // Filter visible grade levels by active tab if selected
  const displayedGradeLevels = useMemo(() => {
    if (activeGradeTab === 'all') return visibleGradeLevels;
    return visibleGradeLevels.filter(g => g === activeGradeTab);
  }, [visibleGradeLevels, activeGradeTab]);

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      {/* TOP HEADER */}
      <header className="h-[76px] px-6 sm:px-8 border-b border-slate-200/80 bg-white shrink-0 flex items-center justify-between z-20 shadow-xs">
        <div className="flex items-center gap-3.5 shrink-0">
          <div className="p-2.5 bg-gradient-to-tr from-[#D8232A] to-[#e63940] text-white rounded-2xl shadow-sm shadow-red-500/20">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#D8232A] bg-red-50 px-2 py-0.5 rounded-md leading-none">
                {isAdmin ? 'Admin Portal' : 'Teacher Portal'}
              </span>
              <span className="text-[10px] font-bold text-slate-400 font-mono">SF10-ES</span>
            </div>
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900 leading-tight mt-0.5">
              Learner's Permanent Academic Record
            </h1>
          </div>
        </div>

        {selectedStudent && (
          <div className="flex items-center gap-2.5">
            {/* Quick Student Stepper in Header */}
            <div className="hidden md:flex items-center bg-slate-100/90 border border-slate-200/80 rounded-xl p-1 shadow-2xs">
              <button
                type="button"
                onClick={handlePreviousStudent}
                disabled={!hasPreviousStudent}
                className="p-1.5 hover:bg-white text-slate-700 hover:text-slate-900 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title={hasPreviousStudent ? `Previous: ${sortedStudents[currentStudentIndex - 1]?.lastName}` : 'No previous student'}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-bold text-slate-600 px-2 font-mono whitespace-nowrap">
                {currentStudentIndex >= 0 ? `${currentStudentIndex + 1} of ${sortedStudents.length}` : ''}
              </span>
              <button
                type="button"
                onClick={handleNextStudent}
                disabled={!hasNextStudent}
                className="p-1.5 hover:bg-white text-slate-700 hover:text-slate-900 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title={hasNextStudent ? `Next: ${sortedStudents[currentStudentIndex + 1]?.lastName}` : 'No next student'}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <Button
              onClick={() => setIsViewingPreview(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-[#D8232A] to-[#b91c22] hover:from-[#b91c22] hover:to-[#96171c] text-white rounded-xl shadow-sm shadow-red-500/25 font-bold text-xs h-10 px-4 transition-all duration-200"
            >
              <Printer className="w-4 h-4" />
              <span>Preview & Print SF10</span>
            </Button>
          </div>
        )}
      </header>

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
        <div className="max-w-7xl mx-auto w-full space-y-6">

          {/* SECTION & LEARNER SELECTOR CARD */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* Section Picker Card */}
            <Card className="p-5 bg-white border border-slate-200/70 rounded-3xl shadow-xs hover:shadow-md transition-all duration-200 space-y-3 !overflow-visible">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-[11px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  1. Filter Section
                </span>
                {sortedSections.length > 0 && (
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    {sortedSections.length} {sortedSections.length === 1 ? 'section' : 'sections'}
                  </span>
                )}
              </div>

              <div className={`relative ${isSectionSelectorOpen ? 'z-50' : 'z-10'}`}>
                <button
                  type="button"
                  onClick={() => setIsSectionSelectorOpen(!isSectionSelectorOpen)}
                  className="flex items-center justify-between w-full bg-slate-50/80 hover:bg-slate-100/70 border border-slate-200/80 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none transition-all shadow-2xs"
                >
                  <span className="truncate">
                    {selectedSectionId === 'all'
                      ? (isAdmin ? 'All Sections' : 'All My Sections')
                      : (() => {
                        const sec = sortedSections.find(s => s.id === selectedSectionId);
                        return sec ? `${sec.gradeLevel} — ${sec.name}` : 'Select Section';
                      })()
                    }
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                </button>

                {isSectionSelectorOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40 bg-black/10 backdrop-blur-2xs"
                      onClick={() => setIsSectionSelectorOpen(false)}
                    />
                    <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200/90 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                      <div className="p-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
                        <Search className="w-4 h-4 text-slate-400 shrink-0" />
                        <input
                          type="text"
                          placeholder="Search sections..."
                          value={sectionSearchQuery}
                          onChange={(e) => setSectionSearchQuery(e.target.value)}
                          className="w-full text-xs font-medium border-none outline-none focus:ring-0 bg-transparent text-slate-700 placeholder:text-slate-400"
                        />
                      </div>
                      <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSectionId('all');
                            setSelectedStudentId('');
                            setIsSectionSelectorOpen(false);
                            setSectionSearchQuery('');
                          }}
                          className={`w-full text-left px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all ${
                            selectedSectionId === 'all' 
                              ? 'text-[#D8232A] bg-red-50 font-extrabold' 
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {isAdmin ? 'All Sections' : 'All My Sections'}
                        </button>
                        {sortedSections
                          .filter(s => {
                            const q = sectionSearchQuery.toLowerCase();
                            return s.name.toLowerCase().includes(q) || s.gradeLevel.toLowerCase().includes(q);
                          })
                          .map(s => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setSelectedSectionId(s.id);
                                setSelectedStudentId('');
                                setIsSectionSelectorOpen(false);
                                setSectionSearchQuery('');
                              }}
                              className={`w-full text-left px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                                s.id === selectedSectionId 
                                  ? 'text-[#D8232A] bg-red-50 font-bold' 
                                  : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <span className="font-bold text-slate-900">{s.gradeLevel}</span>
                              <span className="text-slate-400 mx-1.5">—</span>
                              <span>{s.name}</span>
                            </button>
                          ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Card>

            {/* Learner Custom Search Selector Card */}
            <Card className="col-span-1 md:col-span-2 p-5 bg-white border border-slate-200/70 rounded-3xl shadow-xs hover:shadow-md transition-all duration-200 space-y-3 !overflow-visible">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-[11px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  2. Select Learner
                </span>
                <div className="flex items-center gap-2">
                  {selectedStudent && currentStudentIndex >= 0 && (
                    <span className="text-[10px] font-mono font-bold bg-red-50 text-[#D8232A] px-2 py-0.5 rounded-full">
                      Learner {currentStudentIndex + 1} of {sortedStudents.length}
                    </span>
                  )}
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    {filteredStudents.length} {filteredStudents.length === 1 ? 'learner available' : 'learners available'}
                  </span>
                </div>
              </div>

              {/* Navigation Arrows + Dropdown Row */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePreviousStudent}
                  disabled={!hasPreviousStudent}
                  className="h-12 w-11 flex items-center justify-center bg-slate-50/80 hover:bg-slate-100 border border-slate-200/80 rounded-2xl text-slate-700 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0 shadow-2xs"
                  title={hasPreviousStudent ? `Previous: ${sortedStudents[currentStudentIndex - 1]?.lastName}` : 'No previous student'}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className={`relative flex-1 min-w-0 ${isSelectorOpen ? 'z-50' : 'z-10'}`}>
                  <button
                    type="button"
                    onClick={() => setIsSelectorOpen(!isSelectorOpen)}
                    className="flex items-center justify-between w-full bg-slate-50/80 hover:bg-slate-100/70 border border-slate-200/80 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none transition-all shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {selectedStudent ? (
                        <>
                          <div className="w-6 h-6 rounded-full bg-[#D8232A] text-white flex items-center justify-center font-black text-[10px] shrink-0">
                            {selectedStudent.firstName?.[0] || ''}{selectedStudent.lastName?.[0] || ''}
                          </div>
                          <span className="font-extrabold text-slate-900 truncate">
                            {selectedStudent.lastName}, {selectedStudent.firstName} {selectedStudent.middleName || ''}
                          </span>
                          <span className="text-[10px] font-bold font-mono bg-red-50 text-[#D8232A] px-2 py-0.5 rounded-md shrink-0">
                            LRN: {selectedStudent.lrn}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-400 font-medium">Search or select a learner from list...</span>
                      )}
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                  </button>

                  {isSelectorOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40 bg-black/10 backdrop-blur-2xs"
                        onClick={() => setIsSelectorOpen(false)}
                      />
                      <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200/90 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="p-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
                          <Search className="w-4 h-4 text-slate-400 shrink-0" />
                          <input
                            type="text"
                            placeholder="Search learner by name or 12-digit LRN..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full text-xs font-medium border-none outline-none focus:ring-0 bg-transparent text-slate-700 placeholder:text-slate-400"
                            autoFocus
                          />
                          {searchQuery && (
                            <button
                              type="button"
                              onClick={() => setSearchQuery('')}
                              className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="max-h-72 overflow-y-auto p-1.5 space-y-0.5">
                          {filteredStudents.length > 0 ? (
                            filteredStudents.map((st) => (
                              <button
                                key={st.id}
                                type="button"
                                onClick={() => {
                                  setSelectedStudentId(st.id);
                                  setIsSelectorOpen(false);
                                  setSearchQuery('');
                                  setEditingGradeLevel(null);
                                }}
                                className={`w-full text-left px-3.5 py-2.5 text-xs rounded-xl transition-all flex items-center justify-between ${
                                  st.id === selectedStudentId 
                                    ? 'bg-red-50 text-[#D8232A] font-bold' 
                                    : 'hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                                    {st.firstName?.[0] || ''}{st.lastName?.[0] || ''}
                                  </div>
                                  <div>
                                    <span className="font-bold block text-slate-900">
                                      {st.lastName}, {st.firstName} {st.middleName || ''}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      {st.gradeLevel || 'Grade'} — {st.gender || 'Learner'}
                                    </span>
                                  </div>
                                </div>
                                <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                  {st.lrn}
                                </span>
                              </button>
                            ))
                          ) : (
                            <div className="p-6 text-center text-xs text-slate-400 font-medium space-y-1">
                              <p>No matching learners found.</p>
                              <p className="text-[10px] text-slate-300">Try changing your section filter or search term.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleNextStudent}
                  disabled={!hasNextStudent}
                  className="h-12 w-11 flex items-center justify-center bg-slate-50/80 hover:bg-slate-100 border border-slate-200/80 rounded-2xl text-slate-700 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0 shadow-2xs"
                  title={hasNextStudent ? `Next: ${sortedStudents[currentStudentIndex + 1]?.lastName}` : 'No next student'}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </Card>

          </div>

          {/* MAIN CONTENT AREA */}
          {selectedStudent ? (
            <div className="space-y-6">

              {/* LEARNER PROFILE HERO BANNER */}
              <Card className="p-6 sm:p-7 bg-white border border-slate-200/80 rounded-3xl shadow-xs relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-red-500/5 via-rose-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
                  {/* Left: Avatar & Main Identity */}
                  <div className="flex items-center gap-4.5">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-[#D8232A] via-[#c41e25] to-[#8d1419] text-white flex items-center justify-center font-black text-2xl shadow-md shadow-red-500/20 shrink-0">
                      {selectedStudent.firstName?.[0] || ''}{selectedStudent.lastName?.[0] || ''}
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                          {selectedStudent.lastName}, {selectedStudent.firstName} {selectedStudent.middleName || ''}
                        </h2>
                        <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {selectedStudent.gender || 'Student'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 pt-0.5">
                        <button
                          type="button"
                          onClick={() => handleCopyLrn(selectedStudent.lrn)}
                          className="flex items-center gap-1.5 bg-red-50/80 hover:bg-red-100/80 text-[#D8232A] font-mono font-bold text-xs px-2.5 py-1 rounded-xl transition-all"
                          title="Click to copy LRN"
                        >
                          {copiedLrn ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>LRN: {selectedStudent.lrn}</span>
                        </button>
                        <span className="text-slate-300">•</span>
                        <span className="flex items-center gap-1">
                          <School className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-700">{selectedStudent.gradeLevel || 'Grade'} — {studentSectionName}</span>
                        </span>
                        {selectedStudent.birthDate && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>DOB: {selectedStudent.birthDate}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Quick Performance Stat Chips & Stepper Navigation */}
                  <div className="flex flex-wrap items-center gap-3 self-stretch lg:self-auto pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <div className="bg-slate-50 border border-slate-200/70 rounded-2xl px-4 py-2.5 flex flex-col justify-center min-w-[110px]">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Records</span>
                      <span className="text-sm font-black text-slate-800 mt-0.5">
                        {learnerOverviewStats.encodedCount} of {learnerOverviewStats.totalGrades} Grades
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/70 rounded-2xl px-4 py-2.5 flex flex-col justify-center min-w-[110px]">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Cumulative Gen. Avg</span>
                      <span className="text-sm font-black text-[#D8232A] font-mono mt-0.5">
                        {learnerOverviewStats.overallAverage ? `${learnerOverviewStats.overallAverage}` : '—'}
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/70 rounded-2xl px-4 py-2.5 flex flex-col justify-center min-w-[110px]">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Academic Standing</span>
                      <span className={`text-xs font-black uppercase mt-1 px-2 py-0.5 rounded-md inline-block text-center ${
                        learnerOverviewStats.latestStatus === 'PROMOTED' ? 'bg-emerald-100 text-emerald-800' :
                        learnerOverviewStats.latestStatus === 'RETAINED' ? 'bg-rose-100 text-rose-800' :
                        learnerOverviewStats.latestStatus === 'IRREGULAR' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-200 text-slate-700'
                      }`}>
                        {learnerOverviewStats.latestStatus}
                      </span>
                    </div>

                    {/* Stepper Buttons inside Hero Card */}
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-2xl p-1.5 shadow-2xs">
                      <Button
                        type="button"
                        onClick={handlePreviousStudent}
                        disabled={!hasPreviousStudent}
                        variant="outline"
                        className="h-8 px-2.5 rounded-xl text-xs font-bold border-slate-200 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                        title={hasPreviousStudent ? `Previous: ${sortedStudents[currentStudentIndex - 1]?.lastName}` : 'No previous student'}
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Prev</span>
                      </Button>

                      <span className="text-[11px] font-extrabold text-slate-700 px-2 font-mono whitespace-nowrap">
                        {currentStudentIndex >= 0 ? `${currentStudentIndex + 1} / ${sortedStudents.length}` : '—'}
                      </span>

                      <Button
                        type="button"
                        onClick={handleNextStudent}
                        disabled={!hasNextStudent}
                        variant="outline"
                        className="h-8 px-2.5 rounded-xl text-xs font-bold border-slate-200 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                  </div>
                </div>
              </Card>

              {/* TIMELINE STEPPER / GRADE TABS */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setActiveGradeTab('all')}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    activeGradeTab === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200/70 hover:bg-slate-50'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>All Grade Levels</span>
                </button>

                {visibleGradeLevels.map((gradeLvl) => {
                  const record = findBestRecordForGrade(history, gradeLvl);
                  const isEncoded = record ? (record.isManualHistory === true || hasGradesData(record, gradeLvl)) : false;
                  const isCurrentGrade = isMatchingGrade(selectedStudent.gradeLevel, gradeLvl);
                  const isActiveTab = activeGradeTab === gradeLvl;

                  return (
                    <button
                      key={gradeLvl}
                      type="button"
                      onClick={() => setActiveGradeTab(gradeLvl)}
                      className={`px-4 py-2 rounded-2xl text-xs font-bold shrink-0 transition-all flex items-center gap-2 ${
                        isActiveTab
                          ? 'bg-[#D8232A] text-white shadow-xs shadow-red-500/20 font-extrabold'
                          : 'bg-white text-slate-700 border border-slate-200/70 hover:bg-slate-50'
                      }`}
                    >
                      <span>{gradeLvl}</span>
                      {isEncoded ? (
                        <CheckCircle2 className={`w-3.5 h-3.5 ${isActiveTab ? 'text-white' : 'text-emerald-500'}`} />
                      ) : isCurrentGrade ? (
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* ACADEMIC CARDS CONTAINER */}
              {loadingHistory ? (
                <div className="flex flex-col items-center justify-center p-16 space-y-3 bg-white border border-slate-200/70 rounded-3xl shadow-xs">
                  <div className="w-9 h-9 border-4 border-[#D8232A] border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-bold text-slate-500">Loading academic records...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {displayedGradeLevels.map((gradeLvl) => {
                    const record = findBestRecordForGrade(history, gradeLvl);
                    const hasRecord = record ? (record.isManualHistory === true || hasGradesData(record, gradeLvl)) : false;
                    const isCurrentEditing = editingGradeLevel === gradeLvl;
                    const canEditBlock = true;

                    return (
                      <Card key={gradeLvl} className="p-6 sm:p-7 bg-white border border-slate-200/80 rounded-3xl shadow-xs space-y-5 hover:border-slate-300/80 transition-all duration-200">

                        {/* Card Header Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-r from-red-50 to-rose-50 text-[#D8232A] font-black px-3.5 py-1.5 rounded-xl text-xs uppercase tracking-wide border border-red-100 flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>{gradeLvl}</span>
                            </div>
                            {hasRecord && (
                              <span className="text-xs font-bold text-slate-500 bg-slate-100/80 px-2.5 py-1 rounded-lg">
                                SY {record.academicYear || record.schoolYear || '—'}
                              </span>
                            )}
                            {hasRecord && (
                              <span className="text-xs font-semibold text-slate-500 hidden sm:inline-block">
                                Section: <span className="font-bold text-slate-800">{record.sectionName || studentSectionName}</span>
                              </span>
                            )}
                          </div>

                          {!isCurrentEditing && canEditBlock && (
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                onClick={() => handleStartEncode(gradeLvl, hasRecord ? record : undefined)}
                                variant="outline"
                                className="flex items-center gap-1.5 h-8 px-3.5 rounded-xl text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all"
                              >
                                {hasRecord ? <Edit className="w-3.5 h-3.5 text-slate-500" /> : <Plus className="w-3.5 h-3.5 text-[#D8232A]" />}
                                <span>{hasRecord ? 'Edit Record' : 'Encode History'}</span>
                              </Button>
                              {hasRecord && (
                                <Button
                                  type="button"
                                  onClick={() => handleDeleteRecordBlock(record.id, gradeLvl, record.isManualHistory === true)}
                                  variant="outline"
                                  className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-bold border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-all"
                                  title="Clear/delete this grade level record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Clear</span>
                                </Button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* MODE: EDITING FORM */}
                        {isCurrentEditing ? (
                          <div className="space-y-6 pt-1 animate-in fade-in duration-200">

                            {/* Section 1: School & Section Metadata Input Grid */}
                            <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/60 space-y-4">
                              <div className="flex items-center justify-between">
                                <h4 className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                  <School className="w-3.5 h-3.5 text-slate-400" />
                                  School & Section Information
                                </h4>
                                <span className="text-[10px] font-bold text-slate-400">DepEd Standard Form Fields</span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">School Name</label>
                                  <Input
                                    value={formSchoolName}
                                    onChange={(e) => setFormSchoolName(e.target.value)}
                                    placeholder="e.g. Sta. Maria CS SPED Center"
                                    className="h-9 rounded-xl text-xs font-semibold bg-white border-slate-200 focus:border-[#D8232A]"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">School ID</label>
                                  <Input
                                    value={formSchoolId}
                                    onChange={(e) => setFormSchoolId(e.target.value)}
                                    placeholder="e.g. 199006"
                                    className="h-9 rounded-xl text-xs font-mono font-bold bg-white border-slate-200 focus:border-[#D8232A]"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">Division</label>
                                  <Input
                                    value={formDivision}
                                    onChange={(e) => setFormDivision(e.target.value)}
                                    placeholder="e.g. Zamboanga City"
                                    className="h-9 rounded-xl text-xs font-semibold bg-white border-slate-200 focus:border-[#D8232A]"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">
                                    School Year <span className="text-rose-500 font-bold">*</span>
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
                                    className="h-9 rounded-xl text-xs font-mono font-bold bg-white border-slate-200 focus:border-[#D8232A]"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">Section Name</label>
                                  <Input
                                    value={formSectionName}
                                    onChange={(e) => setFormSectionName(e.target.value)}
                                    placeholder="e.g. Daisy"
                                    className="h-9 rounded-xl text-xs font-semibold bg-white border-slate-200 focus:border-[#D8232A]"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">Adviser Name</label>
                                  <Input
                                    value={formAdviserName}
                                    onChange={(e) => setFormAdviserName(e.target.value)}
                                    placeholder="e.g. Maria Santos"
                                    className="h-9 rounded-xl text-xs font-semibold bg-white border-slate-200 focus:border-[#D8232A]"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Section 2: Learning Areas Table Editor */}
                            {(() => {
                              const isThreeTerm = isThreeTermYear(formAcademicYear);

                              return (
                                <div className="space-y-4">
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                      <h4 className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                        <Award className="w-3.5 h-3.5 text-[#D8232A]" />
                                        Learning Areas & Periodic Ratings
                                      </h4>
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                        {isThreeTerm ? '3-Term Scheme' : '4-Quarter Scheme'}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-slate-500">Action Taken:</span>
                                      <Select value={formStatus} onValueChange={(val) => setFormStatus(val)}>
                                        <SelectTrigger className="h-8 w-36 rounded-xl text-xs font-extrabold bg-white border-slate-200">
                                          <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="PROMOTED" className="text-xs font-bold text-emerald-700">PROMOTED</SelectItem>
                                          <SelectItem value="IRREGULAR" className="text-xs font-bold text-amber-700">IRREGULAR</SelectItem>
                                          <SelectItem value="RETAINED" className="text-xs font-bold text-rose-700">RETAINED</SelectItem>
                                          <SelectItem value="DROPPED" className="text-xs font-bold text-slate-700">DROPPED</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>

                                  <div className="overflow-x-auto border border-slate-200/80 rounded-2xl bg-white shadow-2xs">
                                    <table className="w-full text-center border-collapse text-xs">
                                      <thead>
                                        <tr className="bg-slate-50/80 font-extrabold text-slate-500 border-b border-slate-200">
                                          <th className="p-3 text-left font-extrabold text-[10px] uppercase tracking-wide">Learning Area</th>
                                          {isThreeTerm ? (
                                            <>
                                              <th className="p-3 w-16 font-extrabold text-[10px] text-slate-500 uppercase">T1</th>
                                              <th className="p-3 w-16 font-extrabold text-[10px] text-slate-500 uppercase">T2</th>
                                              <th className="p-3 w-16 font-extrabold text-[10px] text-slate-500 uppercase">T3</th>
                                            </>
                                          ) : (
                                            <>
                                              <th className="p-3 w-16 font-extrabold text-[10px] text-slate-500 uppercase">Q1</th>
                                              <th className="p-3 w-16 font-extrabold text-[10px] text-slate-500 uppercase">Q2</th>
                                              <th className="p-3 w-16 font-extrabold text-[10px] text-slate-500 uppercase">Q3</th>
                                              <th className="p-3 w-16 font-extrabold text-[10px] text-slate-500 uppercase">Q4</th>
                                            </>
                                          )}
                                          <th className="p-3 w-20 font-black text-[#D8232A] bg-red-50/40 text-[10px] uppercase tracking-wide">Final</th>
                                          <th className="p-3 w-16 font-extrabold text-slate-400 text-[10px] uppercase tracking-wide">Actions</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {computedFormGrades.map((row, idx) => {
                                          const subSubjects = computedFormGrades.filter(r => r.isSubSubject);
                                          const hasChildren = !row.isSubSubject && subSubjects.length > 0 &&
                                            (row.subjectName.toUpperCase().includes('MAPEH') || row.subjectName.toUpperCase().includes('MUSIC & ARTS'));

                                          return (
                                            <tr key={row.id} className={`border-b border-slate-100 hover:bg-slate-50/60 transition-colors ${row.isSubSubject ? 'bg-slate-50/40' : ''}`}>
                                              <td className="p-2 text-left">
                                                <div className="flex items-center gap-1.5">
                                                  {row.isSubSubject && (
                                                    <CornerDownRight className="w-3.5 h-3.5 text-slate-400 ml-3 shrink-0" />
                                                  )}
                                                  <Input
                                                    value={row.subjectName}
                                                    onChange={(e) => handleRowChange(row.id, 'subjectName', e.target.value)}
                                                    placeholder={row.isSubSubject ? 'e.g. Music' : 'e.g. Mathematics'}
                                                    className={`h-8 rounded-lg text-xs font-bold border-slate-200 focus:border-[#D8232A] ${row.isSubSubject ? 'font-medium text-slate-600 bg-white' : 'font-extrabold text-slate-900 bg-white'}`}
                                                  />
                                                </div>
                                              </td>

                                              {isThreeTerm ? (
                                                ['t1', 't2', 't3'].map((term) => (
                                                  <td key={term} className="p-1.5">
                                                    <input
                                                      type="number"
                                                      value={row[term as 't1' | 't2' | 't3'] || ''}
                                                      onChange={(e) => handleRowChange(row.id, term as 't1' | 't2' | 't3', e.target.value)}
                                                      disabled={hasChildren}
                                                      className={`w-14 h-8 text-center text-xs font-bold font-mono border border-slate-200 rounded-lg outline-none focus:border-[#D8232A] ${
                                                        hasChildren ? 'bg-red-50/50 text-[#D8232A] border-red-200 cursor-not-allowed select-none font-black' : 'bg-white text-slate-800'
                                                      }`}
                                                      min="1"
                                                      max="100"
                                                      title={hasChildren ? "Averaged from sub-subjects" : undefined}
                                                    />
                                                  </td>
                                                ))
                                              ) : (
                                                ['q1', 'q2', 'q3', 'q4'].map((quarter) => (
                                                  <td key={quarter} className="p-1.5">
                                                    <input
                                                      type="number"
                                                      value={row[quarter as 'q1' | 'q2' | 'q3' | 'q4'] || ''}
                                                      onChange={(e) => handleRowChange(row.id, quarter as 'q1' | 'q2' | 'q3' | 'q4', e.target.value)}
                                                      disabled={hasChildren}
                                                      className={`w-14 h-8 text-center text-xs font-bold font-mono border border-slate-200 rounded-lg outline-none focus:border-[#D8232A] ${
                                                        hasChildren ? 'bg-red-50/50 text-[#D8232A] border-red-200 cursor-not-allowed select-none font-black' : 'bg-white text-slate-800'
                                                      }`}
                                                      min="1"
                                                      max="100"
                                                      title={hasChildren ? "Averaged from sub-subjects" : undefined}
                                                    />
                                                  </td>
                                                ))
                                              )}

                                              {/* Final Rating Column */}
                                              <td className="p-1.5 font-mono font-black text-xs text-[#D8232A] bg-red-50/20">
                                                {(() => {
                                                  if (isThreeTerm) {
                                                    const t1 = row.t1 !== '' ? parseFloat(row.t1) : null;
                                                    const t2 = row.t2 !== '' ? parseFloat(row.t2) : null;
                                                    const t3 = row.t3 !== '' ? parseFloat(row.t3) : null;
                                                    const valid = [t1, t2, t3].filter(v => v !== null && !isNaN(v)) as number[];
                                                    return valid.length === 3 ? Math.round(valid.reduce((a, b) => a + b, 0) / 3) : '—';
                                                  } else {
                                                    const q1 = row.q1 !== '' ? parseFloat(row.q1) : null;
                                                    const q2 = row.q2 !== '' ? parseFloat(row.q2) : null;
                                                    const q3 = row.q3 !== '' ? parseFloat(row.q3) : null;
                                                    const q4 = row.q4 !== '' ? parseFloat(row.q4) : null;
                                                    const valid = [q1, q2, q3, q4].filter(v => v !== null && !isNaN(v)) as number[];
                                                    return valid.length === 4 ? Math.round(valid.reduce((a, b) => a + b, 0) / 4) : '—';
                                                  }
                                                })()}
                                              </td>

                                              <td className="p-1.5 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-1">
                                                  {!row.isSubSubject && (
                                                    <button
                                                      type="button"
                                                      onClick={() => handleAddSubSubjectRow(row.id)}
                                                      className="p-1.5 text-[#D8232A] hover:bg-red-50 rounded-lg transition-all"
                                                      title="Add Sub-subject underneath"
                                                    >
                                                      <Plus className="w-3.5 h-3.5" />
                                                    </button>
                                                  )}
                                                  <button
                                                    type="button"
                                                    onClick={() => handleRemoveSubjectRow(row.id)}
                                                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                                    title="Delete row"
                                                  >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                  </button>
                                                </div>
                                              </td>
                                            </tr>
                                          );
                                        })}

                                        {/* General Average Footer Row */}
                                        {computedFormGrades.length > 0 && (
                                          <tr className="bg-red-50/50 font-bold border-t-2 border-red-200">
                                            <td className="p-3 text-left text-[#D8232A] font-black text-xs uppercase tracking-wide">
                                              Calculated General Average
                                            </td>
                                            <td colSpan={isThreeTerm ? 3 : 4} className="p-2"></td>
                                            <td className="p-3 text-center text-[#D8232A] font-black text-sm bg-red-100/60 font-mono">
                                              {formGeneralAverage || '—'}
                                            </td>
                                            <td className="p-2"></td>
                                          </tr>
                                        )}

                                        {computedFormGrades.length === 0 && (
                                          <tr>
                                            <td colSpan={isThreeTerm ? 6 : 7} className="p-8 text-center text-slate-400 font-semibold italic">
                                              No learning areas added yet. Click "Load Standard Subjects" below to start.
                                            </td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </div>

                                  {/* Action Buttons Below Table */}
                                  <div className="flex flex-wrap items-center gap-2.5 justify-start pt-1">
                                    <Button
                                      type="button"
                                      onClick={handleAddSubjectRow}
                                      variant="outline"
                                      className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-xs font-bold text-[#D8232A] border-red-200 hover:bg-red-50/60"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>Add Learning Area</span>
                                    </Button>
                                    <Button
                                      type="button"
                                      onClick={handleResetStandardSubjects}
                                      variant="outline"
                                      className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-50"
                                      title="Load or reset to standard DepEd curriculum learning areas for this grade level"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                                      <span>Load Standard Subjects</span>
                                    </Button>
                                  </div>

                                  {/* Remedial Classes Section */}
                                  <div className="border border-slate-200 rounded-3xl p-5 bg-white space-y-4 shadow-2xs">
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
                                      <div className="space-y-4 pt-1 animate-in fade-in duration-150">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                          <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Conducted From</label>
                                            <Input
                                              value={formRemedialFrom}
                                              onChange={(e) => setFormRemedialFrom(e.target.value)}
                                              placeholder="e.g. June 1, 2025"
                                              className="h-9 rounded-xl text-xs font-medium"
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Conducted To</label>
                                            <Input
                                              value={formRemedialTo}
                                              onChange={(e) => setFormRemedialTo(e.target.value)}
                                              placeholder="e.g. July 15, 2025"
                                              className="h-9 rounded-xl text-xs font-medium"
                                            />
                                          </div>
                                        </div>

                                        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                                          <table className="w-full text-center border-collapse text-xs">
                                            <thead>
                                              <tr className="bg-slate-50 font-bold text-slate-500 border-b">
                                                <th className="p-2.5 text-left font-bold text-[10px] uppercase">Learning Area</th>
                                                <th className="p-2.5 w-24 font-bold text-[10px] uppercase">Final Rating</th>
                                                <th className="p-2.5 w-28 font-bold text-[10px] uppercase">Remedial Mark</th>
                                                <th className="p-2.5 w-32 font-bold text-[10px] uppercase">Recomputed Final</th>
                                                <th className="p-2.5 w-28 font-bold text-[10px] uppercase">Remarks</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {formRemedialRows.map((row, rIdx) => {
                                                const updateRowField = (f: string, v: string) => {
                                                  setFormRemedialRows(prev => {
                                                    const copy = [...prev];
                                                    copy[rIdx] = { ...copy[rIdx], [f]: v };
                                                    return copy;
                                                  });
                                                };
                                                return (
                                                  <tr key={row.id} className="border-b border-slate-100 last:border-b-0">
                                                    <td className="p-1.5">
                                                      <Input
                                                        value={row.subjectName}
                                                        onChange={(e) => updateRowField('subjectName', e.target.value)}
                                                        placeholder="Subject Name"
                                                        className="h-8 rounded-lg text-xs font-semibold"
                                                      />
                                                    </td>
                                                    <td className="p-1.5">
                                                      <input
                                                        type="number"
                                                        value={row.finalRating}
                                                        onChange={(e) => updateRowField('finalRating', e.target.value)}
                                                        min="1"
                                                        max="100"
                                                        className="w-full h-8 text-center text-xs font-bold font-mono border border-slate-200 rounded-lg outline-none focus:border-[#D8232A]"
                                                      />
                                                    </td>
                                                    <td className="p-1.5">
                                                      <input
                                                        type="number"
                                                        value={row.remedialMark}
                                                        onChange={(e) => updateRowField('remedialMark', e.target.value)}
                                                        min="1"
                                                        max="100"
                                                        className="w-full h-8 text-center text-xs font-bold font-mono border border-slate-200 rounded-lg outline-none focus:border-[#D8232A]"
                                                      />
                                                    </td>
                                                    <td className="p-1.5">
                                                      <input
                                                        type="number"
                                                        value={row.recomputedGrade}
                                                        onChange={(e) => updateRowField('recomputedGrade', e.target.value)}
                                                        min="1"
                                                        max="100"
                                                        className="w-full h-8 text-center text-xs font-bold font-mono border border-slate-200 rounded-lg outline-none focus:border-[#D8232A]"
                                                      />
                                                    </td>
                                                    <td className="p-1.5">
                                                      <Input
                                                        value={row.remarks}
                                                        onChange={(e) => updateRowField('remarks', e.target.value)}
                                                        placeholder="e.g. PASSED"
                                                        className="h-8 rounded-lg text-xs font-bold text-center uppercase"
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

                            {/* Form Footer Action Buttons */}
                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                              <Button
                                type="button"
                                onClick={() => setEditingGradeLevel(null)}
                                variant="outline"
                                className="h-10 px-4 rounded-xl text-xs font-bold border-slate-200 hover:bg-slate-50"
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                onClick={handleSaveBlock}
                                className="h-10 px-5 rounded-xl text-xs font-black bg-gradient-to-r from-[#D8232A] to-[#b91c22] hover:from-[#b91c22] hover:to-[#96171c] text-white shadow-sm shadow-red-500/25 flex items-center gap-2"
                              >
                                <Save className="w-4 h-4" />
                                <span>Save Permanent Record</span>
                              </Button>
                            </div>

                          </div>
                        ) : hasRecord ? (
                          /* MODE: SUMMARY DISPLAY CARD */
                          (() => {
                            const isThree = isThreeTermYear(record.academicYear || record.schoolYear || activeSchoolYearName);
                            let recordGrades = record.grades || {};
                            const matchedGradeKey = Object.keys(recordGrades).find(k => isMatchingGrade(k, gradeLvl));
                            if (matchedGradeKey) {
                              recordGrades = recordGrades[matchedGradeKey];
                            }
                            if (!recordGrades || typeof recordGrades !== 'object') {
                              recordGrades = {};
                            }

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
                              <div className="space-y-4 pt-1 text-xs">
                                {/* School Metadata Strip */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                                  <div>
                                    <span className="text-[10px] text-slate-400 uppercase font-black block">School</span>
                                    <span className="font-bold text-slate-800 block mt-0.5 truncate">{resolvedSchool}</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-slate-400 uppercase font-black block">Section</span>
                                    <span className="font-bold text-slate-800 block mt-0.5 truncate">{resolvedSection}</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-slate-400 uppercase font-black block">Adviser</span>
                                    <span className="font-bold text-slate-800 block mt-0.5 truncate">{resolvedAdviser}</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-slate-400 uppercase font-black block">Division</span>
                                    <span className="font-bold text-slate-800 block mt-0.5 truncate">{resolvedDivision}</span>
                                  </div>
                                  <div className="col-span-2 sm:col-span-1">
                                    <span className="text-[10px] text-slate-400 uppercase font-black block">Action Taken</span>
                                    <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-md font-black text-[10px] uppercase ${
                                      statusValue === 'PROMOTED' ? 'bg-emerald-100 text-emerald-800' :
                                      statusValue === 'RETAINED' ? 'bg-rose-100 text-rose-800' :
                                      statusValue === 'IRREGULAR' ? 'bg-amber-100 text-amber-800' :
                                      'bg-slate-100 text-slate-600'
                                    }`}>
                                      {statusValue}
                                    </span>
                                  </div>
                                </div>

                                {/* Learning Area Grades Table */}
                                <div className="overflow-hidden border border-slate-200/80 rounded-2xl bg-white shadow-2xs">
                                  <table className="w-full text-center border-collapse text-xs">
                                    <thead>
                                      <tr className="bg-slate-50/80 font-bold text-slate-500 border-b border-slate-200">
                                        <th className="p-3 text-left font-extrabold text-[10px] text-slate-500 uppercase tracking-wide">Learning Area</th>
                                        {isThree ? (
                                          <>
                                            <th className="p-3 w-16 font-extrabold text-[10px] text-slate-500 uppercase">T1</th>
                                            <th className="p-3 w-16 font-extrabold text-[10px] text-slate-500 uppercase">T2</th>
                                            <th className="p-3 w-16 font-extrabold text-[10px] text-slate-500 uppercase">T3</th>
                                          </>
                                        ) : (
                                          <>
                                            <th className="p-3 w-16 font-extrabold text-[10px] text-slate-500 uppercase">Q1</th>
                                            <th className="p-3 w-16 font-extrabold text-[10px] text-slate-500 uppercase">Q2</th>
                                            <th className="p-3 w-16 font-extrabold text-[10px] text-slate-500 uppercase">Q3</th>
                                            <th className="p-3 w-16 font-extrabold text-[10px] text-slate-500 uppercase">Q4</th>
                                          </>
                                        )}
                                        <th className="p-3 w-20 font-black text-[#D8232A] bg-red-50/40 text-[10px] uppercase tracking-wide">Final</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {getSubjectRows(record, gradeLvl).map((subj, sIdx) => {
                                        return (
                                          <tr key={`${subj.name}-${sIdx}`} className="border-b border-slate-100 hover:bg-slate-50/50 last:border-b-0 transition-colors">
                                            <td className={`p-3 text-left ${subj.isSubSubject ? 'pl-7 text-slate-500 italic font-semibold' : 'text-slate-900 font-bold'}`}>
                                              <div className="flex items-center gap-1.5">
                                                {subj.isSubSubject && (
                                                  <CornerDownRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                                                )}
                                                <span>{subj.name || <>&nbsp;</>}</span>
                                              </div>
                                            </td>
                                            {isThree ? (
                                              <>
                                                <td className="p-2.5 text-slate-700 font-bold font-mono">{subj.q1 !== '' ? subj.q1 : '—'}</td>
                                                <td className="p-2.5 text-slate-700 font-bold font-mono">{subj.q2 !== '' ? subj.q2 : '—'}</td>
                                                <td className="p-2.5 text-slate-700 font-bold font-mono">{subj.q3 !== '' ? subj.q3 : '—'}</td>
                                              </>
                                            ) : (
                                              <>
                                                <td className="p-2.5 text-slate-700 font-bold font-mono">{subj.q1 !== '' ? subj.q1 : '—'}</td>
                                                <td className="p-2.5 text-slate-700 font-bold font-mono">{subj.q2 !== '' ? subj.q2 : '—'}</td>
                                                <td className="p-2.5 text-slate-700 font-bold font-mono">{subj.q3 !== '' ? subj.q3 : '—'}</td>
                                                <td className="p-2.5 text-slate-700 font-bold font-mono">{subj.q4 !== '' ? subj.q4 : '—'}</td>
                                              </>
                                            )}
                                            <td className="p-2.5 font-black text-[#D8232A] bg-red-50/20 font-mono text-xs">{subj.final !== '' ? subj.final : '—'}</td>
                                          </tr>
                                        );
                                      })}

                                      {/* General Average Row */}
                                      {(() => {
                                        const subjectRows = getSubjectRows(record, gradeLvl);
                                        const mainFinals = subjectRows
                                          .filter(r => !r.isSubSubject && typeof r.final === 'number' && !isNaN(r.final))
                                          .map(r => r.final as number);
                                        if (mainFinals.length > 0) {
                                          const avg = Math.round(mainFinals.reduce((a, b) => a + b, 0) / mainFinals.length);
                                          return (
                                            <tr className="bg-red-50/50 font-bold border-t-2 border-red-200">
                                              <td className="p-3 text-left text-[#D8232A] font-black text-xs uppercase tracking-wide">
                                                General Average
                                              </td>
                                              <td colSpan={isThree ? 3 : 4} className="p-2"></td>
                                              <td className="p-3 text-center text-[#D8232A] font-black bg-red-100/60 font-mono text-sm">
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

                                {/* Remedial Classes Record Box */}
                                {record.remedial && record.remedial.classes && record.remedial.classes.some((c: any) => c.subjectName) && (
                                  <div className="border border-amber-200 rounded-2xl overflow-hidden bg-amber-50/20 space-y-0">
                                    <div className="bg-amber-100/60 px-4 py-2.5 border-b border-amber-200 flex justify-between items-center text-[10px] font-black text-amber-900 uppercase tracking-wider">
                                      <span>Remedial Classes Record</span>
                                      <span className="font-semibold text-amber-700 normal-case">
                                        Conducted: {record.remedial.from || '—'} to {record.remedial.to || '—'}
                                      </span>
                                    </div>
                                    <table className="w-full text-center border-collapse text-xs">
                                      <thead>
                                        <tr className="bg-amber-50/40 font-bold text-amber-800 border-b border-amber-200/60">
                                          <th className="p-2.5 text-left font-bold text-[10px] uppercase">Learning Area</th>
                                          <th className="p-2.5 w-24 font-bold text-[10px] uppercase">Final Rating</th>
                                          <th className="p-2.5 w-28 font-bold text-[10px] uppercase">Remedial Mark</th>
                                          <th className="p-2.5 w-32 font-bold text-[10px] uppercase">Recomputed Final</th>
                                          <th className="p-2.5 w-28 font-black text-emerald-800 text-[10px] uppercase">Remarks</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {record.remedial.classes.map((row: any, rIdx: number) => {
                                          if (!row.subjectName) return null;
                                          return (
                                            <tr key={rIdx} className="border-b border-amber-100/60 last:border-b-0">
                                              <td className="p-2.5 text-left font-bold text-slate-800">{row.subjectName}</td>
                                              <td className="p-2.5 text-slate-700 font-bold font-mono">{row.finalRating || '—'}</td>
                                              <td className="p-2.5 text-slate-700 font-bold font-mono">{row.remedialMark || '—'}</td>
                                              <td className="p-2.5 text-slate-700 font-bold font-mono">{row.recomputedGrade || '—'}</td>
                                              <td className="p-2.5 font-black text-emerald-800 bg-emerald-50/30">{row.remarks || '—'}</td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            );
                          })()
                        ) : (
                          /* MODE: EMPTY STATE */
                          <div className="flex flex-col items-center justify-center py-10 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-slate-400 space-y-2">
                            <FileText className="w-8 h-8 text-slate-300" />
                            <span className="text-xs font-semibold text-slate-500">No historical academic record encoded for {gradeLvl}.</span>
                            <Button
                              type="button"
                              onClick={() => handleStartEncode(gradeLvl)}
                              variant="outline"
                              className="h-8 px-3 rounded-xl text-xs font-bold text-[#D8232A] border-red-200 hover:bg-red-50/60 mt-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Encode {gradeLvl} Record</span>
                            </Button>
                          </div>
                        )}

                      </Card>
                    );
                  })}
                </div>
              )}

            </div>
          ) : (
            /* NO LEARNER SELECTED HERO EMPTY STATE */
            <Card className="flex flex-col items-center justify-center p-16 sm:p-24 text-slate-400 bg-white border border-slate-200/80 rounded-3xl shadow-xs text-center space-y-4">
              <div className="w-20 h-20 rounded-3xl bg-red-50 text-[#D8232A] flex items-center justify-center shadow-xs">
                <GraduationCap className="w-10 h-10 text-[#D8232A]" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Select a Learner to Begin</h3>
                <p className="text-xs font-medium text-slate-500 leading-relaxed">
                  Choose a section and search for a student above to manage, encode past grade levels, view academic summaries, or print the DepEd SF10 permanent record.
                </p>
              </div>
            </Card>
          )}

          {/* SF10 REPORT PREVIEW MODAL */}
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
