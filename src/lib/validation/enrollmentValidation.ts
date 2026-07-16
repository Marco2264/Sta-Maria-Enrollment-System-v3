/**
 * enrollmentValidation.ts
 *
 * Native TypeScript validation layer for enrollment mutations.
 * Provides zero-dependency validation schemas to centralize business rules
 * before sending payloads to Firestore.
 */

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface EnrollmentCreatePayload {
  studentId: string;
  gradeLevel: string;
  schoolYear: string;
  strand?: string;
}

export interface EnrollmentStatusUpdatePayload {
  status: string;
  remarks?: string;
}

const VALID_GRADE_LEVELS = [
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
  'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10',
  'Grade 11', 'Grade 12'
];

const VALID_STATUSES = ['Pending', 'Enrolled', 'Rejected', 'Transferred', 'Dropped'];

/**
 * Validates the payload for creating a new enrollment.
 */
export function validateEnrollmentCreate(payload: Partial<EnrollmentCreatePayload>): ValidationResult {
  const errors: string[] = [];

  if (!payload.studentId || payload.studentId.trim() === '') {
    errors.push('Student ID is required.');
  }

  if (!payload.gradeLevel || !VALID_GRADE_LEVELS.includes(payload.gradeLevel)) {
    errors.push(`Invalid grade level. Must be one of: ${VALID_GRADE_LEVELS.join(', ')}.`);
  }

  if (!payload.schoolYear || !/^\d{4}-\d{4}$/.test(payload.schoolYear)) {
    errors.push('School Year is required and must be in YYYY-YYYY format (e.g., 2026-2027).');
  }

  // Strand is required for Grades 11 and 12
  if (['Grade 11', 'Grade 12'].includes(payload.gradeLevel || '') && (!payload.strand || payload.strand.trim() === '')) {
    errors.push('Strand is required for Senior High School students (Grades 11 & 12).');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates the payload for updating an enrollment's status (e.g., Admin approval/rejection).
 */
export function validateEnrollmentStatusUpdate(payload: Partial<EnrollmentStatusUpdatePayload>): ValidationResult {
  const errors: string[] = [];

  if (!payload.status || !VALID_STATUSES.includes(payload.status)) {
    errors.push(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}.`);
  }

  // If rejected, remarks (reason) are strongly recommended, but maybe we enforce it strictly here based on requirements.
  // The Security Analysis mentions "rejection reason", so let's enforce it for 'Rejected'.
  if (payload.status === 'Rejected' && (!payload.remarks || payload.remarks.trim() === '')) {
    errors.push('A reason (remarks) is required when rejecting an enrollment.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
