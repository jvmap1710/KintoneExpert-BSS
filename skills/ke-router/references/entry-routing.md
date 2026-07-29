# KE entry routing

Entry routes are user-selectable starting points, not mandatory sequential
steps. Accept a number, English label, localized description, or natural
language request.

| Choice | Entry route | Typical signal | Initial action |
| --- | --- | --- | --- |
| 1 | Discovery Intake | Survey, MoM, SOW, emails, Presales pack, source synthesis | Create/select analysis workspace; register and classify sources |
| 2 | Customer Context | Customer overview, stakeholders, objectives, scope, systems | Check G1; reuse evidence or fill only intake gaps |
| 3 | Current-State Assessment / As-Is Analysis | Current process, pain points, conflicts, root causes, standardization | Check G1–G2; assess and confirm As-Is |
| 4 | Future-State Design / To-Be Analysis | Target process, requirements, improvement opportunities | Check G2–G3; propose gap resolution when not ready |
| 5 | Demo / PoC Fast Track | Presales demo, prototype, PoC, proof of concept | Create/select demo workspace and run bounded fast-track readiness |
| 6 | Project Delivery | Implementation, production, go-live, real project | Create/select customer workspace and run delivery readiness with Tí |
| 7 | Existing Solution Assessment | Inspect, audit, optimize, troubleshoot an existing app/process | Create/select assessment workspace when artifacts should persist; start read-only |
| 8 | Expert Consultation / Expert Panel | Advice, options, trade-offs, multi-role review | Route one role or Cò; create a workspace only when context/artifacts should persist |

For a greeting, show the English term followed by a short description in the
configured chat language. Invite the user to reply with a number or natural
language.

## Routing rules

1. Prefer the described intent over a conflicting number and state the
   interpretation.
2. Extract known project identity, objective, entry route, and delivery track;
   never ask the user to re-enter known information.
3. Initialize or select one workspace before reading customer inputs or
   creating persistent artifacts.
4. Run the readiness check in `delivery-lifecycle.md` for any route after
   Discovery Intake. Do not assume upstream baselines are complete.
5. Reuse confirmed baselines and ask only for material missing information.
6. If the user uploads files without a clear instruction, ask whether to start
   Discovery Intake or attach them to an existing project. Do not inspect
   unrelated workspaces to guess.
7. Do not access Kintone from a menu selection alone. Confirm the target app
   and environment before inspection.
8. Do not treat Demo/PoC as permission to deploy, delete, or use production
   data.
9. If analysis transitions to Demo/PoC or Real Project, update `PROJECT.md`,
   append a handoff/transition note, and remain in the same workspace unless
   the user explicitly requests isolation.
10. If Demo/PoC transitions to Real Project, require a PoC-to-Production Gap
    Assessment; never treat the demo build as production-ready.

## Phase-transition response

When a user requests a new track after confirmed analysis:

1. State the current confirmed baseline.
2. Name the requested track.
3. State which work will be reused.
4. List the new readiness check and artifacts.
5. Ask for confirmation only when the transition creates new scope, writes,
   deployment, or a materially different outcome.

Example:

> Current-State Assessment is Confirmed. I will keep the existing Customer
> Context and As-Is baseline, switch this workspace to Demo / PoC Fast Track,
> and define the PoC objective, success criteria, assumptions, synthetic-data
> boundary, and production-hardening backlog.
