import React, { useState, createContext, useContext, ReactNode, useEffect } from 'react';
import { db } from './firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  serverTimestamp,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { getCurrentSchoolYear } from './utils';
import { useAuth } from './AuthContext';
import { normalizeRole } from './roles';

export type SchoolYear = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};
export type Classroom = {
  id: string;
  roomName: string;
  roomType: 'Lecture' | 'Laboratory' | 'Multipurpose';
  status: 'Available' | 'Full' | 'Maintenance';
  gradeLevel: string;
  academicYear?: string;
  createdAt: unknown;
};
export type Section = {
  id: string;
  name: string;
  classroomId: string;
  gradeLevel: string;
  status: 'Active' | 'Inactive';
};
export type Subject = {
  id: string;
  name: string;
  code?: string;
  gradeLevel: string;
  status: 'Active' | 'Inactive';
  createdAt: unknown;
  academicYear: string;
};
export type User = {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  gender: 'Male' | 'Female' | 'Other';
  contactNumber: string;
  email: string;
  role: 'Teacher' | 'Parent' | 'Admin' | 'Subadmin';
  status: 'Active' | 'Pending';
  assignedGrade?: string;
  password?: string;
  photoURL?: string;
  photoUrl?: string;
  createdAt: unknown;
};
export type Assignment = {
  id: string;
  teacherId: string;
  classroomId: string;
  sectionId: string;
};
export type SubjectAssignment = {
  id: string;
  teacherId: string;
  sectionId: string;
  subjectCode: string;
};
export type Schedule = {
  id: string;
  teacherId: string;
  subjectId: string;
  sectionId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  academicYear: string;
  status?: 'draft' | 'published';
};
type AdminContextType = {
  schoolYear: SchoolYear | null;
  setSchoolYear: (sy: SchoolYear | null) => void;
  classrooms: Classroom[];
  addClassroom: (c: Omit<Classroom, 'id' | 'createdAt'>) => Promise<string>;
  updateClassroom: (id: string, updates: Partial<Classroom>) => Promise<void>;
  deleteClassroom: (id: string) => Promise<void>;
  sections: Section[];
  addSection: (s: Omit<Section, 'id'>) => Promise<string>;
  updateSection: (id: string, updates: Partial<Section>) => Promise<void>;
  deleteSection: (id: string) => Promise<void>;
  subjects: Subject[];
  addSubject: (s: Omit<Subject, 'id' | 'createdAt'>) => Promise<void>;
  updateSubject: (id: string, updates: Partial<Subject>) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
  users: User[];
  addUser: (u: Omit<User, 'id' | 'createdAt'> & { id?: string; createdAt?: unknown }) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  assignments: Assignment[];
  addAssignment: (a: Omit<Assignment, 'id'>) => Promise<void>;
  deleteAssignment: (id: string) => Promise<void>;
  subjectAssignments: SubjectAssignment[];
  addSubjectAssignment: (sa: Omit<SubjectAssignment, 'id'>) => Promise<void>;
  deleteSubjectAssignment: (id: string) => Promise<void>;
  schedules: Schedule[];
  addSchedule: (s: Omit<Schedule, 'id'>) => Promise<void>;
  updateSchedule: (id: string, updates: Partial<Schedule>) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  batchAddSchedules: (newSchedules: Omit<Schedule, 'id'>[]) => Promise<void>;
  clearSchedulesForYear: (academicYear: string) => Promise<void>;
  setupComplete: boolean;
  setSetupComplete: (val: boolean) => void;
  isSystemInitialized: boolean;
  loading: boolean;
};

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminDataProvider({ children }: {children: ReactNode;}) {
  const { role: currentUserRole, userData } = useAuth();
  const [schoolYear, setSchoolYear] = useState<SchoolYear | null>(null);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [subjectAssignments, setSubjectAssignments] = useState<SubjectAssignment[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [setupComplete, setSetupComplete] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubClassrooms = onSnapshot(query(collection(db, 'classrooms')), (snap) => {
      setClassrooms(snap.docs.map(d => ({ id: d.id, ...d.data() } as Classroom)));
    });

    const unsubSections = onSnapshot(query(collection(db, 'sections')), (snap) => {
      setSections(snap.docs.map(d => ({ id: d.id, ...d.data() } as Section)));
    });

    const unsubSubjects = onSnapshot(query(collection(db, 'subjects'), orderBy('createdAt', 'desc')), (snap) => {
      setSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as Subject)));
    });

    const unsubUsers = onSnapshot(query(collection(db, 'users')), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as User)));
    });

    const unsubAssignments = onSnapshot(query(collection(db, 'assignments')), (snap) => {
      setAssignments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Assignment)));
    });

    const unsubSubjectAssignments = onSnapshot(query(collection(db, 'subjectAssignments')), (snap) => {
      setSubjectAssignments(snap.docs.map(d => ({ id: d.id, ...d.data() } as SubjectAssignment)));
    });

    const unsubSchedules = onSnapshot(query(collection(db, 'schedules')), (snap) => {
      setSchedules(snap.docs.map(d => ({ id: d.id, ...d.data() } as Schedule)));
    });

    const unsubSchoolYears = onSnapshot(query(collection(db, 'school_years')), (snap) => {
      const sy = snap.docs.find(d => d.data().isActive);
      if (sy) {
        setSchoolYear({ id: sy.id, ...sy.data() } as SchoolYear);
      } else {
        // Fallback or default if none active
        setSchoolYear({
          id: 'default',
          name: getCurrentSchoolYear(),
          startDate: '2024-08-01',
          endDate: '2025-05-31',
          isActive: true
        });
      }
      setLoading(false);
    });

    return () => {
      unsubClassrooms();
      unsubSections();
      unsubSubjects();
      unsubUsers();
      unsubAssignments();
      unsubSubjectAssignments();
      unsubSchedules();
      unsubSchoolYears();
    };
  }, []);

  const isSystemInitialized = classrooms.length > 0 && sections.length > 0 && subjects.length > 0;

  const addClassroom = async (c: Omit<Classroom, 'id' | 'createdAt'>) => {
    const docRef = await addDoc(collection(db, 'classrooms'), { ...c, createdAt: serverTimestamp() });
    return docRef.id;
  };

  const updateClassroom = async (id: string, updates: Partial<Classroom>) => {
    await updateDoc(doc(db, 'classrooms', id), updates);
  };

  const deleteClassroom = async (id: string) => {
    // Cascade delete sections and assignments
    const sectionsToDelete = sections.filter(s => s.classroomId === id);
    for (const s of sectionsToDelete) {
      await deleteSection(s.id);
    }
    await deleteDoc(doc(db, 'classrooms', id));
  };

  const addSection = async (s: Omit<Section, 'id'>) => {
    const docRef = await addDoc(collection(db, 'sections'), s);
    return docRef.id;
  };

  const updateSection = async (id: string, updates: Partial<Section>) => {
    await updateDoc(doc(db, 'sections', id), updates);
  };

  const deleteSection = async (id: string) => {
    // Cascade delete assignments for this section
    const assignmentsToDelete = assignments.filter(a => a.sectionId === id);
    for (const a of assignmentsToDelete) {
      await deleteAssignment(a.id);
    }
    const subjAssignmentsToDelete = subjectAssignments.filter(a => a.sectionId === id);
    for (const a of subjAssignmentsToDelete) {
      await deleteSubjectAssignment(a.id);
    }
    // Cascade delete schedules for this section
    const schedulesToDelete = schedules.filter(s => s.sectionId === id);
    for (const s of schedulesToDelete) {
      await deleteSchedule(s.id);
    }
    await deleteDoc(doc(db, 'sections', id));
  };

  const addSubject = async (s: Omit<Subject, 'id' | 'createdAt'>) => {
    await addDoc(collection(db, 'subjects'), { ...s, createdAt: serverTimestamp() });
  };

  const updateSubject = async (id: string, updates: Partial<Subject>) => {
    await updateDoc(doc(db, 'subjects', id), updates);
  };

  const deleteSubject = async (id: string) => {
    await deleteDoc(doc(db, 'subjects', id));
  };

  const addUser = async (u: Omit<User, 'id' | 'createdAt'> & { id?: string; createdAt?: unknown }) => {
    const userToSave = { ...u, createdAt: serverTimestamp() } as Record<string, any>;
    Object.keys(userToSave).forEach(key => {
      if (userToSave[key] === undefined) {
        delete userToSave[key];
      }
    });

    if (u.id) {
      await setDoc(doc(db, 'users', u.id), userToSave);
    } else {
      await addDoc(collection(db, 'users'), userToSave);
    }
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    await updateDoc(doc(db, 'users', id), updates);
  };

  const deleteUser = async (id: string) => {
    const assignmentsToDelete = assignments.filter(a => a.teacherId === id);
    for (const a of assignmentsToDelete) {
      await deleteAssignment(a.id);
    }
    const subjAssignmentsToDelete = subjectAssignments.filter(a => a.teacherId === id);
    for (const a of subjAssignmentsToDelete) {
      await deleteSubjectAssignment(a.id);
    }
    await deleteDoc(doc(db, 'users', id));
  };

  const addAssignment = async (a: Omit<Assignment, 'id'>) => {
    await addDoc(collection(db, 'assignments'), a);
  };

  const deleteAssignment = async (id: string) => {
    await deleteDoc(doc(db, 'assignments', id));
  };

  const addSubjectAssignment = async (sa: Omit<SubjectAssignment, 'id'>) => {
    await addDoc(collection(db, 'subjectAssignments'), sa);
  };

  const deleteSubjectAssignment = async (id: string) => {
    await deleteDoc(doc(db, 'subjectAssignments', id));
  };

  const addSchedule = async (s: Omit<Schedule, 'id'>) => {
    const data = { status: 'draft', ...s };
    const safeData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
    await addDoc(collection(db, 'schedules'), safeData);
  };

  const updateSchedule = async (id: string, updates: Partial<Schedule>) => {
    const safeUpdates = Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined));
    await updateDoc(doc(db, 'schedules', id), safeUpdates);
  };

  const deleteSchedule = async (id: string) => {
    await deleteDoc(doc(db, 'schedules', id));
  };

  const batchAddSchedules = async (newSchedules: Omit<Schedule, 'id'>[]) => {
    const schedulesWithStatus = newSchedules.map(s => ({ status: 'draft', ...s }));
    const chunks = [];
    for (let i = 0; i < schedulesWithStatus.length; i += 400) {
      chunks.push(schedulesWithStatus.slice(i, i + 400));
    }
    
    for (const chunk of chunks) {
      const batch = writeBatch(db);
      for (const schedule of chunk) {
        const docRef = doc(collection(db, 'schedules'));
        batch.set(docRef, schedule);
      }
      await batch.commit();
    }
  };

  const clearSchedulesForYear = async (academicYear: string) => {
    const schedulesToDelete = schedules.filter(s => s.academicYear === academicYear);
    const chunks = [];
    for (let i = 0; i < schedulesToDelete.length; i += 400) {
      chunks.push(schedulesToDelete.slice(i, i + 400));
    }

    for (const chunk of chunks) {
      const batch = writeBatch(db);
      for (const schedule of chunk) {
        const docRef = doc(db, 'schedules', schedule.id);
        batch.delete(docRef);
      }
      await batch.commit();
    }
  };

  const isSubAdmin = normalizeRole(currentUserRole) === 'subadmin';
  const assignedGrade = userData?.assignedGrade as string | undefined;

  const normalizedAssignedGrade = assignedGrade?.replace(/Grade /i, '').trim();

  const filteredSections = isSubAdmin && normalizedAssignedGrade ? sections.filter(s => {
    const sGrade = s.gradeLevel?.replace(/Grade /i, '').trim();
    return sGrade === normalizedAssignedGrade;
  }) : sections;

  const filteredClassrooms = isSubAdmin && normalizedAssignedGrade ? classrooms.filter(c => {
    const cGrade = c.gradeLevel?.replace(/Grade /i, '').trim();
    const hasSection = filteredSections.some(s => s.classroomId === c.id);
    return cGrade === normalizedAssignedGrade || hasSection;
  }) : classrooms;

  const filteredSubjects = isSubAdmin && normalizedAssignedGrade ? subjects.filter(s => {
    const sGrade = s.gradeLevel?.replace(/Grade /i, '').trim();
    return sGrade === normalizedAssignedGrade;
  }) : subjects;

  return (
    <AdminContext.Provider value={{
      schoolYear,
      setSchoolYear,
      classrooms: filteredClassrooms,
      addClassroom,
      updateClassroom,
      deleteClassroom,
      sections: filteredSections,
      addSection,
      updateSection,
      deleteSection,
      subjects: filteredSubjects,
      addSubject,
      updateSubject,
      deleteSubject,
      users,
      addUser,
      updateUser,
      deleteUser,
      assignments,
      addAssignment,
      deleteAssignment,
      subjectAssignments,
      addSubjectAssignment,
      deleteSubjectAssignment,
      schedules,
      addSchedule,
      updateSchedule,
      deleteSchedule,
      batchAddSchedules,
      clearSchedulesForYear,
      setupComplete,
      setSetupComplete,
      isSystemInitialized,
      loading
    }}>
      {children}
    </AdminContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAdminData() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdminData must be used within an AdminDataProvider');
  }
  return context;
}