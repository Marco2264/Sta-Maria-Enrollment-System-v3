# Sta. Maria School System Deployment Playbook

This playbook documents the exact order of operations for deploying the modernized school system to production. Follow these steps meticulously to ensure zero downtime and prevent data loss.

## Prerequisites

- [ ] Operator must have Firebase CLI installed (`npm install -g firebase-tools`).
- [ ] Operator must be logged in to Firebase (`firebase login`).
- [ ] The current working directory must be the project root.
- [ ] Ensure all code is committed and the working tree is clean.

## Phase 1: Pre-flight & Data Normalization

The modernized system strictly expects roles in the `users` collection to be lowercase (`admin`, `teacher`, `parent`). Mixed casing (e.g. `Teacher`) will cause the new Firestore rules to deny access.

1. **Verify Role Casing:** Check the `users` collection in the Firebase console.
2. **Normalize Data:** If any roles have mixed casing, they must be updated to strictly lowercase before proceeding with the rules deployment.

## Phase 2: Deploy Firestore Configuration

Deploy the database optimizations (Phase 8) and security hardening rules (Phase 9).

1. **Deploy Indexes:**
   ```bash
   firebase deploy --only firestore:indexes
   ```
   *Wait for the Firebase console to show the indexes as "Enabled". Building indexes can take several minutes depending on database size.*

2. **Deploy Security Rules:**
   ```bash
   firebase deploy --only firestore:rules
   ```
   *Verify in the Firebase console that the new rules are active.*

## Phase 3: Execute Data Migrations (Phase 2 Additions)

Execute the additive schema migrations (e.g., adding `schemaVersion: 1` to enrollments).

1. **Dry Run:** (If a script was created to use the `phase2MigrationRunner.ts`)
   *Verify the output of the migration plan.*
2. **Apply Migration:** Execute the migration to apply the additive changes.

## Phase 4: Build and Deploy Frontend

1. **Install Dependencies:**
   ```bash
   npm install
   ```
2. **Run Type Check:**
   ```bash
   npm run tsc --noEmit
   ```
3. **Run Unit Tests:**
   ```bash
   npm run test -- --run
   ```
   *Ensure all tests pass. Do not proceed if tests fail.*
4. **Build the Application:**
   ```bash
   npm run build
   ```
5. **Deploy to Hosting:**
   ```bash
   firebase deploy --only hosting
   ```

## Phase 5: Post-Deployment Smoke Testing

Perform the following manual tests on the live production URL:

- [ ] Unauthenticated users are redirected to `/login` when trying to access `/admin`.
- [ ] Parent login successfully routes to the Parent Portal.
- [ ] Parent cannot access the Admin Dashboard (should see the Unauthorized page).
- [ ] Teacher login successfully routes to the Teacher Dashboard.
- [ ] Admin login successfully routes to the Admin Dashboard.
- [ ] Admin can generate and view the new SF8 report.
- [ ] Admin dashboard charts render successfully.

## Rollback Plan

If critical issues are detected during smoke testing, execute the rollback plan immediately.

1. **Revert Frontend:**
   Use the Firebase console (Hosting section) to roll back to the previous deployment version.
2. **Revert Security Rules:**
   Use the Firebase console (Firestore Database -> Rules tab -> History) to restore the previous permissive ruleset if legitimate users are blocked.
3. **Revert Indexes:**
   Indexes are generally safe to leave, but they can be manually deleted from the Firebase console if necessary.
4. **Revert Migrations:**
   The Phase 2 schema additions are purely additive and backward-compatible with the old frontend. Reverting the database is typically unnecessary unless severe data corruption occurred.
