# Build and deploy template

## Build identity

Plan status: `PREFLIGHT`, `DRAFT - NOT RECONCILED WITH TENANT`, or
`READY FOR BUILD REVIEW`. Ready for review is not approval to execute.
Use Draft while material design, target, access, or inspection evidence is
missing; list those gaps rather than guessing creation/reuse decisions.

| Item | Content |
| --- | --- |
| Objective / acceptance | Requirement and acceptance IDs |
| Environment / App | Tenant label, App ID, exact safe URL |
| Baseline | Live revision and inspected settings |
| Approved scope | Fields, layout, views, workflow, permissions, customization |
| Execution channel | MCP or approved official REST/UI per operation |

## Design-to-tenant reconciliation

| Component / requirement | Design source / version | Inspected target / revision | Evidence / limits | Disposition | Dependency / open question |
| --- | --- | --- | --- | --- | --- |
|  |  |  |  | Reuse / Modify / Create / Needs clarification |  |

Record Config/API/MCP outcomes separately (`PASS`, `FAIL`, `BLOCKED`, or
`NOT RUN`) with executed-check evidence. Include operation-level tool/policy
availability; neither connectivity nor credentials establish write approval.
State the authorized inspection boundary, changes proposed for approval,
and any excluded/unverified remainder. Do not mark absent/denied evidence as
proof a new Space/App is needed.

## Whole-build capability inventory

List every applicable operation, including Space/UI prerequisites and runtime
verification, before proposing one consolidated configuration change. Use
exact verified tool names rather than guessing names from the examples below.

| Operation / dependency | Target / environment | Channel / exact server and tool | Read / write effect | Policy / approval | Installed / configured / session loaded | Verification evidence / blocker |
| --- | --- | --- | --- | --- | --- | --- |
| Space inspection / creation / App placement |  |  |  |  |  |  |
| App / fields / layout / views / new-App icon |  |  |  |  |  |  |
| Lookup / related records / actions |  |  |  |  |  |  |
| Workflow / permissions |  |  |  |  |  |  |
| JS/CSS attachment, if needed |  |  |  |  |  |  |
| Read-back / deployment / status polling |  |  |  |  |  |  |
| Playwright runtime evidence / scoped testing |  |  |  |  |  |  |

Split rows when tools/effects/approvals differ. Mark unneeded operations `N/A`
with a reason and unknown tool names `UNRESOLVED`. Record any required config
change, dependency scope, user approval reference, one planned consolidated
initial host reload after setup is ready, and the post-load inventory check.
Respect user-owned tool filters; do not plan a routine read-only-filter
restoration. Configuration approval is not tenant-operation approval. Do not
validate write availability by executing an unapproved write.

## Change inventory

| Change ID | Requirement | Component | Before | Intended after | Channel | State |
| --- | --- | --- | --- | --- | --- | --- |
| CHG-001 | FR-001 |  |  |  | MCP / REST / UI | PLANNED |

Use only clear states: `PLANNED`, `STAGED`, `DEPLOYED`, `RUNTIME VERIFIED`, or
`BLOCKED`. Never collapse staged, deployed, and runtime-verified states.

## Verification and deployment gates

Permission work: apply `permission-workbook-intake.md`. Record source/version
and ranges, visual/merge/comment inspection, excluded revision scopes, resolved
App/field/principal identities, ordered active ACLs and approved grant/revoke
differences. Preserve out-of-scope entries. Read staged/released ACLs back and
separate configuration evidence from permitted role-based allow/deny checks;
do not call admin-only inspection proof of restricted-user access.

For each newly created App, record the chosen icon, rationale/branding match,
staged read-back, and released evidence (or explicit blocker). Reused App icons
are unchanged unless approved. Stage icons before the first deploy when possible.

Sample-data status: `NOT REQUESTED`, `OFFERED - AWAITING APPROVAL`, `DECLINED`,
or `APPROVED / CREATED` with the actual execution state distinguished. Record
Apps/environment, quantities, scenarios, approval reference and created IDs
only when applicable. Build/release approval alone does not authorize records;
after release/icon verification, offer once and wait unless already requested.

| Gate | Evidence | Result |
| --- | --- | --- |
| Preflight | MCP/runtime/config checks |  |
| Read-back | Staged settings match approved scope |  |
| Safety | No unintended deletion; complete workflow payload where applicable |  |
| Deploy approval | Approver and approval reference |  |
| Deployment | Revision and final `SUCCESS` state |  |
| App link | Output of the safe `app:url` command |  |
| Runtime | Playwright evidence ID or explicit `BLOCKED` reason |  |
| Mit Quick Verification | Result and evidence |  |

## Rollback and hardening

- Rollback/recovery approach:
- Data or compatibility risk:
- Demo/PoC shortcuts:
- Production-hardening backlog:
- Remaining unverified behavior:
