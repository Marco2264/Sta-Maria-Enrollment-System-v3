import React, { useState, createContext, useContext, ReactNode, useEffect, useMemo } from 'react';
import { db } from './firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  getDoc,
  deleteDoc,
  setDoc
} from 'firebase/firestore';
import { useAuth } from './AuthContext';

export type Student = {
  id: string;
  firstName: string;
  lastName: string;
  gender: string;
  lrn: string;
  gradeLevel: string;
  sectionId: string;
  birthDate: string;
  status: 'Enrolled' | 'Dropped' | 'Transferred' | 'Pending' | 'Rejected';
  enrollmentDate?: string;
  grades?: Record<string, number>;
  observedValues?: Record<string, any>;
  middleName?: string;
  parentId?: string;
  address?: {
    street?: string;
    barangay?: string;
    city?: string;
    province?: string;
    zipCode?: string;
  };
  additional?: {
    motherTongue?: string;
    religion?: string;
    isIndigenous?: boolean;
    indigenousGroup?: string;
    is4ps?: boolean;
    learningMode?: string;
  };
  medical?: {
    height: string;
    weight: string;
    [key: string]: string | boolean | string[] | undefined;
  };
  requirementUploads?: {
    psaBirthCertificate?: { fileUrl?: string };
    [key: string]: any;
  };
};

export type AttendanceEntry = {
  id: string;
  studentId: string;
  date: string;
  status?: 'Present' | 'Absent' | 'Late';
  amStatus?: 'Present' | 'Absent' | 'Late' | 'Unmarked';
  pmStatus?: 'Present' | 'Absent' | 'Late' | 'Unmarked';
  sectionId: string;
};

export type TeacherSubject = {
  id: string;
  name: string;
  code?: string;
  gradeLevel: string;
  status: 'Active' | 'Inactive';
  academicYear?: string;
};

export type AssignedSection = {
  sectionId: string;
  isAdvisor: boolean;
  subjectCodes: string[];
  taughtSubjectCodes: string[];
  advisedSubjectCodes: string[];
  name?: string;
  gradeLevel?: string;
};

type TeacherContextType = {
  students: Student[];
  subjects: TeacherSubject[];
  attendance: AttendanceEntry[];
  currentSection: string;
  setCurrentSection: (sectionId: string) => void;
  assignedSections: AssignedSection[];
  isAdvisorForCurrentSection: boolean;
  assignedSubjectCodes: string[];
  updateAttendance: (studentId: string, date: string, amStatus: 'Present' | 'Absent' | 'Late' | 'Unmarked', pmStatus: 'Present' | 'Absent' | 'Late' | 'Unmarked') => Promise<void>;
  deleteAttendance: (studentId: string, date: string) => Promise<void>;
  updateStudentStatus: (id: string, status: 'Enrolled' | 'Rejected') => Promise<void>;
  updateStudentGrade: (id: string, subjectCode: string, quarter: string, grade: number | null) => Promise<void>;
  updateStudentObservedValue: (id: string, statementKey: string, quarter: string, value: string | null) => Promise<void>;
  updateStudentBmi: (id: string, height: string, weight: string) => Promise<void>;
  gradeConfigurations: any[];
  addGradeColumn: (subjectCode: string, term: string, name: string, weight: number) => Promise<void>;
  editGradeColumn: (id: string, name: string, weight: number) => Promise<void>;
  deleteGradeColumn: (id: string) => Promise<void>;
  submitGradesToAdviser: (subjectCode: string, term: string) => Promise<void>;
  requestUnlockGrades: (subjectCode: string, term: string) => Promise<void>;
  grantUnlockGrades: (subjectCode: string, term: string) => Promise<void>;
  updateDynamicStudentGrade: (id: string, subjectCode: string, term: string, columnId: string, grade: number | null) => Promise<void>;
  loading: boolean;
  currentGradeLevel: string;
  currentSectionName: string;
  academicYear: string;
  advisorSectionSchedules: any[];
  allTeachers: any[];
};

const TeacherContext = createContext<TeacherContextType | undefined>(undefined);

