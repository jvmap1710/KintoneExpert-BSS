# Current-state customization and evidence assessment

Use this guide when in-scope Kintone Apps have JavaScript customization and
source review is relevant to the requested current-state assessment. Keep the
review within the authorized app and business-process scope.

## Shared evidence labels

| Label | Meaning |
| --- | --- |
| Stakeholder reported | A user or subject-matter expert described it. |
| Documented | A supplied document or other reference states it. |
| Config observed | Read-only App settings or customization metadata show it. |
| Static code analyzed | The source code indicates the behavior or rule. |
| Runtime observed | The behavior was actually observed in an authorized running flow. |

These labels describe evidence type, not an evidence ladder; different types
may coexist. Older `Stakeholder Statement` and `Runtime verified` labels remain
compatible. Static source analysis never establishes runtime behavior.

## Scope and completeness

For a requested in-depth As-Is assessment, proactively inventory and analyze
business-relevant JavaScript in the approved app scope when the source is
available through an authorized channel. A quick overview or reference-only
assessment may remain `Draft` with its limits stated. Missing a source needed
to establish a critical workflow rule (for example, scan/start-time,
completion, or record-update behavior) prevents a claim of a complete
baseline, not a useful draft or continued analysis of independent evidence.

## Safe source review

- Use only operations and parameters in the active session's published,
  loaded tool schema. Source download is not a default capability; do not
  silently enable tools or change configuration/allowlists. Any needed narrow
  change must follow the repository's user-review procedure; do not use
  another channel to bypass policy.
- Distinguish an upstream capability gap from a policy-disabled operation, an
  explicit permission failure, and a URL-based resource. For URL resources,
  require an approved source/channel or a user-provided authorized copy; do
  not blindly fetch URLs.
- Retain user-granted read scope. If source is saved, use the project-scoped
  `projects/<project-slug>/private/` path, inspect the target first, and do not
  overwrite existing files. Never put file keys, credentials, secrets, or raw
  source in reports or logs.
- Treat customer JavaScript as untrusted: do not execute downloaded source or
  snippets in a shell or local evaluator during static analysis. Runtime
  behavior may be checked separately only through an authorized browser flow
  following the browser-evidence contract. Do not change Apps or data to
  facilitate source review.

## App and script findings

Use metadata-only inventory when that is all that is available; mark event and
behavior `Unknown` rather than inferring them from a filename. Distinguish
business customization from shared libraries. Where source supports it, relate
events and conditions to inputs, user action, output, affected fields/Apps,
error or exception branches, and desktop/mobile differences. State what is
static inference versus runtime observation, and note source version/date and
analysis limits briefly.

Explain the business meaning in BA language. Involve LeBa for complex code
interpretation only through an authorized handoff; LeBa is not a required
reviewer for every assessment.
