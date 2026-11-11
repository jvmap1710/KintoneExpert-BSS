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

## Customer-phase input folders

A request such as "where should I upload Phase 2 documents?" authorizes
preparing that folder inside a clearly identified, confirmed existing project;
do not add an approval prompt. Select the project explicitly and run
`node scripts/ke-project.mjs use --project <slug>` and
`node scripts/ke-project.mjs validate --project <slug>`. Do not infer a project
from recency. If the project or customer phase is unclear, ask only for the
missing detail before creating anything. This does not apply to greetings or
hypothetical advice, and it never creates a project.

Use `input/<phase>/` for sanitized inputs and `private/<phase>/` for raw or
confidential inputs under the existing privacy boundary. Reuse an unambiguous
existing phase folder as-is, including labels such as `Phase 2`; never rename,
move, or overwrite its contents. If none exists, create only that directory,
preferably with a simple stable name such as `phase-2`. Before creating it,
ensure the target and resolved ancestors
stay inside the validated project and the intended `input/` or `private/`
directory; reject traversal and symlink/junction/reparse-point escapes, and
never treat `projects/_template/` as a customer workspace. Verify the directory
exists and return its real absolute path. Claim it was created only if this
operation created it; if creation or verification is blocked, say so and give
manual creation as a fallback.

Folder creation is not a KE workflow transition or gate approval. Keep the
same workspace when continuing the same customer/system and comparing its
baseline; make another project only for explicit isolation or materially
different customer/scope. Preserve prior-phase baselines. When analyzing new
phase material, separate changes, new requirements, retained requirements,
questions, and conflicts; keep analysis and outputs in the same project.
Accept new requirements while an earlier baseline is draft, and mark only
unresolved dependency decisions as blocked. Create no other phase folders by
default.

Apply `team-collaboration.md` whenever an expert joins or hands off within a
persistent project. Keep
project inputs, transitions, analysis and outputs in the same workspace when
the user moves from analysis to Demo/PoC or Real Project. Create a second
workspace only when the user requests isolation or the customer/scope is
materially different.

Never place credentials, tokens, passwords, or unredacted production/personal
data in `PROJECT.md`, `TEAM-NOTES.md`, or `output/`. Customer project
directories are Git-ignored by default.
