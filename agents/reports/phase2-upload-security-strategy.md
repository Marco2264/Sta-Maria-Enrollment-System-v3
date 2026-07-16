# Phase 2 Upload Security Strategy

Date: 2026-05-27
Scope: Parent document upload and admin verification workflow.

## Objectives
- Allow parent upload of PSA/Birth Certificate.
- Preserve confidentiality and integrity of uploaded records.
- Keep implementation backward-compatible and modular.

## Implemented controls

1. Client validation
- Allowed MIME types:
  - `application/pdf`
  - `image/jpeg`
  - `image/jpg`
  - `image/png`
- Max upload size: `10MB`
- Validation path:
  - `/src/lib/services/enrollmentDocumentsService.ts`

2. Storage path hardening
- File name sanitation removes unsafe characters.
- Deterministic storage path structure:
  - `enrollment_documents/{parentId}/{enrollmentId}/{documentType}/{timestamp}_{sanitizedName}`

3. Metadata tracking
- Every upload writes metadata to `enrollment_documents` with:
  - owner (`parentId`)
  - enrollment reference
  - file identity + size + MIME type
  - workflow status (`PENDING`, `APPROVED`, `REJECTED`)

4. Verification workflow enforcement
- Admin review updates both:
  - document record status
  - enrollment requirement mirror metadata
- Rejections capture reason for parent visibility.

## Required policy artifacts (next hardening step)
- Add Firestore security rules and Storage rules (not currently versioned in repository):
  - Parent can upload/read own enrollment documents only.
  - Admin can review/update verification status only.
  - Deny all writes to verification fields from non-admin roles.

## Risk notes
- Current repository is frontend-only; security posture depends on Firebase rules.
- Without strict rules, client-side checks alone are insufficient.

## Recommendation
- Treat rule deployment as mandatory production gate for this feature set.
