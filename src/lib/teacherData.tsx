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
  deleteDoc
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
  medical?: {
    height: string;
    weight: string;
    [key: string]: string | boolean | string[] | undefined;
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
  loading: boolean;
  currentGradeLevel: string;
  currentSectionName: string;
  academicYear: string;
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
    
    const qSubjAssign = query(collection(db, 'subjectAssignments'), where('teacherId', '==', user.uid));
    const unsubSubjAssign = onSnapshot(qSubjAssign, (snap) => {
      setSubjectAssignments(snap.docs.map(d => d.data()));
    });

    return () => {
      unsubAssign();
      unsubSubjAssign();
    };
  }, [user]);

  const [assignedSections, setAssignedSections] = useState<AssignedSection[]>([]);

  // 2. Compute assignedSections (basic)
  useEffect(() => {
    const map = new Map<string, AssignedSection>();
    advisorAssignments.forEach(a => {
      map.set(a.sectionId, { sectionId: a.sectionId, isAdvisor: true, subjectCodes: [] });
    });
    subjectAssignments.forEach(sa => {
      if (map.has(sa.sectionId)) {
        const existing = map.get(sa.sectionId)!;
        if (!existing.subjectCodes.includes(sa.subjectCode)) {
           existing.subjectCodes.push(sa.subjectCode);
        }
      } else {
        map.set(sa.sectionId, { sectionId: sa.sectionId, isAdvisor: false, subjectCodes: [sa.subjectCode] });
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
  }, [advisorAssignments, subjectAssignments]);

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
  useEffect(() => {
    if (!currentSection) {
      setStudents([]);
      setAttendance([]);
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
        const qPending = query(
          collection(db, 'enrollments'),
          where('gradeLevel', '==', normalizedGradeLevel),
          where('status', '==', 'Pending')
        );
        unsubPending = onSnapshot(qPending, (sSnap) => {
          pendingStudents = sSnap.docs.map(d => ({ id: d.id, ...d.data() } as Student));
          setStudents([...pendingStudents, ...enrolledStudents]);
        });

        const qEnrolled = query(
          collection(db, 'enrollments'),
          where('sectionId', '==', currentSection),
          where('status', 'in', ['Enrolled', 'Dropped', 'Transferred'])
        );
        unsubEnrolled = onSnapshot(qEnrolled, (sSnap) => {
          enrolledStudents = sSnap.docs.map(d => ({ id: d.id, ...d.data() } as Student));
          setStudents([...pendingStudents, ...enrolledStudents]);
        });

        const qAttendance = query(collection(db, 'attendance'), where('sectionId', '==', currentSection));
        unsubAttendance = onSnapshot(qAttendance, (aSnap) => {
          setAttendance(aSnap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceEntry)));
        });

        unsubSubjects = onSnapshot(query(collection(db, 'subjects')), (sSnap) => {
          setSubjects(sSnap.docs.map(d => ({ id: d.id, ...d.data() } as TeacherSubject)));
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
    const student = students.find(s => s.id === id);
    if (!student) return;
    const medical = { ...(student.medical || {}), height, weight };
    await updateDoc(doc(db, 'enrollments', id), { medical });
  };

  return (
    <TeacherContext.Provider
      value={{
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
        loading,
        currentGradeLevel,
        currentSectionName,
        academicYear
      }}>
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