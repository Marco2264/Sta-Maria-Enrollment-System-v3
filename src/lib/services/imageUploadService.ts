/**
 * Multi-Provider Image & Document Upload Service
 * Supported Storage Providers:
 *   1. ImageKit (if VITE_IMAGEKIT_PUBLIC_KEY is configured)
 *   2. Firebase Storage (using initialized Firebase app storage bucket)
 *   3. Base64 Data URL (fail-safe offline fallback)
 */

import { storage } from '../firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit for images and documents
export const ALLOWED_UPLOAD_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];
export const ALLOWED_UPLOAD_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf', '.doc', '.docx'];

export interface UploadValidationResult {
  valid: boolean;
  error?: string;
}

export interface UploadOptions {
  folder?: string;
  fileName?: string;
  useUniqueFileName?: boolean;
  onProgress?: (percent: number) => void;
}

export interface ImageKitAuthResponse {
  token: string;
  signature: string;
  expire: number;
}

/**
 * Sanitizes names by removing diacritics/accents and non-alphanumeric characters.
 * Example: "Francis R. Miñoz" -> "FrancisMinoza"
 */
export function sanitizeNameString(str: string): string {
  if (!str) return 'User';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-zA-Z0-9]/g, '')     // Alphanumeric characters only
    .trim();
}

/**
 * Formats Grade level string cleanly without spaces or special characters.
 */
export function sanitizeGradeString(grade?: string): string {
  if (!grade || !grade.trim()) return 'GradeUnassigned';
  const digits = grade.replace(/[^0-9]/g, '');
  if (digits) return `Grade${digits}`;
  const clean = grade.replace(/[^a-zA-Z0-9]/g, '');
  return clean.toLowerCase().startsWith('grade') ? clean : `Grade${clean}`;
}

/**
 * Formats Section string cleanly without spaces or special characters.
 */
export function sanitizeSectionString(section?: string): string {
  if (!section || !section.trim()) return 'SectionGeneral';
  const clean = section.replace(/[^a-zA-Z0-9]/g, '');
  return clean.toLowerCase().startsWith('section') ? clean : `Section${clean}`;
}

/**
 * Maps DocumentType string to standardized filename suffix.
 */
export function getDocumentFilenameSuffix(docType?: string): string {
  if (!docType) return '';
  const typeUpper = docType.toUpperCase();
  if (typeUpper.includes('PSA') || typeUpper.includes('BIRTH')) {
    return 'PSA';
  }
  if (typeUpper.includes('REPORT') || typeUpper.includes('CARD') || typeUpper.includes('SF9')) {
    return 'ReportCard';
  }
  if (typeUpper.includes('MORAL')) {
    return 'GoodMoral';
  }
  if (typeUpper.includes('MEDICAL')) {
    return 'Medical';
  }
  return 'Doc';
}

/**
 * Maps DocumentType string to standardized flat folder under /students.
 */
export function getDocumentImageKitFolder(docType?: string): string {
  if (!docType) return '/students/student-profiles';
  const typeUpper = docType.toUpperCase();
  if (typeUpper.includes('PSA') || typeUpper.includes('BIRTH')) {
    return '/students/psa-certificates';
  }
  if (typeUpper.includes('REPORT') || typeUpper.includes('CARD') || typeUpper.includes('SF9')) {
    return '/students/report-cards';
  }
  if (typeUpper.includes('MORAL')) {
    return '/students/good-moral-certificates';
  }
  if (typeUpper.includes('MEDICAL')) {
    return '/students/medical-records';
  }
  return '/students/student-profiles';
}

/**
 * Builds flat top-level folder paths.
 */
export function buildImageKitFolder(params: {
  role: 'parent' | 'student';
  category?: 'profiles' | 'documents';
  documentType?: string;
}): string {
  if (params.role === 'parent') {
    return '/parents/parent-profiles';
  }

  if (params.category === 'documents' || params.documentType) {
    return getDocumentImageKitFolder(params.documentType);
  }

  return '/students/student-profiles';
}

/**
 * Generates standardized filenames containing Grade, Section, Full Name, and Document Suffix.
 */
export function buildStandardizedFileName(params: {
  role: 'parent' | 'student';
  fullName: string;
  originalFileName: string;
  gradeLevel?: string;
  section?: string;
  documentType?: string;
}): string {
  const ext = params.originalFileName.split('.').pop()?.toLowerCase() || 'jpg';
  const cleanName = sanitizeNameString(params.fullName);

  if (params.role === 'parent') {
    return `Parent_${cleanName}.${ext}`;
  }

  const cleanGrade = sanitizeGradeString(params.gradeLevel);
  const cleanSection = sanitizeSectionString(params.section);
  const docSuffix = params.documentType ? getDocumentFilenameSuffix(params.documentType) : '';
  const suffixStr = docSuffix ? `_${docSuffix}` : '';

  return `${cleanGrade}_${cleanSection}_${cleanName}${suffixStr}.${ext}`;
}

export function buildImageKitFileName(fullName: string, originalFileName: string, suffix?: string): string {
  return buildStandardizedFileName({
    role: 'student',
    fullName,
    originalFileName,
    documentType: suffix
  });
}

/**
 * Validates file format and file size for image & document uploads.
 */
