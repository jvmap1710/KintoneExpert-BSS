---
name: ke-document-writer
description: "Create and maintain KE project deliverables such as meeting minutes (MoM), BRD, survey summaries, solution documents, test reports, decision records, hand-offs, and customer handover notes. Use when the user asks to write, update, save, version, format, or export a project document to standalone HTML."
---

# KE Document Writer

Create project documents from confirmed facts without copying template files.
Create HTML output only when the user requests a saved deliverable.

## Document workflow

1. Confirm the project slug, document type, owner, status, and source inputs.
2. Read source material only from `projects/<project-slug>/input/` and facts
   confirmed in the conversation. Treat `private/` as confidential input and
   never reproduce its raw contents in output.
3. Separate confirmed facts, decisions, assumptions, and open questions. Do not
   invent participants, policy, requirements, approvals, dates, or test results.
4. Write one standalone HTML file directly to
   `projects/<project-slug>/output/`. Do not create Markdown, template, or
   intermediate document files in the repository.
5. Inspect the target path before writing. If it exists, do not overwrite it.
   Propose a new version or ask for explicit overwrite confirmation.
6. Use a metadata table with document ID, version, project, owner, date,
   status, reviewers/approver, and related artifact IDs when applicable.
7. Apply `../ke-router/references/handoff-contract.md` when the document changes
   role ownership.

## HTML standard

Create semantic, standalone HTML with:

- UTF-8, `lang="vi"` unless another language is requested, responsive viewport,
  a meaningful `<title>`, and no remote assets.
- One `<main>` region, a clear `<h1>`, metadata table, logical heading order,
  accessible tables, and descriptive link text.
- Embedded CSS for screen and print. Use a readable system-font stack, strong
  contrast, restrained colors, page margins, and table overflow handling.
- No JavaScript unless the user explicitly needs an interactive deliverable.
- Escaped source text. Do not inject raw customer HTML or unsafe URL schemes.
- A footer containing the project slug, document ID/version, and generation
  date; never include credentials or private filesystem paths.

Use filenames such as:

- `MOM-YYYYMMDD-<topic>.html`
- `BRD-<project>-v<major>.<minor>.html`
- `SURVEY-SUMMARY-<topic>-v<major>.<minor>.html`
- `ADR-<number>-<topic>.html`
- `TEST-REPORT-<release>.html`
- `HANDOVER-<release>.html`

Increment the minor version for review edits and the major version for an
approved scope baseline. Do not silently replace an approved document.

## Data boundary

Treat everything under `projects/<project-slug>/private/` as non-public. Use
only aggregated or redacted facts derived from it. The `projects/` and
`output/` customer directories are Git-ignored by default, but still avoid
writing secrets, tokens, passwords, downloaded attachments, personal data, or
unredacted exports into generated HTML.

## Content standards

### Meeting minutes

Include purpose, participants or roles, discussion by topic, decision IDs,
actions with owner and due date, and open questions. Distinguish a discussion
statement from an approved decision.

### BRD

Include objective and measurable success, scope and exclusions, stakeholders,
As-Is and To-Be process, field catalogue, business rules and exceptions,
approval/notification logic, permissions/reporting/integrations, acceptance
criteria, assumptions, and open decisions. Link requirements to acceptance
criteria with stable IDs.

### Survey summary

Include population and response count, collection period, method, data-quality
limitations, aggregated findings, prioritized pain points, implications,
assumptions, and follow-up questions. Never expose respondent identities or
quote identifiable responses without authorization.

### Solution, test, and handover documents

Preserve requirement and decision IDs. State environment and Kintone app IDs
when relevant. Separate planned, configured, deployed, tested, and accepted
states; never imply that an unverified action succeeded.

## Convert supplied Markdown

When the user supplies a Markdown file under the project `input/` directory and
asks to convert it, run:

```powershell
node scripts/export-markdown-html.mjs --input `
  projects/<project-slug>/input/<document>.md
```

The converter writes to `projects/<project-slug>/output/<document>.html`, rejects
private inputs, and refuses to overwrite an existing HTML file. Use
`--overwrite` only after explicit confirmation.
