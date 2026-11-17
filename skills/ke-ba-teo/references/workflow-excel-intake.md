# Workflow and Business Rules intake

Support either entry without requiring a PM/SA or tenant connection:

- **Agent draft:** read the authorized diagram or description and create a
  **Draft for BA Review** from the shared workbook template.
- **BA completion:** provide a project-local copy of the blank template. The
  BA edits that same workbook/template. On return, review the BA-edited copy
  against the prior version when available and preserve the submitted versions.

Use the asset, sheet, and exact column contract in
`../../ke-document-writer/references/workflow-excel-template.md`. Keep one
workflow per workflow sheet, with multiple workflows allowed in one workbook.
Keep Structure and Permissions in separate workbooks. Rules belong inline in
the applicable workflow row; do not create a separate Business Rules sheet.
IDs and codes are optional and must not be required to use the form.

## Source interpretation

Read diagrams visually as well as through extracted text. Trace connectors,
arrow direction, branches, waiting states, returns, reassignment loops, and
cross-App conditions. Inspect unclear connections at higher resolution before
asking a question. Do not declare a path missing solely because it is absent
from text extraction. Distinguish source statements from BA-confirmed
clarifications; neither alone proves live implementation. Preserve concise
source/version information.

Describe the business process in plain language: who is assigned, the status
before acting, conditions for the action, the action, the resulting status,
and any relevant business rule or desired behavior. Do not invent an actor,
missing-value behavior, automation trigger, or policy to remove an unknown.
Step IDs, rule IDs, and field codes are optional references, not a requirement.
Do not ask speculative questions about reopening or hypothetical cardinality.

Normalize only clear, evidence-backed errors. Make each correction visible to
the BA in a concise change note containing the original wording, normalized
wording, and supporting evidence. Do not silently change uncertain meaning or
resolve a conflict by assumption. Ask only about unresolved material
ambiguity; name the affected workflow row and show the relevant source evidence.

The native Kintone/plugin and JavaScript columns express implementation
proposals only. Do not present a classification as verified until LeBa checks
the actual Kintone/plugin capability and approved scope. If the implementation
approach is unknown, leave those columns blank; the BA may state desired
behavior in the business-rule cell without selecting an approach. Keep
technical capability questions for the LeBa hand-off, not as mandatory BA
questions.

## Review and return

Check that each workflow is on its own sheet and the eight column meanings and
order match the template. Use the packaged Vietnamese headers unless the
requested/configured output language calls for translated labels; do not add
columns. Confirm that status/action transitions are understandable, branch
conditions and assignees are clear where the source establishes them, and
initial/end states are identifiable without fictitious actions. Check that
business rules remain inline with the relevant workflow and that no separate
rule or Structure/Permissions workbook has been folded in. Show unresolved
material gaps without claiming build-ready.

The Agent creates a Draft for BA Review; the BA edits that same workbook and
the BA-reviewed workbook becomes the final workflow input for LeBa when the
user requests that hand-off or implementation is already authorized. Do not
ask again for an already authorized hand-off. A workbook upload, BA review, or content
confirmation alone does not authorize tenant inspection, writes, deployment,
or test records. Preserve prior versions and approvals; do not silently
overwrite them.