export function validateImageFile(file: File): UploadValidationResult {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  const isAllowedType =
    ALLOWED_UPLOAD_TYPES.includes(file.type.toLowerCase()) ||
    ALLOWED_UPLOAD_EXTENSIONS.includes(extension);

  if (!isAllowedType) {
    return {
      valid: false,
      error: `Invalid file format (${extension}). Allowed formats: JPG, PNG, WEBP, GIF, PDF, DOC, DOCX.`
    };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File size (${sizeMb} MB) exceeds the maximum allowed limit of 10 MB.`
    };
  }

  return { valid: true };
}

/**
 * Converts a file to an optimized Base64 data URL.
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a file using Firebase Storage with progress tracking.
 */
async function uploadToFirebaseStorage(
  file: File,
  folder: string,
  fileName: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
  const storagePath = `${cleanFolder}/${fileName}`;
  const storageRef = ref(storage, storagePath);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        if (onProgress) onProgress(progress);
      },
      (error) => {
        console.warn('[UploadService] Firebase Storage upload error:', error);
        reject(error);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadUrl);
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

/**
 * Generates an HMAC-SHA1 signature using the browser Web Crypto API.
 */
async function generateClientSignature(
  privateKey: string,
  token: string,
  expire: number
): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(privateKey);
  const messageData = encoder.encode(token + expire);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Fetches authentication parameters (token, signature, expire) from backend endpoint if configured.
 */
async function fetchImageKitAuthParams(): Promise<ImageKitAuthResponse | null> {
  const authEndpoint = import.meta.env.VITE_IMAGEKIT_AUTH_ENDPOINT;
  if (!authEndpoint || authEndpoint.includes('your_') || authEndpoint.trim() === '') {
    return null;
  }

  try {
    const res = await fetch(authEndpoint);
    if (!res.ok) throw new Error(`Auth endpoint returned status ${res.status}`);
    const data = await res.json();
    if (data.token && data.signature && data.expire) {
      return data as ImageKitAuthResponse;
    }
    return null;
  } catch (err: any) {
    return null;
  }
}

/**
 * Universal multi-provider upload handler.
 * Automatically tries:
 *   1. ImageKit (if keys are provided in .env)
 *   2. Firebase Storage (native project storage)
 *   3. Base64 Data URL fallback
 */
export async function uploadToImageKit(
  file: File,
  options: UploadOptions = {}
): Promise<string> {
  // 1. Validate file
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid file');
  }

  const cleanFileName =
    options.fileName || `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const folder = options.folder || '/students/student-profiles';

  // Strategy 1: Check if ImageKit keys are configured
  const publicKey = import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY;
  const urlEndpoint = import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT;
  const privateKey = import.meta.env.VITE_IMAGEKIT_PRIVATE_KEY;

  const hasImageKitConfig = publicKey && !publicKey.includes('your_') && publicKey.trim() !== '';

  if (hasImageKitConfig) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', cleanFileName);
      formData.append('publicKey', publicKey);
      formData.append('folder', folder);
      const useUnique = options.useUniqueFileName !== undefined ? String(options.useUniqueFileName) : 'false';
      formData.append('useUniqueFileName', useUnique);

      let authParams = await fetchImageKitAuthParams();
      if (!authParams && privateKey) {
        const token = typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const expire = Math.floor(Date.now() / 1000) + 2400;
        const signature = await generateClientSignature(privateKey, token, expire);
        authParams = { token, signature, expire };
      }

      if (authParams) {
        formData.append('token', authParams.token);
        formData.append('signature', authParams.signature);
        formData.append('expire', authParams.expire.toString());
      }

      if (options.onProgress) options.onProgress(30);

      const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        if (options.onProgress) options.onProgress(100);
        if (result.url || result.filePath) {
          return result.url || `${(urlEndpoint || '').replace(/\/$/, '')}/${result.filePath.replace(/^\//, '')}`;
        }
      }
    } catch (imageKitErr) {
      console.warn('[UploadService] ImageKit upload failed, falling back to Firebase Storage:', imageKitErr);
    }
  }

  // Strategy 2: Firebase Storage
  try {
    if (options.onProgress) options.onProgress(40);
    const firebaseUrl = await uploadToFirebaseStorage(
      file,
      folder,
      cleanFileName,
      options.onProgress
    );
    if (firebaseUrl) {
      if (options.onProgress) options.onProgress(100);
      return firebaseUrl;
    }
  } catch (firebaseErr) {
    console.warn('[UploadService] Firebase Storage upload failed, falling back to Base64 Data URL:', firebaseErr);
  }

  // Strategy 3: Base64 Data URL Fail-safe
  try {
    if (options.onProgress) options.onProgress(80);
    const base64Url = await fileToBase64(file);
    if (options.onProgress) options.onProgress(100);
    return base64Url;
  } catch (fallbackErr) {
    console.error('[UploadService] All upload methods failed:', fallbackErr);
    throw new Error('Failed to upload file. Please check your internet connection.');
  }
}

/**
 * Returns initials from a full name for avatar fallbacks.
 */
export function getAvatarInitials(name?: string, fallback: string = 'U'): string {
  if (!name || !name.trim()) return fallback;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
