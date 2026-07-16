import React, { useState, createContext, useContext, ReactNode, useEffect } from 'react';
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

type TeacherContextType = {
  students: Student[];
  subjects: TeacherSubject[];
  attendance: AttendanceEntry[];
  currentSection: string;
  updateAttendance: (studentId: string, date: string, amStatus: 'Present' | 'Absent' | 'Late' | 'Unmarked', pmStatus: 'Present' | 'Absent' | 'Late' | 'Unmarked') => Promise<void>;
  deleteAttendance: (studentId: string, date: string) => Promise<void>;
  updateStudentStatus: (id: string, status: 'Enrolled' | 'Rejected') => Promise<void>;
  updateStudentGrade: (id: string, subjectCode: string, grade: number) => Promise<void>;
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

  useEffect(() => {
    if (!user) {
      setStudents([]);
      setAttendance([]);
      setCurrentSection('');
      setCurrentGradeLevel('');
      setLoading(false);
      return;
    }

    // Track all inner unsub functions so they can be properly cleaned up
    let unsubPending: () => void = () => { /* no-op */ };
    let unsubEnrolled: () => void = () => { /* no-op */ };
    let unsubAttendance: () => void = () => { /* no-op */ };
    let unsubSubjects: () => void = () => { /* no-op */ };
    let cancelled = false;

    // 1. Get Teacher's Assignment
    const qAssign = query(collection(db, 'assignments'), where('teacherId', '==', user.uid));
    const unsubAssign = onSnapshot(qAssign, async (snap) => {
      // Clean up previous inner listeners before setting up new ones
      unsubPending();
      unsubEnrolled();
      unsubAttendance();
      unsubSubjects();

      if (snap.empty) {
        setStudents([]);
        setAttendance([]);
        setCurrentSection('');
        setCurrentGradeLevel('');
        setCurrentSectionName('');
        setAcademicYear('');
        setLoading(false);
        return;
      }

      const assign = snap.docs[0].data();
      const sectionId = assign.sectionId;
      setCurrentSection(sectionId);

      // 2. Get section gradeLevel
      try {
        const secSnap = await getDoc(doc(db, 'sections', sectionId));
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

        // 3a. Pending students for this gradeLevel
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

        // 3b. Enrolled students for this sectionId
        const qEnrolled = query(
          collection(db, 'enrollments'),
          where('sectionId', '==', sectionId),
          where('status', 'in', ['Enrolled', 'Dropped', 'Transferred'])
        );
        unsubEnrolled = onSnapshot(qEnrolled, (sSnap) => {
          enrolledStudents = sSnap.docs.map(d => ({ id: d.id, ...d.data() } as Student));
          setStudents([...pendingStudents, ...enrolledStudents]);
        });

        // 4. Attendance for this section
        const qAttendance = query(collection(db, 'attendance'), where('sectionId', '==', sectionId));
        unsubAttendance = onSnapshot(qAttendance, (aSnap) => {
          setAttendance(aSnap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceEntry)));
        });

        // 5. All subjects
        unsubSubjects = onSnapshot(query(collection(db, 'subjects')), (sSnap) => {
          setSubjects(sSnap.docs.map(d => ({ id: d.id, ...d.data() } as TeacherSubject)));
        });

        setLoading(false);
      } catch (err) {
        console.error('[teacherData] Error fetching section:', err);
        setLoading(false);
      }
    }, (err) => {
      console.error('[teacherData] Assignment listener error:', err);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      unsubAssign();
      unsubPending();
      unsubEnrolled();
      unsubAttendance();
      unsubSubjects();
    };
  }, [user]);

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

  const updateStudentGrade = async (id: string, subjectCode: string, grade: number) => {
    const student = students.find(s => s.id === id);
    if (!student) return;
    
    const grades = { ...(student.grades || {}), [subjectCode]: grade };
    await updateDoc(doc(db, 'enrollments', id), { grades });
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
        updateAttendance,
        deleteAttendance,
        updateStudentStatus,
        updateStudentGrade,
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