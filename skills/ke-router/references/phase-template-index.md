# Phase template index

Use this index after a project workspace is selected. Load only the templates
for the current phase and the next hand-off; do not create every document by
default. A template structures confirmed facts but never authorizes a Kintone
write, deployment, test-data mutation, or external action.

| Lifecycle phase / gate | Owner | Required working template | Completion gate |
| --- | --- | --- | --- |
| Engagement Setup / G0 | Ti (PM) | `ke-pm-ti/references/delivery-plan.md` and `project-control-template.md` | Identity, route, outcome, scope, owner, success measure, risks, and workspace are explicit |
| Discovery Intake / G1 | Teo (BA) | `ke-ba-teo/references/intake-template.md` and `discovery-assessment-template.md` | Sources, authority, missing/conflicting evidence, and initial findings are traceable |
| Customer Context / G2 | Teo (BA) | `ke-ba-teo/references/discovery-assessment-template.md` | Objective, scope, stakeholders, systems, constraints, commitments, and assumptions are reviewed |
| Current-State Assessment / G3 | Teo (BA) | `ke-ba-teo/references/discovery-assessment-template.md` | End-to-end As-Is, pain points, root causes, and material conflicts are confirmed or owned |
| Future-State Design / G4 | Teo (BA) | `ke-ba-teo/references/requirements-catalog-template.md` and `brd-outline.md` | To-Be, requirements, rules, exceptions, and acceptance criteria have stable IDs |
| Solution Architecture / G5 | LauDe (SA) | `ke-sa-laude/references/solution-blueprint.md` | App/data/security/integration decisions are build-ready; open decisions are visible |
| Build / stage / deploy | LeBa (Engineer) | `ke-engineer-leba/references/build-and-deploy-template.md` | Changes are read back; deploy gate and staged/deployed/runtime state are unambiguous |
| Quick Verification / G6 | Mit (Tester) | `ke-tester-mit/references/quick-verification-result-template.md` | One to three changed behaviors return PASS, FAIL, or BLOCKED before LeBa closes the task |
| Smoke Test / G7 | Mit (Tester) | `ke-tester-mit/references/test-case-template.md`, `smoke-test-evidence.md`, and `uat-release-template.md` | User approved the run; 5-10 cases/records, runtime evidence, HTML report, and recommendation are complete |
| UAT / release | Mit (Tester) | `ke-tester-mit/references/test-case-template.md` and `uat-release-template.md` | Business acceptance, defects, residual risks, and release recommendation are explicit |
| Handover / improve | Ti (PM) | `ke-pm-ti/references/handover-improvement-template.md` | Ownership, support, accepted scope, backlog, and sign-off are recorded |
| Cross-phase decision | Co (Expert Panel) | `ke-expert-panel-co/references/decision-record.md` | One decision owner, status, rationale, and action owner are recorded |

When the user asks to save a deliverable, pass the completed working content to
`$ke-document-writer`. Apply the configured document language and output
format, and write the final artifact under
`projects/<project-slug>/output/`. Templates remain inside their skill folders;
do not copy blank templates into customer workspaces.
