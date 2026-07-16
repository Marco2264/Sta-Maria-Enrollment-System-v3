import { DOCUMENT_TYPES, PHASE2_SCHEMA_VERSION } from '../schema/phase2';

type EnrollmentLike = {
  id: string;
  schemaVersion?: number;
  requirementUploads?: Record<string, unknown>;
  attendance?: Array<{ date: string; status: 'Present' | 'Absent' | 'Late' }>;
};

export function buildPhase2EnrollmentPatch(enrollment: EnrollmentLike) {
  const patch: Record<string, unknown> = {};

  if (!enrollment.schemaVersion || enrollment.schemaVersion < PHASE2_SCHEMA_VERSION) {
    patch.schemaVersion = PHASE2_SCHEMA_VERSION;
  }

  if (!enrollment.requirementUploads || typeof enrollment.requirementUploads !== 'object') {
    patch.requirementUploads = {};
  }

  if (!enrollment.attendance) {
    patch.attendance = [];
  }

  return patch;
}

export type MigrationPlanItem = {
  enrollmentId: string;
  patch: Record<string, unknown>;
};

export function buildPhase2EnrollmentMigrationPlan(enrollments: EnrollmentLike[]): MigrationPlanItem[] {
  return enrollments
    .map((enrollment) => ({
      enrollmentId: enrollment.id,
      patch: buildPhase2EnrollmentPatch(enrollment)
    }))
    .filter((item) => Object.keys(item.patch).length > 0);
}

export const PHASE2_MIGRATION_NOTES = {
  strategy: 'Additive and backward-compatible only',
  documentTypeSeed: DOCUMENT_TYPES.PSA_BIRTH_CERTIFICATE,
  schemaVersion: PHASE2_SCHEMA_VERSION
} as const;

