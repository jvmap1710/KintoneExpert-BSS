# Workflow and Business Rules intake

Support either entry without a mandatory PM/SA or tenant connection:

- **Agent fills:** read the user-authorized diagram/text, follow connectors,
  arrow directions, loops and labels, then fill the workbook for BA review.
- **BA fills:** provide a project-local copy of the blank template. On return,
  read both sheets, compare with the prior version when available, preserve BA
  edits and IDs, and ask only about material omissions or contradictions.

Use the asset and layout contract in
`../../ke-document-writer/references/workflow-excel-template.md`.
Structure stays separate; do not recreate its field catalogue in this file.

## Source interpretation

Read the diagram visually as well as its extracted text. Inspect unclear
connectors at higher resolution before asking a question. Trace incoming and
outgoing paths, reassignment loops, waiting states and cross-App conditions.
Do not declare a missing path solely because it was absent from text extraction.
Distinguish user-confirmed clarification from the source diagram; neither is
proof of a live implementation. Preserve a short source/version record.

Write business facts in plain terms: who acts, who receives work, the condition,
and the result. Do not mix implementation speculation (native action support,
API/query, assignee configuration) into BA input/sample cells. Do not introduce
unrequested questions about reopening or hypothetical cardinality. Conversely,
do not invent an actor, missing-value behavior, automation trigger or a rule
just to remove an unknown. Put `Chưa chốt` (or the document-language equivalent)
in the relevant cell for a real unresolved requirement.

Ask only material business questions, identifying the exact step ID and
`current state → action → next state`; quote or show the relevant diagram
region. Do not ask again about an explicit arrow or a confirmed answer. Put
technical verification in the Engineer handoff rather than the BA table.
Project-specific rules (e.g. selecting the newest related record) are never
universal template defaults.

## Review and return

Check that step/rule IDs are unique, cross-references resolve, branch conditions
are understandable, initial/end states are identifiable, and waiting/return
paths follow evidence. Show remaining business gaps without claiming build-ready.
Agent-filled work is **Draft for BA Review**. Keep user-confirmed decisions in
project notes and the next workbook version; do not silently overwrite prior
versions or approvals. A returned Excel file or BA content confirmation alone
does not authorize tenant writes, deployment or test records.
