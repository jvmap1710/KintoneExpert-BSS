# KE entry routing

Entry routes are user-selectable starting points, not mandatory sequential
steps. Accept a number, English label, localized description, or natural
language request.

| Choice | Entry route | Typical signal | Initial action |
| --- | --- | --- | --- |
| 1 | Discovery Intake | A source package that needs registration, classification, or synthesis | For persistent intake, confirm the project then create/select an analysis workspace; process the sources needed for intake |
| 2 | Customer Context | Customer overview, stakeholders, objectives, scope, systems | Reuse confirmed evidence; resolve only material intake gaps |
| 3 | Current-State Assessment / As-Is Analysis | Current process, pain points, conflicts, root causes, standardization | Reuse available baselines; assess only missing or targeted As-Is facts |
| 4 | Future-State Design / To-Be Analysis | Target process, requirements, improvement opportunities | Use confirmed requirements; identify only gaps that affect the requested design |
| 5 | Demo / PoC Fast Track | Presales demo, prototype, PoC, proof of concept | For a persistent PoC, confirm the project then create/select its workspace; use only the intake/readiness needed for this PoC |
| 6 | Project Delivery | Implementation, production, go-live, real project | For a persistent delivery, confirm the project then create/select its workspace; coordinate roles only as needed |
| 7 | Existing Solution Assessment | Inspect, audit, optimize, troubleshoot an existing app/process | Route narrow questions directly; use a workspace when analysis or artifacts should persist; inspect read-only |
| 8 | Expert Consultation / Expert Panel | Advice, options, trade-offs, multi-role review | Route to the requested suitable expert or Cò; use a workspace only when work should persist |

For a greeting, show the English term followed by a short description in the
configured chat language. Invite the user to reply with a number or natural
language.

## Routing rules

1. Follow `first-use-and-routing.md`: a suitable explicitly requested expert
   takes priority; otherwise route by intent. Do not force PM, Cò, or any
   other member into an ad-hoc or direct-role request.
2. Prefer the described intent over a conflicting number and state the
   interpretation.
3. Extract known project identity, objective, entry route, and delivery track;
   never ask the user to re-enter known information.
4. For persistent work, confirm the interpreted project identity/objective,
   then initialize or select one workspace before reading project sources or
   creating saved project artifacts. Self-contained offline answers do not
   need a workspace.
5. Apply only the readiness gates relevant to the requested project work.
   Reuse confirmed baselines and ask only for material missing information;
   route to a prior phase only when its missing evidence blocks the request.
6. If files are uploaded without a clear instruction, ask whether the user
   wants a conversational summary, a persistent Discovery Intake, or to attach
   them to an existing project. Do not inspect unrelated workspaces to guess.
7. Do not access Kintone from a greeting or menu selection alone. Confirm the
   target App/environment and that live inspection is needed.
8. Do not treat Demo/PoC as permission to deploy, delete, or use production
   data. Follow the same explicit operation-level approval gates as other work.
9. If a persistent analysis transitions to Demo/PoC or Real Project, update
   `PROJECT.md`, append a transition note, and remain in the same workspace
   unless the user requests isolation.
10. If Demo/PoC transitions to Real Project, require a PoC-to-Production Gap
    Assessment before reusing it as a production input.
11. For a Demo/PoC, use Tèo's Mini Intake only to resolve material requirement
    gaps. An architecture-led request may start with LauDe; a confirmed,
    build-ready spec may go directly to LeBa. Tí is not a default participant.
12. Broad Existing Solution Assessment may need Tí for cross-role coordination;
    narrow role-specific diagnostics route directly to that expert.

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
