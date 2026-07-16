# Architecture Explanation

Date: 2026-05-27

## System shape
- The system is a single React SPA with three role portals.
- Firebase Auth handles identity; Firestore stores operational records.
- Domain contexts encapsulate read/write logic and feed UI views.

## Portal boundaries
- Admin portal:
  - school setup
  - users
  - classrooms/sections/subjects
  - SF1/SF4 report templates
- Teacher portal:
  - enrollment review
  - attendance
  - grades
  - BMI updates
  - SF5/SF8/SF9 report placeholders
- Parent portal:
  - learner enrollment intake
  - profile and status tracking
  - attendance view (currently dependent on enrollment embedded field)

## Data flow model
1. Parent submits enrollment -> Firestore `enrollments`.
2. Teacher reviews pending enrollment by grade/section assignment.
3. Teacher records attendance in `attendance`.
4. Teacher encodes grades/BMI into enrollment record fields.
5. Admin/Teacher report views read role domain data and render printable templates.

## Critical architecture constraints
- No server API boundary in current repo.
- Authorization and business rules are mostly client-side.
- Report composition is not yet centralized.

## Modernization direction
- Introduce service and policy layers.
- Normalize canonical data contracts.
- Harden route + datastore security.
- Build reusable reporting and analytics engines.

