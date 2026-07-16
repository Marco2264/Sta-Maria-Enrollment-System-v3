# API Analysis

Date: 2026-05-27
Context: No HTTP API layer exists in this repository. "API" is currently context-provider methods over Firebase SDK.

## Current access model
- Client directly calls Firebase Auth and Firestore from browser.
- Domain-level "API" surface is exported from:
  - `src/lib/adminData.tsx`
  - `src/lib/teacherData.tsx`
  - `src/lib/parentData.tsx`
  - `src/lib/AuthContext.tsx`

## Effective API contracts

### Auth API
- `useAuth()` returns:
  - `user`
  - `role`
  - `userData`
  - `loading`
- Login/signup flows directly invoke Firebase auth methods in page components.

### Admin API (`useAdminData`)
- Read state:
  - `schoolYear`, `classrooms`, `sections`, `subjects`, `users`, `assignments`, `loading`
- Mutations:
  - classrooms: add/update/delete
  - sections: add/update/delete
  - subjects: add/update/delete
  - users: add/update/delete
  - assignments: add/delete
- setup flags:
  - `setupComplete`, `setSetupComplete`, `isSystemInitialized`

### Teacher API (`useTeacherData`)
- Read state:
  - `students`, `subjects`, `attendance`, `currentSection`, `loading`
- Mutations:
  - `updateAttendance(studentId, date, status)`
  - `updateStudentStatus(id, status)`
  - `updateStudentGrade(id, subjectCode, grade)`
  - `updateStudentBmi(id, height, weight)`

### Parent API (`useParentData`)
- Read state:
  - `children`, `documents`, `loading`, `documentsLoading`
- Mutations:
  - `addChild(childPayload)`
  - `updateChild(id, updates)`
  - `uploadRequirementDocument(enrollmentId, documentType, file)`

### Phase 2 service API (new)
- `uploadEnrollmentRequirementDocument(...)`
- `subscribeParentEnrollmentDocuments(parentId, onData)`
- `subscribeAllEnrollmentDocuments(onData)`
- `reviewEnrollmentDocument(...)`
- `getEnrollmentDocumentDownloadUrl(storagePath)`
- `mergeAttendanceWithCompatibility(...)`

## Affected modules
- `src/lib/AuthContext.tsx`
- `src/lib/adminData.tsx`
- `src/lib/teacherData.tsx`
- `src/lib/parentData.tsx`
- `src/pages/auth/*`
- `src/components/admin/*`
- `src/components/teacher/*`
- `src/components/parent/*`

## Observed design strengths
- Clear role-scoped provider separation.
- Real-time subscriptions keep UI synchronized with Firestore changes.
- Minimal indirection keeps onboarding simple for small teams.

## API design risks
- No typed service boundary between UI and data source.
- Firestore query logic duplicated across providers and components.
- No centralized error translation for domain-meaningful messages.
- No retry/circuit behavior for transient network faults.
- Mutation methods are tightly coupled to current schema keys.

## Missing middleware/service capabilities
- Request policy layer (retry, timeout, idempotency)
- Access policy layer (role assertions before mutation)
- Validation middleware (schema-safe coercion)
- Audit logging service
- Derived data projection service (for reports/analytics)

## Technical debt
- `any` usage in report and teacher subject handling weakens contract safety.
- Methods execute sequential writes in loops (attendance, grades), increasing request count.
- Mixed role-casing and status-casing complicates downstream policy enforcement.

## Scalability concerns
- Real-time subscriptions on broad queries can become expensive with larger schools.
- No pagination cursors in list-heavy modules (`users`, `subjects`, `classrooms`).
- No caching strategy for repeat read paths across views.

## Optimization opportunities
- Add `services/` layer:
  - `authService`
  - `userService`
  - `enrollmentService`
  - `attendanceService`
  - `reportService`
- Standardize provider contracts around typed DTOs.
- Introduce batch mutation helpers.
- Introduce report query adapters that compose canonical datasets once, then share to all form generators.

## Recommended target API architecture
1. `data-access` layer (Firebase-specific adapters)
2. `domain services` layer (business rules, validation, policy checks)
3. `presentation hooks/providers` layer (state and UI binding)
4. `feature views` layer (render-only + user intent handlers)
