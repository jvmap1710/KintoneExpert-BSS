# KE project workspace

For confirmed persistent analysis, Demo/PoC, assessment, or Real Project work,
create or select one isolated workspace before reading project sources or
creating saved project artifacts. First summarize the inferred project
identity and objective and get confirmation for a new workspace; do not ask
the user to repeat known details. Follow
`first-use-and-routing.md`. Self-contained offline advice and transient
analysis do not need a project workspace.

```powershell
./scripts/init-customer-project.ps1 -ProjectSlug acme-discovery `
  -DisplayName "ACME Discovery" -ProjectType analysis `
  -EntryRoute discovery-intake `
  -Objective "Synthesize Presales inputs and assess the current process"

./scripts/init-customer-project.ps1 -ProjectSlug acme-purchase-poc `
  -DisplayName "ACME Purchase PoC" -ProjectType demo `
  -EntryRoute demo-fast-track `
  -Objective "Validate the purchase-request approval experience"
```

Use a lowercase hyphenated slug containing only `a-z`, `0-9`, and `-`. The
initializer refuses to overwrite an existing workspace.

| Path | Purpose |
| --- | --- |
| `.ke-project.json` | Machine-owned authoritative state for project type, route, phase, gate, owner, handoff, next action, and revision; never edit directly |
| `PROJECT.md` | Human-readable dashboard and projection of current routing state, with baselines, blockers, and artifact links |
| `TEAM-NOTES.md` | Structured working discussions, questions, conflicts and handoffs |
| `input/` | Sanitized customer-provided source material |
| `private/` | Raw files, PII, attachments and confidential evidence |
| `analysis/` | Evidence registers, working analysis and internal matrices |
| `output/` | User-facing standalone deliverables |
| `history/` | Archived closed notes and superseded internal baselines |

Apply `team-collaboration.md` whenever an expert joins or hands off within a
persistent project. Keep
project inputs, transitions, analysis and outputs in the same workspace when
the user moves from analysis to Demo/PoC or Real Project. Create a second
workspace only when the user requests isolation or the customer/scope is
materially different.

Never place credentials, tokens, passwords, or unredacted production/personal
data in `PROJECT.md`, `TEAM-NOTES.md`, or `output/`. Customer project
directories are Git-ignored by default.
