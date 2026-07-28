/* eslint-disable react-refresh/only-export-components */
import React, { useState, createContext, useContext, ReactNode, useEffect } from 'react';
import { db } from './firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  addDoc, 
  updateDoc, 
  setDoc,
  deleteDoc,
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { useAuth } from './AuthContext';
import {
  DOCUMENT_STATUS,
  PHASE2_SCHEMA_VERSION,
  DocumentType,
  EnrollmentDocument,
  RequirementUploadMeta
} from './schema/phase2';
import {
  mergeAttendanceWithCompatibility
} from './services/attendanceCompatibilityService';
import {
  subscribeParentEnrollmentDocuments,
  addEnrollmentDocumentRecord,
  documentTypeToRequirementKey,
  uploadToCloudinary,
  validateRequirementUpload
} from './services/enrollmentDocumentsService';

export type AttendanceRecord = {
  date: string;
  status?: 'Present' | 'Absent' | 'Late' | 'Unmarked';
  amStatus?: 'Present' | 'Absent' | 'Late' | 'Unmarked';
  pmStatus?: 'Present' | 'Absent' | 'Late' | 'Unmarked';
};
export type Child = {
  id: string;
  parentId: string;
  firstName: string;
  lastName: string;
  middleName: string;
  birthDate: string;
  gender: string;
  lrn: string;
  gradeLevel: string;
  isReturning?: boolean;
  fatherName?: string;
  motherName?: string;
  classroomId?: string;
  sectionId?: string;
  address: {
    street: string;
    barangay: string;
    city: string;
    province: string;
    zipCode: string;
  };
  medical: {
    height: string;
    weight: string;
    bloodType: string;
    allergies: string;
    hasDiagnosis: boolean;
    diagnoses: string[];
    hasManifestations: boolean;
    manifestations: string[];
    hasPwdId: boolean;
    pwdId: string;
    emergencyContact: string;
    emergencyPhone: string;
  };
  additional: {
    motherTongue: string;
    religion: string;
    isIndigenous: boolean;
    indigenousGroup: string;
    is4ps: boolean;
    learningMode: 'Modular Print' | 'Digital' | 'Blended';
  };
  status: 'Pending' | 'Enrolled' | 'Rejected';
  requirements: 'Complete' | 'Incomplete' | string;
  requirementUploads?: {
    psaBirthCertificate?: RequirementUploadMeta;
    [key: string]: RequirementUploadMeta | undefined;
  };
  schemaVersion?: number;
  submittedAt: unknown;
  attendance: AttendanceRecord[];
};
type ParentContextType = {
  children: Child[];
  documents: EnrollmentDocument[];
  addChild: (
  child: Omit<
    Child,
    'id' | 'status' | 'requirements' | 'submittedAt' | 'attendance' | 'parentId'>,
    preGeneratedId?: string
  ) => Promise<string>;
  generateEnrollmentId: () => string;
  updateChild: (id: string, updates: Partial<Child>) => Promise<void>;
  uploadRequirementDocument: (params: {
    enrollmentId: string;
    documentType: DocumentType;
    file: File;
    studentName?: string;
    gradeLevel?: string;
  }) => Promise<void>;
  submitFullEnrollment: (
    childData: Omit<Child, 'id' | 'status' | 'requirements' | 'submittedAt' | 'attendance' | 'parentId'>,
    documentParams?: {
      documentType: DocumentType;
      file: File;
    }
  ) => Promise<string>;
  deleteChild: (id: string) => Promise<void>;
  loading: boolean;
  documentsLoading: boolean;
};

const ParentContext = createContext<ParentContextType | undefined>(undefined);

