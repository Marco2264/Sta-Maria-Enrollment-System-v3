# Sta. Maria Enrollment System - Architecture Overview

Date: 2026-05-27

## High-level architecture
- Frontend: React 18 + TypeScript + Tailwind v4 (Vite SPA)
- Identity: Firebase Authentication
- Data: Firestore collections (real-time subscriptions)
- Deployment: Firebase Hosting (`dist` rewrite to `index.html`)

## Role-based portals
- Admin portal: setup, users, classrooms, sections, subjects, SF1/SF4 report templates.
- Teacher portal: enrollment approval, attendance, grades, BMI updates, SF5/SF8/SF9 placeholders.
- Parent portal: learner enrollment intake and child status/detail tracking.

## Runtime data flow
1. Parent submits learner enrollment.
2. Teacher reviews and approves/rejects pending enrollments.
3. Teacher records attendance and grades.
4. Teacher updates height/weight for BMI display.
5. Parent uploads enrollment requirements to Firebase Storage with Firestore metadata tracking.
6. Admin verifies uploaded documents (approve/reject) through verification queue.
7. Reports are rendered from UI templates (data wiring maturity varies by form).

## Current architecture constraints
- No server-side API layer in repository.
- Authorization is mostly client-side.
- Some workflows rely on mixed data sources (example: attendance collection vs embedded enrollment attendance array).

## Modernization direction
- Add service/policy abstraction layer.
- Normalize role and schema contracts.
- Harden route/data security.
- Build reusable reporting and analytics engines.
