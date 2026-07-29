# Playwright-based user guides

Create a user guide, SOP, operating manual, training handout, or step-by-step
how-to from the deployed UI rather than from configuration assumptions.

## Required inputs

Confirm the project, environment, App ID/link, deployed revision, audience
role, covered business flow, language, document owner, and version. If the
guide needs a saved example record, use synthetic data in a Demo/PoC or test
App. Ask before creating data in production.

## Capture workflow

1. Read `../../ke-router/references/browser-evidence.md` and use Playwright MCP
   as the primary capture channel.
2. Walk through the flow using the intended user role. Record stable step IDs
   such as `UG-001`, the page/action, exact visible label, input, and expected
   result.
3. Prefer element-level screenshots over full-page screenshots. Capture only
   when the image removes ambiguity; do not add one for every click.
4. Use synthetic values and hide or avoid personal data, account details,
   notifications, unrelated records, browser chrome, and other tabs. Never
   expose credentials, cookies, tokens, or storage state.
5. Keep raw captures under
   `projects/<project-slug>/private/browser-evidence/<run-id>/`.
6. Replay the documented critical path with Playwright. Mark any unverified
   instruction clearly; do not publish an assumed step as tested.
7. Use Chrome DevTools MCP only when Playwright reproduces a technical problem
   that blocks accurate documentation. It is not a screenshot or writing tool.

## Standalone HTML content

Create one versioned HTML file such as
`USER-GUIDE-<app-or-flow>-v<major>.<minor>.html` under `output/`. Include:

- purpose, audience, scope, environment, App link/ID, revision, version, and
  last verified date;
- prerequisites, roles/permissions, navigation entry point, and test-data
  convention;
- task-oriented sections with numbered steps, expected result, screenshot
  caption, and evidence ID;
- a **Rules and common error handling** table;
- a **Scope and support** section;
- limitations, excluded flows, owner/support route, retained evidence records,
  and change history.

## Rules and common error handling

Include a user-facing table with these columns:

| Situation | System behavior | What the user should do |
| --- | --- | --- |

Cover every important required-field, date/time, boundary, lookup, workflow
action, role/permission, and client-side validation rule that applies. Use the
exact visible message when verified; otherwise label the wording as Draft.
Give a safe recovery action rather than only describing the error.

Examples of the required level of detail include: a missing required field
blocks Save and must be completed; an invalid lookup should be cleared and
retried before contacting the master-data owner; a missing workflow action may
mean the record is in another status or the user lacks the intended role.
Project-specific thresholds, policies, and messages must come from confirmed
requirements and Playwright evidence, never from this example.

## Scope and support

State:

- the workflow and user roles included in the current release/PoC;
- unsupported or deferred cases such as overnight shifts, advanced reports,
  notifications, integrations, or production permissions when applicable;
- how to report an issue: Record ID, timestamp, action, expected result,
  actual result, and a sanitized screenshot;
- the support owner or escalation route;
- synthetic guide/evidence record IDs, their retention purpose, cleanup
  status, and the rule that they are not deleted without confirmation.

End with the project slug, document ID, version, and generation date.

Embed only sanitized screenshots into the standalone HTML as local data URIs;
do not link to private filesystem paths or remote images. Give every image
useful alternative text and a caption. Keep the screenshot readable when
printed and avoid oversized captures.

Distinguish these states:

- **Verified:** replayed successfully in the named environment/revision;
- **Observed:** visible during capture but not exercised end-to-end;
- **Draft:** based on an approved design that is not yet deployed.

Never label a Draft or Observed instruction as Verified.
