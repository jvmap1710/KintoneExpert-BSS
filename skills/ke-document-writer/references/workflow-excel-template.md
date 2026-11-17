# BA Workflow and Business Rules workbook

Packaged blank asset (relative to this skill):
`assets/KE-BA-Workflow-BusinessRules-Template-vi.xlsx`.
It is generated independently of customer workbooks; no customer samples,
diagrams, comments, hidden sheets or stale shared strings belong in this asset.

Copy it to a new versioned path in the selected project's `output/`; never edit
the shipped asset or overwrite a BA-returned workbook. It has three sheets:

1. `01_HuongDan`: short plain paragraphs and a small synthetic text example;
   no fixed instruction table, customer analysis or Agent questionnaire.
2. `02_Workflow`: App, step ID, current state, action, next state, actor,
   recipient, condition, related rule IDs, notes.
3. `03_BusinessRules`: App, rule ID, rule name, applicable step/global scope,
   trigger, condition, business result, notification/recipient, exceptions.

Keep input rows blank when providing a form. Use short business wording in
headers and filled cells. Mark real unknowns locally, not with long speculative
technical notes. Identify initial/end states in notes without fictitious actions.
IDs are document references, not Kintone IDs. Preserve source-language status
labels where exact mapping matters. Apply configured output languages; this
Vietnamese asset is a starting layout, not an override of language preferences.

For an Agent-filled deliverable, work with Teo's
`../../ke-ba-teo/references/workflow-excel-intake.md` interpretation contract.
Fill the two work sheets, or add two clearly named sample tabs while preserving
the blank form if the user requests examples. Add source diagram regions with
captions beside/below the related sample and preserve readability/aspect ratio.
Do not stretch a full diagram into unreadable labels or overlap the table.
Use only authorized project sources; customer samples/images remain project-local
unless publication of that exact material is explicitly authorized.

Before delivery, use the Office quality loop in `office-output.md`: validate,
render/inspect representative instructions and tables, read content back, and
verify references and blank rows where applicable. Retain the Draft for BA
Review label until content acceptance; acceptance is not deployment authority.

Maintainers can reproduce the clean Vietnamese asset with the pinned runtime:

```powershell
node skills/ke-document-writer/scripts/build-workflow-template.mjs --output <new-xlsx-path>
```

The builder refuses existing destinations. Do not regenerate a customer file
with it; revise that file through the normal versioned review workflow.
