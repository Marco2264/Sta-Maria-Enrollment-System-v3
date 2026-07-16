# Security Hardening Plan

Date: 2026-05-27
Target phases: 3, 8, 9 (with early P0 actions)

## Security objectives
- Enforce RBAC consistently across routing, UI actions, and datastore writes.
- Protect student PII/health data and uploaded documents.
- Establish traceability through audit logs.

## Priority roadmap

### P0 - Immediate controls
1. Add protected route wrappers for `/admin`, `/teacher`, `/parent`.
2. Normalize role constants and comparison utilities.
3. Add deny-by-default Firestore rules baseline.

### P1 - Core hardening
1. Add centralized validation schemas for all mutation payloads.
2. Add audit log write hooks for:
   - enrollment approval/rejection
   - attendance edits
   - grade edits
   - user/role changes
3. Restrict sensitive fields by role ownership and assignment.

### P2 - Upload and document security
1. Secure storage bucket path strategy by tenant/school year/user scope.
2. Enforce file type, size, and extension checks.
3. Add malware scanning workflow hook before file activation.
4. Serve files with signed access and expiry policies.

## RBAC model proposal
- Roles: `admin`, `teacher`, `parent`.
- Access matrix:
  - Admin: system configuration, user management, reports, analytics.
  - Teacher: assigned-section enrollment, attendance, grades, health encoding.
  - Parent: owned enrollment and child profile views/edits.

## Firestore rule strategy
- Rule set principles:
  - explicit allow only
  - ownership checks for parent records
  - assignment checks for teacher section actions
  - admin-only write constraints for config/master data
- Include field-level validation for critical schemas where feasible.

## Observability and incident response
- Introduce audit collection:
  - actorId, actorRole, action, target, before/after hash, timestamp
- Add client error telemetry pipeline with security tags.

## Testing plan
- Rule simulator tests (allow/deny matrix by role).
- Route-guard tests for unauthorized navigation.
- Mutation tests for forbidden transitions.
- File upload abuse-case tests.

## Rollback strategy
- Keep old path behind feature flags for one release window.
- Revert to prior ruleset snapshot if legitimate access regression is detected.
- Disable upload activation if scanning or rule enforcement fails.

