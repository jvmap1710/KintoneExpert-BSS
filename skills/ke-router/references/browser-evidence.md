# Browser evidence and diagnostics

Playwright MCP is KE's primary browser channel for every expert. Use it when a
claim depends on what a user can actually see or do in Kintone: form content,
labels, layout, validation, lookup behavior, action visibility, workflow,
runtime JavaScript, responsive behavior, or a final deployed result.

## Playwright operating contract

1. Confirm the target project, environment, App ID/link, account role, and
   intended evidence before opening or changing anything.
2. Reuse the project-scoped persistent Chrome profile. Ask the user to sign in
   manually when authentication is needed; never read, request, type, expose,
   or store a password, cookie, token, or browser storage value.
3. Prefer accessibility and DOM evidence for text, values, controls, and
   state. Add a screenshot when visual layout, color, spacing, or presentation
   is material.
4. Browser writes follow the same scope and approval rules as MCP/REST.
   Read-only inspection is allowed for the active task. A smoke-test request
   authorizes only its bounded synthetic records and workflow actions.
5. Keep navigation within the configured customer tenant and links required by
   the task. Do not inspect unrelated open tabs or browser-profile data.
6. Save raw screenshots, traces, and browser logs under
   `projects/<project-slug>/private/browser-evidence/<run-id>/`. Reports under
   `output/` contain redacted evidence IDs, not secrets or customer data.
7. Record evidence with: evidence ID, timestamp, page URL/App ID, account role,
   action, expected result, actual result, and artifact path when applicable.
8. If Playwright cannot execute a required runtime check, mark it `BLOCKED`.
   API, configuration, or unit evidence is not a substitute for browser
   runtime evidence.

## Chrome DevTools escalation

Chrome DevTools MCP is KE's diagnostic microscope, not the default click path.
Use it only after Playwright reproduces or observes one of these conditions:

- a JavaScript exception, missing source map, or unexpected console message;
- a failed, slow, duplicated, or malformed network request/response;
- a DOM class, event, computed-style, or script-loading discrepancy;
- a material page-load or interaction performance problem.

Diagnostic flow:

1. Reproduce with Playwright and capture the exact URL, timestamp, action, and
   visible symptom.
2. Open the same scenario with Chrome DevTools MCP. Inspect only the relevant
   console entries, requests, DOM/style state, or performance trace.
3. Redact authorization headers, cookies, payload personal data, and unrelated
   requests. The runtime is configured to redact sensitive network headers,
   disable usage statistics, and avoid CrUX URL sharing.
4. Return the root cause or the narrowest supported hypothesis, linked to the
   Playwright evidence ID. Hand code/configuration fixes to LeBa and
   requirement ambiguity to Tèo.
5. Re-run the user-visible path with Playwright after a fix. A clean console
   alone is not proof that the business flow works.

Example: if the OT-hours field does not turn red, Playwright proves the visible
failure and captures the screenshot. Chrome DevTools then checks whether the
customization file returned 200/404, whether a console exception stopped it,
and whether the expected class and computed style reached the field. After the
fix, Playwright repeats the same case and supplies the acceptance evidence.
