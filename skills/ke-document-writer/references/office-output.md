# Office output with OfficeCLI

Use the pinned OfficeCLI runtime to create native Word, Excel, and PowerPoint
deliverables. HTML remains KE's default standalone format.

## Output selection

When the user requests a saved deliverable without naming a format, offer only
the formats useful for that content:

1. HTML — portable, standalone, browser and print friendly;
2. DOCX — narrative documents for review, comments, and handover;
3. XLSX — field catalogues, backlogs, mappings, test cases, and structured
   registers;
4. PPTX — executive summaries, demos, training, and decision presentations;
5. Multiple formats — one approved content baseline rendered into selected
   formats.

If the user already names an extension or format, do not ask again. Keep HTML
as the backward-compatible default only when no format decision is needed.
Do not offer PDF by default: OfficeCLI PDF output requires a separately
configured exporter plugin.

## Runtime

Run the project-pinned binary through:

```powershell
npm --prefix platform/ke-office-cli run office -- <officecli arguments>
```

Verify it with:

```powershell
npm --prefix platform/ke-office-cli run check
```

Never use a globally installed or auto-updated binary when the pinned runtime
is available. The wrapper sets `OFFICECLI_SKIP_UPDATE=1` to disable OfficeCLI
update checks. When syntax,
element paths, or properties are uncertain, run `officecli help` through the
wrapper instead of guessing.

## Format mapping

- DOCX: MoM, BRD, solution blueprint, decision record, test report, user
  guide, SOP, and handover document.
- XLSX: field catalogue, requirement backlog, data mapping, test-case matrix,
  defect log, risk/action register, and migration reconciliation.
- PPTX: proposal, executive status, architecture walkthrough, demo script,
  training deck, decision workshop, and handover presentation.

Build native structure for the target format; do not simply paste the HTML
source into an Office file. For multiple formats, keep the same document ID,
version, facts, decisions, requirement IDs, and status across outputs while
adapting layout to the medium.

## Office quality loop

1. Inspect the destination and refuse silent overwrite.
2. Create or update the file under `projects/<project-slug>/output/`.
3. Close or save the resident OfficeCLI session before another tool reads the
   file.
4. Run `validate` and `view issues`.
5. Render with `view html` or `view screenshot` into
   `projects/<project-slug>/private/office-preview/<document-id>/`.
6. Inspect the render for overflow, clipped text, unreadable tables, broken
   images, missing labels, and inconsistent styles; fix and repeat.
7. Read key content back with `view text`, `view outline`, or structured
   `get/query` and reconcile it with the approved content baseline.
8. Report the final paths, formats, validation result, preview evidence, and
   any known rendering limitation.

Do not claim an Office file is complete merely because `create` or `add`
returned success. A deliverable is complete only after structural validation,
render inspection, and content read-back pass.

## Safety and templates

Use sanitized screenshots and synthetic examples. Do not add macros, external
data connections, OLE objects, remote images, or executable content unless the
user explicitly requests and approves them. Treat a supplied customer template
as source material: preserve it, create a new output file, and never overwrite
the original.

OfficeCLI is an Apache-2.0 project from
`https://github.com/iOfficeAI/OfficeCLI`; KE pins the npm runtime version for
repeatable builds.
