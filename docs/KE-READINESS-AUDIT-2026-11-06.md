# KE Kit — Real Project Readiness Audit

Date: 2026-11-06 (Asia/Bangkok). Baseline: Kit 1.0.22 plus local Kintone MCP update.

Update 2026-11-09: the bounded offline fixes now pass fresh-bundle regression,
validation and package dry-run. See the [closing report](KE-CLOSING-REPORT-2026-11-09.md)
for current evidence and remaining gates. Findings below remain the historical
baseline; this update does not mark every finding resolved or establish live
tenant/browser readiness.

## Responsibility and scope

- Primary agent: Auditor / Planner. Owns evidence review, priorities, acceptance criteria and readiness conclusion.
- Luna (gpt-6-luna, reasoning max): Worker / Developer. Performs assigned implementation and verification; reports evidence to Auditor.
- This assignment applies to the current Kit maintenance work. It does not rename KE product roles.
- Authorization now includes readiness hardening. Completed to date: the MCP dependency update and shared-compass governance integration. Other readiness findings below remain pending implementation.
- Each delegated work order specifies scope/files, acceptance checks, boundaries, and evidence to return. The Auditor checks the diff and relevant tests before making readiness claims. This current role split does not prescribe worker identities for future installed users.
- Reviewed: routing/role instructions, lifecycle, project state/notes, installer/migration, MCP/REST helpers, browser setup, document output, CI, prompt eval and E2E harness.

## Verdict

Suitable for supervised BA work and controlled test/PoC delivery. NOT yet approved as an autonomous production delivery system or a reliable automated production release gate.

The lifecycle is well described, but important controls remain instructions interpreted by the model. They are not all enforced by the implementation. Passing the current regression suite does not establish tenant behavior, authorization boundaries, or end-to-end readiness.

## MCP update and verification

Updated `platform/ke-kintone-mcp/package.json` and lockfile from exact pin 1.9.1 to 1.11.2; installed locally. npm registry latest and official upstream releases agreed at lookup time. Node requirement remains >=22. Upstream 1.11.0 added the customization read tool; this does not establish upload/update capability in the active session.

