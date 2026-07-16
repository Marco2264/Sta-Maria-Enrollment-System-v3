# Reporting Engine Modernization Plan

Date: 2026-05-27
Target phase: Phase 6

## Current state summary
- SF1/SF4: print templates exist but not fully data-wired.
- SF5/SF8/SF9: UI generation states only (no complete output pipeline).
- Output mechanism: `window.print()` and manual save as PDF.

## Goals
- Build reusable report composition engine.
- Support customizable templates and branding.
- Generate reliable printable/exportable outputs for SF forms.

## Proposed architecture
1. `reportDataService`
   - Fetches and validates canonical datasets for each form.
2. `reportTransformers`
   - Maps domain data into form-specific structures.
3. `reportTemplates`
   - Pure presentational templates for SF1/SF4/SF5/SF8/SF9.
4. `reportRenderer`
   - Handles print/export strategy and metadata.

## Template strategy
- Keep form-specific components under `src/reports/templates`.
- Shared layout primitives:
  - header block
  - signatory block
  - footer metadata
  - standard table sections
- Branding config:
  - school identity
  - logos
  - region/division metadata

## Data integrity requirements
- Unified source mapping:
  - enrollment identity and demographics
  - attendance collection aggregates
  - grades map by subject
  - BMI and health metadata
- Validation before render:
  - required columns
  - school year consistency
  - section/grade scope integrity

## Export strategy
- Phase 1: enhanced print styles + deterministic page breaks.
- Phase 2: server-side or headless render to PDF for archival quality.

## Testing strategy
- Golden output snapshots per form and sample dataset.
- Structural tests for required DepEd fields.
- Cross-form consistency tests (student counts, averages, attendance totals).

## Migration and rollout
1. Replace SF1 and SF4 with data-composed versions first.
2. Add SF8 and SF9 with health/grade integration.
3. Add SF5 promotion summary with rules engine.
4. Decommission placeholder report cards and simulated generation.

## Rollback strategy
- Keep legacy report components behind fallback switch.
- Freeze cutover per form (independent toggles) to minimize blast radius.

