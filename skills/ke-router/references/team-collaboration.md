# Project context and team collaboration

Use two project-local Markdown files:

- `PROJECT.md` is the concise current-state dashboard and source of truth for
  routing, phase, baselines, blockers, artifact links, ownership, and next
  action.
- `TEAM-NOTES.md` is the structured working log for findings, questions,
  conflicts, risks, proposals, decision requests, handoffs, test findings, and
  blockers. A note is not an approved requirement or decision by itself.

## Context preflight

Whenever an expert joins or resumes a project:

1. Read `PROJECT.md`.
2. Read the current phase baseline(s) from its artifact index.
3. Read open Critical/High notes and notes targeted to that expert in
   `TEAM-NOTES.md`.
4. State the project, current phase, relevant confirmed baseline, open blocker,
   and the responsibility being accepted.
5. Perform the task without reopening confirmed decisions unless new evidence
   creates a material conflict.

Before leaving a task, append or update a structured note and update
`PROJECT.md` when the phase, gate, baseline, blocker, owner, artifact index,
last handoff, or next action changed.

## Note contract

Assign a stable ID such as `NOTE-2026-001`. Record:

- date/time and author role;
- phase, type, priority, target role, and status;
- related Source IDs and artifacts;
- context and concise finding/question;
- impact;
- response/resolution;
- next action, owner, and due date when material.

Allowed types: `Finding`, `Question`, `Conflict`, `Assumption`, `Risk`,
`Proposal`, `Decision Request`, `Handoff`, `Test Finding`, and `Blocker`.

Allowed statuses: `Open`, `In Review`, `Answered`, `Confirmed`, `Closed`,
`Rejected`, and `Deferred`.

Do not overwrite another role's statement. Add a dated response and update the
status. Promote a confirmed decision into the authoritative business or
technical artifact, update `PROJECT.md`, and then close the note.

## Hygiene

- Keep notes concise and link to artifacts instead of copying documents,
  transcripts, source data, code, or test reports.
- Keep credentials and secrets out of both files. Put sensitive evidence under
  `private/` and reference only a safe relative path.
- Do not place unredacted personal or production data in notes.
- Archive closed notes from completed phases under
  `history/TEAM-NOTES-<phase>.md` when the active log becomes difficult to
  scan. Preserve note IDs.
- Never use context from another project workspace.
