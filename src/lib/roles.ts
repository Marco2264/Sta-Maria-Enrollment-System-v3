/**
 * roles.ts
 *
 * Canonical role definitions for the Sta. Maria School System.
 *
 * Architectural Decision:
 *  - All role comparisons MUST go through this module.
 *  - `normalizeRole()` handles the historical casing inconsistency
 *    ("Teacher" vs "teacher") found in the Firestore `users` collection.
 *  - Do NOT use raw string literals for role comparisons anywhere else in the app.
 */

// ─── Role Type ────────────────────────────────────────────────────────────────

export type AppRole = 'admin' | 'subadmin' | 'teacher' | 'parent';

// ─── Role Constants ───────────────────────────────────────────────────────────

export const ROLES = {
  ADMIN: 'admin' as AppRole,
  SUBADMIN: 'subadmin' as AppRole,
  TEACHER: 'teacher' as AppRole,
  PARENT: 'parent' as AppRole,
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Type guard: checks if a value is a valid AppRole.
 */
export function isValidRole(value: unknown): value is AppRole {
  return value === 'admin' || value === 'subadmin' || value === 'teacher' || value === 'parent';
}

/**
 * Normalizes a role string to lowercase AppRole.
 * Handles legacy casing inconsistencies (e.g. "Teacher" → "teacher").
 *
 * Returns null if the value is not a recognized role.
 */
export function normalizeRole(value: unknown): AppRole | null {
  if (typeof value !== 'string') return null;
  const lower = value.toLowerCase();
  if (isValidRole(lower)) return lower;
  return null;
}

/**
 * Returns true if the given role has admin privileges.
 */
export function isAdmin(role: AppRole | null | undefined): boolean {
  return role === ROLES.ADMIN;
}

/**
 * Returns true if the given role has subadmin privileges.
 */
export function isSubadmin(role: AppRole | null | undefined): boolean {
  return role === ROLES.SUBADMIN;
}

/**
 * Returns true if the given role has teacher privileges.
 */
export function isTeacher(role: AppRole | null | undefined): boolean {
  return role === ROLES.TEACHER;
}

/**
 * Returns true if the given role has parent privileges.
 */
export function isParent(role: AppRole | null | undefined): boolean {
  return role === ROLES.PARENT;
}
