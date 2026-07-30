/**
 * ImageKit Upload Service
 * Clean, flat top-level folder structure with standardized filenames:
 *   /students/student-profiles/           -> Grade6_SectionA_FrancisMinoza.jpg
 *   /students/psa-certificates/           -> Grade6_SectionA_FrancisMinoza_PSA.pdf
 *   /students/report-cards/               -> Grade6_SectionA_FrancisMinoza_ReportCard.pdf
 *   /students/good-moral-certificates/    -> Grade6_SectionA_FrancisMinoza_GoodMoral.pdf
 *   /students/medical-records/            -> Grade6_SectionA_FrancisMinoza_Medical.pdf
 *   /parents/parent-profiles/             -> Parent_JuanDelaCruz.jpg
 */

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit for images and documents
export const ALLOWED_UPLOAD_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf'
];
export const ALLOWED_UPLOAD_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];

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
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics (ñ -> n)
    .replace(/[^a-zA-Z0-9]/g, '')     // Alphanumeric characters only
    .trim();
}

/**
 * Formats Grade level string cleanly without spaces or special characters.
 * Example: "Grade 6" -> "Grade6", "6" -> "Grade6"
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
 * Example: "Section A" -> "SectionA", "A" -> "SectionA"
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
 * Maps DocumentType string to standardized flat ImageKit folder under /students.
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
 * Builds flat top-level ImageKit folder paths without deep nested folder chains.
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
 * Generates standardized ImageKit filenames containing Grade, Section, Full Name, and Document Suffix.
 * Examples:
 *   Student Profile: Grade6_SectionA_FrancisMinoza.jpg
 *   PSA:             Grade6_SectionA_FrancisMinoza_PSA.pdf
 *   Parent Profile:  Parent_JuanDelaCruz.jpg
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

/**
 * Backward compatibility alias for buildStandardizedFileName
 */
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
      error: `Invalid file format (${extension}). Only JPG, PNG, WEBP, and PDF files are allowed.`
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
    if (!res.ok) {
      throw new Error(`Auth endpoint returned status ${res.status}`);
    }
    const data = await res.json();
    if (data.token && data.signature && data.expire) {
      return data as ImageKitAuthResponse;
    }
    return null;
  } catch (err: any) {
    console.warn('[ImageUploadService] Failed to fetch ImageKit auth parameters from backend:', err?.message || err);
    return null;
  }
}

/**
 * Uploads an image or document file to ImageKit using the REST Upload API.
 */
export async function uploadToImageKit(
  file: File,
  options: UploadOptions = {}
): Promise<string> {
  // 1. Validate file format and size limit
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid file');
  }

  const publicKey = import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY;
  const urlEndpoint = import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT;
  const privateKey = import.meta.env.VITE_IMAGEKIT_PRIVATE_KEY;

  if (!publicKey || publicKey.includes('your_public_key')) {
    throw new Error(
      'ImageKit credentials are missing or invalid. Please check VITE_IMAGEKIT_PUBLIC_KEY in .env.'
    );
  }

  // 2. Prepare FormData
  const cleanFileName =
    options.fileName || `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const folder = options.folder || '/students/student-profiles';

  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileName', cleanFileName);
  formData.append('publicKey', publicKey);
  formData.append('folder', folder);
  const useUnique = options.useUniqueFileName !== undefined ? String(options.useUniqueFileName) : 'false';
  formData.append('useUniqueFileName', useUnique);

  // 3. Attach authentication parameters (token, signature, expire)
  let authParams = await fetchImageKitAuthParams();

  if (!authParams && privateKey) {
    const token = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const expire = Math.floor(Date.now() / 1000) + 2400; // 40 minutes expiry
    const signature = await generateClientSignature(privateKey, token, expire);
    authParams = { token, signature, expire };
  }

  if (authParams) {
    formData.append('token', authParams.token);
    formData.append('signature', authParams.signature);
    formData.append('expire', authParams.expire.toString());
  }

  if (options.onProgress) {
    options.onProgress(30);
  }

  // 4. Perform Upload
  try {
    const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
      method: 'POST',
      body: formData
    });

    if (options.onProgress) {
      options.onProgress(80);
    }

    if (!response.ok) {
      let errText = 'Upload failed';
      try {
        const errorJson = await response.json();
        errText = errorJson.message || errorJson.help || response.statusText;
      } catch {
        errText = await response.text();
      }
      throw new Error(`ImageKit Upload Error (${response.status}): ${errText}`);
    }

    const result = await response.json();

    if (options.onProgress) {
      options.onProgress(100);
    }

    if (!result.url && !result.filePath) {
      throw new Error('ImageKit returned an invalid response payload.');
    }

    const finalUrl =
      result.url || `${urlEndpoint.replace(/\/$/, '')}/${result.filePath.replace(/^\//, '')}`;

    return finalUrl;
  } catch (error: any) {
    console.error('[ImageUploadService] Upload failed:', error);
    throw new Error(
      error?.message || 'Failed to upload file to ImageKit. Please check your network and credentials.'
    );
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
