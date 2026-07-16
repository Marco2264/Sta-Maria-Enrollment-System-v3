# Performance Analysis

Date: 2026-05-27
Scope: Render patterns, Firestore access, mutation strategy, bundle/runtime architecture.

## Executive summary
- Current UX is responsive for small datasets, but design patterns will degrade at school-scale data volumes.
- Main pressure points are read amplification from live snapshots and write amplification from sequential per-record updates.

## Findings by area

## 1) Data-fetching patterns
- Multiple `onSnapshot` subscriptions are used for broad collections.
- `TeacherDataProvider` performs nested subscriptions and per-assignment lookups.
- Pending/enrolled student queries are split and merged in memory.

### Risk
- Increased live listener count, higher read costs, and memory overhead.

### Opportunity
- Consolidate query orchestration and use explicit unsub lifecycle tracking.
- Introduce query scopes and optional lazy fetch modes for non-critical panels.

## 2) Mutation patterns
- Attendance save loops student-by-student with awaited sequential writes.
- Grade save loops student x subject sequentially.
- Setup wizard loops entity creation sequentially.

### Risk
- High latency under medium/large classes.
- Increased chance of partial-update states on network interruption.

### Opportunity
- Use Firestore `writeBatch` and chunked commits.
- Add optimistic UI and failure reconciliation.

## 3) Render/load behavior
- Large table/card views render all entries without pagination or virtualization.
- Several dashboards compute derived arrays inline per render.
- Repeated style-heavy components and gradients are acceptable now but can add repaint cost.

### Risk
- Slower interaction as row counts increase.

### Opportunity
- Add pagination and search-indexed filtering.
- Memoize expensive derivations and split heavy views.

## 4) Report generation path
- Report modules are print-template components with client-side rendering.
- No preprocessing/aggregation cache for report datasets.

### Risk
- Future fully data-backed report generation may trigger heavy client computation and long blocking render/print cycles.

### Opportunity
- Introduce report composition service and pre-aggregated summaries.
- Cache report snapshots by school year/section/month.

## 5) Bundle/runtime
- No route-level lazy loading currently.
- Duplicate legacy pages increase code surface.

### Risk
- Larger initial bundle and slower first-load as system grows.

### Opportunity
- Remove duplicate pages and lazy-load role portals.

## Affected modules
- `src/lib/teacherData.tsx`
- `src/lib/adminData.tsx`
- `src/components/teacher/AttendanceView.tsx`
- `src/components/teacher/GradesView.tsx`
- `src/components/admin/SetupWizard.tsx`
- large list renderers (`UsersView`, `SubjectsView`, `ClassroomsView`, `MyChildrenView`)

## Technical debt
- No caching abstraction.
- No query/mutation instrumentation.
- No performance test baseline.

## Scalability concerns
- Listener fan-out and sequential writes will become cost and latency bottlenecks.
- Lack of analytics pre-aggregation will delay Phase 4 dashboard requirements.

## Optimization roadmap
1. P0: Fix subscription lifecycle and unify attendance source.
2. P0: Batch writes for attendance/grades/setup.
3. P1: Add pagination and filter indexing on list-heavy views.
4. P1: Introduce lazy route loading by portal.
5. P1: Add derived-data cache for analytics and reports.
6. P2: Add instrumentation (timings, read/write counters, error rates).

## Phase 2 verification update (2026-05-27)
- Added migration runner with batched update support for additive enrollment patching.
- Parent attendance now supports canonical-read preference with legacy fallback.
- Build output still reports large main bundle warning (>500kB), which remains a Phase 8 optimization item.
