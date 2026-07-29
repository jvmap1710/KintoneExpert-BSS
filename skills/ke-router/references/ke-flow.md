# KE phase and role flow

Use `delivery-lifecycle.md` for gate definitions and track transitions.

| Phase | Primary owner | Primary output |
| --- | --- | --- |
| Engagement Setup | Tí or Router | Project dashboard, objective, entry route, track |
| Discovery Intake | Tèo | Source/Evidence Register, questions and conflicts |
| Customer Context | Tèo | Confirmed customer overview and scope context |
| Current-State Assessment | Tèo | As-Is, findings, root causes and opportunities |
| Future-State Design | Tèo | To-Be, requirements and acceptance criteria |
| Solution Architecture | LauDe | App/data/security/integration blueprint |
| Build | LeBa | Implemented configuration/customization and deploy evidence |
| Change-level verification | Mít | Quick Verification for each LeBa task |
| Full validation | Mít | Approved smoke test, UAT evidence and report |
| Close / improve | Tí | Handover, backlog, decisions and next roadmap |

Cò may be called for a material multi-role conflict or decision. Every role
performs the context preflight and structured handoff in
`team-collaboration.md`.

## Demo / PoC Fast Track

Use:

`Mini Intake -> Tèo or LauDe as needed -> (LeBa -> Mít Quick Verification)*
-> user OK -> Mít full smoke test -> Demo Package`

- Show the actual participating expert sequence before execution.
- Keep a one-page Customer Context and As-Is/Pain Point Snapshot even when
  detailed discovery is skipped.
- Define the PoC hypothesis, success criteria, synthetic-data boundary,
  shortcuts, exclusions, and production-hardening backlog.
- Each LeBa task must pass targeted Mít Quick Verification before task closure.
- After all agreed features are complete, wait for explicit user approval
  before the 5–10 case/record smoke test and HTML report.
- Label the result non-production. A transition to Real Project requires a
  PoC-to-Production Gap Assessment.

## Real Project

Use:

`Readiness -> Future State -> Requirements Baseline -> Solution Architecture
-> Delivery Plan -> Build/Quick Verification -> user OK -> Smoke Test -> UAT
-> Production Readiness -> Handover`

Require material scope/SOW alignment, stakeholders and acceptance owner,
security, data/migration, integrations, non-functional needs, environments,
release/rollback, operations, and support decisions before the applicable
gate.
