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
  getDocs,
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
  validateRequirementUpload,
  deleteRequirementDocument as deleteRequirementDocumentService
} from './services/enrollmentDocumentsService';
import {
  uploadToImageKit,
  buildImageKitFolder,
  buildStandardizedFileName
} from './services/imageUploadService';
import { logActivity } from './services/activityLogService';

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
  photoURL?: string;
  status: 'Pending' | 'Enrolled' | 'Approved' | 'Rejected';
  requirements: 'Complete' | 'Incomplete' | string;
  section?: string;
  adviser?: string;
  studentId?: string;
  grades?: Record<string, number>;
  requirementUploads?: {
    psaBirthCertificate?: RequirementUploadMeta;
    [key: string]: RequirementUploadMeta | undefined;
  };
  schemaVersion?: number;
  submittedAt?: unknown;
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
  deleteRequirementDocument: (params: {
    enrollmentId: string;
    documentType: DocumentType;
    docRecordId?: string;
  }) => Promise<void>;
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

    // Safety fallback: Ensure loading spinner resolves within 1.5s
    const safetyTimer = setTimeout(() => {
      setLoading(false);
      setDocumentsLoading(false);
    }, 1500);

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

    console.log("Collection:", "enrollments");
    console.log("Doc ID:", "N/A");
    console.log("Query params:", { parentId: user.uid });
    const q = query(collection(db, 'enrollments'), where('parentId', '==', user.uid));
    const unsubscribeEnrollments = onSnapshot(
      q,
      async (snapshot) => {
        currentChildren = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Child));
        rebuildChildren();

        // Safely fetch attendance records for current children without creating nested onSnapshot streams
        for (const child of currentChildren) {
          try {
            console.log("Collection:", "attendance");
            console.log("Doc ID:", "N/A");
            console.log("Query params:", { studentId: child.id });
            const attQ = query(collection(db, 'attendance'), where('studentId', '==', child.id));
            const attSnap = await getDocs(attQ);
            attendanceByStudent[child.id] = attSnap.docs.map((d: any) => {
              const row = d.data() as any;
              let derivedStatus = row.status;
              if (!derivedStatus) {
                if (row.amStatus === 'Absent' || row.pmStatus === 'Absent') {
                  derivedStatus = 'Absent';
                } else if (row.amStatus === 'Late' || row.pmStatus === 'Late') {
                  derivedStatus = 'Late';
                } else if (row.amStatus === 'Present' || row.pmStatus === 'Present') {
                  derivedStatus = 'Present';
                } else {
                  derivedStatus = 'Present';
                }
              }
              return { 
                date: row.date, 
                status: derivedStatus,
                amStatus: row.amStatus,
                pmStatus: row.pmStatus
              };
            });
          } catch (attErr) {
            console.warn('[parentData] Error reading student attendance:', attErr);
          }
        }
        rebuildChildren();

        clearTimeout(safetyTimer);
        setLoading(false);
      },
      (error) => {
        console.warn("[parentData] Error subscribing to parent enrollments:", error);
        clearTimeout(safetyTimer);
        setLoading(false);
      }
    );

    const unsubscribeDocuments = subscribeParentEnrollmentDocuments(user.uid, (rows) => {
      setDocuments(rows);
      setDocumentsLoading(false);
    });

    return () => {
      clearTimeout(safetyTimer);
      setTimeout(() => {
        unsubscribeEnrollments();
        unsubscribeDocuments();
      }, 100);
      while (attendanceUnsubs.length > 0) {
        const unsub = attendanceUnsubs.pop();
        if (unsub) {
          setTimeout(() => unsub(), 100);
        }
      }
    };
  }, [user?.uid]);

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
    setChildren(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
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

    const child = children.find((c) => c.id === params.enrollmentId);
    const sName = params.studentName || (child ? `${child.firstName} ${child.lastName}` : 'Student');
    const gLevel = params.gradeLevel || child?.gradeLevel || 'Level';
    const section = child?.section || 'General';

    const validationError = validateRequirementUpload(params.file);
    if (validationError) throw new Error(validationError);

    // Build clean flat ImageKit folder path (/students/psa-certificates, /students/report-cards, etc.)
    const folder = buildImageKitFolder({
      role: 'student',
      category: 'documents',
      documentType: params.documentType
    });

    // Standardized filename: Grade6_SectionA_FrancisMinoza_PSA.pdf
    const fileName = buildStandardizedFileName({
      role: 'student',
      fullName: sName,
      originalFileName: params.file.name,
      gradeLevel: gLevel,
      section,
      documentType: params.documentType
    });

    // Upload to ImageKit with automatic replacement (useUniqueFileName: false)
    const fileUrl = await uploadToImageKit(params.file, {
      folder,
      fileName,
      useUniqueFileName: false
    });

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
        fileUrl,
        status: DOCUMENT_STATUS.PENDING,
        uploadedAt: serverTimestamp()
      }
    }, { merge: true });

    try {
      await logActivity({
        parentId: user.uid,
        title: 'Document Uploaded',
        subtitle: `Uploaded ${params.file.name} for ${sName}.`,
        type: 'document',
        badgeText: 'UPLOADED',
        badgeColor: 'bg-blue-50 text-[#2563eb] border-blue-200',
        dotColor: 'bg-[#2563eb]'
      });
    } catch (err) {
      console.warn('Could not log document upload activity:', err);
    }
  };

  const deleteRequirementDocument = async (params: {
    enrollmentId: string;
    documentType: DocumentType;
    docRecordId?: string;
  }) => {
    if (!user) return;

    const reqKey = documentTypeToRequirementKey(params.documentType);

    // 1. Execute Firestore database deletion
    await deleteRequirementDocumentService(params);

    // 2. Instantly purge from React context documents state
    setDocuments((prevDocs) =>
      prevDocs.filter(
        (d) =>
          d.id !== params.docRecordId &&
          !(d.enrollmentId === params.enrollmentId && (
            d.documentType === params.documentType ||
            d.documentType === reqKey ||
            d.documentType?.toLowerCase() === params.documentType.toLowerCase() ||
            d.documentType?.toLowerCase() === reqKey.toLowerCase()
          ))
      )
    );

    // 3. Purge ONLY the specific requirementUploads key from React context children state
    setChildren((prevChildren) =>
      prevChildren.map((child) => {
        if (child.id === params.enrollmentId) {
          const reqs = { ...(child.requirementUploads || {}) };
          delete reqs[reqKey];
          delete reqs[params.documentType];
          return {
            ...child,
            requirementUploads: reqs
          };
        }
        return child;
      })
    );

    try {
      await logActivity({
        parentId: user.uid,
        title: 'Document Deleted',
        subtitle: `Deleted requirement document from student records.`,
        type: 'delete',
        badgeText: 'DELETED',
        badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
        dotColor: 'bg-rose-500'
      });
    } catch (err) {
      console.warn('Could not log document deletion activity:', err);
    }
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
        deleteRequirementDocument,
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
