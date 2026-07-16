import { describe, it, expect } from 'vitest';
import { validateEnrollmentCreate, validateEnrollmentStatusUpdate } from './enrollmentValidation';

describe('enrollmentValidation', () => {
  describe('validateEnrollmentCreate', () => {
    it('accepts a valid payload for a lower grade', () => {
      const payload = {
        studentId: 'STUD-123',
        gradeLevel: 'Grade 5',
        schoolYear: '2026-2027',
      };
      const result = validateEnrollmentCreate(payload);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('accepts a valid payload for Senior High with a strand', () => {
      const payload = {
        studentId: 'STUD-123',
        gradeLevel: 'Grade 11',
        schoolYear: '2026-2027',
        strand: 'STEM',
      };
      const result = validateEnrollmentCreate(payload);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects an empty studentId', () => {
      const payload = {
        studentId: '',
        gradeLevel: 'Grade 5',
        schoolYear: '2026-2027',
      };
      const result = validateEnrollmentCreate(payload);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Student ID is required.');
    });

    it('rejects an invalid grade level', () => {
      const payload = {
        studentId: 'STUD-123',
        gradeLevel: 'Grade 13',
        schoolYear: '2026-2027',
      };
      const result = validateEnrollmentCreate(payload);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/Invalid grade level/);
    });

    it('rejects Senior High without a strand', () => {
      const payload = {
        studentId: 'STUD-123',
        gradeLevel: 'Grade 12',
        schoolYear: '2026-2027',
        strand: '',
      };
      const result = validateEnrollmentCreate(payload);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Strand is required for Senior High School students (Grades 11 & 12).');
    });
  });

  describe('validateEnrollmentStatusUpdate', () => {
    it('accepts a valid Enrolled status', () => {
      const result = validateEnrollmentStatusUpdate({ status: 'Enrolled' });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects an invalid status', () => {
      const result = validateEnrollmentStatusUpdate({ status: 'SuperEnrolled' });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/Invalid status/);
    });

    it('rejects Rejected status without remarks', () => {
      const result = validateEnrollmentStatusUpdate({ status: 'Rejected', remarks: '   ' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('A reason (remarks) is required when rejecting an enrollment.');
    });

    it('accepts Rejected status with remarks', () => {
      const result = validateEnrollmentStatusUpdate({ status: 'Rejected', remarks: 'Missing form 137' });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
