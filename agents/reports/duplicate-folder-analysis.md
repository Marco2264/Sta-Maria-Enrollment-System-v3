# Duplicate Folder Analysis

Date: 2026-05-27

## Finding
The repository contains both:
- `.agents/`
- `agents/`

These are **not duplicates by function**.

## Purpose separation
- `.agents/`
  - Existing tool/skill workspace metadata (example: shadcn skill assets/rules).
  - Intended for agent tooling configuration and skill internals.
- `agents/`
  - Project modernization tracking workspace required by current implementation process.
  - Contains progress, analysis, plans, reports, and logs.

## Risk
- Team confusion due to similar naming.
- Contributors may place operational docs in `.agents` by mistake.

## Recommendation
1. Keep both folders, but treat them as separate domains:
   - `.agents` = tooling
   - `agents` = project governance artifacts
2. Add a short note in `README.md` clarifying this distinction.
3. Optionally add a root `AGENTS_USAGE.md` with folder usage rules.

## Decision applied
- Canonical project workspace folder remains `agents/`.
- Tooling folder `.agents/` remains intact for agent skill compatibility.
- To avoid duplicate-folder confusion in VS Code Explorer, `.agents` is hidden via:
  - `.vscode/settings.json` -> `files.exclude[".agents"] = true`

## Related structural duplication (code)
- Route-level page variants exist in both:
  - `src/pages/*.tsx` (legacy)
  - `src/pages/{admin|teacher|parent|auth}/*.tsx` (active via router imports)
- These are functionally overlapping modules and should be consolidated in a later cleanup phase.
