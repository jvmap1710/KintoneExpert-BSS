# Discovery and analysis baselines

Use these artifacts as distinct baselines. Keep claims traceable to Source IDs
and separate evidence from interpretation.

## Discovery Intake

Register Survey, MoM, SOW, email, proposal, diagram, spreadsheet, and other
inputs before synthesizing them. For each source capture:

- Source ID, type, title, owner/author, date/version;
- authority: Contractual, Approved, Working, or Informal;
- confidentiality and relevant scope;
- review status and superseded source when applicable.

Classify extracted information as `Fact`, `Stakeholder Statement`,
`Commitment`, `Assumption`, `Constraint`, `Open Question`, `Conflict`, or
`Decision`. Never treat an informal email or Presales idea as equivalent to an
approved SOW commitment.

Primary artifacts:

- `DISCOVERY-EVIDENCE.xlsx` with Sources, Findings, Questions, Conflicts, and
  Decisions sheets;
- `DISCOVERY-SUMMARY` when a narrative deliverable is useful.

## Customer Context

Synthesize company/business-unit context, objectives and success measures,
stakeholders, scope, systems/data landscape, known pain points, constraints,
dependencies, SOW commitments, initial risks, glossary, assumptions, and open
questions.

Do not dump source text, silently merge conflicts, prescribe Kintone design, or
turn an unconfirmed statement into a requirement.

## Current-State Assessment / As-Is Analysis

Start with the business purpose, actors, and end-to-end process before app or
field detail. When supplied sources include spreadsheets, inspect their sheet
structure, headings, Notes/Actions, and related workflow documents together to
recover logical steps, branches, and hand-offs. Preserve meaningful sequence
and branches, but group related work where that improves readability. A layout
or field label alone is not proof of a business rule.

Cover process, actors/responsibilities/handoffs, systems and spreadsheets,
data ownership/quality, business rules, exceptions/workarounds, volume/SLA/KPI,
manual controls, pain points, root causes, compliance/security concerns,
standardization opportunities, open questions, and conflicts.

For each finding record evidence, impact, root cause, opportunity,
question/conflict, priority, and owner. Distinguish:

- symptom from root cause;
- requirement from solution idea;
- verified As-Is behavior from stakeholder recollection;
- standardization opportunity from an approved To-Be decision.

Use the shared evidence labels in
[`customization-assessment.md`](customization-assessment.md); existing
`Documented`, `Config observed`, and `Runtime verified` labels remain
compatible. Note source-versus-live differences as conflicts or gaps; do not
silently reconcile them. A reference-only/document-based assessment does not
require live browser evidence, but must not imply runtime validation. Trace
material rules, approvals, exceptions, and acceptance claims to evidence.
Inventory available per-app fields and relevant scripts in a separate
structure appendix when in scope; record unknown metadata and mapping gaps
without making 100% field mapping a gate. Describe script behavior only when
supported by source code or runtime evidence, never from a filename alone.

## Confirmation

Use `Draft -> Internal Reviewed -> Customer Reviewed -> Confirmed`. Record the
reviewer, date, unresolved assumptions, and accepted risks. Do not progress a
material conflict merely by omitting it from the final document.
