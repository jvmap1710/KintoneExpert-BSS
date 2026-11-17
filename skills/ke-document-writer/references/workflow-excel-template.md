# BA Workflow and Business Rules workbook

The packaged blank asset is `assets/KE-BA-Workflow-BusinessRules-Template-vi.xlsx`.
It is generated independently of customer workbooks. Never put customer
examples, diagrams, comments, hidden sheets, or customer data in this shared
asset.

Copy the blank asset to a new versioned path in the selected project's
`output/`; never edit the shipped asset or silently overwrite a prior or
BA-returned version. Keep Structure and Permissions in separate workbooks.

Use a short guidance sheet with simple paragraphs. Do not add a compulsory
instruction table, customer analysis, or questionnaire. Put one workflow on
each workflow sheet; one workbook may contain multiple workflows. Every
workflow sheet has exactly these eight columns, in this meaning and order.
The Vietnamese packaged asset uses the labels below; for a requested or
configured different output language, translate the labels while preserving
all eight meanings and their order:

1. `Assignees`
2. `Status before taking action`
3. `Conditions to take this action`
4. `Action Name`
5. `Status After Action Taken`
6. `Business Rules làm rõ bổ sung`
7. `Xử lý kèm theo (config bằng standard function/plugin native của Kintone)`
8. `Xử lý kèm theo (customize bổ sung bằng javascript)`

Keep business rules in the relevant workflow row; do not create a separate
Business Rules sheet or add extra workflow columns. Use plain language. Step
IDs, rule IDs, field codes, and other technical codes are optional references,
not required workbook content.
Show initial and end states in the status cells or a short note; do not invent
actions to represent them.

The Agent may create a Draft from an authorized source. The BA reviews and
edits that same workbook/template; keep versions for review history. Normalize
only clear, evidence-backed errors. Make every normalization visible to the BA
as a concise paragraph on the guidance sheet showing the original wording,
normalized wording, and supporting source; do not add a workflow column for
the change record. Do not resolve uncertain meaning by guesswork. Ask only
about unresolved material ambiguity, and identify the relevant workflow row
and source evidence.

The native Kintone/plugin and JavaScript columns are implementation proposals,
not verified capability or authorization. Leave them blank when the approach
is unknown; the BA can describe the desired behavior in the business-rule cell
without selecting an implementation. Any proposed native, plugin, or JavaScript
classification must be verified by LeBa against the available capability and
approved scope before implementation. Send the final workflow input to LeBa
from the BA-reviewed workbook when requested or already authorized as part of
implementation. Do not ask again for that authorized hand-off. A completed
or BA-confirmed workbook is not permission to inspect a tenant, build, or
deploy.

For diagram-based drafts, inspect the diagram visually as well as its extracted
text. Preserve useful source/version information and readable evidence without
stretching or obscuring the workflow sheet. Customer examples and source
material remain in the project workspace; share them only with explicit
authorization for that exact material.

Before delivery, follow `office-output.md`: validate, render and inspect the
guidance and representative workflow sheets, read content back, and confirm
that the eight headers, blank rows where applicable, and version are correct.
Keep an Agent-filled file labeled **Draft for BA Review** until the BA reviews
it.

Maintainers can reproduce the clean Vietnamese asset with the pinned runtime:

```powershell
node skills/ke-document-writer/scripts/build-workflow-template.mjs --output <new-xlsx-path>
```

The builder refuses existing destinations. Do not regenerate a customer file
with it; revise customer workbooks through the normal versioned review process.
