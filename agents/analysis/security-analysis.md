# Security Analysis

Date: 2026-05-27
Scope: Client code, auth flow, role handling, data mutation patterns, documentation references.

## Security posture snapshot
- Authentication exists via Firebase Auth.
- Authorization is primarily client-side and role-string based.
- No backend authorization boundary in repository.
- Firestore rules are not present in repository for review.

## Key findings

### 1) Missing route-level protection
- `/admin`, `/teacher`, `/parent` routes are directly mounted without protected wrappers.
- Users can navigate to pages regardless of auth state; data provider behavior partly limits data but does not fully prevent UI access.

### 2) RBAC is weakly enforced
- Role checks are implicit and spread across UI logic.
- Role value casing inconsistency (`Teacher` vs `teacher`) increases bypass and logic drift risk.

### 3) Privileged operations performed from client
- User creation, role assignment, classroom/subject administration all execute from frontend.
- Without strict Firestore/Auth rules and custom claims policy, privilege escalation risk is high.

### 4) No verified audit trail
- Critical actions (approve/reject enrollment, grade edits, attendance edits, user edits) do not write immutable audit events.

### 5) Data validation is client-only
- Most constraints are UI regex/field checks.
- No centralized schema validation before writes.
- No guaranteed server-side sanitization in this repo.

### 6) Sensitive data handling
- Student medical and demographic fields are heavily used.
- No field-level access strategy visible in code.
- Parent-facing and teacher-facing views use overlapping payloads; least-privilege boundaries are not explicit.

### 7) Report privacy and export controls
- Printable reports can be generated from client context.
- No export entitlement checks visible in report modules.

## Affected modules
- `src/App.tsx` (route exposure)
- `src/lib/AuthContext.tsx`
- `src/lib/adminData.tsx`
- `src/lib/teacherData.tsx`
- `src/lib/parentData.tsx`
- `src/components/admin/*`
- `src/components/teacher/*`
- `src/components/parent/*`

## Risks
- Unauthorized data access
- Role escalation by tampering with client state or permissive rules
- PII/medical data overexposure
- Non-repudiation gaps (cannot prove who changed what)
- Regulatory non-compliance risk for student data handling

## Technical debt
- No policy-as-code artifact in repo (ruleset/matrix missing).
- No environment-hardening checks (CSP, headers) in repo scope.
- No security test harness.

## Scalability and governance concerns
- As schools and users grow, manual policy reasoning in UI becomes unmaintainable.
- Absence of centralized authorization policy will increase defect rate.

## Hardening opportunities
1. Add protected-route guards + role guards in router.
2. Normalize role enum and enforce everywhere.
3. Move privileged mutations behind server-controlled boundary (Cloud Functions or backend).
4. Implement strict Firestore rules with role/owner constraints and document-level checks.
5. Add immutable audit log collection for sensitive actions.
6. Add centralized input validation schema layer.
7. Introduce secure file storage policy for upcoming document upload phase (content type, size, malware scan hooks, signed URL strategy).

## Immediate high-priority actions
- P0: Route guards + role normalization.
- P0: Firestore rules baseline (deny-by-default, explicit allow).
- P1: Audit logging.
- P1: Validation layer for enrollment and grading mutations.

## Phase 2 verification update (2026-05-27)
- Added upload validation controls in service layer:
  - MIME allowlist
  - file-size limit
  - sanitized storage path strategy
- Added approval/rejection workflow metadata fields.
- Remaining production gate:
  - Firestore/Storage rules must be versioned and deployed before release.