Sources: [official releases](https://github.com/kintone/mcp-server/releases), [1.11.2 release](https://github.com/kintone/mcp-server/releases/tag/v1.11.2).

Executed after the update:

| Check | Result | What it establishes |
| --- | --- | --- |
| npm ls @kintone/mcp-server | 1.11.2 | Installed dependency version |
| npm run build | PASS | Installer embeds updated dependency files |
| npm run validate | PASS | Existing static Kit contracts |
| npm run test:flow | 21 checks PASS | Existing isolated installer/workspace regression, including shared-compass packaging/registration |
| npm run eval:contract | 9 corpus cases PASS | Corpus presence and route coverage, not model behavior |
| Intermittent regression observation | First parallel `npm test` call failed at the concurrent note-writer assertion; immediate standalone rerun passed (21 checks + 9 route cases). Cause is not established; R03's lock race is a hypothesis, not proof. | Do not treat the transient failure as resolved by this skill change |
| Runtime REST helper tests | PASS | Local helper fixtures; not live tenant operations |
| Diagnostic state probes | 3 defects reproduced | Literal replacement, partial commit, missing-file exception |
| Luna isolated upgrade failure probe | Defect reproduced | Future project schema aborts migration after managed payload changes; old manifest remains; backup exists |
| npm audit (Kintone runtime) | 3 moderate affected packages | qs dependency chain remains flagged |
| New live model evaluation / tenant / browser E2E | NOT RUN | No fresh real-system evidence in this audit |

Audit reports affected packages `qs`, `@kintone/rest-api-client`, and `@kintone/mcp-server`; these are a dependency chain, not three independent root defects. Do not use the suggested force-fix blindly: npm proposed downgrading MCP to 1.3.11. Review a compatible upstream fix/override separately.

The execution environment printed `NODE_TLS_REJECT_UNAUTHORIZED=0` during npm requests. This is an observed host configuration, not a setting introduced by this patch. Restore certificate verification / configure the trusted corporate CA before using real credentials. No tenant credentials were read or tenant calls made by the Auditor.

## Current routing

| User intent | Entry route | First expert | Workspace |
| --- | --- | --- | --- |
| Greeting only | Menu | Router | None |
| Raw survey/MoM/SOW/email | Discovery Intake | Tèo | Select/create Analysis |
| Customer overview from confirmed evidence | Customer Context | Tèo | Reuse/select Analysis |
| As-Is, pain points, conflicts | Current-State | Tèo | Reuse/select Analysis |
| To-Be, requirements | Future-State | Tèo | Reuse/select Analysis |
| Business form/process PoC | Demo Fast Track | Tèo; LauDe for architecture-led request | Demo |
| Real implementation | Project Delivery | Tí | Customer |
| Broad existing-solution review | Existing Solution Assessment | Tí | Assessment if persistent |
| Explicit cross-role discussion | Expert Panel | Cò | Only if persistent work is needed |

Demo: Mini Intake → Tèo/LauDe → LeBa → Mít Quick Verification per task → user approves full test → Mít smoke test → Demo Package.

Real delivery: readiness → To-Be/requirements → architecture → delivery plan → build/Quick Verification → smoke → UAT → production readiness → handover.

These are prompt-based role handoffs. The Kit does not implement an independent multi-agent scheduling or approval engine. A visible Mít label is not, by itself, independent verification.

## Findings and exceptions

Priorities: P1 must be addressed before relying on unattended production changes or readiness decisions; P2 affects reliability/maintainability; P3 is a presentation/coverage improvement. Static findings are distinguished from executed repros.

### R01 — P1 — E2E can accept unsupported overall PASS (static)

`scripts/run-live-e2e.mjs:161-171` reads the agent JSON and trusts `result.status`. It does not require every planned case to appear once, reject a PASS with failed/not-run cases, or verify referenced evidence exists. The result schema allows an empty cases array. Structured JSON alone is not an evidence gate.

Fix: deterministic result validation against plan IDs, evidence types and actual artifact existence; derive aggregate status. Test missing/duplicate cases, empty results, contradictory PASS, missing screenshots and child-process failure. Failed runs must still produce a diagnostic report.

### R02 — P1 — Test environment and write permission are self-declared (static)

`validatePlan` accepts an environment label but does not bind tenant/App ID to the active project's approved test target. `allowSyntheticWrites` is not type-checked; a string such as `"false"` is truthy. `--dry-run` exits before slug validation. The runner can create a private output directory for a workspace without a PROJECT baseline. Sandbox filesystem mode is not a Kintone tenant authorization boundary.

Fix: schema-validated booleans, canonical origin/guest-space/App target allowlist, existing validated workspace and scoped approvals, plus enforced tool/write scope. Test a production target mislabeled as test, string booleans, invalid slugs and cross-project targets.

### R03 — P1 — Project state update is not a two-file transaction (reproduced)

`scripts/lib/project-state.mjs:161` commits JSON before reading/writing PROJECT.md. Delete PROJECT.md in an isolated fixture, call saveState: command fails but JSON revision/objective changes. Atomic rename applies to each file, not the combined update. Direct Markdown writers and migration/bootstrap do not all take the same lock.

Fix: authoritative state plus recoverable generated projection, expected-revision checks, common lock discipline and recovery/journal. Test interruption at every write stage, simultaneous writers and missing/read-only Markdown.

### R04 — P1 — Shared active pointer can redirect another chat (static)

`.codex/ke-active-project.json` is one repository-wide pointer. Most commands accept implicit active state. A second chat selecting customer B changes where an unqualified command from customer A goes. An atomic pointer write does not prevent this workflow error.

Fix: require explicit project on mutations or bind project to session/run and check expected identity. Tenant/App context must be bound too. Test two interleaved sessions and verify no cross-customer note or write.

### R05 — P1 — Migration/upgrade lacks transaction and faithful legacy state recovery (reproduced/static)

Installer overwrites managed files before migration, then writes the manifest before dependency installation succeeds. No automatic rollback or failed-upgrade journal exists. For workspaces without JSON, migration selects a default route from project type instead of preserving the existing route/phase/gate/owners from Markdown. A late-phase legacy project can be reset to intake/readiness.

Luna reproduced the upgrade failure in an isolated fixture: a future project schema caused upgrade exit 1, a managed skill had already been overwritten, the manifest still reported the old version, and a backup existed. Auditor checked the reported execution order against installer lines 315–395. The legacy phase reset is a separate static finding; it was not part of this worker probe.

Fix: complete preflight before mutation; stage changes, preserve legacy phase/owner/baseline data, record resumable progress and restore on failure. Include real previous-release fixtures and injected dependency/migration failure, not only current-version upgrades.

### R06 — P1 — Lifecycle gates are labels, not enforced state (static)

`ke-project transition` supports eight entry routes, resets phase to the route's readiness phase, and accepts arbitrary `--gate`. It has no command to progress into Build/UAT/Handover or enforce confirmation evidence. Instructions simultaneously tell roles to maintain these phases and forbid editing manager-owned rows. Routing to G3 does not prove G3 passed.

Fix: distinguish entry route, delivery track, phase and gate status; provide state updates for the full lifecycle with evidence/approver references and explicit fast-track exceptions. Gate status should distinguish required/pending/satisfied.

### R07 — P2 — State content and malformed workspace handling (reproduced/static)

`replaceTableValue` at line 141 interpolates user values into JavaScript replacement syntax. Literal `$&` expands to the matched old row; the probe demonstrates corrupted objective text. Pipe/newline values also need consistent escaping. Validator throws on missing PROJECT.md and dereferences an unknown route after recording an error. One bad project can interrupt validate-all/migration instead of producing a complete report.

Fix: replacement callback and shared cell normalization; defensive schema/file validation. Add cases for `$&`, `$1`, pipes, newlines, malformed JSON, unknown routes and missing files.

### R08 — P2 — Notes/handoffs not fully supported by State Manager (static)

CLI provides note add only. No schema check rejects missing author/context, and there is no response/resolve command despite the handoff requirement to update the same note. IDs scan only the current log; after archiving, old IDs can be reused. Manual edits reintroduce concurrent-update risk.

Fix: persisted ID sequence, validated note schema, append-only responses/status changes with revision/lock; test archive plus new note, invalid input and concurrent resolution.

### R09 — P2 — Connection check rejects valid API-token configurations (source + official docs)

`platform/ke-kintone-mcp/scripts/test-connection.mjs` always uses `/k/v1/apps.json`. [Get Apps](https://kintone.dev/en/docs/kintone/rest-api/apps/get-apps/) does not allow API tokens. [Get App](https://kintone.dev/en/docs/kintone/rest-api/apps/get-app/) does, with a named App ID. A valid token can therefore produce a misleading connection failure.

Fix: auth-aware probe with explicit App/guest-space scope. Separate unsupported authentication for this endpoint from invalid credentials and denied access.

### R10 — P1/P2 — Effective environment and REST failure boundaries (static + observed TLS warning)

Config check parses `.env` directly, while runtime uses Node env-file options and inherited environment. A stale inherited domain can differ from the domain just checked. REST client has no explicit timeout, bounded read retry, or ambiguous-write reconciliation; it accepts arbitrary URL resolution with auth headers (current callers use fixed local paths, so no exploit was demonstrated). Customization staging lacks guest-space support although process staging supports it.

Fix: one effective config loader, reject insecure TLS for credentialed operations, bind requests to expected origin, timeouts and read-only retry policy; reconcile a timed-out write before retrying. Add guest-space customization tests.

### R11 — P2 — Browser/project isolation is stated but not configured (static)

Browser runtime uses shared `../../.ke-browser-evidence` and does not pass an explicit customer-workspace user-data directory. State Manager does not switch browser profile. This configuration does not establish the per-customer isolation promised by instructions. Actual browser default profile behavior was not tested here.

Fix: explicit browser session/profile and evidence path per approved project, including user-role identity verification before UI actions. Test two customers and two roles without shared context.

### R12 — P2 — Existing tests overstate behavior coverage (static)

`eval:contract` only validates a JSON corpus and route coverage. Live eval classifies one message, prohibits tools/files and does not exercise skill loading, workspace creation, handoff, approvals or tools. No multi-turn ambiguity/cancel/resume/negative cases. Model/config version is not captured. Child process stdout is piped but not drained and no timeout is set.

CI runs static/flow tests but not the REST helper suite, dependency installation/real MCP handshake or browser tests. Tests install with skip-deps. Ubuntu CI does not prove a usable Ubuntu runtime: shipped config hardcodes npm.cmd and npm init uses powershell.

Fix: accurately label corpus checks; add offline behavior fixtures, deterministic result gates, pinned recorded live-eval configuration and multi-turn adversarial cases; install/runtime checks in CI. Keep live tenant tests opt-in on named synthetic targets. Current hosted CI status was not rechecked; earlier failure does not establish its root cause.

### R13 — P2/P3 — Document contracts differ from helper output (static)

E2E report is written only under private/e2e-runs, while smoke contract requires a deliverable under output. Markdown exporter hardcodes Vietnamese regardless of saved document language. State/project and exporter containment checks are lexical and do not resolve symlink/junction targets. No exploit was run.

Fix: separate private raw evidence and sanitized versioned output; language-aware export; canonical path checks and overwrite tests. Revalidate Office files with the actual installed runtime before claiming native-file readiness.

### R14 — P2 — Prompt conflicts and input authority need a stronger contract (static)

Tester introduction prohibits record writes unless asked for a fix, but later boundaries authorize synthetic writes for smoke requests. Engineer stores customizations in runtime folder despite project-scoped artifact rules. Router generic end-to-end fallback overlaps named route ownership (AGENTS supplies precedence, but the skill list itself remains less explicit). Source classification exists; there is no dedicated tested rule for hostile instructions embedded in customer documents or MCP/browser content.

Fix: single shared authority/approval/routing contract; explicit smoke-write exception at the first relevant instruction; per-project customization output; test malicious source instructions, unclear target, mixed intent, numbered-menu conflict, language preferences, role closure and stop requests.

## Worker development plan / auditor acceptance

Implementation is tracked in [KE-PUBLISH-PLAN-2026-11-06.md](KE-PUBLISH-PLAN-2026-11-06.md), including the fresh-install `hello` / `hi` onboarding acceptance matrix. The findings above are the baseline; implementation status and new test evidence are recorded separately so an original finding is not mistaken for a completed fix.

| Order | Luna development package | Auditor acceptance |
| --- | --- | --- |
| 1 | Effective config/auth-aware probe; target identity and typed E2E plan | Wrong tenant/App rejected; token probe uses supported endpoint; no credential output |
| 2 | Transaction/recovery + session project binding + full phase state | Crash/concurrency/two-customer tests; no partial commit or phase reset |
| 3 | E2E result validation and report lifecycle | Empty/partial/contradictory PASS refused; evidence verified; failed runs reported |
| 4 | Migration/upgrade transaction and legacy preservation | Upgrade real old fixtures; preserve data/preferences; rollback/failure recovery demonstrated |
| 5 | Notes commands, routing contract consistency and multi-turn eval | Resolve/archive IDs safe; agent obeys routing/stop/approval boundaries |
| 6 | CI/runtime/browser evidence and production rehearsal | Named test tenant, role permissions, positive/negative paths, deployment failure and recovery; human UAT sign-off |

Do not rewrite the published v1.0.22 tag for this work. A later release should contain independently reviewed fixes and explicit remaining limitations.

## Reproduction command

`node scripts/review-state-probes.mjs`

The script creates and removes only its own temporary fixture. It is a diagnostic probe reporting defects, not a PASS regression test. No customer project is modified.
