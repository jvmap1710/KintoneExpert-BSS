# {{DISPLAY_NAME}}

> KE's project-local dashboard and current source of truth. Every expert reads
> this file, the referenced current baseline, and open targeted items in
> `TEAM-NOTES.md` before acting.

## Project identity

| Property | Value |
| --- | --- |
| Project ID | `{{PROJECT_SLUG}}` |
| Engagement type | {{PROJECT_TYPE}} |
| Display name | {{DISPLAY_NAME}} |
| Created | {{CREATED_DATE}} |
| Objective | {{OBJECTIVE}} |
| Entry route | {{ENTRY_ROUTE}} |
| Delivery track | {{DELIVERY_TRACK}} |
| Current phase | {{CURRENT_PHASE}} |
| Current gate | G0 — Engagement Confirmed |
| Active owner | KE Router |
| Environment | Analysis / Test |

## Baseline status

| Baseline | Status | Version / artifact | Confirmed by / date |
| --- | --- | --- | --- |
| Evidence baseline | Not started | — | — |
| Customer Context | Not started | — | — |
| Current State | Not started | — | — |
| Future State | Not started | — | — |
| Solution Architecture | Not started | — | — |

Allowed baseline states: `Not started`, `Draft`, `Internal Reviewed`,
`Customer Reviewed`, and `Confirmed`.

## Scope and assumptions

### In scope

- {{OBJECTIVE}}

### Out of scope

- Not established.

### Critical assumptions

- None recorded.

## Open blockers

- None recorded.

## Artifact index

| Artifact | Status | Safe relative path | Owner |
| --- | --- | --- | --- |
| Team collaboration log | Active | `TEAM-NOTES.md` | All KE experts |

## Delivery state

| Property | Value |
| --- | --- |
| Last handoff | None |
| Next action | Complete readiness check for {{ENTRY_ROUTE}} |
| Next owner | KE Router |
| Last updated | {{CREATED_DATE}} |

## Workspace

- `input/`: sanitized customer-provided source material.
- `private/`: raw files, PII, attachments, and confidential evidence.
- `analysis/`: working registers and analysis artifacts.
- `output/`: user-facing standalone deliverables.
- `history/`: archived phase notes and superseded internal baselines.

## Rules

- Keep this dashboard concise; put working discussion in `TEAM-NOTES.md`.
- Promote confirmed decisions into the authoritative artifact before closing
  the related note.
- Update phase, gate, baselines, blockers, artifact index, handoff, next
  action, owner, and timestamp when they change.
- Never place credentials, secrets, or unredacted personal/production data in
  this file or user-facing output.
- Never read or reuse context from another customer project.
