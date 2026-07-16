# Codebase Analysis

Date: 2026-05-27
Scope: Full repository and documentation pass

## Architecture summary
- Stack: Vite + React 18 + TypeScript + Tailwind v4 + Firebase (Auth + Firestore).
- Runtime model: Client-heavy SPA. No dedicated backend API layer in this repository.
- Domain partitions:
  - Admin: setup, users, classrooms, subjects, report shells.
  - Teacher: enrollment approvals, attendance, grades, BMI updates, report shells.
  - Parent: learner enrollment intake, status tracking, child detail, dashboard.
- State model: React Context providers as domain data access layer:
  - `AuthContext` (user, role, profile)
  - `AdminDataProvider`
  - `TeacherDataProvider`
  - `ParentDataProvider`

## Frontend module analysis
- Router entrypoint: `src/App.tsx`.
  - Exposes `/`, `/login`, `/signup`, `/admin`, `/teacher`, `/parent`.
  - No route guard middleware or protected route wrapper.
- Page structure:
  - Active route modules use nested folders (`src/pages/admin`, `auth`, `teacher`, `parent`).
  - Legacy duplicate pages exist in `src/pages/*` root (same feature, older variant).
- UI foundation:
  - Custom UI primitives under `src/components/ui/*` inspired by shadcn/Radix patterns.
  - Shared utility class merge in `src/components/ui/utils.ts`.
- Styling:
  - Theme variables in `src/index.css` with Tailwind `@theme` tokens.
  - Widespread per-page utility classes and gradients; no central design token abstraction beyond base theme.

## Affected modules
- `src/App.tsx`
- `src/pages/**`
- `src/components/admin/**`
- `src/components/teacher/**`
- `src/components/parent/**`
- `src/components/ui/**`
- `src/lib/**`
- `docs/School-Forms-Digitized-Report-v.1.0.pdf`

## Backend module analysis
- No Node/Express/Nest backend in repo.
- No server actions, no cloud functions, no API routes.
- All CRUD is browser-side via Firestore SDK.

## Routing system analysis
- Single `BrowserRouter` with direct route mapping.
- Catch-all route redirects to `/`.
- Missing:
  - Auth guard
  - Role-based route resolver
  - Unauthorized and forbidden route handling

## Authentication flow analysis
- Auth provider listens with `onAuthStateChanged`.
- User role profile loaded from Firestore `users/{uid}`.
- Login flow:
  - `signInWithEmailAndPassword`
  - Reads role from Firestore
  - Navigates to `/${role}`
- Sign-up flow:
  - Parent self-registration writes role `parent`.
- Admin user creation flow:
  - Uses secondary Firebase app instance to avoid logging out current admin.

## RBAC/role system analysis
- Role model currently string-based and client-enforced.
- Inconsistency:
  - Types in admin models use title case (`Teacher`, `Parent`, `Admin`)
  - Auth/routing expects lowercase (`teacher`, `parent`, `admin`)
- No authoritative permission matrix.
- No server-side authorization boundary in this repo.

## Report generation engine analysis
- Admin reports:
  - SF1 component exists but currently renders from `children: any[] = []` placeholder.
  - SF4 component exists with static template and "No data found" placeholders.
- Teacher reports:
  - SF5/SF8/SF9 cards currently trigger simulated generation states only.
- Export mode:
  - Browser `window.print()` + print CSS templates.
- Current maturity: Template/UI-level only, not fully data-composed.

## Attendance workflow analysis
- Teacher attendance writes to `attendance` collection by `studentId + date + sectionId`.
- Parent child detail reads `attendance[]` field embedded in enrollment document.
- Data divergence risk: parent-facing attendance can be stale because it is not hydrated from canonical attendance collection.

## Enrollment approval workflow analysis
- Parent creates enrollment with `status: Pending`.
- Teacher fetches pending by grade-level inferred from assigned section.
- Teacher approval updates enrollment status:
  - Approve: sets `status: Enrolled` and `sectionId`
  - Reject: sets `status: Rejected`
