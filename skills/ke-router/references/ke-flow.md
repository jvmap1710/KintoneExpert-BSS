# KE phase and role flow

This table describes role ownership when a phase is needed; it is not a
required sequence. Users may invoke one suitable expert directly. Use
`delivery-lifecycle.md` for gates that apply to persistent project work, not
to force every request through every phase.

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

Cò may be called for a material multi-role conflict or decision. Within a
persistent project, each participating role performs the context preflight and
structured handoff in `team-collaboration.md`. For ad-hoc advice, answer the
requested question without creating project state or switching roles unless
the user asks.

## Demo / PoC Fast Track

When the user asks for coordinated Demo / PoC delivery, a typical path is:

`(Tèo Mini Intake if requirements gap | LauDe for architecture-led work |
LeBa for approved build-ready spec) -> (LeBa -> Mít Quick Verification)*
-> user OK -> Mít full smoke test`

- Show the actual participating expert sequence before execution; skip
  unneeded experts and completed work.
- Keep a one-page Customer Context and As-Is/Pain Point Snapshot even when
  they are needed to define a safe PoC; reuse confirmed material rather than
  recreating it.
- Define the PoC hypothesis, success criteria, synthetic-data boundary,
  shortcuts, exclusions, and production-hardening backlog.
- Each LeBa task must pass targeted Mít Quick Verification before task closure.
- After all agreed features are complete, wait for explicit user approval
  before the 5–10 case/record smoke test and HTML report.
- Label the result non-production. A transition to Real Project requires a
  PoC-to-Production Gap Assessment.

## Real Project

When the user requests coordinated Real Project delivery, relevant phases may
include:

`Readiness -> Future State -> Requirements Baseline -> Solution Architecture
-> Delivery Plan -> Build/Quick Verification -> user OK -> Smoke Test -> UAT
-> Production Readiness -> Handover`

Apply the gates relevant to the agreed scope. Require material scope/SOW
alignment, stakeholders and acceptance owner,
security, data/migration, integrations, non-functional needs, environments,
release/rollback, operations, and support decisions before the applicable
gate.
