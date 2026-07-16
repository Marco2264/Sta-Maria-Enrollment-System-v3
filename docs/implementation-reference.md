# Sta. Maria Enrollment System - Implementation Reference

Date: 2026-05-27

## Core entry files
- `src/App.tsx` - route map
- `src/index.tsx` - application bootstrap
- `src/lib/firebase.ts` - Firebase initialization
- `src/lib/AuthContext.tsx` - auth state and role loading

## Domain provider files
- `src/lib/adminData.tsx`
- `src/lib/teacherData.tsx`
- `src/lib/parentData.tsx`

## Active route pages
- `src/pages/auth/LoginPage.tsx`
- `src/pages/auth/SignUpPage.tsx`
- `src/pages/admin/AdminDashboard.tsx`
- `src/pages/teacher/TeacherDashboard.tsx`
- `src/pages/parent/ParentPortal.tsx`

## Domain component folders
- `src/components/admin`
- `src/components/teacher`
- `src/components/parent`
- `src/components/ui`

## Firestore collections (in code)
- `users`
- `classrooms`
- `sections`
- `subjects`
- `assignments`
- `school_years`
- `settings`
- `enrollments`
- `attendance`
- `enrollment_documents` (Phase 2 upload verification metadata)

## Phase 2 service modules
- `src/lib/schema/phase2.ts`
- `src/lib/services/enrollmentDocumentsService.ts`
- `src/lib/services/attendanceCompatibilityService.ts`
- `src/lib/migrations/phase2SafeMigrations.ts`
- `src/lib/migrations/phase2MigrationRunner.ts`

## Known implementation caveats
- Duplicate legacy page files also exist in `src/pages` root.
- Route protection and role guards are not yet centralized.
- Report modules are at mixed maturity (template-first vs fully data-driven).
