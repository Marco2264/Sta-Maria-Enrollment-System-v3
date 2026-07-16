# System Modernization Plan

Date: 2026-05-27
Mode: Analysis and strategy only (no feature code changes yet)

## Objectives
- Preserve current stable workflows.
- Add enterprise-grade modular architecture.
- Improve security, performance, and report reliability.
- Maintain backward compatibility during migration.

## Phase roadmap

### Phase 1 - Full System Analysis (current)
- Complete architecture, data, API, security, and performance assessment.
- Produce migration-safe implementation plans.

### Phase 2 - Safe Database Refactoring
- Add schema versioning metadata and compatibility adapters.
- Normalize attendance source of truth.
- Prepare analytics-ready structures (non-destructive, additive only).

### Phase 3 - Parent Portal Document Upload
- Secure upload pipeline (validation, storage policy, verification status).
- Admin review queue with approve/reject flow.

### Phase 4 - Admin Descriptive Analytics Dashboard
- KPI cards + segmented charts:
  - Attendance
  - IP
  - 4Ps
  - Mother Tongue
  - BMI
  - Religion
- Query-efficient aggregate views.

### Phase 5 - Subject Management UI Refactor
- Cleaner shadcn-based UX.
- Hide subject codes in presentation layer while preserving DB compatibility.
- Add search/filter/pagination.

### Phase 6 - Report Generator Modernization
- Template engine abstraction.
- Data composition services for SF forms.
- Branding and export pipeline.

### Phase 7 - BMI and Health Monitoring Expansion
- Nutritional status dashboard and trends.
- Feeding program eligibility indicators.
- Printable health reports.

### Phase 8 - Performance Optimization
- Batch writes, query index tuning, caching, lazy loading, render optimization.

### Phase 9 - Security Hardening
- RBAC normalization and route protection.
- Audit logs.
- Validation and sanitization layer.
- Secure file serving.

### Phase 10 - Testing and Deployment
- Unit, integration, workflow, migration tests.
- Rollback playbook and deployment checklist.

## Cross-cutting architecture actions
1. Introduce `services/` layer between UI and Firestore.
2. Centralize validation schema definitions.
3. Add role constants and policy utilities.
4. Create migration runner scripts with idempotent checkpoints.
5. Add telemetry hooks for write/read performance.

## Backward compatibility strategy
- Additive migrations first.
- Adapter functions for old/new field mapping.
- Dual-read period for high-risk entities.
- Cutover only after parity checks and pilot validation.

## Rollback strategy (global)
- Keep previous schema fields until stability window passes.
- Feature-flag new read paths.
- Retain migration checkpoints for reverse replay where feasible.
- Maintain backup export snapshots before irreversible operations.

