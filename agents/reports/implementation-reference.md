# Implementation Reference

Date: 2026-05-27

## Primary entry points
- App router: `src/App.tsx`
- Auth context: `src/lib/AuthContext.tsx`
- Firebase bootstrap: `src/lib/firebase.ts`

## Domain providers
- Admin: `src/lib/adminData.tsx`
- Teacher: `src/lib/teacherData.tsx`
- Parent: `src/lib/parentData.tsx`

## Role pages (active)
- Admin: `src/pages/admin/AdminDashboard.tsx`
- Teacher: `src/pages/teacher/TeacherDashboard.tsx`
- Parent: `src/pages/parent/ParentPortal.tsx`
- Auth: `src/pages/auth/LoginPage.tsx`, `src/pages/auth/SignUpPage.tsx`

## Important note on duplicates
- Legacy duplicate pages exist under `src/pages` root:
  - `AdminDashboard.tsx`
  - `TeacherDashboard.tsx`
  - `ParentPortal.tsx`
  - `LoginPage.tsx`
- Current router imports nested feature-folder versions.

## Admin feature modules
- `components/admin/DashboardView.tsx`
- `components/admin/UsersView.tsx`
- `components/admin/ClassroomsView.tsx`
- `components/admin/SubjectsView.tsx`
- `components/admin/ReportsView.tsx`
- `components/admin/SF1ReportDocument.tsx`
- `components/admin/SF4ReportDocument.tsx`
- `components/admin/SetupWizard.tsx`

## Teacher feature modules
- `components/teacher/TeacherDashboardView.tsx`
- `components/teacher/EnrollmentsView.tsx`
- `components/teacher/AttendanceView.tsx`
- `components/teacher/GradesView.tsx`
- `components/teacher/StudentsView.tsx`
- `components/teacher/TeacherReportsView.tsx`

## Parent feature modules
- `components/parent/ParentDashboardView.tsx`
- `components/parent/EnrollmentForm.tsx`
- `components/parent/MyChildrenView.tsx`
- `components/parent/ChildDetailView.tsx`
- `components/parent/RequirementsView.tsx`

## Phase 2 modular services
- `lib/schema/phase2.ts`
- `lib/services/enrollmentDocumentsService.ts`
- `lib/services/attendanceCompatibilityService.ts`
- `lib/migrations/phase2SafeMigrations.ts`
- `lib/migrations/phase2MigrationRunner.ts`

## Phase 2 admin modules
- `components/admin/DocumentVerificationView.tsx`

## UI primitive system
- `components/ui/*` (Button, Card, Input, Select, Dialog, Table, Tabs, etc.)

## Build/deploy references
- Vite config: `vite.config.ts`
- TS config: `tsconfig.json`
- Firebase hosting: `firebase.json`