export function TeacherDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<TeacherSubject[]>([]);
  const [attendance, setAttendance] = useState<AttendanceEntry[]>([]);
  const [currentSection, setCurrentSection] = useState('');
  const [currentGradeLevel, setCurrentGradeLevel] = useState('');
  const [currentSectionName, setCurrentSectionName] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [loading, setLoading] = useState(true);

  const [advisorAssignments, setAdvisorAssignments] = useState<any[]>([]);
  const [subjectAssignments, setSubjectAssignments] = useState<any[]>([]);

  // 1. Fetch Assignments
  useEffect(() => {
    if (!user) {
      setAdvisorAssignments([]);
      setSubjectAssignments([]);
      return;
    }
    const qAssign = query(collection(db, 'assignments'), where('teacherId', '==', user.uid));
    const unsubAssign = onSnapshot(qAssign, (snap) => {
      setAdvisorAssignments(snap.docs.map(d => d.data()));
    });
    
    const qSubjAssign = query(
      collection(db, 'schedules'),
      where('teacherId', '==', user.uid),
      where('status', '==', 'published')
    );
    const unsubSubjAssign = onSnapshot(qSubjAssign, (snap) => {
      setSubjectAssignments(snap.docs.map(d => d.data()));
    });

    const qSubjects = query(collection(db, 'subjects'));
    const unsubSubjects = onSnapshot(qSubjects, (snap) => {
      setSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as TeacherSubject)));
    });

    const qTeachers = query(collection(db, 'users'), where('role', 'in', ['Teacher', 'teacher']));
    const unsubTeachers = onSnapshot(qTeachers, (snap) => {
      setAllTeachers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubAssign();
      unsubSubjAssign();
      unsubSubjects();
      unsubTeachers();
    };
  }, [user]);

  const [advisorSectionSchedules, setAdvisorSectionSchedules] = useState<any[]>([]);
  const [allTeachers, setAllTeachers] = useState<any[]>([]);

  useEffect(() => {
    if (advisorAssignments.length === 0) {
      setAdvisorSectionSchedules([]);
      return;
    }
    const sectionIds = advisorAssignments.map(a => a.sectionId);
    
    const chunks = [];
    for (let i = 0; i < sectionIds.length; i += 10) {
      chunks.push(sectionIds.slice(i, i + 10));
    }
    
    const unsubs: (() => void)[] = [];
    const allSchedulesMap = new Map<string, any[]>();
    
    chunks.forEach((chunk, idx) => {
      const q = query(collection(db, 'schedules'), where('sectionId', 'in', chunk), where('status', '==', 'published'));
      const unsub = onSnapshot(q, (snap) => {
        allSchedulesMap.set(idx.toString(), snap.docs.map(d => d.data()));
        const merged = Array.from(allSchedulesMap.values()).flat();
        setAdvisorSectionSchedules(merged);
      });
      unsubs.push(unsub);
    });
    
    return () => unsubs.forEach(u => u());
  }, [advisorAssignments]);

  const [assignedSections, setAssignedSections] = useState<AssignedSection[]>([]);

  // 2. Compute assignedSections (basic)
  useEffect(() => {
    const map = new Map<string, AssignedSection>();
    advisorAssignments.forEach(a => {
      map.set(a.sectionId, { sectionId: a.sectionId, isAdvisor: true, subjectCodes: [], taughtSubjectCodes: [], advisedSubjectCodes: [] });
    });

    subjectAssignments.forEach(sa => {
      const subject = subjects.find(s => s.id === sa.subjectId);
      const subjectCode = subject ? (subject.code || subject.name) : (sa.subjectCode || 'Unknown');
      
      if (map.has(sa.sectionId)) {
        const existing = map.get(sa.sectionId)!;
        if (!existing.taughtSubjectCodes.includes(subjectCode)) {
           existing.taughtSubjectCodes.push(subjectCode);
           if (!existing.subjectCodes.includes(subjectCode)) existing.subjectCodes.push(subjectCode);
        }
      } else {
        map.set(sa.sectionId, { sectionId: sa.sectionId, isAdvisor: false, subjectCodes: [subjectCode], taughtSubjectCodes: [subjectCode], advisedSubjectCodes: [] });
      }
    });

    advisorSectionSchedules.forEach(sa => {
      if (map.has(sa.sectionId)) {
         const subject = subjects.find(s => s.id === sa.subjectId);
         const subjectCode = subject ? (subject.code || subject.name) : (sa.subjectCode || 'Unknown');
         const existing = map.get(sa.sectionId)!;
         
         if (!existing.taughtSubjectCodes.includes(subjectCode) && !existing.advisedSubjectCodes.includes(subjectCode)) {
           existing.advisedSubjectCodes.push(subjectCode);
           if (!existing.subjectCodes.includes(subjectCode)) existing.subjectCodes.push(subjectCode);
         }
      }
    });
    
    const basicSections = Array.from(map.values());
    
    // Fetch names for these sections
    if (basicSections.length === 0) {
      setAssignedSections([]);
      return;
    }

    let isMounted = true;
    const fetchNames = async () => {
      const enriched = await Promise.all(basicSections.map(async (sec) => {
        try {
          const snap = await getDoc(doc(db, 'sections', sec.sectionId));
          if (snap.exists()) {
            return {
              ...sec,
              name: snap.data().name || snap.data().sectionName || 'Unnamed Section',
              gradeLevel: snap.data().gradeLevel || 'Unknown Grade'
            };
          }
        } catch(e) {}
        return { ...sec, name: 'Unknown', gradeLevel: '' };
      }));
      if (isMounted) {
        setAssignedSections(enriched);
      }
    };
    fetchNames();

    return () => { isMounted = false; };
  }, [advisorAssignments, subjectAssignments, subjects, advisorSectionSchedules]);

  // 3. Auto-select current section
  useEffect(() => {
    if (assignedSections.length > 0) {
      if (!currentSection || !assignedSections.some(s => s.sectionId === currentSection)) {
        setCurrentSection(assignedSections[0].sectionId);
      }
    } else {
      setCurrentSection('');
    }
  }, [assignedSections, currentSection]);

  const currentSectionData = useMemo(() => {
     return assignedSections.find(s => s.sectionId === currentSection) || { sectionId: '', isAdvisor: false, subjectCodes: [] };
  }, [assignedSections, currentSection]);

  // 4. Load current section details
  const [gradeConfigurations, setGradeConfigurations] = useState<any[]>([]);

  useEffect(() => {
    if (!currentSection) {
      setStudents([]);
      setAttendance([]);
      setGradeConfigurations([]);
      setCurrentGradeLevel('');
      setCurrentSectionName('');
      setAcademicYear('');
      setSubjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let unsubPending = () => {};
    let unsubEnrolled = () => {};
    let unsubAttendance = () => {};
    let unsubSubjects = () => {};
    let unsubGradeConfigs = () => {};
    let cancelled = false;

    const loadData = async () => {
      try {
        const secSnap = await getDoc(doc(db, 'sections', currentSection));
        if (cancelled || !secSnap.exists()) {
          setLoading(false);
          return;
        }
        
        const gradeLevel = secSnap.data().gradeLevel;
        const sName = secSnap.data().name || secSnap.data().sectionName || '';
        const aYear = secSnap.data().schoolYear || '';
        
        setCurrentGradeLevel(gradeLevel);
        setCurrentSectionName(sName);
        setAcademicYear(aYear);

        let pendingStudents: Student[] = [];
        let enrolledStudents: Student[] = [];

        const normalizedGradeLevel = gradeLevel ? gradeLevel.replace(/Grade /i, '').trim() : '';
        const validGrades = [
          normalizedGradeLevel,
          `Grade ${normalizedGradeLevel}`,
          `grade ${normalizedGradeLevel}`,
          `GRADE ${normalizedGradeLevel}`
        ];

        const qPending = query(
          collection(db, 'enrollments'),
          where('status', '==', 'Pending')
        );
        unsubPending = onSnapshot(qPending, (sSnap) => {
          pendingStudents = sSnap.docs
            .map(d => ({ id: d.id, ...d.data() } as Student))
            .filter((s) => s.gradeLevel && validGrades.includes(s.gradeLevel.toString().trim()));
          setStudents([...pendingStudents, ...enrolledStudents]);
        });

        const qEnrolled = query(
          collection(db, 'enrollments'),
          where('sectionId', '==', currentSection),
          where('status', 'in', ['Enrolled', 'enrolled', 'PROMOTED', 'RETAINED', 'IRREGULAR', 'Dropped', 'Transferred'])
        );
        unsubEnrolled = onSnapshot(qEnrolled, (sSnap) => {
          enrolledStudents = sSnap.docs
            .map(d => ({ id: d.id, ...d.data() } as Student))
            .filter((s: any) => s.isManualHistory !== true);
          setStudents([...pendingStudents, ...enrolledStudents]);
        });

        const qAttendance = query(collection(db, 'attendance'), where('sectionId', '==', currentSection));
        unsubAttendance = onSnapshot(qAttendance, (aSnap) => {
          setAttendance(aSnap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceEntry)));
        });

        const qGradeConfigs = query(collection(db, 'gradeConfigurations'), where('sectionId', '==', currentSection));
        unsubGradeConfigs = onSnapshot(qGradeConfigs, (snap) => {
          setGradeConfigurations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        setLoading(false);
      } catch (err) {
        console.error('[teacherData] Error fetching section:', err);
        setLoading(false);
      }
    };
    loadData();

    return () => {
      cancelled = true;
      unsubPending();
      unsubEnrolled();
      unsubAttendance();
      unsubSubjects();
      unsubGradeConfigs();
    };
  }, [currentSection]);

  const updateAttendance = async (studentId: string, date: string, amStatus: 'Present' | 'Absent' | 'Late' | 'Unmarked', pmStatus: 'Present' | 'Absent' | 'Late' | 'Unmarked') => {
    if (!currentSection) return;

    const existing = attendance.find(a => a.studentId === studentId && a.date === date);
    
    if (existing) {
      await updateDoc(doc(db, 'attendance', existing.id), { amStatus, pmStatus });
    } else {
      await addDoc(collection(db, 'attendance'), {
        studentId,
        date,
        amStatus,
        pmStatus,
        sectionId: currentSection,
        createdAt: serverTimestamp()
      });
    }
  };

  const deleteAttendance = async (studentId: string, date: string) => {
    const existing = attendance.find(a => a.studentId === studentId && a.date === date);
    if (existing) {
      await deleteDoc(doc(db, 'attendance', existing.id));
    }
  };

  const updateStudentStatus = async (id: string, status: 'Enrolled' | 'Rejected') => {
    if (status === 'Enrolled' && currentSection) {
      const todayStr = new Date().toISOString().split('T')[0];
      await updateDoc(doc(db, 'enrollments', id), { 
        status, 
        sectionId: currentSection,
        enrollmentDate: todayStr 
      });
    } else {
      await updateDoc(doc(db, 'enrollments', id), { status });
    }
  };

  const updateStudentGrade = async (id: string, subjectCode: string, quarter: string, grade: number | null) => {
    const student = students.find(s => s.id === id);
    if (!student) return;
    
    const existingGrades = student.grades || {};
    const gradeKey = currentGradeLevel || 'Grade 6';
    const gradeLevelGrades = (existingGrades as Record<string, any>)[gradeKey] || {};
    const existingSubjectGrades = gradeLevelGrades[subjectCode] || {};
    
    let updatedSubjectGrades = {};
    if (typeof existingSubjectGrades === 'object' && existingSubjectGrades !== null) {
      updatedSubjectGrades = { ...existingSubjectGrades };
      if (grade === null) {
        delete (updatedSubjectGrades as any)[quarter];
      } else {
        (updatedSubjectGrades as any)[quarter] = grade;
      }
    } else {
      updatedSubjectGrades = grade === null ? {} : { [quarter]: grade };
    }

    const grades = {
      ...existingGrades,
      [gradeKey]: {
        ...gradeLevelGrades,
        [subjectCode]: updatedSubjectGrades
      }
    };
    await updateDoc(doc(db, 'enrollments', id), { grades });
  };

  const updateStudentObservedValue = async (id: string, statementKey: string, quarter: string, value: string | null) => {
    const student = students.find(s => s.id === id);
    if (!student) return;

    const existingObsValues = (student as any).observedValues || {};
    const gradeKey = currentGradeLevel || 'Grade 6';
    const gradeLevelValues = existingObsValues[gradeKey] || {};
    const existingStatementValues = gradeLevelValues[statementKey] || {};

    let updatedStatementValues = {};
    if (typeof existingStatementValues === 'object' && existingStatementValues !== null) {
      updatedStatementValues = { ...existingStatementValues };
      if (value === null) {
        delete (updatedStatementValues as any)[quarter];
      } else {
        (updatedStatementValues as any)[quarter] = value;
      }
    } else {
      updatedStatementValues = value === null ? {} : { [quarter]: value };
    }

    const observedValues = {
      ...existingObsValues,
      [gradeKey]: {
        ...gradeLevelValues,
        [statementKey]: updatedStatementValues
      }
    };
    await updateDoc(doc(db, 'enrollments', id), { observedValues });
  };

  const updateStudentBmi = async (id: string, height: string, weight: string) => {
    const studentRef = doc(db, 'enrollments', id);
    await updateDoc(studentRef, {
      'medical.height': height,
      'medical.weight': weight
    });
  };

  const addGradeColumn = async (subjectCode: string, term: string, name: string, weight: number) => {
    if (!currentSection) return;
    await addDoc(collection(db, 'gradeConfigurations'), {
      sectionId: currentSection,
      subjectCode,
      term,
      name,
      weight,
      createdAt: serverTimestamp()
    });
  };

  const deleteGradeColumn = async (id: string) => {
    await deleteDoc(doc(db, 'gradeConfigurations', id));
  };

  const editGradeColumn = async (id: string, name: string, weight: number) => {
    await updateDoc(doc(db, 'gradeConfigurations', id), {
      name,
      weight
    });
  };

  const submitGradesToAdviser = async (subjectCode: string, term: string) => {
    if (!currentSection) return;
    const safeSubjectCode = subjectCode.replace(/[^a-zA-Z0-9]/g, '');
    const safeTerm = term.replace(/\s+/g, '');
    const docId = `sub_${currentSection}_${safeSubjectCode}_${safeTerm}`;
    
    await setDoc(doc(db, 'gradeConfigurations', docId), {
      type: 'submission',
      sectionId: currentSection,
      subjectCode,
      term,
      status: 'submitted',
      createdAt: serverTimestamp()
    });
  };

  const requestUnlockGrades = async (subjectCode: string, term: string) => {
    if (!currentSection) return;
    const safeSubjectCode = subjectCode.replace(/[^a-zA-Z0-9]/g, '');
    const safeTerm = term.replace(/\s+/g, '');
    const docId = `sub_${currentSection}_${safeSubjectCode}_${safeTerm}`;
    await updateDoc(doc(db, 'gradeConfigurations', docId), {
      status: 'unlock-requested'
    });
  };

  const grantUnlockGrades = async (subjectCode: string, term: string) => {
    if (!currentSection) return;
    const safeSubjectCode = subjectCode.replace(/[^a-zA-Z0-9]/g, '');
    const safeTerm = term.replace(/\s+/g, '');
    const docId = `sub_${currentSection}_${safeSubjectCode}_${safeTerm}`;
    await deleteDoc(doc(db, 'gradeConfigurations', docId));
  };

  const updateDynamicStudentGrade = async (id: string, subjectCode: string, term: string, columnId: string, grade: number | null) => {
    if (!currentGradeLevel) return;
    const studentRef = doc(db, 'enrollments', id);
    const normalizedGradeLevel = currentGradeLevel.trim().replace(/Grade /i, 'Grade ');
    
    // Check if it's the old nested grade structure (grades -> Grade Level -> Subject -> Term -> Column)
    const fieldPath = `grades.${normalizedGradeLevel}.${subjectCode}.${term}.${columnId}`;
    
    await updateDoc(studentRef, {
      [fieldPath]: grade
    });
  };

  const value = {
    students,
    subjects,
    attendance,
    currentSection,
    setCurrentSection,
    assignedSections,
    isAdvisorForCurrentSection: currentSectionData.isAdvisor,
    assignedSubjectCodes: currentSectionData.subjectCodes,
    updateAttendance,
    deleteAttendance,
    updateStudentStatus,
    updateStudentGrade,
    updateStudentObservedValue,
    updateStudentBmi,
    gradeConfigurations,
    addGradeColumn,
    editGradeColumn,
    deleteGradeColumn,
    submitGradesToAdviser,
    requestUnlockGrades,
    grantUnlockGrades,
    updateDynamicStudentGrade,
    loading,
    currentGradeLevel,
    currentSectionName,
    academicYear,
    advisorSectionSchedules,
    allTeachers
  };

  return (
    <TeacherContext.Provider
      value={value}>
      {children}
    </TeacherContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTeacherData() {
  const context = useContext(TeacherContext);
  if (context === undefined) {
    throw new Error('useTeacherData must be used within a TeacherDataProvider');
  }
  return context;
}