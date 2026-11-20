# Database Design v3 — Structure workbook contract

Use this as the default for creating and reading Structure workbooks. It
replaces the one-App-per-sheet convention for new Structure deliverables only.
Keep Workflow and Permissions as separate workbooks. Accept existing legacy
inputs without forcing conversion or overwriting a BA-approved baseline.

## Create a workbook

Start from the packaged template with clearly labelled synthetic examples
`../../ke-document-writer/assets/KE-BA-Structure-Template-v3.xlsx`.
Copy it to a new versioned project output file; keep the shared asset unchanged.
Examples teach filling conventions, not customer requirements. Remove example
values when creating a blank BA input; never carry them into a build baseline.
Do not recreate its layout from memory or use the customer-filled reference
as a public template. Extend blank rows/plugin blocks only as needed.

Use the document writer's Office output procedure to create a versioned XLSX
in the confirmed project's output directory. Create the following six sheets;
do not copy customer rows, comments, revision history or company metadata from
the reference workbook into a shared template. Do not create an alternative
one-App-per-sheet version unless requested.

| Sheet | Columns / content |
| --- | --- |
| Danh sách app | Space; App; Có workflow |
| Database | Space; App; Field Name; Field Code; Field Type; Field Group or Table; Required (x) or not?; Appearance Condition; Default Value; Value List; Formula; Key?; Config; Note; Customization |
| Plug-in | Independent named plugin blocks with their own headers; see below |
| Views | App; View No.; View Name; View type; Visible fields and column order; Filter; Sort by; Ascending/Descending |
| Customization | App; Subject; Customization Description |
| Value List | Controlled Field Type vocabulary used for entry validation |

Use Space + App to identify an App. If names are ambiguous across Spaces,
include Space in the other sheets or resolve the mapping explicitly. Field
codes are unique within an App, not across the workbook. Preserve natural
business labels; do not require BA to invent technical IDs for review.

Keep the source's clear section/header styling, wrapped text, sensible widths,
frozen headers and identity columns. Clear saved filters in a new blank file;
cover all data rows in filters. Use the Value List for Field Type dropdowns.
Keep a small explicitly synthetic example set and blank entry space, never
actual customer data. A short filling note is sufficient; do not
add a dense instruction table or unrelated sheets. Validate, render and inspect
the generated workbook and read content back before delivery.

## Read the entire workbook, not just visible rows

Inspect sheet names, headers, merged regions, rich-text runs, strikethrough,
colors, comments and hidden/filtered rows together with values. Render relevant
regions when visual meaning is unclear. Red text alone does not mean deleted.
Treat clearly struck-out text as superseded design text, not part of the new
field name/code; preserve a revision note. A struck-out item never authorizes
deleting a live field. Ask only if the surviving meaning is ambiguous.

Do not concatenate old and replacement codes. Do not forward-fill arbitrary
blank cells. In a merged configuration block, inherit only the merged parent
values within its bounds. Blank content outside that block remains unknown.
Keep source sheet/cell references for material rules and unresolved conflicts.

Resolve Field Group or Table against the declared container in the same App.
For a table inside a group, retain both levels; ask when the container cannot
be resolved. Labels/spaces and layout notes are not missing database fields.
PK/FK notation describes intent, not proof of implemented uniqueness/lookup.

## Plugin blocks have independent layouts

Detect each block from its title, local headers and merged boundaries. Blocks
can sit side by side: a physical row is not necessarily one logical record.
Do not hardcode source row numbers or use the first block's columns globally.
Recognize these source patterns without requiring every plugin in every project:

- Data Transfer: App, plugin, setting, conditions, events/actions, destination,
  match fields/operators, destination/source mappings and create-if-not-found.
- Conditional Display/Control: App, condition and output.
- Table Numbering: App and number field.
- Advanced Lookup: App, Lookup field, source field, operator, in-App field.
- Table Lookup: App, Lookup field, edit/automatic options, source/destination
  tables and column mappings.
- Related Records Auto-Calculation: App, triggers, related field, source field,
  calculation and output.
- Calculate and Fill: App, setting, events, conditions, field and value/formula.
- Conditional Table Summation: App, table, condition column/value, sum and output.
- Process Management History: App, history table and history-field mappings.

Create only requested plugin blocks, retaining plugin-specific headers rather
than imposing one universal table. Empty plugin scope can have an unfilled
instruction area. Preserve supplied legacy plugin names; compare their exact
version/capability with the plugin KB before proposing migration. Reading a
setting is not evidence the plugin is installed or configured.

## Customization: field detail plus project checklist

Read BOTH Database.Customization and the Customization sheet. The first records
field-specific calculations, defaulting, validation and behavior. The second is
the project checklist: it includes those field requirements AND cross-App or
other business rules that have no single field owner. Never discard a rule
because it appears only on the checklist.

Reconcile duplicates by App, subject, trigger, condition and intended effect,
not text similarity alone. Implement one confirmed rule once, retaining links
to both locations. Do not silently prioritize one location when they conflict;
raise the specific difference to BA. No compulsory code-based linking for BA.

For cross-App rules establish trigger, condition, source/target, matching key,
expected result and relevant no-match/retry/delete effects. Ask only material
missing questions; a useful review draft can mark unresolved items. Keep rules
inline in the workflow workbook when they belong to a workflow transition;
the checklist may summarize them without creating a competing definition.

Customization means a behavior requirement, not automatically JavaScript.
Evaluate standard configuration, documented plugin and custom implementation.
A checklist entry is not implementation completion or approval to write/delete.
BA-reviewed input can pass directly to LeBa; tenant access, installation,
deployment and test-data permissions remain independently scoped.
