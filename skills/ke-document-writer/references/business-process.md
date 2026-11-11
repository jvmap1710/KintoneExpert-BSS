# Business-process and current-state documents

Use this guide for business-process, As-Is/current-state, and workflow
documents. Keep detail proportional to the request and evidence. A document
based on supplied references can be useful without live browser evidence; do
not describe runtime behavior as verified unless it was observed.

## Narrative and evidence

Lead with the business purpose/outcome, then actors and responsibilities,
end-to-end flow, main path, exceptions, and business rules. Put app mechanics,
field inventories, and implementation detail in a technical appendix so the
business meaning remains clear in the main narrative.

Distinguish what source documents state, what live configuration shows, and
what runtime evidence verifies. Preserve source-versus-live differences as
visible gaps or conflicts; do not guess a reconciliation. Trace material
rules, approvals, exceptions, and decisions to evidence, without requiring a
formal trace link for every field or sentence.

For consistent labels and JavaScript limits in BA assessments, use the shared
[BA evidence guide](../../ke-ba-teo/references/customization-assessment.md).

For a useful structure appendix, inventory available per-app field groups and
fields, including labels, codes, types, requiredness, source, conditional rules,
business mapping, and next action as available. Include app relationships and
App Actions; distinguish lookup, related-record display, action-initiated
record creation, and automation. Mark missing details unknown or needing
confirmation rather than implying full coverage. List relevant script files
even when only metadata is available; mark event and behavior unknown unless
source code or runtime evidence supports them. A filename alone cannot
establish behavior.

## Visuals

Choose the visual that matches the question:

- A business-process/swimlane diagram shows work steps, actors, hand-offs, and
  decision branches.
- A state-transition diagram shows statuses and the events or rules that move
  work between them.
- A data-flow diagram shows data origins, transformations, and destinations.
- A form-structure diagram shows field groups and their organization; do not
  connect field groups with sequential arrows as though they were process
  steps.

Keep real process order and branches legible, while grouping related steps when
that improves comprehension. Cross-check every diagram against its supporting
table and narrative for consistent actors, sequence, labels, branches, and
rules. Use standalone HTML or SVG that remains readable on screen and in print;
keep assets local/embedded and ensure text is legible at page scale.

## Readability check

Keep the main flow understandable as trigger → actor and App → action →
outcome. For each App described, make its purpose, users, record timing,
inputs/action/output, relationships, status-versus-approval meaning, and known
exceptions or evidence gaps clear; the BA
[per-app profile](../../ke-ba-teo/references/discovery-assessment-template.md)
is a prompt, not a mandatory set of headings. Show master/reference data beside
the main sequence unless creating or maintaining it is itself a process step.
For example, selecting a supplier from a catalogue is not a supplier-setup
step in every purchasing request. Define acronyms in context on first use and
add a short glossary when terms need to be reused or clarified.
