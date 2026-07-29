# KE delivery lifecycle

Treat entry routes as selectable starting points, not sequential menu steps.
Use the canonical lifecycle to control readiness and traceability:

`Engagement Setup -> Discovery Intake -> Customer Context -> Current-State
Assessment -> Future-State Design -> Solution Architecture -> Build & Quick
Verification -> user OK -> Smoke Test -> UAT -> Handover`

Phases may iterate. Skip a phase only when an existing confirmed baseline
satisfies its gate. Never infer readiness merely because the user selected a
later entry route.

## Quality gates

| Gate | Required evidence |
| --- | --- |
| G0 Engagement Confirmed | Project identity, engagement type, objective, active entry route, workspace |
| G1 Evidence Baseline Ready | Registered sources, authority classification, traceable findings, missing/conflicting information recorded |
| G2 Customer Context Confirmed | Objective, scope, stakeholders, systems, constraints, commitments, assumptions reviewed |
| G3 Current State Confirmed | End-to-end As-Is, evidence-backed pain points, root causes, material conflicts resolved or owned |
| G4 Solution Direction Approved | To-Be, prioritized requirements, acceptance criteria, scope and assumptions agreed |
| G5 Build Ready | App boundary, data/field design, workflow, security, integration and testable acceptance conditions |
| G6 Feature Complete | All agreed features deployed as required and each LeBa task passed Mít Quick Verification |
| G7 Release Evidence Ready | User approved full smoke testing; runtime evidence, 5–10 cases/records and HTML report completed |

Use `Draft -> Internal Reviewed -> Customer Reviewed -> Confirmed` for business
baselines. A customer-approved artifact or an explicitly accepted working
baseline may satisfy a gate. Record who confirmed it, when, and any accepted
risk.

## Readiness check

When the user selects Customer Context, Current-State Assessment, Future-State
Design, Demo/PoC, Project Delivery, or another later route:

1. Inspect `PROJECT.md`, the artifact index, and confirmed baselines.
2. Compare the requested start against the applicable gate.
3. Reuse confirmed work; do not recreate it.
4. List only material readiness gaps.
5. Offer the recommended earlier phase or an explicit fast-track assumption
   path when safe.
6. Update the current phase only after the user accepts the transition.

Critical gaps involving contract/scope, security, compliance, architecture, or
data ownership block progression. High-impact gaps must be resolved before
build. Medium gaps may continue as owned, dated assumptions. Low gaps may move
to backlog.

## Delivery-track transitions

Keep transitions inside the active project workspace:

- Analysis to Demo/PoC: create a bounded PoC objective, success criteria,
  synthetic-data boundary, assumptions, non-production limitations, and
  production-hardening backlog.
- Analysis to Real Project: run delivery readiness, then continue through
  Future-State Design and G4/G5.
- Demo/PoC to Real Project: preserve PoC evidence and create a PoC-to-Production
  Gap Assessment covering data, permissions, workflow exceptions,
  customization, integration, testing, operations, and support.
- Real Project to focused PoC: treat the PoC as a project branch in metadata,
  not as a new customer workspace, unless the user requests isolation.

Never treat a successful PoC as production readiness. Never reset confirmed
analysis merely because the delivery track changes.

## Minimum Demo/PoC Fast Track

`Mini Intake -> one-page Customer Context -> As-Is/Pain Point Snapshot -> To-Be
Hypothesis -> PoC Design -> Build/Quick Verification -> user OK -> Smoke Test`

Record the demo audience, deadline, success criteria, shortcuts, synthetic
data, exclusions, and production-hardening backlog.
