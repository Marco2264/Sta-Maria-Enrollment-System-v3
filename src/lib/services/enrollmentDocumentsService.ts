import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  DOCUMENT_STATUS,
  DOCUMENT_TYPES,
  DocumentStatus,
  DocumentType,
  EnrollmentDocument,
  MAX_UPLOAD_BYTES,
  PHASE2_SCHEMA_VERSION
} from '../schema/phase2';

const ENROLLMENT_DOCUMENTS_COLLECTION = 'enrollment_documents';

export function validateRequirementUpload(file: File): string | null {
  if (!ALLOWED_UPLOAD_MIME_TYPES.has(file.type)) {
    return 'Only PDF, JPG, and PNG files are allowed.';
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return 'File exceeds the 10MB upload limit.';
  }
  return null;
}

export function documentTypeToRequirementKey(type: DocumentType): string {
  if (type === DOCUMENT_TYPES.PSA_BIRTH_CERTIFICATE) return 'psaBirthCertificate';
  if (type === DOCUMENT_TYPES.REPORT_CARD) return 'reportCard';
  if (type === DOCUMENT_TYPES.GOOD_MORAL) return 'goodMoral';
  return 'other';
}

export async function uploadToCloudinary(file: File): Promise<string> {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary configuration is missing in environment variables.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error('Failed to upload document to Cloudinary');
  }

  const data = await response.json();
  return data.secure_url;
}

export async function addEnrollmentDocumentRecord(params: {
  enrollmentId: string;
  parentId: string;
  studentName: string;
  gradeLevel: string;
  documentType: DocumentType;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
}) {
  const { enrollmentId, parentId, studentName, gradeLevel, documentType, fileName, fileUrl, mimeType, sizeBytes } = params;

  const documentRef = await addDoc(collection(db, ENROLLMENT_DOCUMENTS_COLLECTION), {
    schemaVersion: PHASE2_SCHEMA_VERSION,
    enrollmentId,
    parentId,
    studentName,
    gradeLevel,
    documentType,
    fileName,
    fileUrl,
    mimeType,
    sizeBytes,
    status: DOCUMENT_STATUS.PENDING,
    uploadedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return documentRef.id;
}

export function subscribeParentEnrollmentDocuments(
  parentId: string,
  onData: (docs: EnrollmentDocument[]) => void,
  onError?: (error: Error) => void
) {
  // Use simple where() without orderBy to avoid needing a composite Firestore index.
  // We sort client-side instead.
  const q = query(
    collection(db, ENROLLMENT_DOCUMENTS_COLLECTION),
    where('parentId', '==', parentId)
  );
  return onSnapshot(
    q,
    (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as EnrollmentDocument));
      // Sort by uploadedAt descending on the client side
      docs.sort((a, b) => {
        const aTime = (a.uploadedAt as { seconds?: number })?.seconds ?? 0;
        const bTime = (b.uploadedAt as { seconds?: number })?.seconds ?? 0;
        return bTime - aTime;
      });
      onData(docs);
    },
    (error) => {
      console.error('[enrollmentDocumentsService] subscribeParentEnrollmentDocuments error:', error);
      onError?.(error);
      // Still call onData with empty array so loading state clears
      onData([]);
    }
  );
}

export function subscribeAllEnrollmentDocuments(
  onData: (docs: EnrollmentDocument[]) => void
) {
  const q = query(
    collection(db, ENROLLMENT_DOCUMENTS_COLLECTION),
    orderBy('uploadedAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as EnrollmentDocument)));
  });
}

export function subscribeEnrollmentDocumentsByGradeLevel(
  gradeLevel: string,
  onData: (docs: EnrollmentDocument[]) => void,
  onError?: (error: Error) => void
) {
  const q = query(
    collection(db, ENROLLMENT_DOCUMENTS_COLLECTION),
    where('gradeLevel', '==', gradeLevel)
  );
  return onSnapshot(
    q,
    (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as EnrollmentDocument));
      docs.sort((a, b) => {
        const aTime = (a.uploadedAt as { seconds?: number })?.seconds ?? 0;
        const bTime = (b.uploadedAt as { seconds?: number })?.seconds ?? 0;
        return bTime - aTime;
      });
      onData(docs);
    },
    (error) => {
      console.error('[enrollmentDocumentsService] subscribeEnrollmentDocumentsByGradeLevel error:', error);
      onError?.(error);
      onData([]);
    }
  );
}

export async function reviewEnrollmentDocument(params: {
  documentId: string;
  enrollmentId: string;
  documentType: DocumentType;
  status: Extract<DocumentStatus, 'APPROVED' | 'REJECTED'>;
  reviewerId: string;
  reviewerName: string;
  rejectionReason?: string;
}) {
  const {
    documentId,
    enrollmentId,
    documentType,
    status,
    reviewerId,
    reviewerName,
    rejectionReason
  } = params;
  const requirementKey = documentTypeToRequirementKey(documentType);

  await updateDoc(doc(db, ENROLLMENT_DOCUMENTS_COLLECTION, documentId), {
    status,
    verifiedBy: reviewerId,
    verifiedByName: reviewerName,
    verifiedAt: serverTimestamp(),
    rejectionReason: status === DOCUMENT_STATUS.REJECTED ? rejectionReason || '' : '',
    updatedAt: serverTimestamp()
  });

  await updateDoc(doc(db, 'enrollments', enrollmentId), {
    [`requirementUploads.${requirementKey}.status`]: status,
    [`requirementUploads.${requirementKey}.verifiedAt`]: serverTimestamp(),
    [`requirementUploads.${requirementKey}.verifiedBy`]: reviewerId,
    requirements: status === DOCUMENT_STATUS.APPROVED ? 'Complete' : 'Incomplete'
  });
}

 