- No explicit admin approval path in code, despite documentation references.

## BMI computation workflow analysis
- Parent captures height/weight at intake (medical payload).
- Teacher updates `medical.height` and `medical.weight` on enrollment.
- BMI computed on demand in UI (`weight / (height_m^2)`), not persisted.
- No BMI category, percentile, HFA persistence in current data model.

## State management analysis
- Context providers combine:
  - Remote subscription logic
  - Domain mutation functions
  - UI-consumed state
- Strengths:
  - Simple feature-local usage.
  - Real-time updates via snapshots.
- Weaknesses:
  - Tight coupling between view and datastore.
  - Repeated Firestore query/mutation logic.
  - Limited error/loading standardization.

## Reusable components analysis
- Strong reusable primitive base (`Button`, `Card`, `Input`, `Select`, `Dialog`, `Table`, `Tabs`, etc.).
- Some duplication remains:
  - Similar dashboard shells repeated across admin/teacher/parent.
  - Repeated status badge switch blocks across views.

## API structure analysis (in-repo)
- No REST/GraphQL API.
- De facto API is context provider functions:
  - Admin: `addClassroom`, `updateSubject`, `addAssignment`, etc.
  - Teacher: `updateAttendance`, `updateStudentStatus`, `updateStudentGrade`, `updateStudentBmi`
  - Parent: `addChild`, `updateChild`

## Middleware/services analysis
- No middleware layer.
- No service/repository abstraction.
- No centralized error translation or retry policy.

## Validation logic analysis
- Present:
  - Basic client input checks (password confirmation, contact digits, numeric fields).
  - Some inline filtering by regex.
- Missing:
  - Shared schema validation (e.g., Zod/Yup).
  - Cross-field validation at submission boundaries.
  - Server-side validation guarantees.

## File structure standards and naming conventions
- Strengths:
  - Clear domain folders under `components`.
  - Consistent `View` suffix for feature panels.
- Debt:
  - Duplicated page modules in both `src/pages/*` and nested feature folders.
  - Mixed casing/semantics for roles and statuses.
  - Mixed usage of strongly typed models and `any`.

## Dependencies and libraries
- Core:
  - `react`, `react-router-dom`, `firebase`
  - `@radix-ui/*`, `lucide-react`, `framer-motion`
  - `class-variance-authority`, `clsx`, `tailwind-merge`
- Build/tooling:
  - `vite`, `typescript`, `eslint`, `@tailwindcss/vite`

## Documentation analysis summary
- Present docs:
  - `README.md` (high level only)
  - `docs/School-Forms-Digitized-Report-v.1.0.pdf` (rich manual)
- Missing docs:
  - Code architecture guide
  - Data model and migration guide
  - Security model and RBAC matrix
  - API/service contract spec

## Technical debt and risks
- Client-only privileged operations (high security risk without strict rules).
- Role model inconsistency may cause authorization drift.
- Setup wizard persistence mismatch with active-year source.
- Subscription lifecycle risk in teacher data provider.
- Report engine not yet data-backed for official forms.

## Scalability concerns
- Firestore reads scale with multiple live `onSnapshot` subscriptions.
- Sequential per-row writes for attendance/grades (high latency as class size grows).
- No pagination for large user/subject/class lists.
- No analytics-ready aggregate model.

## Optimization opportunities
- Introduce typed service layer and query reuse.
- Batch writes (`writeBatch`) for attendance/grades.
- Normalize attendance source and derive parent views from canonical data.
- Add route/RBAC guards and role normalization.
- Remove duplicate page copies and dead modules.

## Phase 2 verification update (2026-05-27)
- Introduced modular Phase 2 boundaries without touching unrelated stable modules:
  - `src/lib/schema/phase2.ts`
  - `src/lib/services/enrollmentDocumentsService.ts`
  - `src/lib/services/attendanceCompatibilityService.ts`
  - `src/lib/migrations/*`
  - targeted portal views for parent upload and admin verification
- Verified `/agents` as canonical project tracking folder.
- Kept `/.agents` intact for local skill tooling compatibility.
