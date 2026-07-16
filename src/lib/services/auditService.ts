import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { AppRole } from '../roles';

/**
 * Immutable audit log entry representing a single privileged action.
 */
export interface AuditLogEntry {
  actorId: string;
  actorRole: AppRole;
  action: string;
  targetId: string;
  targetCollection: string;
  timestamp: Timestamp;
  metadata?: Record<string, unknown>;
}

/**
 * Canonical action constants to ensure consistency in audit logs.
 */
export const AUDIT_ACTIONS = {
  ENROLLMENT_APPROVE: 'enrollment.approve',
  ENROLLMENT_REJECT: 'enrollment.reject',
  GRADE_EDIT: 'grade.edit',
  ATTENDANCE_EDIT: 'attendance.edit',
  USER_ROLE_CHANGE: 'user.role_change',
} as const;

/**
 * Writes an immutable audit log entry to the 'auditLogs' collection.
 * This is a fire-and-forget operation; it handles its own errors so it
 * doesn't block the critical path of the caller.
 */
export async function writeAuditLog(
  entry: Omit<AuditLogEntry, 'timestamp'>
): Promise<void> {
  try {
    const auditRef = collection(db, 'auditLogs');
    await addDoc(auditRef, {
      ...entry,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    // We log to console rather than throwing, as failing to audit
    // should ideally not crash the application, but it must be recorded.
    console.error('[auditService] Failed to write audit log:', error, entry);
  }
}
