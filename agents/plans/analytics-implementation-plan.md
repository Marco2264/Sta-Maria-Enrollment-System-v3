# Analytics Implementation Plan

Date: 2026-05-27
Target phase: Phase 4

## Scope
- Admin descriptive analytics dashboard with:
  - Attendance analytics
  - IP analytics
  - 4Ps analytics
  - Mother tongue analytics
  - BMI analytics
  - Religion analytics
- Real-time KPI and chart layer.

## Data prerequisites
1. Canonical attendance model finalized.
2. Enrollment demographic fields normalized.
3. BMI calculation and category persistence strategy defined.
4. Aggregate collections/projections prepared.

## Proposed data model additions (additive)
- `analytics_daily/{date}`:
  - attendance totals by section/grade
  - status counts (present/absent/late)
- `analytics_demographics/{schoolYear}`:
  - IP, 4Ps, mother tongue, religion distributions
- `analytics_health/{schoolYear}`:
  - BMI category counts and trend snapshots

## Processing strategy
- Option A (recommended): scheduled Cloud Function or secure backend job to compute aggregates.
- Option B: client-triggered fallback for low-volume environments (temporary only).

## API/service layer requirements
- `analyticsService` methods:
  - `getKpis(schoolYear, filters)`
  - `getAttendanceSeries(range, scope)`
  - `getDemographicBreakdown(type, scope)`
  - `getBmiSeries(range, scope)`

## UI implementation plan
1. Create dashboard shell with filter bar (SY, grade, section, date range).
2. Add KPI row with loading skeletons and empty/error states.
3. Add chart blocks:
  - line/area for attendance trends
  - bar/donut for demographic splits
4. Add drill-down table panels.
5. Add export snapshot action.

## Performance and reliability guardrails
- Cache aggregates by filter keys.
- Avoid direct raw enrollment scans on dashboard load.
- Use paged drill-downs.
- Establish chart fallback for missing data.

## Validation and QA
- Cross-check KPI totals against raw source collections.
- Snapshot test chart data transformations.
- Permission tests for admin-only access.
- Load tests for target data volume.

## Rollback strategy
- Feature flag analytics dashboard route.
- Preserve existing dashboard as fallback view.
- Keep aggregate writers isolated; disable writer job to freeze updates if anomalies occur.