export function ParentDataProvider({ children: reactChildren }: {children: ReactNode;}) {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [documents, setDocuments] = useState<EnrollmentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [documentsLoading, setDocumentsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setChildren([]);
      setDocuments([]);
      setLoading(false);
      setDocumentsLoading(false);
      return;
    }

    let currentChildren: Child[] = [];
    const attendanceByStudent: Record<string, AttendanceRecord[]> = {};
    const attendanceUnsubs: Array<() => void> = [];

    const rebuildChildren = () => {
      const merged = currentChildren.map((child) => ({
        ...child,
        attendance: mergeAttendanceWithCompatibility({
          studentId: child.id,
          canonicalEntries: Object.entries(attendanceByStudent).flatMap(([studentId, entries]) =>
            entries.map((entry) => ({ studentId, ...entry }))
          ),
          legacyEntries: child.attendance
        })
      }));
      setChildren(merged);
    };

    const q = query(collection(db, 'enrollments'), where('parentId', '==', user.uid));
    const unsubscribeEnrollments = onSnapshot(q, (snapshot) => {
      currentChildren = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Child));
      rebuildChildren();

      while (attendanceUnsubs.length > 0) {
        const unsub = attendanceUnsubs.pop();
        if (unsub) unsub();
      }

      currentChildren.forEach((child) => {
        const attendanceQuery = query(collection(db, 'attendance'), where('studentId', '==', child.id));
        const attendanceUnsub = onSnapshot(attendanceQuery, (attendanceSnapshot) => {
          attendanceByStudent[child.id] = attendanceSnapshot.docs.map((d) => {
            const row = d.data() as any;
            return { 
              date: row.date, 
              status: row.status,
              amStatus: row.amStatus,
              pmStatus: row.pmStatus
            };
          });
          rebuildChildren();
        });
        attendanceUnsubs.push(attendanceUnsub);
      });

      setLoading(false);
    });

    const unsubscribeDocuments = subscribeParentEnrollmentDocuments(user.uid, (rows) => {
      setDocuments(rows);
      setDocumentsLoading(false);
    });

    return () => {
      unsubscribeEnrollments();
      unsubscribeDocuments();
      while (attendanceUnsubs.length > 0) {
        const unsub = attendanceUnsubs.pop();
        if (unsub) unsub();
      }
    };
  }, [user]);

  const generateEnrollmentId = () => {
    return doc(collection(db, 'enrollments')).id;
  };

  const addChild = async (
    childData: Omit<Child, 'id' | 'status' | 'requirements' | 'submittedAt' | 'attendance' | 'parentId'>,
    preGeneratedId?: string
  ): Promise<string> => {
    if (!user) throw new Error("Not authenticated");
    
    const data = {
      ...childData,
      parentId: user.uid,
      status: 'Pending',
      requirements: 'Pending Verification',
      requirementUploads: {},
      schemaVersion: PHASE2_SCHEMA_VERSION,
      submittedAt: serverTimestamp(),
      attendance: []
    };

    if (preGeneratedId) {
      await setDoc(doc(db, 'enrollments', preGeneratedId), data, { merge: true });
      return preGeneratedId;
    } else {
      const docRef = await addDoc(collection(db, 'enrollments'), data);
      return docRef.id;
    }
  };

  const updateChild = async (id: string, updates: Partial<Child>) => {
    await updateDoc(doc(db, 'enrollments', id), updates);
  };

  const deleteChild = async (id: string) => {
    await deleteDoc(doc(db, 'enrollments', id));
  };

  const submitFullEnrollment = async (
    childData: Omit<Child, 'id' | 'status' | 'requirements' | 'submittedAt' | 'attendance' | 'parentId'>,
    documentParams?: {
      documentType: DocumentType;
      file: File;
    }
  ): Promise<string> => {
    if (!user) throw new Error('Not authenticated');

    let fileUrl = '';
    let documentId = '';
    let requirementKey = '';

    const enrollmentId = generateEnrollmentId();
    const studentName = `${childData.firstName} ${childData.lastName}`;

    if (documentParams) {
      const validationError = validateRequirementUpload(documentParams.file);
      if (validationError) throw new Error(validationError);

      // 1. Upload to Cloudinary FIRST
      fileUrl = await uploadToCloudinary(documentParams.file);

      // 2. Add the Document Record to Firestore
      documentId = await addEnrollmentDocumentRecord({
        enrollmentId,
        parentId: user.uid,
        studentName,
        gradeLevel: childData.gradeLevel,
        documentType: documentParams.documentType,
        fileName: documentParams.file.name,
        fileUrl,
        mimeType: documentParams.file.type,
        sizeBytes: documentParams.file.size
      });

      requirementKey = documentTypeToRequirementKey(documentParams.documentType);
    }

    // 3. Save the full Child record with the proper nested requirementUploads object
    const data = {
      ...childData,
      parentId: user.uid,
      status: 'Pending',
      requirements: documentParams ? 'Pending Verification' : 'Incomplete',
      requirementUploads: documentParams ? {
        [requirementKey]: {
          documentId,
          documentType: documentParams.documentType,
          fileName: documentParams.file.name,
          fileUrl,
          status: DOCUMENT_STATUS.PENDING,
          uploadedAt: serverTimestamp()
        }
      } : {},
      schemaVersion: PHASE2_SCHEMA_VERSION,
      submittedAt: serverTimestamp(),
      attendance: []
    };

    // Use setDoc without merge since this is a brand new document!
    await setDoc(doc(db, 'enrollments', enrollmentId), data);

    return enrollmentId;
  };

  const uploadRequirementDocument = async (params: {
    enrollmentId: string;
    documentType: DocumentType;
    file: File;
    studentName?: string;
    gradeLevel?: string;
  }) => {
    if (!user) return;

    let sName = params.studentName;
    let gLevel = params.gradeLevel;

    if (!sName || !gLevel) {
      const child = children.find((c) => c.id === params.enrollmentId);
      if (!child) throw new Error('Student enrollment not found.');
      sName = `${child.firstName} ${child.lastName}`;
      gLevel = child.gradeLevel;
    }

    const validationError = validateRequirementUpload(params.file);
    if (validationError) throw new Error(validationError);

    const fileUrl = await uploadToCloudinary(params.file);
    const requirementKey = documentTypeToRequirementKey(params.documentType);

    const documentId = await addEnrollmentDocumentRecord({
      enrollmentId: params.enrollmentId,
      parentId: user.uid,
      studentName: sName,
      gradeLevel: gLevel,
      documentType: params.documentType,
      fileName: params.file.name,
      fileUrl,
      mimeType: params.file.type,
      sizeBytes: params.file.size
    });

    await setDoc(doc(db, 'enrollments', params.enrollmentId), {
      schemaVersion: PHASE2_SCHEMA_VERSION,
      parentId: user.uid,
      [`requirementUploads.${requirementKey}`]: {
        documentId,
        documentType: params.documentType,
        fileName: params.file.name,
        status: DOCUMENT_STATUS.PENDING,
        uploadedAt: serverTimestamp()
      }
    }, { merge: true });
  };

  return (
    <ParentContext.Provider
      value={{
        children,
        documents,
        addChild,
        generateEnrollmentId,
        updateChild,
        deleteChild,
        uploadRequirementDocument,
        submitFullEnrollment,
        loading,
        documentsLoading
      }}>
      {reactChildren}
    </ParentContext.Provider>);
}

export function useParentData() {
  const context = useContext(ParentContext);
  if (context === undefined) {
    throw new Error('useParentData must be used within a ParentDataProvider');
  }
  return context;
}
