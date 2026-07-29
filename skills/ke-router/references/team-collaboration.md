# Project context and team collaboration

Project state has one machine-owned source and two human-readable views:

- `.ke-project.json` is the machine-owned state for route, type, phase, gate,
  owner, handoff, next action, and revision. Do not edit it manually.
- `.codex/ke-active-project.json` points to the selected workspace. It is local
  state and must not be committed.

- `PROJECT.md` is the concise human-readable dashboard for phase, baselines,
  blockers, artifact links, ownership, and next action. For fields mirrored
  from `.ke-project.json`, the machine state is authoritative.
- `TEAM-NOTES.md` is the structured working log for findings, questions,
  conflicts, risks, proposals, decision requests, handoffs, test findings, and
  blockers. A note is not an approved requirement or decision by itself.

## Context preflight

Whenever an expert joins or resumes a project:

1. Run `node scripts/ke-project.mjs current` and
   `node scripts/ke-project.mjs validate`. If the intended project is not
   active, run `node scripts/ke-project.mjs use <slug>`.
2. Read `PROJECT.md`.
3. Read the current phase baseline(s) from its artifact index.
4. Read open Critical/High notes and notes targeted to that expert in
   `TEAM-NOTES.md`.
5. State the project, current phase, relevant confirmed baseline, open blocker,
   and the responsibility being accepted.
6. Perform the task without reopening confirmed decisions unless new evidence
   creates a material conflict.

Before leaving a task, append or update a structured note and update
the project through `node scripts/ke-project.mjs transition ...` when its route, type,
phase, gate, owner, handoff, or next action changed. Use
`node scripts/ke-project.mjs note add --from <json>` for concurrent-safe note IDs.
Content such as baselines, blockers, and artifact links may still be curated
in `PROJECT.md`, but do not hand-edit state-manager rows.

State writes are atomic and protected by a project-local lock. Validate after
each transition. Never select a project by folder timestamp or reuse active
state from another repository.

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
