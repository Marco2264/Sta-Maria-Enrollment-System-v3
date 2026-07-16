import { describe, it, expect } from 'vitest';
import { normalizeRole, isAdmin, isTeacher, isParent, ROLES } from './roles';

describe('roles', () => {
  describe('normalizeRole', () => {
    it('returns lowercase for valid mixed case roles', () => {
      expect(normalizeRole('Admin')).toBe('admin');
      expect(normalizeRole('TEACHER')).toBe('teacher');
      expect(normalizeRole('Parent')).toBe('parent');
    });

    it('returns lowercase for valid lowercase roles', () => {
      expect(normalizeRole('admin')).toBe('admin');
      expect(normalizeRole('teacher')).toBe('teacher');
      expect(normalizeRole('parent')).toBe('parent');
    });

    it('returns null for invalid roles', () => {
      expect(normalizeRole('student')).toBeNull();
      expect(normalizeRole('')).toBeNull();
      expect(normalizeRole(null)).toBeNull();
      expect(normalizeRole(undefined)).toBeNull();
      expect(normalizeRole(123)).toBeNull();
    });
  });

  describe('isAdmin', () => {
    it('returns true for admin', () => {
      expect(isAdmin(ROLES.ADMIN)).toBe(true);
    });

    it('returns false for other roles', () => {
      expect(isAdmin(ROLES.TEACHER)).toBe(false);
      expect(isAdmin(ROLES.PARENT)).toBe(false);
      expect(isAdmin(null)).toBe(false);
      expect(isAdmin(undefined)).toBe(false);
    });
  });

  describe('isTeacher', () => {
    it('returns true for teacher', () => {
      expect(isTeacher(ROLES.TEACHER)).toBe(true);
    });

    it('returns false for other roles', () => {
      expect(isTeacher(ROLES.ADMIN)).toBe(false);
      expect(isTeacher(ROLES.PARENT)).toBe(false);
      expect(isTeacher(null)).toBe(false);
      expect(isTeacher(undefined)).toBe(false);
    });
  });

  describe('isParent', () => {
    it('returns true for parent', () => {
      expect(isParent(ROLES.PARENT)).toBe(true);
    });

    it('returns false for other roles', () => {
      expect(isParent(ROLES.ADMIN)).toBe(false);
      expect(isParent(ROLES.TEACHER)).toBe(false);
      expect(isParent(null)).toBe(false);
      expect(isParent(undefined)).toBe(false);
    });
  });
});
