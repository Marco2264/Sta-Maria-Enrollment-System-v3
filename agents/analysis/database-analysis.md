# Database Analysis

Date: 2026-05-27
Database: Firebase Firestore (inferred from code usage)

## Current collection inventory
- `users`
- `classrooms`
- `sections`
- `subjects`
- `assignments`
- `school_years`
- `settings` (doc: `system`)
- `enrollments`
- `attendance`

## Inferred schema contracts

### `users/{uid}`
- `firstName`, `middleName`, `lastName`, `suffix`
- `gender`
- `email`
- `contactNumber`
- `role` (mixed-case risk: lowercase and title-case present)
- `status` (`Active`/`Pending`)
- `relationship` (parent-only in signup path)
- `createdAt` (mixed type: ISO string in some writes)

### `classrooms/{id}`
- `roomName`
- `roomType` (`Lecture` | `Laboratory` | `Multipurpose`)
- `status` (`Available` | `Full` | `Maintenance`)
- `gradeLevel`
- `createdAt` (Firestore timestamp)

### `sections/{id}`
- `name`
- `classroomId`
- `gradeLevel`
- `status` (`Active` | `Inactive`)

### `subjects/{id}`
- `name`
- `code`
- `gradeLevel`
- `units`
- `status`
- `academicYear`
- `createdAt`

### `assignments/{id}`
- `teacherId`
- `classroomId`
- `sectionId`

### `school_years/{id}`
- `name`
- `startDate`
- `endDate`
- `isActive`

### `settings/system`
- `currentAcademicYear`
- `setupComplete`
- `updatedAt`

### `enrollments/{id}`
- Student profile:
  - identity, demographics, LRN, grade level
  - address payload
  - medical payload
  - additional payload (mother tongue, religion, IP, 4Ps, learning mode)
- workflow:
  - `parentId`
  - `status` (`Pending` | `Enrolled` | `Rejected` | others used by teacher view)
  - `requirements`
  - `sectionId` (set on approval)
- academic/health:
  - `grades` map by subject code
  - `medical.height`, `medical.weight` updated by teacher
- time:
  - `submittedAt`
- also includes `attendance[]` array (legacy/conflicting source)

### `attendance/{id}`
- `studentId`
- `sectionId`
- `date` (`YYYY-MM-DD`)
- `status` (`Present` | `Absent` | `Late`)
- `createdAt`

## Relationship mapping
- `users (teacher)` -> `assignments.teacherId`
- `classrooms` -> `sections.classroomId`
- `sections` -> `assignments.sectionId`
- `enrollments.parentId` -> `users/{parentUid}`
- `attendance.studentId` -> `enrollments/{id}`

## Affected modules
- `src/lib/adminData.tsx`
- `src/lib/teacherData.tsx`
- `src/lib/parentData.tsx`
- `src/components/admin/*`
- `src/components/teacher/*`
- `src/components/parent/*`

## Data integrity risks
- No transactional integrity for multi-document operations (e.g., setup wizard loops).
- Mixed timestamp representations (ISO string vs Firestore timestamp).
- Role and status casing inconsistencies.
- Duplicate attendance sources:
  - canonical-like `attendance` collection
  - embedded `enrollment.attendance[]`
- Subject identifier coupling to mutable `subject.code` values.

## Indexing and query considerations
- Frequent filters indicate likely index requirements:
  - `enrollments`: (`gradeLevel`, `status`)
  - `enrollments`: (`sectionId`, `status`)
  - `attendance`: (`sectionId`, `date`) recommended for date-filtered attendance pages
  - `assignments`: (`teacherId`)
  - `subjects`: `createdAt` sorting
- Current code does not include index specification artifacts in repo.

## Technical debt
- No explicit migration/versioning metadata.
- No schema registry or typed collection boundary.
- `enrollments` is carrying both intake profile and ongoing academic state (high coupling).

## Scalability concerns
- As data volume grows, snapshot listeners on entire collections become expensive.
- Large enrollment doc shape increases read payload per parent/teacher view.
- Sequential attendance/grade writes scale poorly per class.

## Optimization opportunities
- Introduce schema version field per collection document.
- Split enrollment intake and student-record lifecycle docs (or introduce projection docs).
- Remove embedded attendance array and derive attendance view from dedicated attendance records.
- Add analytics-oriented aggregate collections (daily/monthly summaries).
- Introduce migration scripts with idempotent markers.

## Backward-compatible refactor strategy (Phase 2 readiness)
1. Add new fields/collections in additive mode.
2. Introduce compatibility adapters in providers.
3. Backfill historical records in batches.
4. Switch read paths with feature flags.
5. Keep old fields until post-validation cutoff.

## Phase 2 verification update (2026-05-27)
- Implemented additive schema contracts:
  - `enrollment_documents` metadata collection
  - `enrollments.schemaVersion`
  - `enrollments.requirementUploads`
- Added migration planning and execution helpers:
  - `buildPhase2EnrollmentMigrationPlan`
  - `createPhase2EnrollmentMigrationPlanFromDb`
  - `applyPhase2EnrollmentMigrationPlan`
- Backward compatibility preserved:
  - legacy `enrollment.attendance[]` can still be read
  - parent path now prefers canonical attendance collection when available
