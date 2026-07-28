# Smoke test execution and evidence

A smoke test is a shallow runtime test of the deployed critical path. A
configuration inspection is not a smoke test.

## Required execution

For a requested smoke test in a named Demo/PoC or test App:

1. Confirm App ID, live revision, critical path, synthetic-data boundary, and
   available execution channels.
2. Define 5–10 cases covering the happy path, visible validation failure,
   important boundaries, lookup/calculation, workflow approval and rejection,
   and role access when applicable.
3. Create 5–10 persisted synthetic records for cases that permit saving. Mark
   every record with a unique run ID such as `KE-TEST-<timestamp>-<case-id>`
   in an available text field and retain its record ID/revision.
4. Execute invalid or blocked-save cases through the UI when browser
   automation is available. These attempts are evidence even though no record
   should persist.
5. Exercise workflow actions and verify status and assignee after each
   transition. Use separate records for approve and reject paths.
6. Read persisted records back and reconcile expected versus actual values.
7. List all created record IDs and cleanup status. Never delete them without
   explicit confirmation.
8. Always publish a standalone HTML report through `$ke-document-writer` under
   `projects/<project-slug>/output/`, even when cases fail or are blocked.

A request to run a smoke test authorizes creation and workflow mutation of
these clearly marked synthetic records only in the named Demo/PoC or test App.
It does not authorize settings changes, production test data, or deletion. Ask
for explicit confirmation before testing in a production App.

## Evidence levels

Keep these levels separate:

- **Configuration verification:** fields, layout, lookup, workflow settings,
  customization attachment, and deployed revision.
- **API functional test:** record persistence, lookup results returned by the
  server, and workflow transitions executed through MCP/REST.
- **Browser runtime test:** client-side JavaScript, visible validation,
  styling, action visibility, interactive lookup behavior, and save blocking.

Creating a record through MCP/REST does not execute browser JavaScript. Unit
tests prove calculation logic in isolation but do not prove that Kintone
loaded or ran the customization.

Use only these case statuses:

- `PASS`: the case was executed at its required evidence level and matched the
  expected result;
- `FAIL`: it was executed and did not match;
- `BLOCKED`: execution could not proceed because a required tool, account,
  environment, or dependency was unavailable;
- `NOT RUN`: the case was not attempted.

Never write `smoke test PASS`, `runtime PASS`, or `demo-ready` from
configuration evidence alone. If browser evidence is required but unavailable,
mark those cases `BLOCKED`; do not ask the user to execute them before first
completing all API/unit checks Mít can perform independently.

## Browser evidence

When an approved browser tool is available, use the authenticated Kintone tab
to create records, trigger validation, inspect visible values/styles, execute
actions, and capture screenshots. Store raw screenshots and traces under
`projects/<project-slug>/private/`; reference redacted evidence IDs in the
report.

Prefer accessibility/DOM evidence for values and controls, screenshots for
visual styling, and console/network evidence for JavaScript failures. Treat
the browser as privileged access: stay within the configured Kintone domain,
do not expose cookies or credentials, and request confirmation for destructive
or production actions.

## Mandatory HTML report

Use a new `TEST-REPORT-<release-or-run>.html` file. Include:

- project, environment, App ID/link, deployed revision, run ID and timestamp;
- scope and execution channels;
- the 5–10 case matrix with test data, expected result, actual result,
  evidence level, evidence ID, and status;
- created record IDs/revisions and cleanup status;
- separate configuration, API, and browser summaries;
- defects and reproduction steps;
- blocked/not-run items and the exact missing capability;
- `demo-ready`, `not demo-ready`, or `not assessed`, with evidence-based
  rationale.
