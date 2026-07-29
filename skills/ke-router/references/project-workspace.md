# KE project workspace

Create or select one isolated workspace before reading customer sources or
creating persistent work for analysis, Demo/PoC, assessment, or Real Project.

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
| `PROJECT.md` | Concise current project dashboard and authoritative routing state |
| `TEAM-NOTES.md` | Structured working discussions, questions, conflicts and handoffs |
| `input/` | Sanitized customer-provided source material |
| `private/` | Raw files, PII, attachments and confidential evidence |
| `analysis/` | Evidence registers, working analysis and internal matrices |
| `output/` | User-facing standalone deliverables |
| `history/` | Archived closed notes and superseded internal baselines |

Apply `team-collaboration.md` whenever an expert joins or hands off. Keep
project inputs, transitions, analysis and outputs in the same workspace when
the user moves from analysis to Demo/PoC or Real Project. Create a second
workspace only when the user requests isolation or the customer/scope is
materially different.

Never place credentials, tokens, passwords, or unredacted production/personal
data in `PROJECT.md`, `TEAM-NOTES.md`, or `output/`. Customer project
directories are Git-ignored by default.
