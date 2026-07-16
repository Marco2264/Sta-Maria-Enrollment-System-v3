export const PHASE2_SCHEMA_VERSION = 2;

export const DOCUMENT_TYPES = {
  PSA_BIRTH_CERTIFICATE: 'PSA_BIRTH_CERTIFICATE'
} as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[keyof typeof DOCUMENT_TYPES];

export const DOCUMENT_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED'
} as const;

export type DocumentStatus = (typeof DOCUMENT_STATUS)[keyof typeof DOCUMENT_STATUS];

export type RequirementUploadMeta = {
  documentId: string;
  documentType: DocumentType;
  fileName: string;
  fileUrl?: string;
  status: DocumentStatus;
  uploadedAt: unknown;
};

export type EnrollmentDocument = {
  id: string;
  schemaVersion: number;
  enrollmentId: string;
  parentId: string;
  studentName: string;
  gradeLevel: string;
  documentType: DocumentType;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
  status: DocumentStatus;
  uploadedAt: unknown;
  updatedAt: unknown;
  verifiedAt?: unknown;
  verifiedBy?: string;
  verifiedByName?: string;
  rejectionReason?: string;
};

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png'
]);

