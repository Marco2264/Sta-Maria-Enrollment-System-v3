# Phase 2 Migration Runbook

Date: 2026-05-27
Target: Safe database refactoring for enrollment schema readiness.

## Goal
- Introduce additive schema fields for Phase 2 workflows with backward compatibility:
  - `enrollments.schemaVersion`
  - `enrollments.requirementUploads`
  - canonical upload metadata in `enrollment_documents`

## Modified implementation modules
- `/src/lib/schema/phase2.ts`
- `/src/lib/migrations/phase2SafeMigrations.ts`
- `/src/lib/migrations/phase2MigrationRunner.ts`
- `/src/lib/services/enrollmentDocumentsService.ts`

## Migration impact
- Existing enrollment records remain readable without immediate backfill.
- New workflows write `schemaVersion = 2` and requirement metadata.
- Legacy attendance and enrollment reads continue to work through compatibility logic.

## Execution strategy

1. Dry run plan generation
- Use `createPhase2EnrollmentMigrationPlanFromDb()` to scan existing enrollments.
- Persist plan output snapshot externally (change review artifact).

2. Apply additive patches
- Use `applyPhase2EnrollmentMigrationPlan(plan, { dryRun: false })`.
- Batch size defaults to 200 updates/commit for write safety.

3. Post-apply verification
- Confirm patched record count equals planned record count.
- Validate random sample of old and new enrollment docs.
- Validate parent and teacher read paths remain unchanged.

## Rollback strategy
- No destructive schema change is performed; rollback is operational:
  - disable new Phase 2 read paths/UI entry points
  - keep old fields and old flows active
  - ignore new additive fields (`schemaVersion`, `requirementUploads`)
- If a partial apply occurs, re-run migration safely; patch planner is idempotent.

## Safety guardrails
- Never delete enrollment fields during Phase 2.
- Never overwrite unrelated enrollment properties.
- Always dry-run first in production/staging.
- Keep Firestore export backup before non-dev apply.

## Firestore index requirements
- For parent document history:
  - `enrollment_documents` on (`parentId`, `uploadedAt desc`)
- For admin verification queue:
  - `enrollment_documents` on (`uploadedAt desc`)

## Deployment note
- Because this repo has no backend migration worker, migration is executed through controlled admin/operator tooling only.
