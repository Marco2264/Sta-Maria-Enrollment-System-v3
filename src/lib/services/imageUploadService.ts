/**
 * ImageKit Upload Service
 * Handles client-side upload validation, HMAC authentication signature generation,
 * ImageKit REST API communication, dynamic folder structuring, and clean error reporting.
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
  onProgress?: (percent: number) => void;
}

export interface ImageKitAuthResponse {
  token: string;
  signature: string;
  expire: number;
}

/**
 * Builds structured ImageKit folder paths based on user role, grade level, section, and document category.
 * Examples:
 *   Parent Profile:  /parents
 *   Student Avatar:   /students/Grade_6/Section_A/profiles
 *   PSA Document:    /students/Grade_6/Section_A/documents/PSA_BIRTH_CERTIFICATE
 */
export function buildImageKitFolder(params: {
  role: 'parent' | 'student';
  gradeLevel?: string;
  section?: string;
  category?: 'profiles' | 'documents';
  documentType?: string;
}): string {
  if (params.role === 'parent') {
    return '/parents';
  }

  const gradeStr = params.gradeLevel && params.gradeLevel.trim()
    ? `Grade_${params.gradeLevel.replace(/[^a-zA-Z0-9]/g, '_')}`
    : 'Unassigned_Grade';

  const sectionStr = params.section && params.section.trim()
    ? `Section_${params.section.replace(/[^a-zA-Z0-9]/g, '_')}`
    : 'General';

  if (params.category === 'documents' || params.documentType) {
    const docTypeStr = params.documentType
      ? params.documentType.replace(/[^a-zA-Z0-9]/g, '_')
      : 'General_Docs';
    return `/students/${gradeStr}/${sectionStr}/documents/${docTypeStr}`;
  }

  return `/students/${gradeStr}/${sectionStr}/profiles`;
}

/**
 * Builds a clean file name incorporating the user's actual name and timestamp.
 * Example: Francis_R_Minoz_PSA_BIRTH_CERTIFICATE_1785382000.pdf
 */
export function buildImageKitFileName(fullName: string, originalFileName: string, prefix?: string): string {
  const cleanName = fullName
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const ext = originalFileName.split('.').pop()?.toLowerCase() || 'jpg';
  const prefixStr = prefix ? `${prefix.replace(/[^a-zA-Z0-9]/g, '_')}_` : '';
  return `${prefixStr}${cleanName || 'User'}_${Date.now()}.${ext}`;
}

/**
 * Validates file type and file size for image & document uploads.
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
 * ImageKit signature format: HMAC-SHA-1(token + expire, privateKey)
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
  const folder = options.folder || '/uploads';

  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileName', cleanFileName);
  formData.append('publicKey', publicKey);
  formData.append('folder', folder);
  formData.append('useUniqueFileName', 'true');

  // 3. Attach authentication parameters (token, signature, expire)
  let authParams = await fetchImageKitAuthParams();

  // If no backend endpoint is set, generate HMAC-SHA1 signature directly using privateKey
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
