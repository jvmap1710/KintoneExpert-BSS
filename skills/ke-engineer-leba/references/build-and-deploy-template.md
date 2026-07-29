# Build and deploy template

## Build identity

| Item | Content |
| --- | --- |
| Objective / acceptance | Requirement and acceptance IDs |
| Environment / App | Tenant label, App ID, exact safe URL |
| Baseline | Live revision and inspected settings |
| Approved scope | Fields, layout, views, workflow, permissions, customization |
| Execution channel | MCP or approved official REST/UI per operation |

## Change inventory

| Change ID | Requirement | Component | Before | Intended after | Channel | State |
| --- | --- | --- | --- | --- | --- | --- |
| CHG-001 | FR-001 |  |  |  | MCP / REST / UI | PLANNED |

Use only clear states: `PLANNED`, `STAGED`, `DEPLOYED`, `RUNTIME VERIFIED`, or
`BLOCKED`. Never collapse staged, deployed, and runtime-verified states.

## Verification and deployment gates

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
